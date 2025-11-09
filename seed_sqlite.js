import Database from "better-sqlite3";
import { readFileSync } from "fs";
import { VehiclesByTypeSchema } from "./schema.js";

const db = new Database("vehicles.db");

// Create vehicles table
const createTableSQL = `
CREATE TABLE IF NOT EXISTS vehicles (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER,
  trim TEXT,
  engine_type TEXT,
  engine_horsepower TEXT,
  engine_fuelType TEXT,
  mpg_city TEXT,
  mpg_highway TEXT,
  driveType TEXT,
  bodyStyle TEXT,
  price_baseMSRP TEXT,
  price_leaseEstimate TEXT,
  price_financeEstimate TEXT,
  towingCapacity TEXT,
  payloadCapacity TEXT,
  seatingCapacity TEXT,
  cargoSpace TEXT,
  batteryWarranty TEXT,
  emissions TEXT,
  features TEXT,
  image TEXT,
  dealerships TEXT
)
`;

console.log("Creating vehicles table...");
db.exec(createTableSQL);

// Prepare insert statement
const insertSQL = `
INSERT OR REPLACE INTO vehicles (
  id, type, make, model, year, trim,
  engine_type, engine_horsepower, engine_fuelType,
  mpg_city, mpg_highway,
  driveType, bodyStyle,
  price_baseMSRP, price_leaseEstimate, price_financeEstimate,
  towingCapacity, payloadCapacity, seatingCapacity, cargoSpace,
  batteryWarranty, emissions,
  features, image, dealerships
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`;

const insert = db.prepare(insertSQL);

// Read and parse vehicles.json
console.log("Reading vehicles.json...");
let vehiclesData;
try {
  const fileContent = readFileSync("vehicles.json", "utf-8");
  vehiclesData = JSON.parse(fileContent);
} catch (error) {
  console.error("Error reading vehicles.json:", error.message);
  console.error("Please run 'npm run generate' first to create vehicles.json");
  db.close();
  process.exit(1);
}

// Insert vehicles into database
console.log("Inserting vehicles into database...");
const transaction = db.transaction((vehicles) => {
  let count = 0;
  for (const vehicle of vehicles) {
    insert.run(
      vehicle.id,
      vehicle.type,
      vehicle.make,
      vehicle.model,
      typeof vehicle.year === "string" ? parseInt(vehicle.year) : vehicle.year,
      vehicle.trim,
      vehicle.engine.type,
      String(vehicle.engine.horsepower),
      vehicle.engine.fuelType,
      String(vehicle.mpg.city),
      String(vehicle.mpg.highway),
      vehicle.driveType,
      vehicle.bodyStyle,
      String(vehicle.price.baseMSRP),
      vehicle.price.leaseEstimate ? String(vehicle.price.leaseEstimate) : null,
      vehicle.price.financeEstimate ? String(vehicle.price.financeEstimate) : null,
      vehicle.towingCapacity || null,
      vehicle.payloadCapacity || null,
      vehicle.seatingCapacity ? String(vehicle.seatingCapacity) : null,
      vehicle.cargoSpace || null,
      vehicle.batteryWarranty || null,
      vehicle.emissions || null,
      JSON.stringify(vehicle.features),
      vehicle.image,
      JSON.stringify(vehicle.dealerships)
    );
    count++;
  }
  return count;
});

let totalCount = 0;

// Process each vehicle type
const vehicleTypes = ["Cars & Minivans", "Trucks", "Crossovers & SUVs", "Hybrids"];
for (const type of vehicleTypes) {
  if (vehiclesData[type] && Array.isArray(vehiclesData[type])) {
    const count = transaction(vehiclesData[type]);
    totalCount += count;
    console.log(`  Inserted ${count} vehicles from ${type}`);
  }
}

console.log(`\n✓ Successfully seeded ${totalCount} vehicles into vehicles.db`);

// Verify by counting rows
const rowCount = db.prepare("SELECT COUNT(*) as count FROM vehicles").get();
console.log(`Database now contains ${rowCount.count} vehicles`);

db.close();
console.log("Database connection closed.");

