export const VehicleSchema = {
  type: "object",
  required: ["type","id","make","model","year","trim","engine","mpg","driveType","bodyStyle","price","features","image","dealerships"],
  properties: {
    type: { enum: ["Cars & Minivans","Trucks","Crossovers & SUVs","Hybrids"] },
    id: { type: "string" },
    make: { type: "string" },
    model: { type: "string" },
    year: { type: ["integer","string"] },
    trim: { type: "string" },
    engine: {
      type: "object",
      required: ["type","horsepower","fuelType"],
      properties: {
        type: { type: "string" },
        horsepower: { type: ["integer","string"] },
        fuelType: { type: "string" }
      }
    },
    mpg: {
      type: "object",
      required: ["city","highway"],
      properties: {
        city: { type: ["integer","string"] },
        highway: { type: ["integer","string"] }
      }
    },
    driveType: { type: "string" },
    bodyStyle: { type: "string" },
    price: {
      type: "object",
      required: ["baseMSRP","leaseEstimate","financeEstimate"],
      properties: {
        baseMSRP: { type: ["number","string"] },
        leaseEstimate: { type: ["number","string","null"] },
        financeEstimate: { type: ["number","string","null"] }
      }
    },
    towingCapacity: { type: ["string","null"] },
    payloadCapacity: { type: ["string","null"] },
    seatingCapacity: { type: ["string","integer","null"] },
    cargoSpace: { type: ["string","null"] },
    batteryWarranty: { type: ["string","null"] },
    emissions: { type: ["string","null"] },
    features: { type: "array", items: { type: "string" } },
    image: { type: "string" },
    dealerships: {
      type: "array",
      items: {
        type: "object",
        required: ["name","zip","distance"],
        properties: {
          name: { type: "string" },
          zip: { type: "string" },
          distance: { type: "string" }
        }
      }
    }
  },
  additionalProperties: false
};

export const VehiclesByTypeSchema = {
  type: "object",
  required: ["Cars & Minivans","Trucks","Crossovers & SUVs","Hybrids"],
  properties: {
    "Cars & Minivans": { type: "array", items: VehicleSchema },
    "Trucks": { type: "array", items: VehicleSchema },
    "Crossovers & SUVs": { type: "array", items: VehicleSchema },
    "Hybrids": { type: "array", items: VehicleSchema }
  },
  additionalProperties: false
};

