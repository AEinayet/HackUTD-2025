#*Monthly Payment = P * (r * (1 + r)^n) / ((1 + r)^n - 1)
#where:
#P = Principal (Loan Amount)
#r = Monthly Interest Rate (Annual Rate / 12)
#n = Total Number of Months **/

def find_monthly_payment(model_car, amount_desired, n_month_estimated, annual_rate):
    p = amount_desired 
    r= (annual_rate / 100) / 12 
    n = n_month_estimated
    if r == 0:
        monthly_payment = P / n
    else:
        monthly_payment = P * (r * (1 + r)**n) / ((1 + r)**n - 1)
    
    return round(monthly_payment,2)

def find_lease_payment(vehicle_price, down_payment, residual_value, term_months, apr):
    capitalized_cost = vehicle_price - down_payment # price of car at the current moment
    money_factor = apr / 2400 # A number used instead of an interest rate
    monthly_payment = ((capitalized_cost - residual_value) / term_months) + \
                      ((capitalized_cost + residual_value) * money_factor)
    return round(monthly_payment, 2)


def max_affordable_vehicle(monthly_income, monthly_expenses, down_payment, annual_rate, n_months):
    r = (annual_rate / 100) / 12
    max_monthly_payment = (monthly_income * 0.2) - monthly_expenses
    max_loan_amount = max_monthly_payment * ((1 - (1 + r)**-n_months) / r)
    max_vehicle_price = max_loan_amount + down_payment
    return {
        "max_monthly_payment": round(max_monthly_payment, 2),
        "max_vehicle_price": round(max_vehicle_price, 2)
    }
def future_value(initial_value, depreciation_rate, years):
    fv = initial_value * ((1 - depreciation_rate) ** years) #fv value of the car
    return round(fv, 2)

