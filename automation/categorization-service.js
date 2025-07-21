#!/usr/bin/env node

/**
 * YNAB Categorization Service
 * A standalone service that handles daily transaction categorization
 * without MCP overhead, designed for production automation
 */

import { readFileSync, writeFileSync, existsSync, appendFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import Database from 'better-sqlite3';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env') });

// Configuration
const CONFIG = {
  claudeApiKey: process.env.CLAUDE_API_KEY,
  ynabApiKey: process.env.YNAB_API_KEY,
  ynabBudgetId: process.env.YNAB_BUDGET_ID,
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
  telegramChatId: process.env.TELEGRAM_CHAT_ID,
  logFile: '/opt/ynab-mcp/logs/categorization-service.log',
  usageFile: '/opt/ynab-mcp/data/api-usage.json',
  merchantDbPath: '/opt/ynab-mcp-automation/data/merchant_data.db',
  maxRetries: 3,
  retryDelay: 5000,
};

// API Limits (no longer restrictive)
const LIMITS = {
  claude: {
    daily: 999999,
    monthly: 999999,
    cost_limit: 999999
  },
  ynab: {
    daily: 999999,
    monthly: 999999
  }
};

// Logging utility
function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}`;
  console.log(logMessage);
  
  if (process.env.NODE_ENV === 'production' && CONFIG.logFile) {
    try {
      appendFileSync(CONFIG.logFile, logMessage + '\n');
    } catch (error) {
      console.error('Failed to write to log file:', error.message);
    }
  }
}

// API Usage Tracking
class ApiLimiter {
  constructor() {
    this.usageFile = CONFIG.usageFile;
  }

  loadUsage() {
    if (!existsSync(this.usageFile)) {
      return {
        claude: { daily: 0, monthly: 0, cost_estimate: 0, last_reset: new Date().toISOString() },
        ynab: { daily: 0, monthly: 0, last_reset: new Date().toISOString() }
      };
    }
    
    try {
      return JSON.parse(readFileSync(this.usageFile, 'utf8'));
    } catch {
      return this.loadUsage(); // Return default if corrupted
    }
  }

  saveUsage(usage) {
    try {
      writeFileSync(this.usageFile, JSON.stringify(usage, null, 2));
    } catch (error) {
      log(`Failed to save usage data: ${error.message}`, 'ERROR');
    }
  }

  resetCountersIfNeeded(usage) {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    for (const service of ['claude', 'ynab']) {
      const lastReset = new Date(usage[service].last_reset);
      const lastResetDate = lastReset.toISOString().split('T')[0];
      
      // Reset daily counter if it's a new day
      if (today !== lastResetDate) {
        usage[service].daily = 0;
      }
      
      // Reset monthly counter if it's a new month
      if (now.getMonth() !== lastReset.getMonth() || now.getYear() !== lastReset.getYear()) {
        usage[service].monthly = 0;
        if (service === 'claude') {
          usage[service].cost_estimate = 0;
        }
      }
      
      usage[service].last_reset = now.toISOString();
    }
    
    return usage;
  }

  checkLimit(service) {
    const usage = this.resetCountersIfNeeded(this.loadUsage());
    const limits = LIMITS[service];
    
    if (!limits) {
      log(`Unknown service: ${service}`, 'WARN');
      return false;
    }
    
    // Check limits (now effectively unlimited)
    if (usage[service].daily >= limits.daily) {
      log(`Daily limit exceeded for ${service}: ${usage[service].daily}/${limits.daily}`, 'WARN');
      return false;
    }
    
    if (usage[service].monthly >= limits.monthly) {
      log(`Monthly limit exceeded for ${service}: ${usage[service].monthly}/${limits.monthly}`, 'WARN');
      return false;
    }
    
    if (service === 'claude' && usage[service].cost_estimate >= limits.cost_limit) {
      log(`Cost limit exceeded for Claude: $${usage[service].cost_estimate}/$${limits.cost_limit}`, 'WARN');
      return false;
    }
    
    return true;
  }

  recordUsage(service, cost = 0) {
    const usage = this.resetCountersIfNeeded(this.loadUsage());
    
    usage[service].daily++;
    usage[service].monthly++;
    
    if (service === 'claude') {
      usage[service].cost_estimate += cost;
    }
    
    this.saveUsage(usage);
    log(`${service} usage updated: daily=${usage[service].daily}, monthly=${usage[service].monthly}`);
  }
}

// YNAB API Client
class YnabClient {
  constructor(apiKey, budgetId) {
    this.apiKey = apiKey;
    this.budgetId = budgetId;
    this.baseUrl = 'https://api.ynab.com/v1';
    this.limiter = new ApiLimiter();
  }

  async makeRequest(endpoint, options = {}) {
    if (!this.limiter.checkLimit('ynab')) {
      throw new Error('YNAB API limit exceeded');
    }

    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    this.limiter.recordUsage('ynab');

    if (!response.ok) {
      throw new Error(`YNAB API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getUnapprovedTransactions(sinceDays = 7) {
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - sinceDays);
    const since = sinceDate.toISOString().split('T')[0];

    const data = await this.makeRequest(`/budgets/${this.budgetId}/transactions?since_date=${since}`);
    
    const unapproved = data.data.transactions.filter(t => !t.approved && !t.deleted);
    
    return {
      count: unapproved.length,
      transactions: unapproved.map(t => ({
        id: t.id,
        date: t.date,
        amount: t.amount / 1000, // Convert from milliunits
        payee_name: t.payee_name,
        category_name: t.category_name,
        category_id: t.category_id,
        account_name: t.account_name,
        memo: t.memo,
        cleared: t.cleared,
        approved: t.approved
      }))
    };
  }

  async getCategories() {
    const data = await this.makeRequest(`/budgets/${this.budgetId}/categories`);
    return data.data.category_groups.flatMap(group => 
      group.categories.map(cat => ({
        id: cat.id,
        name: cat.name,
        category_group_name: group.name
      }))
    );
  }

  async updateTransaction(transactionId, categoryId = null, memo = null, approved = false) {
    const updateData = {
      transaction: {}
    };

    if (categoryId !== null) updateData.transaction.category_id = categoryId;
    if (memo !== null) updateData.transaction.memo = memo;
    if (approved !== false) updateData.transaction.approved = approved;

    const data = await this.makeRequest(
      `/budgets/${this.budgetId}/transactions/${transactionId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(updateData)
      }
    );

    return data.data.transaction;
  }
}

// Merchant Database Manager
class MerchantManager {
  constructor(dbPath) {
    this.db = new Database(dbPath);
    this.initializeDb();
  }

  initializeDb() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS merchant_categorizations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        merchant_name TEXT NOT NULL,
        category_name TEXT NOT NULL,
        category_id TEXT,
        confidence REAL DEFAULT 0,
        auto_approved BOOLEAN DEFAULT FALSE,
        transaction_id TEXT,
        amount REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  getMerchantHistory(merchantName) {
    const results = this.db.prepare(`
      SELECT category_name, category_id, AVG(confidence) as avg_confidence, COUNT(*) as count
      FROM merchant_categorizations 
      WHERE merchant_name = ? 
      GROUP BY category_name, category_id
      ORDER BY count DESC, avg_confidence DESC
    `).all(merchantName);

    if (results.length === 0) {
      return {
        message: `No history found for merchant: ${merchantName}`,
        merchant_name: merchantName,
        isNew: true
      };
    }

    return {
      merchant_name: merchantName,
      history: results,
      isNew: false
    };
  }

  recordCategorization(merchantName, categoryName, categoryId, confidence, autoApproved, transactionId, amount) {
    // Ensure null values instead of undefined for SQLite compatibility
    const safeValues = [
      merchantName || null,
      categoryName || null, 
      categoryId || null,
      confidence || 0,
      autoApproved || false,
      transactionId || null,
      amount || 0
    ];
    
    const result = this.db.prepare(`
      INSERT INTO merchant_categorizations 
      (merchant_name, category_name, category_id, confidence, auto_approved, transaction_id, amount)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(...safeValues);

    return {
      merchant_id: result.lastInsertRowid,
      success: true
    };
  }

  close() {
    this.db.close();
  }
}

// Claude API Client
class ClaudeClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.limiter = new ApiLimiter();
  }

  async categorizeTransaction(merchantName, amount, categories, merchantHistory = null) {
    if (!this.limiter.checkLimit('claude')) {
      throw new Error('Claude API daily limit exceeded');
    }

    // Load categorization rules
    const rulesPath = join(__dirname, 'CLAUDE.md');
    let rules = '';
    try {
      rules = readFileSync(rulesPath, 'utf8');
    } catch (error) {
      log(`Could not load CLAUDE.md rules: ${error.message}`, 'WARN');
    }

    const prompt = `${rules}

Available categories: ${categories.map(c => c.name).join(', ')}

Merchant: ${merchantName}
Amount: $${Math.abs(amount)}

${merchantHistory && !merchantHistory.isNew ? 
  `Historical categorizations for this merchant:
${merchantHistory.history.map(h => `- ${h.category_name}: ${h.count} times (${(h.avg_confidence * 100).toFixed(0)}% confidence)`).join('\n')}` 
  : 'This is a new merchant with no history.'}

Respond with ONLY a JSON object in this exact format:
{
  "category": "exact category name from the list",
  "confidence": 0.95,
  "reasoning": "brief explanation"
}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: prompt
        }]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Claude API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    this.limiter.recordUsage('claude', 0.003); // Estimate cost

    if (!data.content || !data.content[0] || !data.content[0].text) {
      throw new Error('Invalid response format from Claude API');
    }

    // Parse Claude's response
    try {
      const result = JSON.parse(data.content[0].text);
      return {
        category: result.category,
        confidence: result.confidence || 0,
        reasoning: result.reasoning || '',
        source: 'claude'
      };
    } catch (error) {
      log(`Failed to parse Claude response: ${data.content[0].text}`, 'ERROR');
      throw new Error('Failed to parse Claude response');
    }
  }
}

// Telegram Client
class TelegramClient {
  constructor(botToken, chatId) {
    this.botToken = botToken;
    this.chatId = chatId;
  }

  async sendDailySummary(stats, transactions, date) {
    if (!this.botToken || !this.chatId) {
      log('Telegram not configured, skipping summary', 'WARN');
      return;
    }

    const summary = `📊 Daily YNAB Summary - ${date}

Statistics:
• Processed: ${stats.processed} transactions
• Auto-approved: ${stats.approved} ✅
• Need review: ${stats.pending} ⏳

${stats.pending > 0 ? `Need Review (${stats.pending}):
${transactions.filter(t => !t.approved).slice(0, 3).map(t => 
  `• ${t.payee}: $${Math.abs(t.amount)} → ${t.category} (${(t.confidence * 100).toFixed(0)}%)`
).join('\n')}${transactions.filter(t => !t.approved).length > 3 ? `\n• ... and ${transactions.filter(t => !t.approved).length - 3} more` : ''}` : ''}`;

    const response = await fetch(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: this.chatId,
        text: summary,
        parse_mode: 'HTML'
      })
    });

    if (!response.ok) {
      throw new Error(`Telegram API error: ${response.status}`);
    }

    return response.json();
  }
}

// Main Categorization Service
class CategorizationService {
  constructor() {
    this.ynab = new YnabClient(CONFIG.ynabApiKey, CONFIG.ynabBudgetId);
    this.claude = new ClaudeClient(CONFIG.claudeApiKey);
    this.merchant = new MerchantManager(CONFIG.merchantDbPath);
    this.telegram = new TelegramClient(CONFIG.telegramBotToken, CONFIG.telegramChatId);
  }

  async categorizeTransaction(transaction, categories) {
    try {
      log(`Processing transaction: ${transaction.payee_name} ($${Math.abs(transaction.amount)})`);
      
      // Check merchant history
      log(`Checking history for merchant: ${transaction.payee_name}`);
      const merchantHistory = this.merchant.getMerchantHistory(transaction.payee_name);
      
      // Use historical data if confidence is high
      if (!merchantHistory.isNew && merchantHistory.history.length > 0) {
        const topCategory = merchantHistory.history[0];
        if (topCategory.avg_confidence >= 0.9 && topCategory.count >= 3) {
          log(`Using historical categorization for ${transaction.payee_name}: ${topCategory.category_name}`);
          return {
            category: topCategory.category_name,
            categoryId: topCategory.category_id,
            confidence: topCategory.avg_confidence,
            reasoning: `Historical categorization (${topCategory.count} times)`,
            source: 'history'
          };
        }
      }
      
      // Use Claude for categorization
      log(`Sending to Claude for categorization: ${transaction.payee_name}`);
      return await this.claude.categorizeTransaction(
        transaction.payee_name,
        transaction.amount,
        categories,
        merchantHistory
      );
      
    } catch (error) {
      log(`Error categorizing transaction ${transaction.id}: ${error.message}`, 'ERROR');
      
      // Fallback to default category
      const fallbackCategory = categories.find(c => 
        c.name.toLowerCase().includes('stuff i forgot') ||
        c.name.toLowerCase().includes('miscellaneous') ||
        c.name.toLowerCase().includes('other')
      ) || categories[0];
      
      return {
        category: fallbackCategory.name,
        categoryId: fallbackCategory.id,
        confidence: 0,
        reasoning: `Error during categorization: ${error.message}`,
        source: 'error'
      };
    }
  }

  async processDailyCategorization() {
    try {
      log('Starting daily transaction categorization');
      
      // Get categories
      const categories = await this.ynab.getCategories();
      log(`Loaded ${categories.length} categories`);
      
      // Get unapproved transactions
      log('Fetching unapproved transactions...');
      const result = await this.ynab.getUnapprovedTransactions(7);
      log(`Found ${result.count} unapproved transactions`);
      
      if (result.count === 0) {
        log('No transactions to process');
        return;
      }
      
      const stats = { processed: 0, approved: 0, pending: 0, errors: 0 };
      const processedTransactions = [];
      
      for (const transaction of result.transactions) {
        let categorization = null;
        let categoryId = null;
        let shouldAutoApprove = false;
        
        try {
          categorization = await this.categorizeTransaction(transaction, categories);
          
          // Find category ID
          const category = categories.find(c => c.name === categorization.category);
          categoryId = category ? category.id : null;
          
          // Auto-approve if confidence is high
          shouldAutoApprove = categorization.confidence >= 0.95 && categorization.source !== 'error';
          
          // Update transaction
          const memo = `[AI: ${categorization.category} (${(categorization.confidence * 100).toFixed(0)}%)]`;
          await this.ynab.updateTransaction(transaction.id, categoryId, memo, shouldAutoApprove);
          
          // Record in merchant database
          this.merchant.recordCategorization(
            transaction.payee_name,
            categorization.category,
            categoryId,
            categorization.confidence,
            shouldAutoApprove,
            transaction.id,
            transaction.amount
          );
          
          stats.processed++;
          if (shouldAutoApprove) {
            stats.approved++;
            log(`✅ ${transaction.payee_name} → ${categorization.category} (${(categorization.confidence * 100).toFixed(0)}%) APPROVED`);
          } else {
            stats.pending++;
            log(`✅ ${transaction.payee_name} → ${categorization.category} (${(categorization.confidence * 100).toFixed(0)}%) PENDING`);
          }
          
          processedTransactions.push({
            payee: transaction.payee_name,
            amount: transaction.amount,
            category: categorization.category,
            confidence: categorization.confidence,
            approved: shouldAutoApprove,
            reasoning: categorization.reasoning
          });
          
        } catch (error) {
          log(`Error processing transaction ${transaction.id}: ${error.message}`, 'ERROR');
          
          // Check if YNAB update succeeded despite merchant DB error
          if (error.message.includes('SQLite3') && categorization && categoryId !== null) {
            log(`YNAB update likely succeeded for ${transaction.payee_name}, counting as processed`, 'WARN');
            
            stats.processed++;
            if (shouldAutoApprove) {
              stats.approved++;
            } else {
              stats.pending++;
            }
            
            processedTransactions.push({
              payee: transaction.payee_name,
              amount: transaction.amount,
              category: categorization.category,
              confidence: categorization.confidence,
              approved: shouldAutoApprove,
              reasoning: categorization.reasoning + ' (merchant DB error)'
            });
          } else {
            stats.errors++;
          }
        }
      }
      
      log(`Categorization complete: ${stats.processed} processed, ${stats.approved} approved, ${stats.pending} pending, ${stats.errors} errors`);
      
      // Send Telegram summary
      try {
        await this.telegram.sendDailySummary(stats, processedTransactions, new Date().toISOString().split('T')[0]);
        log('Telegram summary sent successfully');
      } catch (error) {
        log(`Failed to send Telegram summary: ${error.message}`, 'ERROR');
      }
      
    } catch (error) {
      log(`Fatal error in daily categorization: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  close() {
    this.merchant.close();
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const service = new CategorizationService();
  
  service.processDailyCategorization()
    .then(() => {
      log('Daily categorization completed successfully');
      service.close();
      process.exit(0);
    })
    .catch((error) => {
      log(`Daily categorization failed: ${error.message}`, 'ERROR');
      service.close();
      process.exit(1);
    });
}

export { CategorizationService };