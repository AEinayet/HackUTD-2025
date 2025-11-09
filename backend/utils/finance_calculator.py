from typing import Dict, Union
import math

class FinanceCalculator:
    def __init__(self):
        self.default_loan_term = 60  # 5 years in months
        self.default_lease_term = 36  # 3 years in months

    def calculate_loan_payment(self, 
                             vehicle_price: float, 
                             down_payment: float, 
                             interest_rate: float, 
                             loan_term_months: int = 60) -> Dict[str, Union[float, int]]:
        """
        Calculate monthly loan payment using the formula:
        PMT = P * (r * (1 + r)^n) / ((1 + r)^n - 1)
        where:
        PMT = Monthly Payment
        P = Principal (Loan Amount)
        r = Monthly Interest Rate (Annual Rate / 12)
        n = Total Number of Months
        """
        loan_amount = vehicle_price - down_payment
        monthly_rate = interest_rate / 12 / 100
        
        if monthly_rate == 0:
            monthly_payment = loan_amount / loan_term_months
        else:
            monthly_payment = loan_amount * (monthly_rate * (1 + monthly_rate)**loan_term_months) / ((1 + monthly_rate)**loan_term_months - 1)
        
        total_cost = monthly_payment * loan_term_months
        total_interest = total_cost - loan_amount
        
        return {
            "monthly_payment": round(monthly_payment, 2),
            "total_cost": round(total_cost, 2),
            "total_interest": round(total_interest, 2),
            "loan_term_months": loan_term_months,
            "loan_amount": round(loan_amount, 2)
        }

    def calculate_lease_payment(self,
                              vehicle_price: float,
                              residual_value: float,
                              money_factor: float,
                              down_payment: float,
                              lease_term_months: int = 36) -> Dict[str, Union[float, int]]:
        """
        Calculate monthly lease payment using the formula:
        Monthly Payment = (Capitalized Cost - Residual Value) / Term + (Capitalized Cost + Residual Value) × Money Factor
        where:
        Capitalized Cost = Vehicle Price - Down Payment
        Money Factor = APR / 2400
        """
        capitalized_cost = vehicle_price - down_payment
        
        # Depreciation fee
        monthly_depreciation = (capitalized_cost - residual_value) / lease_term_months
        
        # Finance fee
        monthly_finance_charge = (capitalized_cost + residual_value) * money_factor
        
        monthly_payment = monthly_depreciation + monthly_finance_charge
        total_cost = (monthly_payment * lease_term_months) + down_payment
        
        return {
            "monthly_payment": round(monthly_payment, 2),
            "total_lease_cost": round(total_cost, 2),
            "capitalized_cost": round(capitalized_cost, 2),
            "monthly_depreciation": round(monthly_depreciation, 2),
            "monthly_finance_charge": round(monthly_finance_charge, 2),
            "lease_term_months": lease_term_months
        }

    def calculate_affordability(self,
                              monthly_income: float,
                              monthly_expenses: float,
                              down_payment: float,
                              interest_rate: float,
                              loan_term_months: int = 60) -> Dict[str, float]:
        """
        Calculate affordable vehicle price based on 20% rule:
        - Total monthly car expenses should not exceed 20% of monthly take-home pay
        - Formula: Maximum car payment = (Monthly Income × 0.2) - Monthly Expenses
        """
        monthly_available = (monthly_income * 0.2) - monthly_expenses
        
        # Work backwards from monthly payment to find maximum affordable price
        monthly_rate = interest_rate / 12 / 100
        
        if monthly_rate == 0:
            max_loan_amount = monthly_available * loan_term_months
        else:
            max_loan_amount = monthly_available * ((1 - (1 + monthly_rate)**-loan_term_months) / monthly_rate)
        
        max_vehicle_price = max_loan_amount + down_payment
        
        return {
            "max_vehicle_price": round(max_vehicle_price, 2),
            "monthly_payment_capacity": round(monthly_available, 2),
            "max_loan_amount": round(max_loan_amount, 2)
        }

    def calculate_depreciation(self,
                             initial_value: float,
                             years: int,
                             annual_depreciation_rate: float = 0.15) -> Dict[str, list]:
        """
        Calculate vehicle depreciation over time using compound depreciation:
        Future Value = Initial Value × (1 - depreciation_rate)^years
        """
        values = []
        depreciation_amounts = []
        cumulative_depreciation = []
        
        current_value = initial_value
        for year in range(1, years + 1):
            new_value = initial_value * ((1 - annual_depreciation_rate) ** year)
            depreciation_amount = current_value - new_value
            values.append(round(new_value, 2))
            depreciation_amounts.append(round(depreciation_amount, 2))
            cumulative_depreciation.append(round(initial_value - new_value, 2))
            current_value = new_value
            
        return {
            "yearly_values": values,
            "yearly_depreciation": depreciation_amounts,
            "cumulative_depreciation": cumulative_depreciation
        }

    def compare_lease_vs_loan(self,
                             vehicle_price: float,
                             down_payment: float,
                             loan_interest_rate: float,
                             lease_money_factor: float,
                             residual_value: float) -> Dict[str, Dict]:
        """
        Compare total costs and monthly payments for lease vs loan
        """
        loan_calc = self.calculate_loan_payment(
            vehicle_price=vehicle_price,
            down_payment=down_payment,
            interest_rate=loan_interest_rate
        )
        
        lease_calc = self.calculate_lease_payment(
            vehicle_price=vehicle_price,
            residual_value=residual_value,
            money_factor=lease_money_factor,
            down_payment=down_payment
        )
        
        comparison = {
            "loan": {
                "monthly_payment": loan_calc["monthly_payment"],
                "total_cost": loan_calc["total_cost"],
                "ownership": "Yes",
                "term_months": self.default_loan_term
            },
            "lease": {
                "monthly_payment": lease_calc["monthly_payment"],
                "total_cost": lease_calc["total_lease_cost"],
                "ownership": "No",
                "term_months": self.default_lease_term
            }
        }
        
        return comparison