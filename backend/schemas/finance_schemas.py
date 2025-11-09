from pydantic import BaseModel, Field, validator, constr
from typing import List, Optional, Literal
from datetime import datetime

class Engine(BaseModel):
    type: str
    horsepower: str
    fuelType: str

class MPG(BaseModel):
    city: str
    highway: str

class Price(BaseModel):
    baseMSRP: float = Field(..., ge=1000)  # Minimum price validation
    leaseEstimate: Optional[float] = None
    financeEstimate: Optional[float] = None

class Dealership(BaseModel):
    name: str
    zip: constr(regex=r'^\d{5}$')
    distance: str

class Vehicle(BaseModel):
    type: Literal['Cars & Minivans', 'Trucks', 'Crossovers & SUVs', 'Hybrids']
    id: str
    make: str
    model: str
    year: int = Field(..., ge=2000)
    trim: str
    engine: Engine
    mpg: MPG
    driveType: str
    bodyStyle: str
    price: Price
    towingCapacity: Optional[str] = None
    payloadCapacity: Optional[str] = None
    seatingCapacity: Optional[str] = None
    cargoSpace: Optional[str] = None
    batteryWarranty: Optional[str] = None
    emissions: Optional[str] = None
    features: List[str]
    image: str
    dealerships: List[Dealership]

# Finance Calculator Schemas
class LoanCalculatorRequest(BaseModel):
    vehiclePrice: float = Field(..., ge=1000)
    downPayment: float = Field(..., ge=0)
    interestRate: float = Field(..., ge=0)
    loanTermMonths: int = Field(..., ge=12, le=84)

    @validator('downPayment')
    def validate_down_payment(cls, v, values):
        if 'vehiclePrice' in values and v >= values['vehiclePrice']:
            raise ValueError('Down payment must be less than vehicle price')
        return v

class LoanCalculatorResponse(BaseModel):
    monthlyPayment: float
    totalCost: float
    totalInterest: float
    loanTermMonths: int
    loanAmount: float

class LeaseCalculatorRequest(BaseModel):
    vehiclePrice: float = Field(..., ge=1000)
    residualValue: float = Field(..., ge=0)
    moneyFactor: float = Field(..., ge=0)
    downPayment: float = Field(..., ge=0)
    leaseTermMonths: int = Field(..., ge=24, le=48)

    @validator('residualValue')
    def validate_residual_value(cls, v, values):
        if 'vehiclePrice' in values and v >= values['vehiclePrice']:
            raise ValueError('Residual value must be less than vehicle price')
        return v

class LeaseCalculatorResponse(BaseModel):
    monthlyPayment: float
    totalLeaseCost: float
    capitalizedCost: float
    monthlyDepreciation: float
    monthlyFinanceCharge: float
    leaseTermMonths: int

class AffordabilityRequest(BaseModel):
    monthlyIncome: float = Field(..., ge=0)
    monthlyExpenses: float = Field(..., ge=0)
    downPayment: float = Field(..., ge=0)
    interestRate: float = Field(..., ge=0)
    loanTermMonths: int = Field(..., ge=12, le=84)

    @validator('monthlyExpenses')
    def validate_expenses(cls, v, values):
        if 'monthlyIncome' in values and v >= values['monthlyIncome']:
            raise ValueError('Monthly expenses cannot exceed monthly income')
        return v

class AffordabilityResponse(BaseModel):
    maxVehiclePrice: float
    monthlyPaymentCapacity: float
    maxLoanAmount: float
    suggestedVehicles: List[dict]

class DepreciationRequest(BaseModel):
    initialValue: float = Field(..., ge=1000)
    years: int = Field(..., ge=1, le=10)
    annualDepreciationRate: float = Field(..., ge=0, le=1)

class DepreciationResponse(BaseModel):
    yearlyValues: List[float]
    yearlyDepreciation: List[float]
    cumulativeDepreciation: List[float]

# Quiz and Booking Schemas
class Budget(BaseModel):
    monthly: float = Field(..., ge=0)
    downPayment: float = Field(..., ge=0)

class Preferences(BaseModel):
    vehicleTypes: List[str]
    mustHaveFeatures: List[str]
    seatingMinimum: int = Field(..., ge=2)
    fuelPreference: str
    primaryUse: str

class FinancingPreference(BaseModel):
    preferredType: Literal['loan', 'lease']
    termLength: int

class QuizRequest(BaseModel):
    budget: Budget
    preferences: Preferences #suv car, mini van, hhybrid etc.
    financing: FinancingPreference

class AppointmentSlot(BaseModel):
    date: datetime
    time: str
    type: Literal['test-drive', 'consultation']

class DealershipRecommendation(BaseModel):
    name: str
    zip: str
    distance: str
    availableSlots: List[AppointmentSlot]

class VehicleRecommendation(BaseModel):
    vehicle: Vehicle
    matchScore: float = Field(..., ge=0, le=100)
    monthlyPayment: float
    availableDealerships: List[DealershipRecommendation]

class QuizResponse(BaseModel):
    recommendations: List[VehicleRecommendation]

class CustomerInfo(BaseModel):
    name: str
    email: constr(regex=r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
    phone: constr(regex=r'^\+?1?\d{9,15}$')
    preferredContact: Literal['email', 'phone']

class BookingRequest(BaseModel):
    vehicleId: str
    dealership: Dealership
    appointment: AppointmentSlot
    customer: CustomerInfo

class BookingResponse(BaseModel):
    bookingId: str
    confirmationNumber: str
    appointmentDetails: dict
    status: Literal['confirmed', 'pending']