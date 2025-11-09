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
  model: "gemini-2.5-flash",
  generationConfig: {
    responseMimeType: "application/json",
  }
});

// Initialize JSON Schema validator
const ajv = new Ajv({ allErrors: true, allowUnionTypes: true });
const validate = ajv.compile(VehiclesByTypeSchema);

// Prompt for generating vehicle data
const prompt = `Generate a comprehensive dataset of vehicles in JSON format. The response must be a JSON object with exactly these top-level keys: "Cars & Minivans", "Trucks", "Crossovers & SUVs", and "Hybrids". Each key should contain an array of vehicle objects.

Create realistic vehicle data for each category:
- "Cars & Minivans": Include sedans, coupes, minivans (at least 3 vehicles)
- "Trucks": Include pickup trucks of various sizes (at least 3 vehicles)
- "Crossovers & SUVs": Include compact, mid-size, and full-size SUVs (at least 3 vehicles)
- "Hybrids": Include hybrid versions of various vehicle types (at least 3 vehicles)

Each vehicle object MUST have these exact fields:
{
  "type": "Cars & Minivans" (or "Trucks", "Crossovers & SUVs", "Hybrids"),
  "id": "unique-string-id",
  "make": "Brand name",
  "model": "Model name",
  "year": 2020-2025 (number),
  "trim": "Trim level name",
  "engine": {
    "type": "V6", "V8", "I4", etc.,
    "horsepower": 150-500 (number),
    "fuelType": "Gasoline", "Hybrid", "Electric"
  },
  "mpg": {
    "city": 15-50 (number),
    "highway": 20-60 (number)
  },
  "driveType": "FWD", "RWD", "AWD", or "4WD",
  "bodyStyle": "Sedan", "SUV", "Pickup", etc.,
  "price": {
    "baseMSRP": 20000-80000 (number),
    "leaseEstimate": number or null,
    "financeEstimate": number or null
  },
  "features": ["Feature 1", "Feature 2", ...] (at least 5 strings),
  "image": "https://example.com/image.jpg",
  "dealerships": [
    {"name": "Dealer Name", "zip": "12345", "distance": "5 miles"},
    ... (at least 2 dealerships)
  ],
  "towingCapacity": "5000 lbs" or null,
  "payloadCapacity": "1500 lbs" or null,
  "seatingCapacity": 5 or null,
  "cargoSpace": "20 cu ft" or null,
  "batteryWarranty": "8 years" or null,
  "emissions": "LEV III" or null
}

Return ONLY valid JSON, no markdown, no code blocks, no explanations. The JSON must match this exact structure.`;

async function generateVehicleData() {
  try {
    console.log("Connecting to Gemini API...");
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log("Parsing JSON response...");
    let vehicleData;
    try {
      // Try to parse the response - it might be wrapped in markdown code blocks
      let jsonText = text.trim();
      // Remove markdown code blocks if present
      if (jsonText.startsWith("```json")) {
        jsonText = jsonText.replace(/^```json\s*/, "").replace(/\s*```$/, "");
      } else if (jsonText.startsWith("```")) {
        jsonText = jsonText.replace(/^```\s*/, "").replace(/\s*```$/, "");
      }
      vehicleData = JSON.parse(jsonText);
      
      // If the response is an array, transform it to the expected object format
      if (Array.isArray(vehicleData)) {
        console.log(`Received array of ${vehicleData.length} vehicles, transforming to object format...`);
        const transformed = {
          "Cars & Minivans": [],
          "Trucks": [],
          "Crossovers & SUVs": [],
          "Hybrids": []
        };
        
        vehicleData.forEach(vehicle => {
          // Normalize field names (handle variations like trimLevel vs trim)
          if (vehicle.trimLevel) vehicle.trim = vehicle.trimLevel;
          
          const type = vehicle.type || "Cars & Minivans";
          if (transformed[type]) {
            transformed[type].push(vehicle);
          } else {
            // Default to first category if type doesn't match
            transformed["Cars & Minivans"].push(vehicle);
          }
        });
        
        vehicleData = transformed;
        console.log("Transformed data structure:");
        Object.keys(vehicleData).forEach(key => {
          console.log(`  ${key}: ${vehicleData[key].length} vehicles`);
        });
      }
    } catch (parseError) {
      console.error("Error parsing JSON response:", parseError.message);
      console.error("Response text (first 1000 chars):", text.substring(0, 1000));
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

