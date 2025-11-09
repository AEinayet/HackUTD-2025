# Gemini-First Vehicle Data Pipeline

A Node.js project that uses Google's Gemini AI to generate, validate, and seed vehicle data into a SQLite database.

## Overview

This pipeline consists of two main steps:
1. **Generate**: Uses Gemini AI to generate realistic vehicle data in JSON format, validates it against a JSON schema, and saves it to `vehicles.json`
2. **Seed**: Reads the generated JSON file and inserts all vehicle data into a SQLite database (`vehicles.db`)

## Prerequisites

- **Node.js** (v18 or higher recommended)
- **npm** (comes with Node.js)
- **Google API Key** for Gemini AI

## Setup

### 1. Install Dependencies

```bash
npm install
```

This will install the following packages:
- `@google/generative-ai` - Google's Gemini AI SDK
- `ajv` - JSON Schema validator
- `better-sqlite3` - SQLite database driver

### 2. Set Your Google API Key

You need to export the `GOOGLE_API_KEY` environment variable before running the generate script:

```bash
export GOOGLE_API_KEY=YOUR_KEY_HERE
```

**Note**: You can get a Google API key from [Google AI Studio](https://makersuite.google.com/app/apikey).

To make this persistent, you can add it to your shell profile (e.g., `~/.zshrc` or `~/.bashrc`):

```bash
echo 'export GOOGLE_API_KEY=YOUR_KEY_HERE' >> ~/.zshrc
source ~/.zshrc
```

## Usage

### Step 1: Generate Vehicle Data

Generate vehicle data using Gemini AI:

```bash
npm run generate
```

This script will:
- Connect to the Gemini API
- Request vehicle data organized by type (Cars & Minivans, Trucks, Crossovers & SUVs, Hybrids)
- Validate the generated data against the JSON schema
- Save the validated data to `vehicles.json`

**Expected Output:**
- A `vehicles.json` file containing validated vehicle data
- Console output showing the number of vehicles generated per category

### Step 2: Seed the Database

Insert the generated vehicle data into SQLite:

```bash
npm run seed
```

This script will:
- Read `vehicles.json`
- Create a `vehicles` table in `vehicles.db` (if it doesn't exist)
- Insert all vehicle records into the database
- Display a summary of inserted vehicles

**Expected Output:**
- A `vehicles.db` SQLite database file
- Console output confirming the number of vehicles inserted

## Project Structure

```
.
├── package.json              # Project dependencies and scripts
├── schema.js                 # JSON schema definitions for vehicle validation
├── generate_with_gemini.js   # Generates vehicle data using Gemini AI
├── seed_sqlite.js            # Seeds the SQLite database
├── vehicles.json             # Generated vehicle data (created after running generate)
├── vehicles.db               # SQLite database (created after running seed)
└── README.md                 # This file
```

## Data Schema

The vehicle data follows a strict JSON schema defined in `schema.js`. Each vehicle includes:

- **Basic Info**: type, id, make, model, year, trim
- **Engine**: type, horsepower, fuelType
- **Performance**: mpg (city/highway), driveType
- **Details**: bodyStyle, features array
- **Pricing**: baseMSRP, leaseEstimate, financeEstimate
- **Optional**: towingCapacity, payloadCapacity, seatingCapacity, cargoSpace, batteryWarranty, emissions
- **Media**: image URL
- **Dealerships**: array of dealership objects with name, zip, and distance

## Troubleshooting

### Error: GOOGLE_API_KEY environment variable is not set

Make sure you've exported the API key:
```bash
export GOOGLE_API_KEY=YOUR_KEY_HERE
```

### Error: Error reading vehicles.json

Run `npm run generate` first to create the `vehicles.json` file before running `npm run seed`.

### Error: Validation failed

If the generated data doesn't match the schema, the script will output validation errors. This is rare but can happen if Gemini generates unexpected data. Simply run `npm run generate` again.

## License

ISC

