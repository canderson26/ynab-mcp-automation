# Interactive Budget Session

This document defines how interactive budget sessions work when you want to allocate funds with Claude's assistance.

## Starting a Session

You can start a budget session anytime by saying something like:
- "Let's do a budget session"
- "Time to budget"
- "I want to allocate funds"
- "Help me budget"

## Session Flow

### 1. Initial Status Check

When you start a session, I'll gather:
- Current "Ready to Assign" amount
- Recent income transactions (last 7 days)
- Current category balances
- Upcoming bills (based on CLAUDE.md schedule)

I'll present this as a clear overview:

```
💰 Ready to Assign: $5,247.92

📥 Recent Income:
• Accenture (Jan 15): $3,847.00
• OrthoVA (Jan 12): $1,200.00
• Mom's Car Payment: $340.00

📅 Upcoming Bills (next 14 days):
• Mortgage: $0/$2,400 (due Feb 1) ⚠️
• Daycare: $800/$1,600 (due Feb 5) ⚠️
• Internet: $80/$80 (due Feb 10) ✅

📊 Quick Status:
• Groceries: $127 (usually $650)
• Emergency Fund: $5,234 
• Total budgeted this month: $3,450
```

### 2. Natural Language Commands

You can use conversational commands:

**Funding Categories:**
- "Put $1200 in mortgage" → assignFunds(mortgage, 1200)
- "Fund mortgage" → assignFunds(mortgage, 2400) [full amount]
- "Add $500 to emergency" → assignFunds(emergency, 500)
- "Top up groceries" → assignFunds(groceries, 523) [to reach $650]
- "Fill groceries to 650" → assignFunds(groceries, amount_needed)

**Moving Money:**
- "Move $200 from dining out to groceries" → moveFunds(from, to, 200)
- "Take $100 from fun money" → [asks where to put it]

**Queries:**
- "What needs funding?" → Show underfunded categories vs targets
- "Show bills" → List bills with funded status
- "How much for savings?" → Calculate percentage-based amounts
- "What's left?" → Show remaining ready to assign

**Bulk Operations:**
- "Fund all bills" → Fund all bills due before next paycheck
- "Do the usual" → Apply typical allocation pattern
- "10% to emergency" → Calculate and assign percentage

### 3. Intelligent Suggestions

Based on context, I'll make suggestions:

**If bills are unfunded:**
"⚠️ Your mortgage is due in 5 days and needs $2,400. Should I fund it first?"

**If essentials are low:**
"I notice groceries is pretty low ($127). Want to top it up to your $650 target?"

**For savings goals:**
"Based on your Accenture paycheck, 10% would be $385 for emergency fund. Should I allocate that?"

**If overspending detected:**
"Dining Out is at -$50 (overspent). Want to cover this from another category?"

### 4. Validation and Feedback

After each action:
```
✅ Done! Mortgage now fully funded ($2,400)
💰 Remaining to assign: $2,847.92
```

For complex operations:
```
📋 Here's what I'll do:
1. Mortgage: $1,200 (half payment)
2. Daycare: $800 (to reach $1,600)  
3. Groceries: $523 (to reach $650)
4. Emergency: $385 (10% of paycheck)

Total: $2,908
Remaining: $2,339.92

Look good? (or tell me what to change)
```

### 5. Session Summary

When you're done:
```
🎉 Budget Session Complete!

📊 Today's Allocations:
• Bills funded: $4,420 (5 categories)
• Savings: $585 (Emergency + Brokerage)
• Variable spending: $1,150 (6 categories)
• Total allocated: $6,155

💰 Still available: $92.92

✅ All bills for next 2 weeks are funded
📈 Emergency fund increased to $5,819
🎯 6 categories at target amounts

Great job budgeting!
```

## Context Awareness

During the session, I maintain context about:
- Which paycheck we're allocating (affects strategy)
- Previous allocations in this session
- Your stated priorities
- Typical patterns from CLAUDE.md

## Smart Features

### Bill Priority System
1. Past due bills (if any)
2. Bills due in next 7 days  
3. Bills due before next paycheck
4. Other bills in due date order

### Paycheck Recognition
- Accenture paychecks → Follow semi-monthly allocation
- OrthoVA paychecks → Top up variable categories
- Both available → Suggest combined strategy

### Math Assistance
- "Split the remainder between X and Y"
- "Put half in savings"  
- "20% to brokerage, rest to emergency"

### Undo/Adjust
- "Actually, make that $1,000 instead"
- "Undo the last one"
- "Move that to groceries instead"

## Error Prevention

I'll warn you about:
- Overallocating (trying to assign more than available)
- Double-funding (category already at target)
- Unusual amounts (10x normal allocation)
- Missing critical bills

## Quick Patterns

For experienced users, support quick patterns:

**"Do a quick essential budget"**
1. Fund all upcoming bills
2. Top up groceries and gas
3. 10% to emergency
4. Show remainder

**"Paycheck allocation"**
1. Detect which paycheck
2. Apply standard allocation
3. Show for approval
4. Execute if confirmed

**"Month-end cleanup"**
1. Show overspent categories
2. Suggest coverage sources
3. Reset for new month

## Session Persistence

The session context persists until:
- You explicitly end it ("that's all", "done", "thanks")
- 30 minutes of inactivity
- You start a different type of task

This allows for natural back-and-forth without repeating information.