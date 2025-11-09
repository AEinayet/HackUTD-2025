from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from ..schemas.finance_schemas import (
    LoanCalculatorRequest, LoanCalculatorResponse,
    LeaseCalculatorRequest, LeaseCalculatorResponse,
    AffordabilityRequest, AffordabilityResponse,
    DepreciationRequest, DepreciationResponse,
    QuizRequest, QuizResponse,
    BookingRequest, BookingResponse,
    Vehicle
)
from ..utils.finance_calculator import FinanceCalculator
from ..database import get_db
import sqlite3

router = APIRouter()
calculator = FinanceCalculator()

@router.get("/vehicles")
async def list_vehicles(
    type: Optional[str] = Query(None, description="Vehicle type filter"),
    min_price: Optional[float] = Query(1000, ge=1000),
    max_price: Optional[float] = Query(None),
    year: Optional[int] = Query(None)
):
    db = get_db()
    query = "SELECT * FROM vehicles WHERE 1=1"
    params = []

    if type:
        query += " AND type = ?"
        params.append(type)
    
    if min_price:
        query += " AND CAST(price_baseMSRP AS FLOAT) >= ?"
        params.append(min_price)
    
    if max_price:
        query += " AND CAST(price_baseMSRP AS FLOAT) <= ?"
        params.append(max_price)
    
    if year:
        query += " AND year = ?"
        params.append(year)

    try:
        cursor = db.execute(query, params)
        vehicles = cursor.fetchall()
        return {"vehicles": vehicles}
    except sqlite3.Error as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/finance/loan-calculator", response_model=LoanCalculatorResponse)
async def calculate_loan(request: LoanCalculatorRequest):
    try:
        result = calculator.calculate_loan_payment(
            vehicle_price=request.vehiclePrice,
            down_payment=request.downPayment,
            interest_rate=request.interestRate,
            loan_term_months=request.loanTermMonths
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/finance/lease-calculator", response_model=LeaseCalculatorResponse)
async def calculate_lease(request: LeaseCalculatorRequest):
    try:
        result = calculator.calculate_lease_payment(
            vehicle_price=request.vehiclePrice,
            residual_value=request.residualValue,
            money_factor=request.moneyFactor,
            down_payment=request.downPayment,
            lease_term_months=request.leaseTermMonths
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/finance/affordability", response_model=AffordabilityResponse)
async def calculate_affordability(request: AffordabilityRequest):
    try:
        result = calculator.calculate_affordability(
            monthly_income=request.monthlyIncome,
            monthly_expenses=request.monthlyExpenses,
            down_payment=request.downPayment,
            interest_rate=request.interestRate,
            loan_term_months=request.loanTermMonths
        )
        
        # Find suggested vehicles within budget
        db = get_db()
        max_price = result["max_vehicle_price"]
        cursor = db.execute(
            """
            SELECT * FROM vehicles 
            WHERE CAST(price_baseMSRP AS FLOAT) <= ? 
            ORDER BY CAST(price_baseMSRP AS FLOAT) DESC 
            LIMIT 5
            """,
            (max_price,)
        )
        suggested_vehicles = cursor.fetchall()
        
        result["suggestedVehicles"] = [
            {
                "vehicle": vehicle,
                "monthlyPayment": calculator.calculate_loan_payment(
                    vehicle_price=float(vehicle["price_baseMSRP"]),
                    down_payment=request.downPayment,
                    interest_rate=request.interestRate,
                    loan_term_months=request.loanTermMonths
                )["monthlyPayment"],
                "affordabilityGap": max_price - float(vehicle["price_baseMSRP"])
            }
            for vehicle in suggested_vehicles
        ]
        
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/finance/depreciation", response_model=DepreciationResponse)
async def calculate_depreciation(request: DepreciationRequest):
    try:
        result = calculator.calculate_depreciation(
            initial_value=request.initialValue,
            years=request.years,
            annual_depreciation_rate=request.annualDepreciationRate
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/quiz/find-your-wheel", response_model=QuizResponse)
async def process_quiz(request: QuizRequest):
    db = get_db()
    try:
        # Calculate maximum affordable price
        max_monthly = request.budget.monthly
        down_payment = request.budget.downPayment
        
        # Get base query for vehicle type preferences
        query = """
        SELECT * FROM vehicles 
        WHERE type IN ({})
        AND CAST(seatingCapacity AS INTEGER) >= ?
        """.format(','.join('?' * len(request.preferences.vehicleTypes)))
        
        params = [
            *request.preferences.vehicleTypes,
            request.preferences.seatingMinimum
        ]
        
        # Add price constraints
        if request.financing.preferredType == 'loan':
            # Calculate max vehicle price based on monthly budget
            affordable_price = calculator.calculate_affordability(
                monthly_income=max_monthly * 5,  # Rough estimate for required income
                monthly_expenses=0,  # Already considered in max_monthly
                down_payment=down_payment,
                interest_rate=5.0,  # Average rate
                loan_term_months=request.financing.termLength
            )["max_vehicle_price"]
            
            query += " AND CAST(price_baseMSRP AS FLOAT) <= ?"
            params.append(affordable_price)
        
        cursor = db.execute(query, params)
        vehicles = cursor.fetchall()
        
        # Calculate match scores and payments
        recommendations = []
        for vehicle in vehicles:
            score = calculate_match_score(vehicle, request.preferences)
            
            if score >= 50:  # Only include good matches
                monthly_payment = None
                if request.financing.preferredType == 'loan':
                    monthly_payment = calculator.calculate_loan_payment(
                        vehicle_price=float(vehicle["price_baseMSRP"]),
                        down_payment=down_payment,
                        interest_rate=5.0,  # Average rate
                        loan_term_months=request.financing.termLength
                    )["monthlyPayment"]
                
                # Get dealership availability
                dealerships = get_dealership_availability(vehicle["dealerships"])
                
                recommendations.append({
                    "vehicle": vehicle,
                    "matchScore": score,
                    "monthlyPayment": monthly_payment,
                    "availableDealerships": dealerships
                })
        
        # Sort by match score and return top matches
        recommendations.sort(key=lambda x: x["matchScore"], reverse=True)
        return {"recommendations": recommendations[:5]}
    
    except sqlite3.Error as e:
        raise HTTPException(status_code=500, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/bookings", response_model=BookingResponse)
async def create_booking(request: BookingRequest):
    try:
        # Verify vehicle exists
        db = get_db()
        vehicle = db.execute(
            "SELECT * FROM vehicles WHERE id = ?",
            (request.vehicleId,)
        ).fetchone()
        
        if not vehicle:
            raise HTTPException(status_code=404, detail="Vehicle not found")
        
        # Verify dealership and appointment slot
        # In a real implementation, this would check against a dealership database
        
        # Create booking
        booking_id = generate_booking_id()
        confirmation_number = generate_confirmation_number()
        
        # Store booking in database (not implemented in this example)
        
        return {
            "bookingId": booking_id,
            "confirmationNumber": confirmation_number,
            "appointmentDetails": {
                "vehicle": vehicle,
                "dealership": request.dealership,
                "datetime": f"{request.appointment.date}T{request.appointment.time}",
                "type": request.appointment.type
            },
            "status": "confirmed"
        }
    
    except sqlite3.Error as e:
        raise HTTPException(status_code=500, detail=str(e))

# Helper functions
def calculate_match_score(vehicle: dict, preferences) -> float:
    """Calculate how well a vehicle matches user preferences"""
    score = 100.0
    
    # Basic type match
    if vehicle["type"] not in preferences.vehicleTypes:
        return 0
    
    # Features match
    vehicle_features = set(vehicle["features"])
    must_have_features = set(preferences.mustHaveFeatures)
    missing_features = must_have_features - vehicle_features
    score -= len(missing_features) * 10
    
    # Seating capacity
    if vehicle["seatingCapacity"]:
        if int(vehicle["seatingCapacity"]) < preferences.seatingMinimum:
            score -= 30
    
    # Fuel type preference
    if preferences.fuelPreference.lower() in vehicle["engine"]["fuelType"].lower():
        score += 10
    else:
        score -= 10
    
    return max(0, min(100, score))

def get_dealership_availability(dealerships: List[dict]) -> List[dict]:
    """Get available appointment slots for dealerships"""
    # In a real implementation, this would check against a dealership scheduling system
    from datetime import datetime, timedelta
    
    available_slots = []
    start_date = datetime.now() + timedelta(days=1)
    
    for dealership in dealerships:
        slots = []
        for i in range(5):  # Next 5 days
            date = start_date + timedelta(days=i)
            slots.extend([
                {
                    "date": date.date().isoformat(),
                    "time": "10:00",
                    "type": "test-drive"
                },
                {
                    "date": date.date().isoformat(),
                    "time": "14:00",
                    "type": "consultation"
                }
            ])
        
        available_slots.append({
            **dealership,
            "availableSlots": slots
        })
    
    return available_slots

def generate_booking_id() -> str:
    """Generate a unique booking ID"""
    import uuid
    return str(uuid.uuid4())

def generate_confirmation_number() -> str:
    """Generate a human-readable confirmation number"""
    import random
    import string
    chars = string.ascii_uppercase + string.digits
    return ''.join(random.choices(chars, k=8))