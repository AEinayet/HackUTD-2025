# Finance API Specification

## Endpoints

### 1. GET /api/vehicles
List all vehicles by type with filtering options.

Query Parameters:
```json
{
  "type": "string (Cars & Minivans | Trucks | Crossovers & SUVs | Hybrids)",
  "priceRange": {
    "min": "number",
    "max": "number"
  },
  "year": "number (optional)"
}
```

Response:
```json
{
  "vehicles": [Vehicle]  // Array of vehicle objects matching schema
}
```

### 2. POST /api/finance/loan-calculator
Calculate loan payments for a vehicle.

Request:
```json
{
  "vehiclePrice": "number (>= 1000)",
  "downPayment": "number (>= 0)",
  "interestRate": "number (>= 0)",
  "loanTermMonths": "number (12-84)"
}
```

Response:
```json
{
  "monthlyPayment": "number",
  "totalCost": "number",
  "totalInterest": "number",
  "loanTermMonths": "number",
  "loanAmount": "number"
}
```

### 3. POST /api/finance/lease-calculator
Calculate lease payments.

Request:
```json
{
  "vehiclePrice": "number (>= 1000)",
  "residualValue": "number (>= 0)",
  "moneyFactor": "number (>= 0)",
  "downPayment": "number (>= 0)",
  "leaseTermMonths": "number (24-48)"
}
```

Response:
```json
{
  "monthlyPayment": "number",
  "totalLeaseCost": "number",
  "capitalizedCost": "number",
  "monthlyDepreciation": "number",
  "monthlyFinanceCharge": "number",
  "leaseTermMonths": "number"
}
```

### 4. POST /api/finance/affordability
Calculate maximum affordable vehicle price.

Request:
```json
{
  "monthlyIncome": "number (>= 0)",
  "monthlyExpenses": "number (>= 0)",
  "downPayment": "number (>= 0)",
  "interestRate": "number (>= 0)",
  "loanTermMonths": "number (12-84)"
}
```

Response:
```json
{
  "maxVehiclePrice": "number",
  "monthlyPaymentCapacity": "number",
  "maxLoanAmount": "number",
  "suggestedVehicles": [
    {
      "vehicle": "Vehicle object",
      "monthlyPayment": "number",
      "affordabilityGap": "number"
    }
  ]
}
```

### 5. POST /api/finance/depreciation
Calculate vehicle depreciation over time.

Request:
```json
{
  "initialValue": "number (>= 1000)",
  "years": "number (1-10)",
  "annualDepreciationRate": "number (0-1)"
}
```

Response:
```json
{
  "yearlyValues": "number[]",
  "yearlyDepreciation": "number[]",
  "cumulativeDepreciation": "number[]"
}
```

### 6. POST /api/quiz/find-your-wheel
Submit quiz answers and get vehicle recommendations.

Request:
```json
{
  "budget": {
    "monthly": "number (>= 0)",
    "downPayment": "number (>= 0)"
  },
  "preferences": {
    "vehicleTypes": "string[]",
    "mustHaveFeatures": "string[]",
    "seatingMinimum": "number",
    "fuelPreference": "string",
    "primaryUse": "string"
  },
  "financing": {
    "preferredType": "string (loan | lease)",
    "termLength": "number"
  }
}
```

Response:
```json
{
  "recommendations": [
    {
      "vehicle": "Vehicle object",
      "matchScore": "number (0-100)",
      "monthlyPayment": "number",
      "availableDealerships": [
        {
          "name": "string",
          "zip": "string",
          "distance": "string",
          "availableSlots": [
            {
              "date": "string (ISO date)",
              "time": "string (HH:MM)",
              "type": "string (test-drive | consultation)"
            }
          ]
        }
      ]
    }
  ]
}
```

### 7. POST /api/bookings
Create a booking appointment.

Request:
```json
{
  "vehicleId": "string",
  "dealership": {
    "name": "string",
    "zip": "string"
  },
  "appointment": {
    "date": "string (ISO date)",
    "time": "string (HH:MM)",
    "type": "string (test-drive | consultation)"
  },
  "customer": {
    "name": "string",
    "email": "string",
    "phone": "string",
    "preferredContact": "string (email | phone)"
  }
}
```

Response:
```json
{
  "bookingId": "string",
  "confirmationNumber": "string",
  "appointmentDetails": {
    "vehicle": "Vehicle object",
    "dealership": "Dealership object",
    "datetime": "string (ISO datetime)",
    "type": "string"
  },
  "status": "string (confirmed | pending)"
}
```

## Error Responses

All endpoints may return the following error responses:

```json
{
  "error": {
    "code": "string",
    "message": "string",
    "details": "object (optional)"
  }
}
```

Common error codes:
- 400: Bad Request (invalid input)
- 404: Not Found (vehicle or dealership not found)
- 422: Validation Error (input validation failed)
- 429: Too Many Requests (rate limit exceeded)
- 500: Internal Server Error