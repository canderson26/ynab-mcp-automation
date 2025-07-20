import fetch from 'node-fetch';

export class YnabClient {
  constructor(apiKey, budgetId) {
    this.apiKey = apiKey;
    this.budgetId = budgetId;
    this.baseUrl = 'https://api.youneedabudget.com/v1';
    this.headers = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    };
    
    // Rate limiting: YNAB allows 200 requests per hour
    this.rateLimiter = {
      requests: [],
      maxRequests: 200,
      windowMs: 60 * 60 * 1000 // 1 hour
    };
  }

  // Check rate limit before making request
  checkRateLimit() {
    const now = Date.now();
    
    // Remove requests outside the current window
    this.rateLimiter.requests = this.rateLimiter.requests.filter(
      requestTime => now - requestTime < this.rateLimiter.windowMs
    );
    
    // Check if we're at the limit
    if (this.rateLimiter.requests.length >= this.rateLimiter.maxRequests) {
      const oldestRequest = Math.min(...this.rateLimiter.requests);
      const resetTime = oldestRequest + this.rateLimiter.windowMs;
      const waitTime = resetTime - now;
      throw new Error(`YNAB API rate limit exceeded. Reset in ${Math.ceil(waitTime / 1000)} seconds.`);
    }
    
    // Record this request
    this.rateLimiter.requests.push(now);
  }

  // Helper method for API requests with rate limiting and retries
  async request(method, endpoint, body = null, retryCount = 0) {
    try {
      // Check rate limit
      this.checkRateLimit();
      
      const url = `${this.baseUrl}${endpoint}`;
      const options = {
        method,
        headers: this.headers
      };

      if (body) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(url, options);
      
      // Handle rate limiting from YNAB
      if (response.status === 429) {
        const retryAfter = response.headers.get('retry-after') || 60;
        throw new Error(`YNAB API rate limited. Retry after ${retryAfter} seconds.`);
      }
      
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.detail || `YNAB API error: ${response.status} ${response.statusText}`);
      }

      return data.data;
      
    } catch (error) {
      console.error(`YNAB API error (attempt ${retryCount + 1}): ${error.message}`);
      
      // Retry on certain errors
      if (retryCount < 2 && (
        error.message.includes('rate limited') ||
        error.message.includes('timeout') ||
        error.message.includes('ECONNRESET')
      )) {
        const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
        console.log(`Retrying YNAB API call in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.request(method, endpoint, body, retryCount + 1);
      }
      
      throw error;
    }
  }

  // Get current month in YYYY-MM format
  getCurrentMonth() {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  // Get date X days ago in YYYY-MM-DD format
  getDateDaysAgo(days) {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString().split('T')[0];
  }

  // Transaction Management
  async getUnapprovedTransactions(sinceDays = 30) {
    const sinceDate = this.getDateDaysAgo(sinceDays);
    const endpoint = `/budgets/${this.budgetId}/transactions?since_date=${sinceDate}`;
    const data = await this.request('GET', endpoint);
    
    // Filter for unapproved transactions
    const unapproved = data.transactions.filter(t => !t.approved);
    
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

  async getTransaction(transactionId) {
    const endpoint = `/budgets/${this.budgetId}/transactions/${transactionId}`;
    const data = await this.request('GET', endpoint);
    return data.transaction;
  }

  async updateTransaction(transactionId, updates) {
    const endpoint = `/budgets/${this.budgetId}/transactions/${transactionId}`;
    const body = { transaction: updates };
    return await this.request('PUT', endpoint, body);
  }

  // Budget Operations
  async getReadyToAssign() {
    const month = this.getCurrentMonth();
    const endpoint = `/budgets/${this.budgetId}/months/${month}`;
    const data = await this.request('GET', endpoint);
    
    return {
      amount: data.month.to_be_budgeted / 1000, // Convert from milliunits
      formatted: `$${(data.month.to_be_budgeted / 1000).toFixed(2)}`
    };
  }

  async getCategories(month = null) {
    month = month || this.getCurrentMonth();
    const endpoint = `/budgets/${this.budgetId}/categories`;
    const data = await this.request('GET', endpoint);
    
    // Get current month data for balances
    const monthData = await this.request('GET', `/budgets/${this.budgetId}/months/${month}`);
    const categoryBalances = {};
    
    monthData.month.categories.forEach(cat => {
      categoryBalances[cat.id] = {
        budgeted: cat.budgeted / 1000,
        activity: cat.activity / 1000,
        balance: cat.balance / 1000
      };
    });
    
    // Organize categories by group
    return data.category_groups.map(group => ({
      name: group.name,
      hidden: group.hidden,
      categories: group.categories
        .filter(cat => !cat.hidden && !cat.deleted)
        .map(cat => ({
          id: cat.id,
          name: cat.name,
          ...categoryBalances[cat.id]
        }))
    }));
  }

  async getCategoryBalance(categoryId, month = null) {
    month = month || this.getCurrentMonth();
    const endpoint = `/budgets/${this.budgetId}/months/${month}/categories/${categoryId}`;
    const data = await this.request('GET', endpoint);
    
    return {
      name: data.category.name,
      budgeted: data.category.budgeted / 1000,
      activity: data.category.activity / 1000,
      balance: data.category.balance / 1000,
      goal_percentage_complete: data.category.goal_percentage_complete
    };
  }

  async getAllCategoryBalances(month = null) {
    month = month || this.getCurrentMonth();
    const endpoint = `/budgets/${this.budgetId}/months/${month}`;
    const data = await this.request('GET', endpoint);
    
    return data.month.categories
      .filter(cat => !cat.hidden && !cat.deleted)
      .map(cat => ({
        id: cat.id,
        name: cat.name,
        budgeted: cat.budgeted / 1000,
        activity: cat.activity / 1000,
        balance: cat.balance / 1000,
        goal_percentage_complete: cat.goal_percentage_complete
      }));
  }

  async assignFunds(categoryId, amount, month = null) {
    month = month || this.getCurrentMonth();
    const endpoint = `/budgets/${this.budgetId}/months/${month}/categories/${categoryId}`;
    
    // Get current budgeted amount
    const current = await this.request('GET', endpoint);
    const currentBudgeted = current.category.budgeted;
    
    // Add the new amount to current
    const newBudgeted = currentBudgeted + (amount * 1000); // Convert to milliunits
    
    const body = {
      category: {
        budgeted: newBudgeted
      }
    };
    
    const result = await this.request('PATCH', endpoint, body);
    
    return {
      name: result.category.name,
      previous_budgeted: currentBudgeted / 1000,
      new_budgeted: result.category.budgeted / 1000,
      assigned: amount,
      balance: result.category.balance / 1000
    };
  }

  async moveFunds(fromCategoryId, toCategoryId, amount, month = null) {
    month = month || this.getCurrentMonth();
    
    // Remove from source category
    await this.assignFunds(fromCategoryId, -amount, month);
    
    // Add to destination category  
    const result = await this.assignFunds(toCategoryId, amount, month);
    
    return {
      moved: amount,
      from: fromCategoryId,
      to: toCategoryId,
      ...result
    };
  }

  // Historical Data
  async getRecentTransactions(type = 'all', daysBack = 7) {
    const sinceDate = this.getDateDaysAgo(daysBack);
    const endpoint = `/budgets/${this.budgetId}/transactions?since_date=${sinceDate}`;
    const data = await this.request('GET', endpoint);
    
    let transactions = data.transactions;
    
    // Filter by type
    if (type === 'inflow') {
      transactions = transactions.filter(t => t.amount > 0);
    } else if (type === 'outflow') {
      transactions = transactions.filter(t => t.amount < 0);
    }
    
    return transactions.map(t => ({
      id: t.id,
      date: t.date,
      amount: t.amount / 1000,
      payee_name: t.payee_name,
      category_name: t.category_name,
      account_name: t.account_name,
      memo: t.memo,
      cleared: t.cleared,
      approved: t.approved
    }));
  }

  async getCategorySpending(categoryId, monthsBack = 3) {
    const spending = [];
    const today = new Date();
    
    for (let i = 0; i < monthsBack; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      try {
        const data = await this.getCategoryBalance(categoryId, month);
        spending.push({
          month,
          activity: Math.abs(data.activity), // Activity is negative for spending
          budgeted: data.budgeted
        });
      } catch (error) {
        // Month might not exist yet
        console.error(`No data for ${month}:`, error.message);
      }
    }
    
    return {
      category_id: categoryId,
      months: spending,
      average_spending: spending.reduce((sum, m) => sum + m.activity, 0) / spending.length
    };
  }

  async getTransactionsByPayee(payeeName, daysBack = 90) {
    const sinceDate = this.getDateDaysAgo(daysBack);
    const endpoint = `/budgets/${this.budgetId}/transactions?since_date=${sinceDate}`;
    const data = await this.request('GET', endpoint);
    
    // Filter by payee name (case insensitive)
    const transactions = data.transactions.filter(t => 
      t.payee_name && t.payee_name.toLowerCase().includes(payeeName.toLowerCase())
    );
    
    return {
      payee: payeeName,
      count: transactions.length,
      transactions: transactions.map(t => ({
        id: t.id,
        date: t.date,
        amount: t.amount / 1000,
        payee_name: t.payee_name,
        category_name: t.category_name,
        memo: t.memo,
        approved: t.approved
      }))
    };
  }

  // Health check
  async checkHealth() {
    try {
      // Test YNAB API connectivity by getting budget info
      const endpoint = `/budgets/${this.budgetId}`;
      const data = await this.request('GET', endpoint);
      
      return {
        status: 'healthy',
        ynab_api: 'connected',
        budget_id: this.budgetId,
        budget_name: data.budget.name,
        last_modified: data.budget.last_modified_on,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}