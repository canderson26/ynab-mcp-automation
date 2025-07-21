#!/usr/bin/env node

/**
 * Telegram MCP HTTP Server
 * Persistent HTTP-based MCP server for Telegram notifications
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { TelegramClient } from '../telegram-server/telegram-client.js';

// Load environment variables
dotenv.config({ path: '../../.env' });

const app = express();
const PORT = process.env.TELEGRAM_MCP_PORT || 3003;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Telegram client
const telegram = new TelegramClient(
  process.env.TELEGRAM_BOT_TOKEN,
  process.env.TELEGRAM_CHAT_ID
);

// MCP Server Info
const SERVER_INFO = {
  name: 'telegram-server',
  version: '1.0.0',
  capabilities: {
    tools: {}
  }
};

// Tool definitions
const TOOLS = [
  {
    name: 'sendMessage',
    description: 'Send a message to Telegram',
    inputSchema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          description: 'Message text to send'
        },
        parseMode: {
          type: 'string',
          enum: ['Markdown', 'HTML'],
          description: 'Message formatting mode',
          default: 'Markdown'
        },
        chatId: {
          type: 'string',
          description: 'Chat ID (optional, uses default if not provided)'
        }
      },
      required: ['message']
    }
  },
  {
    name: 'sendSecurityAlert',
    description: 'Send a security alert to Telegram',
    inputSchema: {
      type: 'object',
      properties: {
        alertType: {
          type: 'string',
          description: 'Type of security alert'
        },
        details: {
          type: 'string',
          description: 'Alert details'
        },
        severity: {
          type: 'string',
          enum: ['low', 'medium', 'high', 'critical'],
          description: 'Alert severity',
          default: 'medium'
        }
      },
      required: ['alertType', 'details']
    }
  },
  {
    name: 'sendDailySummary',
    description: 'Send daily categorization summary',
    inputSchema: {
      type: 'object',
      properties: {
        stats: {
          type: 'object',
          description: 'Categorization statistics'
        },
        transactions: {
          type: 'array',
          description: 'List of processed transactions'
        },
        date: {
          type: 'string',
          description: 'Date of the summary'
        }
      },
      required: ['stats', 'transactions', 'date']
    }
  },
  {
    name: 'sendBudgetAlert',
    description: 'Send budget-related alert',
    inputSchema: {
      type: 'object',
      properties: {
        alertType: {
          type: 'string',
          enum: ['overspent', 'low_balance', 'goal_reached', 'budget_warning'],
          description: 'Type of budget alert'
        },
        categoryName: {
          type: 'string',
          description: 'Budget category name'
        },
        amount: {
          type: 'number',
          description: 'Amount related to the alert'
        },
        details: {
          type: 'string',
          description: 'Additional details'
        }
      },
      required: ['alertType', 'categoryName']
    }
  }
];

// MCP JSON-RPC handler
async function handleMCPRequest(method, params) {
  try {
    switch (method) {
      case 'initialize':
        return {
          protocolVersion: '2024-11-05',
          capabilities: SERVER_INFO.capabilities,
          serverInfo: SERVER_INFO
        };
        
      case 'tools/list':
        return { tools: TOOLS };
        
      case 'tools/call':
        return await handleToolCall(params.name, params.arguments || {});
        
      default:
        throw new Error(`Unknown method: ${method}`);
    }
  } catch (error) {
    throw {
      code: -32603,
      message: error.message,
      data: error.stack
    };
  }
}

// Tool call handler
async function handleToolCall(toolName, args) {
  switch (toolName) {
    case 'sendMessage':
      const result = await telegram.sendMessage(
        args.message,
        args.parseMode || 'Markdown',
        args.chatId
      );
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }]
      };
      
    case 'sendSecurityAlert':
      const alertResult = await telegram.sendSecurityAlert(
        args.alertType,
        args.details,
        args.severity || 'medium'
      );
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(alertResult, null, 2)
        }]
      };
      
    case 'sendDailySummary':
      const summaryResult = await telegram.sendDailySummary(
        args.stats,
        args.transactions,
        args.date
      );
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(summaryResult, null, 2)
        }]
      };
      
    case 'sendBudgetAlert':
      const budgetResult = await telegram.sendBudgetAlert(
        args.alertType,
        args.categoryName,
        args.amount,
        args.details
      );
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(budgetResult, null, 2)
        }]
      };
      
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

// HTTP endpoints for MCP protocol
app.post('/mcp', async (req, res) => {
  try {
    const { jsonrpc, id, method, params } = req.body;
    
    if (jsonrpc !== '2.0') {
      return res.status(400).json({
        jsonrpc: '2.0',
        id: id || null,
        error: {
          code: -32600,
          message: 'Invalid Request'
        }
      });
    }
    
    const result = await handleMCPRequest(method, params || {});
    
    res.json({
      jsonrpc: '2.0',
      id: id || null,
      result
    });
    
  } catch (error) {
    res.json({
      jsonrpc: '2.0',
      id: req.body.id || null,
      error: error.code ? error : {
        code: -32603,
        message: error.message || 'Internal error'
      }
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    server: SERVER_INFO,
    timestamp: new Date().toISOString(),
    telegram_configured: !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID)
  });
});

// Server info endpoint
app.get('/info', (req, res) => {
  res.json({
    ...SERVER_INFO,
    tools: TOOLS,
    endpoints: {
      mcp: '/mcp',
      health: '/health',
      info: '/info'
    }
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Telegram MCP Server running on http://0.0.0.0:${PORT}`);
  console.log(`📋 Available endpoints:`);
  console.log(`   POST http://localhost:${PORT}/mcp - MCP JSON-RPC`);
  console.log(`   GET  http://localhost:${PORT}/health - Health check`);
  console.log(`   GET  http://localhost:${PORT}/info - Server info`);
  console.log(`📱 Telegram configured: ${!!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID)}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT, shutting down gracefully');
  process.exit(0);
});