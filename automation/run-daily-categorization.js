#!/usr/bin/env node

/**
 * Daily Transaction Categorization Script
 * Runs on the VPS via cron to automatically categorize YNAB transactions
 */

import { spawn } from 'child_process';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Configuration
const CONFIG = {
  claudeApiKey: process.env.CLAUDE_API_KEY,
  logFile: '/opt/ynab-mcp/logs/daily-categorization.log',
  maxRetries: 3,
  retryDelay: 5000, // 5 seconds
};

// Logging utility
function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}`;
  console.log(logMessage);
  
  // In production, also write to log file
  if (process.env.NODE_ENV === 'production') {
    require('fs').appendFileSync(CONFIG.logFile, logMessage + '\n');
  }
}

// Call Claude API with our categorization prompt
async function callClaude(prompt) {
  // Check API limits first
  const { spawn } = await import('child_process');
  const checkLimit = spawn('node', ['/opt/ynab-mcp/api-limiter.js', 'check', 'claude']);
  
  await new Promise((resolve, reject) => {
    checkLimit.on('close', (code) => {
      if (code !== 0) {
        reject(new Error('Claude API daily limit exceeded'));
      } else {
        resolve();
      }
    });
  });

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': CONFIG.claudeApiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: prompt
      }]
    })
  });

  if (!response.ok) {
    throw new Error(`Claude API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  
  // Record API usage (estimate $0.02 per call)
  const recordUsage = spawn('node', ['/opt/ynab-mcp/api-limiter.js', 'record', 'claude', '0.02']);
  recordUsage.on('close', () => {}); // Fire and forget
  
  return data.content[0].text;
}

// Execute MCP tool via Docker
async function executeMCPTool(server, tool, args = {}) {
  return new Promise((resolve, reject) => {
    const dockerCmd = [
      'exec', '-i', 
      `ynab-mcp-${server}-server-1`,
      'node', 'index.js'
    ];

    const mcpInput = JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: {
        name: tool,
        arguments: args
      }
    });

    const child = spawn('docker', dockerCmd, {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        try {
          const response = JSON.parse(stdout);
          if (response.result) {
            resolve(JSON.parse(response.result.content[0].text));
          } else if (response.error) {
            reject(new Error(response.error.message));
          } else {
            resolve(response);
          }
        } catch (e) {
          log(`Parse error: ${e.message}, stdout: ${stdout}`, 'ERROR');
          reject(new Error(`Failed to parse MCP response: ${e.message}`));
        }
      } else {
        reject(new Error(`MCP call failed: ${stderr}`));
      }
    });

    // Send input and close stdin
    child.stdin.write(mcpInput + '\n');
    child.stdin.end();
  });
}

// Load categories from CLAUDE.md
function loadCategories() {
  try {
    const claudeFile = readFileSync(join(__dirname, 'CLAUDE.md'), 'utf8');
    
    // Extract categories section - this is a simple parser
    const categoryMatch = claudeFile.match(/categories:\s*\n([\s\S]*?)\n\n/);
    if (!categoryMatch) {
      throw new Error('Could not find categories in CLAUDE.md');
    }
    
    // Parse YAML-like format to get category names
    const categoryLines = categoryMatch[1].split('\n');
    const categories = [];
    
    for (const line of categoryLines) {
      const match = line.match(/^\s*"([^"]+)":/);
      if (match) {
        categories.push(match[1]);
      }
    }
    
    return categories;
  } catch (error) {
    log(`Error loading categories: ${error.message}`, 'ERROR');
    return []; // Return empty array as fallback
  }
}

// Create categorization prompt for Claude
function createCategorizationPrompt(transaction, merchantHistory, categories) {
  const historyText = merchantHistory && !merchantHistory.isNew 
    ? `This merchant has been categorized before:
- Most common: ${merchantHistory.most_likely_category?.category} (${merchantHistory.most_likely_category?.usage_count} times, ${Math.round(merchantHistory.most_likely_category?.confidence)}% confidence)
- Recent categories: ${merchantHistory.recent_history?.slice(0, 3).map(h => h.category_name).join(', ')}`
    : 'This is a new merchant with no history.';

  return `I need to categorize this YNAB transaction:

**Transaction Details:**
- Payee: ${transaction.payee_name}
- Amount: $${Math.abs(transaction.amount).toFixed(2)} ${transaction.amount > 0 ? '(Income)' : '(Expense)'}
- Date: ${transaction.date}
- Account: ${transaction.account_name}
- Memo: ${transaction.memo || 'None'}
- Current Category: ${transaction.category_name || 'Uncategorized'}

**Merchant History:**
${historyText}

**Instructions:**
1. Analyze the transaction and suggest the most appropriate category
2. For income (positive amounts), especially from known employers like Accenture or OrthoVA, use "Ready to assign"
3. Consider the payee name, amount, and any merchant history
4. Provide a confidence score (0-100) for your categorization
5. Briefly explain your reasoning

**Valid Categories:**
${categories.join(', ')}

Please respond in this exact format:
Category: [exact category name]
Confidence: [0-100]
Reasoning: [brief explanation]`;
}

// Parse Claude's response
function parseCategorization(response) {
  const categoryMatch = response.match(/Category:\s*(.+)/i);
  const confidenceMatch = response.match(/Confidence:\s*(\d+)/i);
  const reasoningMatch = response.match(/Reasoning:\s*(.+)/i);

  return {
    category: categoryMatch ? categoryMatch[1].trim() : null,
    confidence: confidenceMatch ? parseInt(confidenceMatch[1]) : 0,
    reasoning: reasoningMatch ? reasoningMatch[1].trim() : 'No reasoning provided'
  };
}

// Main categorization function
async function categorizeTransaction(transaction, categories) {
  try {
    // Get merchant history
    log(`Checking history for merchant: ${transaction.payee_name}`);
    const merchantHistory = await executeMCPTool('merchant', 'getMerchantHistory', {
      merchantName: transaction.payee_name
    });

    // Check if we have high confidence from history
    if (merchantHistory && !merchantHistory.isNew && 
        merchantHistory.most_likely_category?.confidence >= 90) {
      
      log(`Using high-confidence historical category: ${merchantHistory.most_likely_category.category} (${merchantHistory.most_likely_category.confidence}% confidence)`);
      
      return {
        category: merchantHistory.most_likely_category.category,
        confidence: merchantHistory.most_likely_category.confidence,
        reasoning: `Historical pattern (${merchantHistory.most_likely_category.usage_count} previous transactions)`,
        source: 'history'
      };
    }

    // Use Claude for categorization
    log(`Sending to Claude for categorization: ${transaction.payee_name}`);
    const prompt = createCategorizationPrompt(transaction, merchantHistory, categories);
    const claudeResponse = await callClaude(prompt);
    
    const categorization = parseCategorization(claudeResponse);
    
    if (!categorization.category) {
      throw new Error('Claude did not provide a category');
    }

    log(`Claude categorization: ${categorization.category} (${categorization.confidence}% confidence)`);
    
    return {
      ...categorization,
      source: 'claude'
    };

  } catch (error) {
    log(`Error categorizing transaction ${transaction.id}: ${error.message}`, 'ERROR');
    return {
      category: 'Stuff I Forgot to Budget For', // Fallback category
      confidence: 0,
      reasoning: `Error during categorization: ${error.message}`,
      source: 'error'
    };
  }
}

// Main execution function
async function runDailyCategorization() {
  log('Starting daily transaction categorization');

  try {
    // Load categories
    const categories = loadCategories();
    if (categories.length === 0) {
      throw new Error('No categories loaded from CLAUDE.md');
    }
    log(`Loaded ${categories.length} categories`);

    // Get unapproved transactions
    log('Fetching unapproved transactions...');
    const transactionData = await executeMCPTool('ynab', 'getUnapprovedTransactions', {
      sinceDays: 7 // Only look at last week
    });

    const transactions = transactionData.transactions || [];
    log(`Found ${transactions.length} unapproved transactions`);

    if (transactions.length === 0) {
      log('No transactions to process');
      return;
    }

    const results = {
      processed: 0,
      approved: 0,
      pending: 0,
      errors: 0,
      details: []
    };

    // Process each transaction
    for (const transaction of transactions) {
      try {
        log(`Processing transaction: ${transaction.payee_name} ($${Math.abs(transaction.amount).toFixed(2)})`);
        
        const categorization = await categorizeTransaction(transaction, categories);
        
        // Determine if we should auto-approve
        const shouldApprove = categorization.confidence >= 75 || 
                            (transaction.amount > 0 && categorization.category === 'Ready to assign');

        // Find category ID
        const categoryId = categories.includes(categorization.category) 
          ? await getCategoryId(categorization.category)
          : null;

        // Update transaction
        await executeMCPTool('ynab', 'updateTransaction', {
          transactionId: transaction.id,
          categoryId: categoryId,
          memo: transaction.memo ? 
            `${transaction.memo} [AI: ${categorization.confidence}%]` : 
            `[AI: ${categorization.category} (${categorization.confidence}%)]`,
          approved: shouldApprove
        });

        // Record in merchant database
        await executeMCPTool('merchant', 'recordCategorization', {
          merchantName: transaction.payee_name,
          categoryName: categorization.category,
          categoryId: categoryId,
          confidence: categorization.confidence,
          autoApproved: shouldApprove,
          transactionId: transaction.id,
          amount: transaction.amount
        });

        results.processed++;
        if (shouldApprove) {
          results.approved++;
        } else {
          results.pending++;
        }

        results.details.push({
          payee: transaction.payee_name,
          amount: transaction.amount,
          category: categorization.category,
          confidence: categorization.confidence,
          approved: shouldApprove,
          reasoning: categorization.reasoning
        });

        log(`✅ ${transaction.payee_name} → ${categorization.category} (${categorization.confidence}%) ${shouldApprove ? 'APPROVED' : 'PENDING'}`);

      } catch (error) {
        log(`❌ Error processing transaction ${transaction.id}: ${error.message}`, 'ERROR');
        results.errors++;
      }
    }

    log(`Categorization complete: ${results.processed} processed, ${results.approved} approved, ${results.pending} pending, ${results.errors} errors`);

    // Send Telegram summary
    try {
      await executeMCPTool('telegram', 'sendDailySummary', {
        stats: {
          processed: results.processed,
          approved: results.approved,
          pending: results.pending,
          errors: results.errors
        },
        transactions: results.details,
        date: new Date().toISOString().split('T')[0]
      });
      log('Telegram summary sent successfully');
    } catch (error) {
      log(`Failed to send Telegram summary: ${error.message}`, 'ERROR');
      // Don't fail the whole process if Telegram fails
    }

    return results;

  } catch (error) {
    log(`Fatal error in daily categorization: ${error.message}`, 'ERROR');
    throw error;
  }
}

// Helper function to get category ID (simplified)
async function getCategoryId(categoryName) {
  try {
    const categories = await executeMCPTool('ynab', 'getCategories');
    for (const group of categories) {
      for (const category of group.categories) {
        if (category.name === categoryName) {
          return category.id;
        }
      }
    }
    return null;
  } catch (error) {
    log(`Error getting category ID for ${categoryName}: ${error.message}`, 'ERROR');
    return null;
  }
}

// Run if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runDailyCategorization()
    .then(() => {
      log('Daily categorization completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      log(`Daily categorization failed: ${error.message}`, 'ERROR');
      process.exit(1);
    });
}

export { runDailyCategorization };