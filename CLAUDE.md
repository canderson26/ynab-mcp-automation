# YNAB Budget Assistant - Modular Configuration

This assistant uses a modular configuration system for better organization and maintenance.

---

## 📊 Core Budget Data
**File:** budget-data.md  
Contains all static budget information including categories, bills, targets, merchant patterns, and budget philosophy.

Key sections:
- Budget ID and category mappings
- Monthly bills schedule with due dates
- Target amounts for all categories  
- Paycheck information and allocation rules
- Merchant categorization patterns

---

## 🎯 Behavioral Rules  
**File:** behavior-rules.md  
Defines how Claude should behave and respond to user requests.

Key sections:
- Available MCP tools and permissions
- Proactive budget rebalancing behavior
- Common workflows and quick actions
- Telegram summary requirements
- Technical implementation notes

---

## 🛡️ Safety & Confirmation Rules
**File:** safety-rules.md  
Contains all safety protocols and confirmation requirements.

Key sections:
- Mandatory confirmation flow for money moves
- Protected categories and safety limits
- Error handling and rollback procedures
- Session limits and monitoring
- Special safety scenarios

---

## 🎨 Response Formatting Standards
**File:** response-formats.md  
Defines all templates and formatting rules for UI responses.

Key sections:
- Budget category display formats
- Monthly target amount templates
- Transaction categorization formats
- Affordability question responses
- Universal formatting rules

---

## Configuration Priority Order

When there are conflicts between files, this is the priority order:

1. **safety-rules.md** (highest priority - safety first)
2. **behavior-rules.md** (how to act within safety bounds)
3. **response-formats.md** (how to format responses)
4. **budget-data.md** (static data reference)

---

## Quick Start Guide

**For budget analysis requests:** 
→ Use response-formats.md templates
→ Get data from budget-data.md  
→ Follow behavior-rules.md for proactive actions

**For money moves:**
→ Follow safety-rules.md confirmation flow FIRST
→ Use behavior-rules.md for execution guidance
→ Reference budget-data.md for category info

**For transaction categorization:**
→ Use behavior-rules.md workflows
→ Apply response-formats.md templates
→ Reference budget-data.md merchant patterns

---

## File Modification Guidelines

**To update budget amounts:** Edit budget-data.md only  
**To change response templates:** Edit response-formats.md only  
**To modify Claude's behavior:** Edit behavior-rules.md only  
**To adjust safety protocols:** Edit safety-rules.md only

This modular approach ensures changes don't conflict and makes maintenance much easier.