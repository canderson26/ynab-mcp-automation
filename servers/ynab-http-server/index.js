#!/usr/bin/env node

/**
 * YNAB MCP HTTP Server
 * Persistent HTTP-based MCP server for Claude Code integration
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { YnabClient } from '../ynab-server/ynab-client.js';

// Load environment variables
dotenv.config({ path: '../../.env' });

const app = express();
const PORT = process.env.YNAB_MCP_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize YNAB client
const ynab = new YnabClient(
  process.env.YNAB_API_KEY,
  process.env.YNAB_BUDGET_ID
);

// MCP Server Info
const SERVER_INFO = {
  name: 'ynab-server',
  version: '1.0.0',
  capabilities: {
    tools: {}
  }
};

// Tool definitions
const TOOLS = [
  {
    name: 'getUnapprovedTransactions',
    description: 'Get all unapproved transactions',
    inputSchema: {
      type: 'object',
      properties: {
        sinceDays: {
          type: 'number',
          description: 'Number of days to look back',
          default: 30
        }
      }
    }
  },
  {
    name: 'getTransaction',
    description: 'Get a specific transaction by ID',
    inputSchema: {
      type: 'object',
      properties: {
        transactionId: {
          type: 'string',
          description: 'Transaction ID'
        }
      },
      required: ['transactionId']
    }
  },
  {
    name: 'updateTransaction',
    description: 'Update a transaction (category, memo, approved status)',
    inputSchema: {
      type: 'object',
      properties: {
        transactionId: {
          type: 'string',
          description: 'Transaction ID'
        },
        categoryId: {
          type: 'string',
          description: 'Category ID to assign'
        },
        memo: {
          type: 'string',
          description: 'Transaction memo'
        },
        approved: {
          type: 'boolean',
          description: 'Whether to approve the transaction'
        }
      },
      required: ['transactionId']
    }
  },
  {
    name: 'getCategories',
    description: 'Get all budget categories with current balances',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'assignToCategory',
    description: 'Assign money to a budget category',
    inputSchema: {
      type: 'object',
      properties: {
        categoryId: {
          type: 'string',
          description: 'Category ID'
        },
        amount: {
          type: 'number',
          description: 'Amount to assign (positive number)'
        }
      },
      required: ['categoryId', 'amount']
    }
  },
  {
    name: 'getReadyToAssign',
    description: 'Get the amount ready to assign',
    inputSchema: {
      type: 'object',
      properties: {}
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
    case 'getUnapprovedTransactions':
      const result = await ynab.getUnapprovedTransactions(args.sinceDays || 30);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }]
      };
      
    case 'getTransaction':
      const transaction = await ynab.getTransaction(args.transactionId);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(transaction, null, 2)
        }]
      };
      
    case 'updateTransaction':
      // Build the updates object properly for YNAB API
      const updates = {};
      if (args.categoryId !== undefined) updates.category_id = args.categoryId;
      if (args.memo !== undefined) updates.memo = args.memo;
      if (args.approved !== undefined) updates.approved = args.approved;
      
      const updated = await ynab.updateTransaction(args.transactionId, updates);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(updated, null, 2)
        }]
      };
      
    case 'getCategories':
      const categories = await ynab.getCategories();
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(categories, null, 2)
        }]
      };
      
    case 'assignToCategory':
      const assignment = await ynab.assignFunds(args.categoryId, args.amount);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(assignment, null, 2)
        }]
      };
      
    case 'getReadyToAssign':
      const readyToAssign = await ynab.getReadyToAssign();
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(readyToAssign, null, 2)
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
    timestamp: new Date().toISOString()
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
  console.log(`🚀 YNAB MCP Server running on http://0.0.0.0:${PORT}`);
  console.log(`📋 Available endpoints:`);
  console.log(`   POST http://localhost:${PORT}/mcp - MCP JSON-RPC`);
  console.log(`   GET  http://localhost:${PORT}/health - Health check`);
  console.log(`   GET  http://localhost:${PORT}/info - Server info`);
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