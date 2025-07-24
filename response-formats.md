# Response Formatting Standards

This file contains all templates and formatting rules for UI responses.

## Interactive Budget Session Phrases
When doing budget sessions, I should understand these natural language requests:

- "Fund the bills" → Fund all upcoming bills based on due dates
- "Top up groceries" → Bring groceries to target amount
- "How much for savings?" → Calculate percentage-based savings
- "What's left?" → Show ready to assign after planned allocations
- "Fill essentials" → Fund all essential categories to targets
- "Check bill status" → Show which bills are funded/unfunded
- "Emergency fund status" → Show current balance and goal progress

## Budget Category Display Format Requirements
When asked for ANY budget or category information including "spending analysis", "budget analysis", "category balances", "check balances", "budget status", "category status", or similar requests, ALWAYS provide detailed category-by-category breakdown in this exact format for UI card rendering:

**CRITICAL: Budget Status Classification Rules:**
- **🚨 Over Budget** = Categories with NEGATIVE balances (need immediate money moved to them)
- **ℹ️ Covered Overspending** = Categories that were overspent but now have POSITIVE balances (money was moved to cover)
- **✅ Under Budget** = Categories with remaining funds that weren't fully spent

**Required Format:**
```
## 🚨 Over Budget Categories (NEGATIVE BALANCE):
• **[Category Name]**: balance -$[current_balance] (spent $[spent] vs budgeted $[budgeted]) - [%] over

## ℹ️ Covered Overspending (POSITIVE BALANCE):
• **[Category Name]**: balance $[current_balance] (spent $[spent] vs budgeted $[budgeted]) - [%] over budget but covered

## ✅ Under Budget Categories:
• **[Category Name]**: balance $[current_balance] (spent $[spent] vs budgeted $[budgeted]) - [%] under

## Key Insights
• [Insight with specific amounts and percentages]

## Recommendations  
1. [Numbered recommendations with specific actions]
```

**CRITICAL:** Always include the current category balance using "balance $X" format. This shows whether the category actually needs money (negative balance) or has been covered (positive balance).

**Example Response:**
```
Based on your budget data, here's your spending analysis for this month:

## 🚨 Over Budget Categories (NEGATIVE BALANCE)
• **Gas & Transportation**: balance -$67.87 (spent $349.31 vs budgeted $281.44) - 24% over

## ℹ️ Covered Overspending (POSITIVE BALANCE)
• **Dog Food**: balance $15.24 (spent $289.24 vs budgeted $80) - 262% over budget but covered
• **Fun Money**: balance $4.32 (spent $1070.45 vs budgeted $974.77) - 10% over budget but covered

## ✅ Under Budget Categories  
• **Groceries**: balance $171.37 (spent $1028.63 vs budgeted $1200) - 14% under
• **Utilities**: balance $94.00 (spent $126 vs budgeted $220) - 43% under

## Key Insights
• Gas & Transportation needs immediate attention (balance -$67.87)
• Dog Food was heavily overspent but has been covered by money moves (balance +$15.24)
• Strong performance on Groceries (balance +$171.37)

## Recommendations
1. Move $67.87 from under-budget categories to cover Gas & Transportation deficit
2. Review Dog Food spending patterns - significantly over normal but already handled
```

**ABSOLUTELY CRITICAL:** ALWAYS include "spent $X vs budgeted $Y" format for EVERY category in ANY budget/category response to enable visual budget cards in the UI. This applies to ALL budget-related requests regardless of exact wording - "check balances", "category status", "budget overview", etc. NEVER give simplified responses without the "vs budgeted" pattern when showing category information.

## Monthly Target Amounts Format Requirements
When asked for "target amounts", "monthly targets", "target budgets" or similar requests, ALWAYS use this exact format for UI card rendering:

**Required Format:**
```
Based on your CLAUDE.md targets, here are your monthly budget targets:

## Essential Bills
- Groceries: $1,200
- Utilities: $220
- Daycare: $1,940
- Car Insurance: $183.83

## Personal Care
- Haircut: $99.98
- Gym: $85
- Supplements: $225.24

## Savings
- Emergency: $773.44
- Brokerage: $6,736.40

## Discretionary
- Fun Money: $400
- Dining Out: $140
- Vacation: $1,000

Total monthly targets: $16,904.22 (matches your income exactly)
```

**CRITICAL Requirements:**
- Use `## Section Name` headers (exactly 2 hash marks)
- Use `- Category: $amount` format (dash, space, category name, colon, space, dollar sign, amount)
- NO extra information in parentheses like "(quarterly $324 ÷ 3)"
- NO bold formatting on category names
- Group logically by Essential Bills, Personal Care, Savings, Discretionary
- Always include total at the end

This format ensures the UI displays clean cards with just category names and amounts.

## Comprehensive Response Formatting Standards
ALL responses must follow these exact formats based on response type for optimal UI display:

**🚨 UNIVERSAL BUDGET CARD RULE:** ANY request about budget categories, balances, or spending MUST include "spent $X vs budgeted $Y" pattern for EVERY category mentioned. This enables budget card rendering in the UI. NEVER give simplified category responses without this pattern.

## Affordability Questions Format
When asked "Can I afford X?" or similar affordability questions, use this EXACT format:

```
Based on your budget, **[YES/NO], you [can/cannot] afford $X/month for [item]**. Here's why:

## Current Situation
- Current [item] payment: $X/month ([category] category)
- Your [relevant category] target: $X/month
- Total monthly income: $16,904.22

## Analysis
- Net increase needed: $X/month ($X - $X current)
- This would require reducing: [specific category] by $X/month
- Impact on savings rate: [current]% → [new]% (change of X%)

## The Problem
- [Specific issue with the affordability]
- [Impact on other categories or goals]

## Recommendation
[Specific advice with dollar amounts]

## Summary
[One sentence conclusion with specific recommendation]
```

## Transaction Categorization Format
When categorizing transactions, use this EXACT format:

```
You have **X transactions** that need approval:

## Ready to Auto-Approve (X transactions)
- **$X.XX** - [Merchant] → [Category] ✓ [reason]
- **$X.XX** - [Merchant] → [Category] ✓ [reason]

## Need Manual Review (X transactions)
- **$X.XX** - [Merchant] → [suggested category] [reason for review]

## Recommendations
1. Auto-approve the ready transactions above
2. Review and categorize the manual review items
3. [Any specific guidance]
```

## Account Balance Questions Format
When asked about balances or available funds:

```
Based on your current budget:

## Available Funds
- Ready to Assign: $X.XX
- [Category]: $X.XX remaining
- [Category]: $X.XX remaining

## Allocated but Available
- [Category]: $X.XX (could be reallocated if needed)

## Summary
You have **$X.XX** immediately available, with **$X.XX** in flexible categories.
```

## General Financial Advice Format
For all other financial advice, use this structure:

```
Brief direct answer to the question.

## Current Situation
- [Relevant financial facts with specific amounts]
- [Key context about their budget/goals]

## Analysis
- [Breakdown of the situation]
- [Specific calculations or comparisons]

## Recommendation
1. [Specific actionable item with amounts]
2. [Another specific recommendation]
3. [Timeline or next steps]

## Summary
[Clear conclusion with specific advice]
```

## Universal Formatting Rules
- Use `## Section Name` for all sections (exactly 2 hash marks, space, title)
- Use `- ` for bullet points (dash + space)
- Use `1. ` for numbered recommendations
- Bold all dollar amounts: `**$1,200/month**`
- Bold YES/NO answers: `**YES**` or `**NO**`
- Always include specific dollar amounts, never vague terms
- No walls of text - always break into sections
- Keep sections focused and scannable