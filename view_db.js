#!/usr/bin/env node
// view_db.js — Display all vehicles from the database in a readable format

import Database from "better-sqlite3";

const DB_PATH = "vehicles.db";

// Try to open database
let db;
try {
  db = new Database(DB_PATH, { fileMustExist: true });
} catch (error) {
  if (error.code === 'SQLITE_CANTOPEN' || error.message.includes('unable to open database file')) {
    console.error(`\nError: Database file '${DB_PATH}' not found.`);
    console.error(`\nPlease run the following commands first:\n`);
    console.error(`  1. npm run generate  (generates vehicles.json)`);
    console.error(`  2. npm run seed      (creates vehicles.db from vehicles.json)\n`);
    process.exit(1);
  }
  throw error;
}

// Get all vehicles
const vehicles = db.prepare(`SELECT * FROM vehicles`).all();

if (vehicles.length === 0) {
  console.log("\n⚠️  Database is empty. No vehicles found.\n");
  console.log("Run 'npm run generate' and 'npm run seed' to populate the database.\n");
  db.close();
  process.exit(0);
}

console.log("\n" + "=".repeat(80));
console.log(`📊 VEHICLE DATABASE - ${vehicles.length} Total Vehicles`);
console.log("=".repeat(80) + "\n");

// Group by type
const byType = {};
vehicles.forEach(v => {
  const type = v.type || "Unknown";
  if (!byType[type]) byType[type] = [];
  byType[type].push(v);
});

// Display by category
Object.keys(byType).sort().forEach(type => {
  const vehiclesInType = byType[type];
  console.log(`\n${"─".repeat(80)}`);
  console.log(`🚗 ${type.toUpperCase()} (${vehiclesInType.length} vehicles)`);
  console.log("─".repeat(80));
  
  vehiclesInType.forEach((v, idx) => {
    console.log(`\n  ${idx + 1}. ${v.year || 'N/A'} ${v.make || 'N/A'} ${v.model || 'N/A'} ${v.trim || ''}`);
    console.log(`     ID: ${v.id}`);
    console.log(`     Engine: ${v.engine_type || 'N/A'} | ${v.engine_horsepower || 'N/A'} HP | ${v.engine_fuelType || 'N/A'}`);
    console.log(`     MPG: ${v.mpg_city || 'N/A'} city / ${v.mpg_highway || 'N/A'} highway`);
    console.log(`     Drive: ${v.driveType || 'N/A'} | Body: ${v.bodyStyle || 'N/A'}`);
    
    const msrp = v.price_baseMSRP ? `$${Number(v.price_baseMSRP).toLocaleString()}` : 'N/A';
    console.log(`     Price: ${msrp}`);
    
    // Parse and show features
    try {
      const features = JSON.parse(v.features || "[]");
      if (features.length > 0) {
        console.log(`     Features: ${features.slice(0, 3).join(", ")}${features.length > 3 ? ` (+${features.length - 3} more)` : ''}`);
      }
    } catch (e) {
      // Ignore parse errors
    }
    
    // Parse and show dealerships
    try {
      const dealerships = JSON.parse(v.dealerships || "[]");
      if (dealerships.length > 0) {
        console.log(`     Dealerships: ${dealerships.length} nearby`);
      }
    } catch (e) {
      // Ignore parse errors
    }
    
    if (v.image) {
      console.log(`     Image: ${v.image}`);
    }
  });
});

// Summary statistics
console.log("\n" + "=".repeat(80));
console.log("📈 SUMMARY STATISTICS");
console.log("=".repeat(80));

const stats = {
  total: vehicles.length,
  byType: Object.keys(byType).reduce((acc, type) => {
    acc[type] = byType[type].length;
    return acc;
  }, {}),
  priceRange: (() => {
    const prices = vehicles
      .map(v => Number(v.price_baseMSRP))
      .filter(p => !isNaN(p) && p > 0);
    if (prices.length === 0) return null;
    return {
      min: Math.min(...prices),
      max: Math.max(...prices),
      avg: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
    };
  })(),
  makes: [...new Set(vehicles.map(v => v.make).filter(Boolean))].sort()
};

console.log(`\n  Total Vehicles: ${stats.total}`);
console.log(`  By Category:`);
Object.entries(stats.byType).forEach(([type, count]) => {
  console.log(`    ${type}: ${count}`);
});

if (stats.priceRange) {
  console.log(`\n  Price Range:`);
  console.log(`    Min: $${stats.priceRange.min.toLocaleString()}`);
  console.log(`    Max: $${stats.priceRange.max.toLocaleString()}`);
  console.log(`    Avg: $${stats.priceRange.avg.toLocaleString()}`);
}

if (stats.makes.length > 0) {
  console.log(`\n  Makes (${stats.makes.length}): ${stats.makes.join(", ")}`);
}

console.log("\n" + "=".repeat(80) + "\n");

db.close();

