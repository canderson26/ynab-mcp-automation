#!/usr/bin/env node

/**
 * Merchant MCP HTTP Server
 * Persistent HTTP-based MCP server for merchant categorization data
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { MerchantDatabase } from '../merchant-server/database.js';
import { join } from 'path';

// Load environment variables
dotenv.config({ path: '../../.env' });

const app = express();
const PORT = process.env.MERCHANT_MCP_PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize database
const dbPath = process.env.DATABASE_PATH || join(process.cwd(), '../../data/merchant_data.db');
const db = new MerchantDatabase(dbPath);

// MCP Server Info
const SERVER_INFO = {
  name: 'merchant-server',
  version: '1.0.0',
  capabilities: {
    tools: {}
  }
};

// Tool definitions
const TOOLS = [
  {
    name: 'getMerchantHistory',
    description: 'Get categorization history and patterns for a merchant',
    inputSchema: {
      type: 'object',
      properties: {
        merchantName: {
          type: 'string',
          description: 'Merchant/payee name'
        }
      },
      required: ['merchantName']
    }
  },
  {
    name: 'getMerchantConfidence',
    description: 'Get confidence score for a merchant/category combination',
    inputSchema: {
      type: 'object',
      properties: {
        merchantName: {
          type: 'string',
          description: 'Merchant/payee name'
        },
        categoryName: {
          type: 'string',
          description: 'Category name'
        }
      },
      required: ['merchantName', 'categoryName']
    }
  },
  {
    name: 'recordCategorization',
    description: 'Record a new categorization for learning',
    inputSchema: {
      type: 'object',
      properties: {
        merchantName: {
          type: 'string',
          description: 'Merchant/payee name'
        },
        categoryName: {
          type: 'string',
          description: 'Category name'
        },
        categoryId: {
          type: 'string',
          description: 'Category ID'
        },
        confidence: {
          type: 'number',
          description: 'Confidence score (0-1)'
        },
        autoApproved: {
          type: 'boolean',
          description: 'Whether this was auto-approved'
        },
        transactionId: {
          type: 'string',
          description: 'Transaction ID'
        },
        amount: {
          type: 'number',
          description: 'Transaction amount'
        }
      },
      required: ['merchantName', 'categoryName']
    }
  },
  {
    name: 'getMerchantStats',
    description: 'Get statistics about merchant categorizations',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Limit number of results',
          default: 50
        }
      }
    }
  },
  {
    name: 'searchMerchants',
    description: 'Search for merchants by name pattern',
    inputSchema: {
      type: 'object',
      properties: {
        pattern: {
          type: 'string',
          description: 'Search pattern'
        },
        limit: {
          type: 'number',
          description: 'Limit number of results',
          default: 20
        }
      },
      required: ['pattern']
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
    case 'getMerchantHistory':
      const history = await db.getMerchantHistory(args.merchantName);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(history, null, 2)
        }]
      };
      
    case 'getMerchantConfidence':
      const confidence = await db.getMerchantConfidence(args.merchantName, args.categoryName);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(confidence, null, 2)
        }]
      };
      
    case 'recordCategorization':
      const result = await db.recordCategorization(
        args.merchantName,
        args.categoryName,
        args.categoryId,
        args.confidence,
        args.autoApproved,
        args.transactionId,
        args.amount
      );
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }]
      };
      
    case 'getMerchantStats':
      const stats = await db.getMerchantStats(args.limit || 50);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(stats, null, 2)
        }]
      };
      
    case 'searchMerchants':
      const merchants = await db.searchMerchants(args.pattern, args.limit || 20);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(merchants, null, 2)
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
    database_path: dbPath
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
  console.log(`🚀 Merchant MCP Server running on http://0.0.0.0:${PORT}`);
  console.log(`📋 Available endpoints:`);
  console.log(`   POST http://localhost:${PORT}/mcp - MCP JSON-RPC`);
  console.log(`   GET  http://localhost:${PORT}/health - Health check`);
  console.log(`   GET  http://localhost:${PORT}/info - Server info`);
  console.log(`📊 Database: ${dbPath}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully');
  db.close?.();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT, shutting down gracefully');
  db.close?.();
  process.exit(0);
});