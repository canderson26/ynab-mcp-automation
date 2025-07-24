# YNAB Budget Data

This file contains all static budget data, categories, bills, and targets.

## Budget ID
- **Budget ID**: 6abd0309-5bdb-40e3-ae88-746eabd102a2

## Categories and IDs
```yaml
categories:
  # Savings & Investments
  "Whole Life Insurance": "09792f02-fb60-4214-a889-e04fcca09c2d"
  "Emergency": "f124f595-9e0a-4ee3-8bf0-7df46f04cbee"
  "Brokerage": "cfd77fe6-5c6f-4d74-8da1-d62ff2ffbb67"
  "PennMutual Life Insurance Premium": "08a6ae35-29ee-4f85-b4ff-50526ccd7363"
  
  # Housing
  "Mortgage": "c3d023aa-ec90-432a-9081-eaef8fde7de5"
  "6840 Boot Renovation": "42a43437-3282-4235-b391-5471c88ec854"
  "HVAC": "dd3bae8b-c131-48b5-99bf-231d8eb25b6c"
  "Home Gym Equipment": "ca06ce36-b052-4ea6-8c95-b9a7840aa18d"
  
  # Transportation
  "Cars": "b26bd781-1bb1-4a25-b998-5812ca5f58bb"
  "Gas & Transportation": "6bd13160-1551-4277-b932-47aaf507d7a4"
  "Car Insurance": "513c6a19-0f3a-495a-ab6c-2c5fa229cc4b"
  "Car Tax": "ae83fd72-0e69-43a0-943e-238c3245faef"
  
  # Daily Living
  "Groceries": "38e7a904-be3f-4a0c-85cf-c089e1deff4e"
  "Utilities": "1e89c2b4-8fef-46c6-b6e3-3fdc580a738b"
  "Cell Phone": "21ea65cc-378c-4e41-af3f-1c6f3deebfc9"
  "Internet": "91817207-fc66-4aaf-8ea1-480277603f1a"
  "Security System": "737a560d-13bf-4997-8773-ae66fc9e35aa"
  "HOA": "5e82d621-9771-49c9-827c-031e5bc121cf"
  
  # Family
  "Daycare": "cb502164-3fa7-4d27-a047-72d5dc5e9c4f"
  "St. Marks Montessori Tuition": "39254ca6-6aab-4d29-b1fd-d52ec30dca28"
  "Term Life Insurance": "589c8e8d-b68d-4d64-a397-22435e18590c"
  "Misc Needs (Diapers etc.)": "74e01609-8939-4554-bcbe-a001ac4c85c4"
  "Dog Food": "9df4252c-b350-4dca-b3e9-9c4ff37469b7"
  
  # Personal
  "Haircut": "2d5c10da-c65b-4400-a8ca-cc4ff2f79a4c"
  "Havie's Haircut": "9ba849c6-80a0-4161-bfe1-61a050d311f3"
  "Gym": "4e61aec6-9aeb-429f-a6ee-73f338f41d97"
  "Supplements": "891ebee3-1cfd-49b3-a455-153dfb1cd6bd"
  
  # Entertainment & Discretionary
  "Fun Money": "3c956646-2348-4b54-8488-779d6dfb0c33"
  "Oliver Fun Money": "fcb72f08-5db3-446d-885b-bdbb78de156d"
  "Dining Out": "a6b6650c-2f85-4901-855f-8d3d7b74b7bd"
  "Vacation": "258c2b94-369f-4948-9785-3339b92b537a"
  
  # Subscriptions & Services
  "TV": "ded746ed-c846-428f-bb1f-0b75d4815a09"
  "Spotify": "d66304dc-4d79-4986-8a90-d9644b9f83ca"
  "Other Subscriptions": "5f87fb67-7b1f-48a6-8fea-e6e6d87a895e"
  "Ynab": "7f312af6-faf7-4f30-b054-cbc6693df63d"
  "Housekeeping": "a8f1ad3c-71b8-435e-a6fd-2d55fc7044a2"
  
  # Work & Business
  "DIGICAP Expenses": "c397f4d3-c2d2-4e7a-8bb1-0b401d659135"
  
  # Other
  "Stuff I Forgot to Budget For": "8c2d90ac-494a-4cb6-95a7-233bc2155063"
  "Moms Car Loan Repayment": "063686f4-9863-4164-b0cd-ac1685a0f917"
  "Ready to assign": "60e6c5cd-0ee3-41b3-b18a-351019c8b110"
```

## Monthly Bills Schedule
```yaml
bills:
  # Fixed bills with due dates
  - name: "HOA"
    amount: 324
    due_day: 10
    category: "HOA"
    priority: 1
    
  - name: "Daycare"
    amount: 485
    due_day: 15  # Weekly - use mid-month
    category: "Daycare"
    priority: 1
    
  - name: "Internet"
    amount: 89.99
    due_day: 23
    category: "Internet"
    priority: 2
    
  - name: "Car Insurance"
    amount: 183.83
    due_day: 27
    category: "Car Insurance"
    priority: 1
    
  - name: "Term Life Insurance (Charlie)"
    amount: 52.13
    due_day: 13
    category: "Term Life Insurance"
    priority: 2
    
  - name: "Term Life Insurance (Lauren)"
    amount: 44.87
    due_day: 1
    category: "Term Life Insurance"
    priority: 2
    
  - name: "Term Life Insurance (TransAmerica)"
    amount: 56.95
    due_day: 10
    category: "Term Life Insurance"
    priority: 2
    
  - name: "Cars"
    amount: 477.25
    due_day: 20
    category: "Cars"
    priority: 1
    
  - name: "6840 Boot Renovation"
    amount: 149
    due_day: 24
    category: "6840 Boot Renovation"
    priority: 1
    
  - name: "HVAC"
    amount: 180.09
    due_day: 27
    category: "HVAC"
    priority: 1
    
  - name: "Home Gym Equipment"
    amount: 57
    due_day: 16
    category: "Home Gym Equipment"
    priority: 1
    
  - name: "Security System"
    amount: 59.99
    due_day: 3
    category: "Security System"
    priority: 2
    
  - name: "YNAB"
    amount: 9.08
    due_day: 6  # yearly - use early month
    category: "Ynab"
    priority: 2
    
  - name: "Calvary Road Christian School (1st half)"
    amount: 680
    due_day: 5
    category: "St. Marks Montessori Tuition"
    priority: 1
    
  - name: "Calvary Road Christian School (2nd half)"
    amount: 680
    due_day: 20
    category: "St. Marks Montessori Tuition"
    priority: 1
    
  - name: "TV (YouTube TV)"
    amount: 82.99
    due_day: 23
    category: "TV"
    priority: 2
    
  - name: "TV (Disney Plus)"
    amount: 16.99
    due_day: 8
    category: "TV"
    priority: 2
    
  - name: "TV (Netflix)"
    amount: 7.99
    due_day: 15
    category: "TV"
    priority: 2
    
  - name: "Spotify"
    amount: 19.99
    due_day: 10
    category: "Spotify"
    priority: 2
    
  - name: "Supplements"
    amount: 175.24
    due_day: 9
    category: "Supplements"
    priority: 2
    
  # Variable bills (estimated)
  - name: "Utilities"
    amount: 220
    category: "Utilities"
    variable: true
    priority: 2
```

## Target Monthly Amounts
```yaml
targets:
  # Fixed bills (covered by bills section timing)
  "HOA": 108                           # $324 quarterly ÷ 3
  "Daycare": 1940                      # $485 weekly × 4
  "Internet": 89.99
  "Car Insurance": 183.83
  "Term Life Insurance": 153.95       # $52.13 + $44.87 + $56.95
  "Cars": 477.25
  "6840 Boot Renovation": 149.00
  "HVAC": 180.09
  "Home Gym Equipment": 57.00
  "Security System": 59.99
  "Ynab": 9.08
  "St. Marks Montessori Tuition": 1360  # $680 × 2
  "TV": 135.97                         # YouTube + Disney + Netflix + GotTV
  "Spotify": 19.99
  "Supplements": 225.24               # $175.24 bill + $50 additional
  "Utilities": 220                     # Variable estimate
  
  # Essential variable spending
  "Groceries": 1200
  "Gas & Transportation": 200
  "Misc Needs (Diapers etc.)": 150
  "Dog Food": 80
  
  # Personal care
  "Haircut": 99.98
  "Havie's Haircut": 25
  "Gym": 85
  
  # Discretionary
  "Fun Money": 400
  "Dining Out": 140
  "Vacation": 1000
  
  # Services and subscriptions
  "Housekeeping": 320
  "Claude": 100
  
  # Irregular/cushion
  "Stuff I Forgot to Budget For": 225.02
  
  # Top priority savings
  "Brokerage": 6736.40
  "Emergency": 773.44                  # Updated to balance budget perfectly
```

## Savings Goals
```yaml
savings:
  # Fixed monthly amounts (from targets section)
  "Emergency": 
    type: fixed
    amount: 773.44
    priority: high
    
  "Brokerage":
    type: fixed
    amount: 6736.40
    priority: highest
    
  # Vacation and other savings built into monthly targets
  "Vacation":
    type: fixed
    amount: 1000
    priority: medium
```

## Paycheck Information
```yaml
paychecks:
  Accenture:
    schedule: semi_monthly
    days: [6, 21]  # 6th and 21st of month
    typical_amount: 4384.84
    allocation_strategy: "bills_first"
    covers_bills:
      - first_check: [1, 15]   # Bills due 1st-15th
      - second_check: [16, 31] # Bills due 16th-31st
      
  OrthoVA:
    schedule: bi_weekly
    typical_amount: 3748.45
    allocation_strategy: "top_up_variable"
    last_known_date: "2025-07-10"  # Recent pay date provided
```

## Allocation Rules
```yaml
allocation_rules:
  # Order of operations
  1_fixed_bills:
    description: "Fund all bills due before next paycheck"
    
  2_essential_targets:
    description: "Top up essential categories to target"
    categories: ["Groceries", "Gas & Transportation", "Utilities"]
    
  3_savings_percentage:
    description: "Allocate percentage-based savings"
    
  4_personal_targets:
    description: "Fund personal/discretionary to target"
    
  5_remainder:
    description: "Remaining funds to designated category"

# Special rules
special_rules:
  - "Mom's car loan payment ($340) shows as income - assign to her category"
  - "Three paycheck months (OrthoVA): Extra payment to Emergency/Brokerage"
  - "Annual bills: Car Tax (~$500 October), YNAB ($99 June)"
  - "Income transactions (positive amount) go to 'Ready to assign'"
```

## Budget Philosophy
1. **Bills always come first** - Never risk missing a bill payment
2. **Build Emergency Fund consistently** - 10% minimum from each paycheck
3. **Variable categories can flex** - Reduce dining/fun if needed
4. **Track True Expenses** - Even irregular ones (car maintenance, medical)
5. **Three-paycheck months are bonuses** - Extra to savings/debt

## Quick Reference
- Total fixed bills: $5,535.32/month
- Essential variable spending: $1,630/month  
- Discretionary/Personal: $1,990/month
- Savings targets: $7,509.84/month (Brokerage $6,736.40 + Emergency $773.44)
- Monthly income: $16,904.22 (2 Accenture + 2.17 OrthoVA avg)
- Total savings rate: 44.4% ($7,509.84 of $16,904.22)
- Budget balance: EXACTLY $0 surplus

## Merchant Categorization Rules

### Auto-Approval Limits by Category
```yaml
auto_approval_limits:
  "Groceries": 150          # Auto-approve up to $150
  "Gas & Transportation": 75 # Auto-approve up to $75
  "Dining Out": 50          # Auto-approve up to $50
  "Fun Money": 100          # Auto-approve up to $100
  "Daycare": 1000           # Auto-approve up to $1000 for known providers
  "Utilities": 300          # Auto-approve known providers up to $300
  "Cell Phone": 150         # Auto-approve known providers
  "Internet": 100           # Auto-approve known providers
  "Car Insurance": 200      # Auto-approve known providers
  "Gym": 100               # Auto-approve known providers
  "Claude": 120            # Auto-approve up to $120 (covers monthly + overages)
  "Spotify": 25            # Auto-approve up to $25
  "TV": 60                 # Auto-approve up to $60
```

### Common Merchant Patterns
```yaml
merchant_patterns:
  groceries:
    - "Kroger"
    - "Walmart" 
    - "Target"
    - "Whole Foods"
    - "Costco"
    - "Sam's Club"
    
  gas_transportation:
    - "Shell"
    - "Chevron" 
    - "BP"
    - "Exxon"
    - "Uber"
    - "Lyft"
    
  dining_out:
    - "McDonald's"
    - "Chipotle"
    - "Starbucks"
    - "DoorDash"
    - "Uber Eats"
    
  subscriptions:
    - "Spotify"
    - "Claude"
    - "Netflix" 
    - "Hulu"
    - "Disney"
```