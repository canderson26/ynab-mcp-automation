import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  CallToolRequestSchema, 
  ListToolsRequestSchema 
} from '@modelcontextprotocol/sdk/types.js';
import dotenv from 'dotenv';
import { MerchantDatabase } from './database.js';
import { join } from 'path';

// Load environment variables
dotenv.config({ path: '../../.env' });

// Initialize database
const dbPath = process.env.DATABASE_PATH || join(process.cwd(), '../../data/merchant_data.db');
const db = new MerchantDatabase(dbPath);

// Create MCP server
const server = new Server(
  {
    name: 'merchant-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define available tools
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
    description: 'Record a new categorization decision',
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
          description: 'YNAB category ID'
        },
        confidence: {
          type: 'number',
          description: 'Confidence score (0-100)'
        },
        autoApproved: {
          type: 'boolean',
          description: 'Whether this was auto-approved'
        },
        transactionId: {
          type: 'string',
          description: 'YNAB transaction ID'
        },
        amount: {
          type: 'number',
          description: 'Transaction amount'
        }
      },
      required: ['merchantName', 'categoryName', 'confidence', 'autoApproved']
    }
  },
  {
    name: 'recordCorrection',
    description: 'Record when a user corrects a categorization',
    inputSchema: {
      type: 'object',
      properties: {
        merchantName: {
          type: 'string',
          description: 'Merchant/payee name'
        },
        oldCategory: {
          type: 'string',
          description: 'Previous category'
        },
        newCategory: {
          type: 'string',
          description: 'Corrected category'
        }
      },
      required: ['merchantName', 'oldCategory', 'newCategory']
    }
  },
  {
    name: 'getMerchantSuggestions',
    description: 'Get high-confidence merchant categorization rules',
    inputSchema: {
      type: 'object',
      properties: {
        minConfidence: {
          type: 'number',
          description: 'Minimum confidence threshold',
          default: 80
        }
      }
    }
  },
  {
    name: 'getRecentActivity',
    description: 'Get recent categorization activity',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Number of recent items to return',
          default: 20
        }
      }
    }
  },
  {
    name: 'getStats',
    description: 'Get database statistics',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'exportMerchantRules',
    description: 'Export merchant categorization rules',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'importMerchantRules',
    description: 'Import merchant categorization rules',
    inputSchema: {
      type: 'object',
      properties: {
        rules: {
          type: 'array',
          description: 'Array of merchant rules to import',
          items: {
            type: 'object',
            properties: {
              merchant_name: { type: 'string' },
              category_name: { type: 'string' },
              confidence_score: { type: 'number' },
              success_count: { type: 'number' },
              correction_count: { type: 'number' }
            }
          }
        }
      },
      required: ['rules']
    }
  },
  {
    name: 'backupDatabase',
    description: 'Create a backup of the merchant database',
    inputSchema: {
      type: 'object',
      properties: {
        backupPath: {
          type: 'string',
          description: 'Path where to save the backup'
        }
      },
      required: ['backupPath']
    }
  },
  {
    name: 'health',
    description: 'Check merchant server health',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  }
];

// Handle tool listing
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: TOOLS
  };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result;

    switch (name) {
      case 'getMerchantHistory':
        result = db.getMerchantHistory(args.merchantName);
        if (!result) {
          result = { 
            message: `No history found for merchant: ${args.merchantName}`,
            merchant_name: args.merchantName,
            isNew: true 
          };
        }
        break;

      case 'getMerchantConfidence':
        result = db.getMerchantConfidence(args.merchantName, args.categoryName);
        break;

      case 'recordCategorization':
        result = db.recordCategorization(
          args.merchantName,
          args.categoryName,
          args.categoryId,
          args.confidence,
          args.autoApproved,
          args.transactionId,
          args.amount
        );
        break;

      case 'recordCorrection':
        result = db.recordCorrection(
          args.merchantName,
          args.oldCategory,
          args.newCategory
        );
        break;

      case 'getMerchantSuggestions':
        result = db.getMerchantSuggestions(args.minConfidence || 80);
        break;

      case 'getRecentActivity':
        result = db.getRecentActivity(args.limit || 20);
        break;

      case 'getStats':
        result = db.getStats();
        break;

      case 'exportMerchantRules':
        result = db.exportMerchantRules();
        break;

      case 'importMerchantRules':
        result = db.importMerchantRules(args.rules);
        break;

      case 'backupDatabase':
        result = await db.backupDatabase(args.backupPath);
        break;

      case 'health':
        result = db.checkHealth();
        break;

      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  } catch (error) {
    console.error(`Error in ${name}:`, error);
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`
        }
      ],
      isError: true
    };
  }
});

// Handle server shutdown
process.on('SIGINT', () => {
  console.error('Shutting down merchant server...');
  db.close();
  process.exit(0);
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Merchant MCP server running...');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});