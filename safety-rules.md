# Safety & Confirmation Rules

This file defines safety protocols and confirmation requirements for all budget operations.

## 🚨 MANDATORY CONFIRMATION FLOW

**CRITICAL SAFETY REQUIREMENT:** Before executing ANY money moves via `assignToCategory`, you MUST follow this confirmation process:

### 1. Present Summary of Planned Changes
Show all planned moves in a clear, organized table format.

### 2. Request Explicit Confirmation  
Ask "Do you want me to proceed with these changes? (yes/no)" and WAIT for user response.

### 3. Execute Only After Confirmation
Do NOT execute any `assignToCategory` calls until the user explicitly confirms with "yes" or equivalent.

## Required Confirmation Format

When presenting money moves for confirmation, use this EXACT format:

```
## Proposed Budget Changes

I found these issues and want to make these moves:

| From Category | To Category | Amount | Reason |
|---------------|-------------|--------|---------|
| Brokerage | Gas & Transportation | $67.87 | Cover overspending (balance -$67.87) |
| Groceries | Emergency | $50.00 | Build emergency fund as requested |
| Fun Money | Daycare | $25.00 | Cover unexpected daycare costs |

**Summary:**
- Total moves: $142.87
- Categories affected: 6
- Largest single move: $67.87

**After these changes:**
- Gas & Transportation: -$67.87 → $0.00 ✅
- Emergency: $773.44 → $823.44 ✅  
- Daycare: -$25.00 → $0.00 ✅

Do you want me to proceed with these changes? (yes/no)
```

## Safety Limits & Protections

### Protected Categories (Require Extra Confirmation)
These categories require explicit user permission before removing money FROM them:

**Emergency Fund Protection:**
- Never move money FROM Emergency without explicit request
- If Emergency balance would drop below $500, require additional confirmation
- Example: "This would reduce your Emergency fund to $400. Are you sure? (yes/no)"

**Bill Protection (Upcoming Bills):**
- Never move money from categories with bills due within 7 days
- Check bill due dates against current date before any moves
- Warn user if attempting to move money from protected bill categories

**Large Move Protection:**
- Any single move over $500 requires confirmation even for routine operations
- Any session with total moves over $1000 requires summary confirmation

### Validation Requirements

**Before ANY money move, validate:**
1. **Category ID exists** - Use `getCategories` to verify category_id is valid
2. **Sufficient funds available** - Check source category has enough balance
3. **Mathematical accuracy** - Ensure move amounts are positive numbers
4. **No circular moves** - Don't move money A→B and B→A in same session

### Error Handling & Rollback

**If a money move fails:**
1. **Stop immediately** - Don't attempt remaining moves in the batch
2. **Report the failure** - Tell user exactly which move failed and why
3. **Provide rollback option** - "Would you like me to reverse the moves that succeeded?"
4. **Wait for instruction** - Don't automatically retry or continue

**Rollback Process:**
```
## Error During Money Moves

❌ **Move Failed:** $67.87 from Brokerage to Gas & Transportation
**Error:** Category not found or insufficient funds

✅ **Successful moves that can be reversed:**
- $50.00 from Groceries to Emergency  
- $25.00 from Fun Money to Daycare

Would you like me to reverse the successful moves? (yes/no)
```

## Session Limits & Monitoring

### Daily Limits
- **Maximum total moved per session:** $2,000
- **Maximum number of moves per session:** 10
- **Maximum single move without extra confirmation:** $500

### Session Tracking
Keep track of moves within each conversation:
- Total amount moved in session
- Number of categories affected
- Source of funds (which categories money came from)

**When approaching limits:**
```
⚠️ **Session Limit Warning**
You've moved $1,847 so far today (limit: $2,000)
This move would exceed your daily limit. 

Do you want to continue anyway? (yes/no)
```

## Special Safety Scenarios

### Emergency Fund Depletion Warning
If any move would reduce Emergency fund below $1,000:
```
🚨 **Emergency Fund Warning**
This change would reduce your Emergency fund to $456.

Your target Emergency fund is $773.44.
Having less than $1,000 emergency funds increases financial risk.

Are you sure you want to proceed? (yes/no)
```

### Bill Payment Risk Warning  
If moving money from a category with upcoming bills:
```
⚠️ **Bill Payment Risk**
You have these bills due soon in [Category]:
- [Bill Name]: $X.XX due in X days

Moving money from this category could affect bill payment.

Do you still want to proceed? (yes/no)
```

### Large Savings Move Warning
If moving more than $1,000 from Brokerage or investment categories:
```
💰 **Large Investment Move**
You're moving $1,500 from your Brokerage (investment) category.

This reduces your monthly investment by $1,500.
Your investment target is $6,736.40/month.

Are you sure this aligns with your financial goals? (yes/no)
```

## Confirmation Response Handling

**Accepted Confirmations:** 
- "yes", "y", "proceed", "go ahead", "do it", "confirm"

**Rejected Confirmations:**
- "no", "n", "cancel", "stop", "abort", "wait"

**Unclear Responses:**
If user response is unclear, ask again:
```
I need a clear yes or no response to proceed.

Do you want me to make these budget changes? 
Please respond with "yes" to proceed or "no" to cancel.
```

## Override Protocols

**Emergency Override:** 
Only if user explicitly says "override safety" or "emergency override", you may skip confirmation for critical fixes (like covering negative balances that could cause overdrafts).

**Still required even with override:**
- Show what you're doing
- Explain why it's necessary  
- Report what was changed afterward