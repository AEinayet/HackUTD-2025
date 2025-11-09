#!/usr/bin/env node
// quiz.js — Match user preferences to top vehicles in vehicles.db

import Database from "better-sqlite3";
import inquirer from "inquirer";
import { GoogleGenerativeAI } from "@google/generative-ai";

// --- CONFIG ---
const DB_PATH = "vehicles.db";
const USE_GEMINI = !!process.env.GOOGLE_API_KEY;       // set GOOGLE_API_KEY to enable explanations
const GEM_MODEL = "gemini-1.5-flash";                  // fast; switch to -pro for higher-quality
const DEFAULT_APR = 4.0;                               // %
const DEFAULT_TERM = 60;                                // months
const DEFAULT_DOWN = 10;                                // % down payment

// --- UTILS ---
const num = v => {
  if (v === null || v === undefined) return null;
  const n = Number(String(v).replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : null;
};

function monthlyPayment(price, apr = DEFAULT_APR, term = DEFAULT_TERM, downPct = DEFAULT_DOWN) {
  const P = Math.max(0, price - price * (downPct / 100));
  const r = (apr / 100) / 12;
  const n = term;
  if (!P || !r || !n) return null;
  return (P * r * (1 + r) ** n) / ((1 + r) ** n - 1);
}

function includesI(hay, needle) {
  return (hay || "").toLowerCase().includes((needle || "").toLowerCase());
}

function anyIncludes(list, value) {
  const v = (value || "").toLowerCase();
  return (list || []).some(x => (x || "").toLowerCase().includes(v));
}

// --- LOAD DB ---
let db;
try {
  db = new Database(DB_PATH, { fileMustExist: true });
} catch (error) {
  if (error.code === 'SQLITE_CANTOPEN' || error.message.includes('unable to open database file')) {
    console.error(`\n❌ Error: Database file '${DB_PATH}' not found.`);
    console.error(`\nPlease run the following commands first:\n`);
    console.error(`  1. npm run generate  (generates vehicles.json)`);
    console.error(`  2. npm run seed      (creates vehicles.db from vehicles.json)\n`);
    process.exit(1);
  }
  throw error;
}

// Pull all vehicles (flatten JSON cols)
function loadVehicles() {
  const rows = db.prepare(`SELECT * FROM vehicles`).all();
  return rows.map(r => ({
    id: r.id,
    type: r.type,
    make: r.make,
    model: r.model,
    year: r.year,
    trim: r.trim,
    engine: {
      type: r.engine_type,
      horsepower: r.engine_horsepower,
      fuelType: r.engine_fuelType
    },
    mpg: {
      city: r.mpg_city,
      highway: r.mpg_highway
    },
    driveType: r.driveType,
    bodyStyle: r.bodyStyle,
    price: {
      baseMSRP: r.price_baseMSRP,
      leaseEstimate: r.price_leaseEstimate,
      financeEstimate: r.price_financeEstimate
    },
    towingCapacity: r.towingCapacity,
    payloadCapacity: r.payloadCapacity,
    seatingCapacity: r.seatingCapacity,
    cargoSpace: r.cargoSpace,
    batteryWarranty: r.batteryWarranty,
    emissions: r.emissions,
    features: (() => { try { return JSON.parse(r.features || "[]"); } catch { return []; } })(),
    image: r.image,
    dealerships: (() => { try { return JSON.parse(r.dealerships || "[]"); } catch { return []; } })()
  }));
}

// --- QUIZ ---
async function ask() {
  const answers = await inquirer.prompt([
    {
      type: "list",
      name: "type",
      message: "What category fits you best?",
      choices: ["Any", "Cars & Minivans", "Trucks", "Crossovers & SUVs", "Hybrids"],
      default: "Any"
    },
    {
      type: "input",
      name: "budget",
      message: "What is your target budget (base MSRP) in USD? (e.g. 32000, leave blank to skip)",
      filter: v => v.trim(),
      validate: v => v === "" || /^\d+(\.\d+)?$/.test(v) ? true : "Enter a number or leave blank"
    },
    {
      type: "list",
      name: "fuel",
      message: "Fuel preference?",
      choices: ["Any", "Gasoline", "Hybrid", "Electric"],
      default: "Any"
    },
    {
      type: "list",
      name: "size",
      message: "Preferred size/body?",
      choices: ["Any", "Sedan", "Hatchback", "Minivan", "SUV", "Pickup"],
      default: "Any"
    },
    {
      type: "list",
      name: "drive",
      message: "Drive preference?",
      choices: ["Any", "FWD", "RWD", "AWD", "4WD"],
      default: "Any"
    },
    {
      type: "list",
      name: "mpgBias",
      message: "How important is MPG?",
      choices: [
        { name: "Not important", value: 0 },
        { name: "Somewhat", value: 1 },
        { name: "Very", value: 2 }
      ],
      default: 1
    },
    {
      type: "checkbox",
      name: "features",
      message: "Must-have features? (multi-select)",
      choices: ["Apple CarPlay", "Android Auto", "Blind Spot Monitor", "Adaptive Cruise Control", "Backup Camera", "Lane Keep Assist", "AWD"],
      default: []
    }
  ]);

  // Numeric conversions
  answers.budget = answers.budget ? Number(answers.budget) : null;
  return answers;
}

// --- SCORING ---
function scoreVehicle(v, prefs) {
  let score = 0;
  let reasons = [];

  // HARD FILTERS (optional, but keeps results relevant)
  if (prefs.type !== "Any" && v.type !== prefs.type) return { score: -Infinity, reasons: ["Different category"] };
  if (prefs.size !== "Any") {
    const ok = includesI(v.bodyStyle, prefs.size) || (prefs.size === "Pickup" && includesI(v.bodyStyle, "pickup"));
    if (!ok) return { score: -Infinity, reasons: ["Different body size"] };
  }

  // Budget — soft match
  const msrp = num(v.price?.baseMSRP);
  if (prefs.budget && msrp) {
    const diff = Math.abs(msrp - prefs.budget);
    if (diff <= 2000) { score += 25; reasons.push("Near your budget"); }
    else if (diff <= 5000) { score += 15; reasons.push("Within ~$5k of budget"); }
    else if (msrp < prefs.budget) { score += 10; reasons.push("Under budget"); }
    else { score -= 10; reasons.push("Above budget"); }
  }

  // Fuel preference
  if (prefs.fuel !== "Any") {
    if (includesI(v.engine?.fuelType, prefs.fuel)) { score += 20; reasons.push(`Matches ${prefs.fuel}`); }
    else { score -= 10; reasons.push(`Not ${prefs.fuel}`); }
  }

  // Drive type
  if (prefs.drive !== "Any") {
    if ((v.driveType || "").toUpperCase() === prefs.drive) { score += 10; reasons.push(`Drive ${prefs.drive}`); }
  }

  // MPG bias (favor higher highway when requested)
  const mpgH = num(v.mpg?.highway);
  if (prefs.mpgBias > 0 && mpgH) {
    score += prefs.mpgBias * Math.min(30, mpgH) * 0.5; // cap contribution
    reasons.push("Good MPG");
  }

  // Features
  if (prefs.features?.length) {
    const have = v.features || [];
    let matches = 0;
    for (const f of prefs.features) {
      if (anyIncludes(have, f)) matches++;
    }
    score += matches * 6;
    if (matches) reasons.push(`Features: ${matches} match`);
  }

  return { score, reasons };
}

// --- GEMINI EXPLANATION (optional) ---
async function explainWithGemini(model, picks, prefs) {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    const g = genAI.getGenerativeModel({ model: GEM_MODEL });
    const text = `
User preferences: ${JSON.stringify(prefs, null, 2)}
Top picks: ${JSON.stringify(picks, null, 2)}
Write 3 short sentences explaining why these are good matches. No markdown, concise.
`;
    const res = await g.generateContent(text);
    return res.response.text().trim();
  } catch (e) {
    return null;
  }
}

// --- MAIN ---
(async () => {
  const prefs = await ask();
  const all = loadVehicles();

  // Score all, keep top 3
  const scored = all
    .map(v => ({ v, ...scoreVehicle(v, prefs) }))
    .filter(x => x.score > -Infinity)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  if (!scored.length) {
    console.log("\nNo good matches found. Try relaxing filters (e.g., Type: Any, Size: Any).\n");
    process.exit(0);
  }

  console.log("\n🎯 Top Matches");
  scored.forEach((s, i) => {
    const msrp = num(s.v.price?.baseMSRP);
    const monthly = msrp ? monthlyPayment(msrp) : null;
    console.log(`\n#${i + 1} ${s.v.year} ${s.v.make} ${s.v.model} ${s.v.trim}  [${s.v.type}]`);
    if (msrp) console.log(`   MSRP: $${msrp.toLocaleString()}  | Est. Finance: $${monthly?.toFixed(0)}/mo`);
    console.log(`   Body/Drive: ${s.v.bodyStyle || "-"} / ${s.v.driveType || "-"}`);
    console.log(`   MPG: ${s.v.mpg?.city || "-"} city / ${s.v.mpg?.highway || "-"} hwy`);
    if (s.v.features?.length) console.log(`   Features: ${s.v.features.slice(0, 5).join(", ")}${s.v.features.length > 5 ? "..." : ""}`);
    if (s.v.image) console.log(`   Image: ${s.v.image}`);
    console.log(`   Why: ${s.reasons.join("; ")}`);
  });

  if (USE_GEMINI) {
    const picks = scored.map(s => ({
      id: s.v.id, name: `${s.v.year} ${s.v.make} ${s.v.model} ${s.v.trim}`, type: s.v.type
    }));
    const explanation = await explainWithGemini(GEM_MODEL, picks, prefs);
    if (explanation) {
      console.log("\n🤖 Gemini says:");
      console.log(explanation);
    }
  }

  console.log("\nTip: rerun the quiz with different answers to see how matches change.");
})();
