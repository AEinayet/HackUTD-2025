import { GoogleGenerativeAI } from "@google/generative-ai";
import Ajv from "ajv";
import { writeFileSync } from "fs";
import { VehiclesByTypeSchema } from "./schema.js";

// Check for API key
const apiKey = process.env.GOOGLE_API_KEY;
if (!apiKey) {
  console.error("Error: GOOGLE_API_KEY environment variable is not set.");
  console.error("Please set it using: export GOOGLE_API_KEY=YOUR_KEY_HERE");
  process.exit(1);
}

// Initialize Gemini
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ 
  model: "gemini-1.5-pro",
  generationConfig: {
    responseMimeType: "application/json",
  }
});

// Initialize JSON Schema validator
const ajv = new Ajv({ allErrors: true });
const validate = ajv.compile(VehiclesByTypeSchema);

// Prompt for generating vehicle data
const prompt = `Generate a comprehensive dataset of vehicles organized by type. 
Create realistic vehicle data for each category:
- Cars & Minivans: Include sedans, coupes, minivans
- Trucks: Include pickup trucks of various sizes
- Crossovers & SUVs: Include compact, mid-size, and full-size SUVs
- Hybrids: Include hybrid versions of various vehicle types

For each vehicle, include:
- A unique ID (string)
- Make and model (realistic brand names)
- Year (2020-2025)
- Trim level
- Engine details (type, horsepower, fuel type)
- MPG (city and highway)
- Drive type (FWD, RWD, AWD, 4WD)
- Body style
- Price information (baseMSRP, leaseEstimate, financeEstimate)
- Optional fields: towingCapacity, payloadCapacity, seatingCapacity, cargoSpace, batteryWarranty, emissions
- Features array (at least 5 features per vehicle)
- Image URL (placeholder or realistic URL)
- Dealerships array (at least 2-3 dealerships with name, zip, and distance)

Generate at least 3-5 vehicles per category. Ensure all data is realistic and follows the schema exactly.`;

async function generateVehicleData() {
  try {
    console.log("Connecting to Gemini API...");
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log("Parsing JSON response...");
    let vehicleData;
    try {
      vehicleData = JSON.parse(text);
    } catch (parseError) {
      console.error("Error parsing JSON response:", parseError.message);
      console.error("Response text:", text.substring(0, 500));
      process.exit(1);
    }
    
    console.log("Validating data against schema...");
    const valid = validate(vehicleData);
    
    if (!valid) {
      console.error("Validation failed. Errors:");
      console.error(JSON.stringify(validate.errors, null, 2));
      process.exit(1);
    }
    
    console.log("Validation passed! Saving to vehicles.json...");
    writeFileSync("vehicles.json", JSON.stringify(vehicleData, null, 2));
    
    // Print summary
    const counts = {
      "Cars & Minivans": vehicleData["Cars & Minivans"]?.length || 0,
      "Trucks": vehicleData["Trucks"]?.length || 0,
      "Crossovers & SUVs": vehicleData["Crossovers & SUVs"]?.length || 0,
      "Hybrids": vehicleData["Hybrids"]?.length || 0
    };
    
    console.log("\n✓ Successfully generated vehicle data!");
    console.log("Summary:");
    Object.entries(counts).forEach(([type, count]) => {
      console.log(`  ${type}: ${count} vehicles`);
    });
    console.log(`\nTotal vehicles: ${Object.values(counts).reduce((a, b) => a + b, 0)}`);
    console.log("Data saved to vehicles.json");
    
  } catch (error) {
    console.error("Error generating vehicle data:", error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

generateVehicleData();

