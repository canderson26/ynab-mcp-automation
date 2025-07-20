import fetch from 'node-fetch';

export class TelegramClient {
  constructor(botToken, defaultChatId) {
    this.botToken = botToken;
    this.defaultChatId = defaultChatId;
    this.baseUrl = `https://api.telegram.org/bot${botToken}`;
  }

  // Helper method for Telegram API requests
  async request(method, params = {}) {
    if (!this.botToken) {
      throw new Error('Telegram bot token not configured');
    }

    const url = `${this.baseUrl}/${method}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params)
    });

    const data = await response.json();
    
    if (!data.ok) {
      throw new Error(`Telegram API error: ${data.description || 'Unknown error'}`);
    }

    return data.result;
  }

  // Send a simple message
  async sendMessage(text, parseMode = 'Markdown', chatId = null) {
    const targetChatId = chatId || this.defaultChatId;
    
    if (!targetChatId) {
      throw new Error('No chat ID provided and no default chat ID configured');
    }

    return await this.request('sendMessage', {
      chat_id: targetChatId,
      text: text,
      parse_mode: parseMode,
      disable_web_page_preview: true
    });
  }

  // Send formatted daily categorization summary
  async sendDailySummary(stats, transactions, date = null) {
    const processDate = date || new Date().toISOString().split('T')[0];
    
    // Build summary message
    let message = `📊 *Daily YNAB Summary* - ${processDate}\n\n`;
    
    // Statistics
    message += `*Statistics:*\n`;
    message += `• Processed: ${stats.processed} transactions\n`;
    message += `• Auto-approved: ${stats.approved} ✅\n`;
    message += `• Need review: ${stats.pending} ⏳\n`;
    if (stats.errors > 0) {
      message += `• Errors: ${stats.errors} ❌\n`;
    }
    message += '\n';

    // Auto-approved transactions
    const approvedTxs = transactions.filter(tx => tx.approved);
    if (approvedTxs.length > 0) {
      message += `*Auto-Approved (${approvedTxs.length}):*\n`;
      approvedTxs.slice(0, 5).forEach(tx => {
        const amount = Math.abs(tx.amount).toFixed(2);
        message += `• ${tx.payee}: $${amount} → ${tx.category}\n`;
      });
      if (approvedTxs.length > 5) {
        message += `• ... and ${approvedTxs.length - 5} more\n`;
      }
      message += '\n';
    }

    // Pending review transactions
    const pendingTxs = transactions.filter(tx => !tx.approved);
    if (pendingTxs.length > 0) {
      message += `*Need Review (${pendingTxs.length}):*\n`;
      pendingTxs.slice(0, 3).forEach(tx => {
        const amount = Math.abs(tx.amount).toFixed(2);
        const confidence = tx.confidence || 0;
        message += `• ${tx.payee}: $${amount} → ${tx.category} (${confidence}%)\n`;
      });
      if (pendingTxs.length > 3) {
        message += `• ... and ${pendingTxs.length - 3} more\n`;
      }
    }

    return await this.sendMessage(message);
  }

  // Send security alert
  async sendSecurityAlert(alertType, details, severity = 'medium') {
    const severityEmojis = {
      low: '🔵',
      medium: '🟡', 
      high: '🟠',
      critical: '🔴'
    };

    const typeEmojis = {
      ssh_login: '🔑',
      api_limit: '⚠️',
      failed_auth: '🚫',
      intrusion: '🚨'
    };

    const emoji = severityEmojis[severity] || '🟡';
    const typeEmoji = typeEmojis[alertType] || '⚠️';

    let message = `${emoji} *Security Alert* ${typeEmoji}\n\n`;
    message += `*Type:* ${alertType.replace('_', ' ').toUpperCase()}\n`;
    message += `*Severity:* ${severity.toUpperCase()}\n`;
    message += `*Details:* ${details}\n`;
    message += `*Time:* ${new Date().toISOString()}`;

    return await this.sendMessage(message);
  }

  // Send budget alert
  async sendBudgetAlert(category, percentageUsed, amount = null, budget = null) {
    let emoji = '💰';
    if (percentageUsed >= 100) emoji = '🚨';
    else if (percentageUsed >= 90) emoji = '⚠️';
    else if (percentageUsed >= 80) emoji = '🟡';

    let message = `${emoji} *Budget Alert*\n\n`;
    message += `*Category:* ${category}\n`;
    message += `*Usage:* ${percentageUsed.toFixed(1)}%\n`;
    
    if (amount && budget) {
      message += `*Spent:* $${amount.toFixed(2)} of $${budget.toFixed(2)}\n`;
    }
    
    if (percentageUsed >= 100) {
      message += `\n⚠️ Budget exceeded! Consider adjusting spending or moving funds.`;
    } else if (percentageUsed >= 90) {
      message += `\n⚠️ Close to budget limit. Monitor spending carefully.`;
    }

    return await this.sendMessage(message);
  }

  // Send paycheck detection alert
  async sendPaycheckAlert(amount, source, readyToAssign = null) {
    let message = `💰 *Paycheck Detected*\n\n`;
    message += `*Source:* ${source}\n`;
    message += `*Amount:* $${Math.abs(amount).toFixed(2)}\n`;
    
    if (readyToAssign) {
      message += `*Ready to Assign:* $${readyToAssign.toFixed(2)}\n`;
    }
    
    message += `\n✨ Ready for a budget session? Just say "Let's do a budget session" to get started!`;

    return await this.sendMessage(message);
  }

  // Send API usage alert
  async sendApiUsageAlert(service, usage, timeframe) {
    const percentage = (usage.current / usage.limit * 100).toFixed(1);
    
    let emoji = '📊';
    if (percentage >= 90) emoji = '🚨';
    else if (percentage >= 80) emoji = '⚠️';
    else if (percentage >= 70) emoji = '🟡';

    let message = `${emoji} *API Usage Alert*\n\n`;
    message += `*Service:* ${service.toUpperCase()}\n`;
    message += `*Usage:* ${usage.current}/${usage.limit} (${percentage}%)\n`;
    message += `*Timeframe:* ${timeframe}\n`;

    if (percentage >= 90) {
      message += `\n⚠️ Approaching limit! Consider reducing usage or increasing limits.`;
    }

    return await this.sendMessage(message);
  }

  // Get recent messages from chat
  async getLastMessages(limit = 10) {
    if (!this.defaultChatId) {
      throw new Error('No default chat ID configured');
    }

    const updates = await this.request('getUpdates', {
      limit: limit,
      offset: -limit
    });

    return updates
      .filter(update => update.message && update.message.chat.id.toString() === this.defaultChatId)
      .map(update => ({
        message_id: update.message.message_id,
        text: update.message.text,
        date: update.message.date,
        from: update.message.from
      }));
  }

  // Check bot health
  async checkHealth() {
    try {
      const me = await this.request('getMe');
      
      // Test sending a message if chat ID is configured
      let chatTest = null;
      if (this.defaultChatId) {
        try {
          chatTest = await this.sendMessage('🤖 Health check - YNAB MCP Bot is online');
        } catch (error) {
          chatTest = { error: error.message };
        }
      }

      return {
        status: 'healthy',
        bot_info: {
          id: me.id,
          username: me.username,
          first_name: me.first_name
        },
        chat_id_configured: !!this.defaultChatId,
        chat_test: chatTest,
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

  // Format message with common patterns
  formatCurrency(amount) {
    return `$${Math.abs(amount).toFixed(2)}`;
  }

  formatPercentage(value) {
    return `${value.toFixed(1)}%`;
  }

  formatDate(date) {
    if (typeof date === 'string') {
      date = new Date(date);
    }
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short', 
      day: 'numeric'
    });
  }

  // Escape markdown characters
  escapeMarkdown(text) {
    return text.replace(/[_*[\]()~`>#+-=|{}.!]/g, '\\$&');
  }
}