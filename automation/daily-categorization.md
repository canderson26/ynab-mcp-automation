# Daily Transaction Categorization

This automation runs daily to categorize unapproved YNAB transactions using merchant history and AI.

## Workflow Overview

1. **Fetch Unapproved Transactions**: Get all transactions that need categorization
2. **Check Merchant History**: Look up each merchant in the learning database
3. **AI Categorization**: Use Claude to categorize unknown or low-confidence merchants
4. **Auto-Approval**: Approve high-confidence categorizations automatically
5. **Update Database**: Record all decisions for future learning
6. **Send Summary**: Notify via Telegram with results

## MCP Tools Used

- `ynab-server`: getUnapprovedTransactions, updateTransaction
- `merchant-server`: getMerchantHistory, recordCategorization
- `telegram-server`: sendDailySummary (when implemented)

## Main Process

```
For each unapproved transaction:
  1. Check merchant history
     - If confidence > 90%: Use historical category
     - If confidence 75-90%: Use historical but flag for review
     - If confidence < 75%: Send to Claude for categorization
  
  2. Claude categorization prompt includes:
     - Transaction details (payee, amount, date)
     - Merchant history if available
     - Valid categories from CLAUDE.md
     - Special rules (income → Ready to assign)
  
  3. Apply categorization:
     - Update transaction with suggested category
     - Auto-approve if confidence > 75%
     - Record in merchant database
  
  4. Track results:
     - Count of auto-approved
     - Count of categorized but not approved
     - List of low-confidence requiring review
```

## Claude Prompt Template

I need to categorize this YNAB transaction:

**Transaction Details:**
- Payee: {payee_name}
- Amount: ${amount}
- Date: {date}
- Account: {account_name}
- Memo: {memo}
- Current Category: {current_category or "Uncategorized"}

**Merchant History:**
{if has_history}
This merchant has been categorized before:
- Most common: {most_likely_category} ({usage_count} times, {confidence}% confidence)
- Recent categories: {recent_list}
{else}
This is a new merchant with no history.
{/if}

**Instructions:**
1. Analyze the transaction and suggest the most appropriate category
2. Consider the payee name, amount, and any merchant history
3. For income (positive amounts), especially from known employers, use "Ready to assign"
4. Provide a confidence score (0-100) for your categorization
5. Briefly explain your reasoning

**Valid Categories:**
[List from CLAUDE.md]

Please respond with:
- Suggested category: [exact category name]
- Confidence: [0-100]
- Reasoning: [brief explanation]

## Auto-Approval Logic

```python
def should_auto_approve(confidence, merchant_history):
    # Always auto-approve income to Ready to assign
    if amount > 0 and category == "Ready to assign":
        return True
    
    # High confidence from AI or history
    if confidence >= 75:
        return True
    
    # Known merchant with good track record
    if merchant_history and merchant_history.success_count > 5:
        if merchant_history.confidence_score >= 80:
            return True
    
    # Everything else needs manual review
    return False
```

## Summary Format

Daily Categorization Summary for {date}

📊 **Statistics:**
- Transactions processed: {total}
- Auto-approved: {approved} ✅
- Needs review: {pending} ⏳
- New merchants: {new}

💡 **High Confidence:**
{list of auto-approved with amounts}

⚠️ **Need Your Review:**
{list of pending with suggested categories}

📈 **Learning Progress:**
- Total known merchants: {merchant_count}
- Average confidence: {avg_confidence}%
- This week's accuracy: {accuracy}%

## Error Handling

- If YNAB API fails: Retry 3x with exponential backoff
- If merchant DB fails: Continue but log error
- If Claude fails: Mark transaction for manual review
- If Telegram fails: Log summary locally

## Schedule

Run daily at 10:00 AM local time (after most overnight transactions post)

Alternative: Run after detecting new transactions via webhook (future enhancement)