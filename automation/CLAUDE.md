# YNAB Budget Context

This file contains budget rules, bill schedules, and allocation strategies for the YNAB automation system.

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
  - name: "Mortgage"
    amount: 2400
    due_day: 1
    category: "Mortgage"
    priority: 1
    
  - name: "HOA"
    amount: 250
    due_day: 1
    category: "HOA"
    priority: 1
    
  - name: "Daycare"
    amount: 1600
    due_day: 5
    category: "Daycare"
    priority: 1
    
  - name: "Internet"
    amount: 80
    due_day: 10
    category: "Internet"
    priority: 2
    
  - name: "Car Insurance"
    amount: 300
    due_day: 15
    category: "Car Insurance"
    priority: 1
    
  - name: "Term Life Insurance"
    amount: 125
    due_day: 20
    category: "Term Life Insurance"
    priority: 2
    
  - name: "Cell Phone"
    amount: 140
    due_day: 22
    category: "Cell Phone"
    priority: 2
    
  # Variable bills (estimated)
  - name: "Utilities"
    amount: 250  # Higher in summer/winter
    category: "Utilities"
    variable: true
    priority: 2
```

## Target Monthly Amounts
```yaml
targets:
  # Essential variable spending
  "Groceries": 650
  "Gas & Transportation": 250
  "Misc Needs (Diapers etc.)": 200
  "Dog Food": 50
  
  # Personal care
  "Haircut": 40
  "Havie's Haircut": 25
  "Supplements": 50
  
  # Discretionary
  "Fun Money": 200
  "Oliver Fun Money": 100
  "Dining Out": 300
  
  # Irregular/cushion
  "Stuff I Forgot to Budget For": 200
  
  # Services
  "Housekeeping": 200
  "Gym": 50
```

## Savings Goals
```yaml
savings:
  # Percentage-based (of paycheck)
  "Emergency": 
    type: percentage
    amount: 10
    priority: high
    
  "Brokerage":
    type: percentage
    amount: 15
    priority: medium
    applies_to: ["Accenture"]  # Only from Accenture paychecks
    
  # Fixed amounts
  "Vacation":
    type: fixed
    amount: 200
    priority: low
    
  "6840 Boot Renovation":
    type: remainder  # Gets whatever is left
    priority: low
```

## Paycheck Information
```yaml
paychecks:
  Accenture:
    schedule: semi_monthly
    days: [15, -1]  # 15th and last day of month
    typical_amount: 3850
    allocation_strategy: "bills_first"
    covers_bills:
      - first_check: [15, 31]  # Bills due 15th-31st
      - second_check: [1, 14]  # Bills due 1st-14th
      
  OrthoVA:
    schedule: bi_weekly
    typical_amount: 1300
    allocation_strategy: "top_up_variable"
    last_known_date: "2024-01-05"  # Track 14-day cycles from this
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

## Interactive Budget Session Phrases
When doing budget sessions, I should understand these natural language requests:

- "Fund the bills" → Fund all upcoming bills based on due dates
- "Top up groceries" → Bring groceries to target amount
- "How much for savings?" → Calculate percentage-based savings
- "What's left?" → Show ready to assign after planned allocations
- "Fill essentials" → Fund all essential categories to targets
- "Check bill status" → Show which bills are funded/unfunded
- "Emergency fund status" → Show current balance and goal progress

## Budget Philosophy
1. **Bills always come first** - Never risk missing a bill payment
2. **Build Emergency Fund consistently** - 10% minimum from each paycheck
3. **Variable categories can flex** - Reduce dining/fun if needed
4. **Track True Expenses** - Even irregular ones (car maintenance, medical)
5. **Three-paycheck months are bonuses** - Extra to savings/debt

## Quick Reference
- Total fixed bills: ~$5,115/month
- Essential variable spending: ~$1,150/month  
- Discretionary targets: ~$600/month
- Typical monthly income: ~$8,900 (2 Accenture + 2 OrthoVA)
- Savings rate goal: 20-25% of gross income