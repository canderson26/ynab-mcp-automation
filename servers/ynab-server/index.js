import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  CallToolRequestSchema, 
  ListToolsRequestSchema 
} from '@modelcontextprotocol/sdk/types.js';
import dotenv from 'dotenv';
import { YnabClient } from './ynab-client.js';

// Load environment variables
dotenv.config({ path: '../../.env' });

// Initialize YNAB client
const ynab = new YnabClient(
  process.env.YNAB_API_KEY,
  process.env.YNAB_BUDGET_ID
);

// Create MCP server
const server = new Server(
  {
    name: 'ynab-server',
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
    name: 'getReadyToAssign',
    description: 'Get the amount ready to assign',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'getCategories',
    description: 'Get all budget categories with current balances',
    inputSchema: {
      type: 'object',
      properties: {
        month: {
          type: 'string',
          description: 'Month in YYYY-MM format (defaults to current month)'
        }
      }
    }
  },
  {
    name: 'getCategoryBalance',
    description: 'Get balance for a specific category',
    inputSchema: {
      type: 'object',
      properties: {
        categoryId: {
          type: 'string',
          description: 'Category ID'
        },
        month: {
          type: 'string',
          description: 'Month in YYYY-MM format (defaults to current month)'
        }
      },
      required: ['categoryId']
    }
  },
  {
    name: 'getAllCategoryBalances',
    description: 'Get all category balances for a month',
    inputSchema: {
      type: 'object',
      properties: {
        month: {
          type: 'string',
          description: 'Month in YYYY-MM format (defaults to current month)'
        }
      }
    }
  },
  {
    name: 'assignFunds',
    description: 'Assign funds to a category',
    inputSchema: {
      type: 'object',
      properties: {
        categoryId: {
          type: 'string',
          description: 'Category ID'
        },
        amount: {
          type: 'number',
          description: 'Amount to assign in milliunits (1000 = $1.00)'
        },
        month: {
          type: 'string',
          description: 'Month in YYYY-MM format (defaults to current month)'
        }
      },
      required: ['categoryId', 'amount']
    }
  },
  {
    name: 'moveFunds',
    description: 'Move funds between categories',
    inputSchema: {
      type: 'object',
      properties: {
        fromCategoryId: {
          type: 'string',
          description: 'Source category ID'
        },
        toCategoryId: {
          type: 'string',
          description: 'Destination category ID'
        },
        amount: {
          type: 'number',
          description: 'Amount to move in milliunits (1000 = $1.00)'
        },
        month: {
          type: 'string',
          description: 'Month in YYYY-MM format (defaults to current month)'
        }
      },
      required: ['fromCategoryId', 'toCategoryId', 'amount']
    }
  },
  {
    name: 'getRecentTransactions',
    description: 'Get recent transactions by type',
    inputSchema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['inflow', 'outflow', 'all'],
          description: 'Transaction type filter',
          default: 'all'
        },
        daysBack: {
          type: 'number',
          description: 'Number of days to look back',
          default: 7
        }
      }
    }
  },
  {
    name: 'getCategorySpending',
    description: 'Get spending history for a category',
    inputSchema: {
      type: 'object',
      properties: {
        categoryId: {
          type: 'string',
          description: 'Category ID'
        },
        monthsBack: {
          type: 'number',
          description: 'Number of months to look back',
          default: 3
        }
      },
      required: ['categoryId']
    }
  },
  {
    name: 'getTransactionsByPayee',
    description: 'Get transactions by payee name',
    inputSchema: {
      type: 'object',
      properties: {
        payeeName: {
          type: 'string',
          description: 'Payee name to search for'
        },
        daysBack: {
          type: 'number',
          description: 'Number of days to look back',
          default: 90
        }
      },
      required: ['payeeName']
    }
  },
  {
    name: 'health',
    description: 'Check YNAB server health',
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
      case 'getUnapprovedTransactions':
        result = await ynab.getUnapprovedTransactions(args.sinceDays);
        break;

      case 'getTransaction':
        result = await ynab.getTransaction(args.transactionId);
        break;

      case 'updateTransaction':
        result = await ynab.updateTransaction(
          args.transactionId,
          {
            category_id: args.categoryId,
            memo: args.memo,
            approved: args.approved
          }
        );
        break;

      case 'getReadyToAssign':
        result = await ynab.getReadyToAssign();
        break;

      case 'getCategories':
        result = await ynab.getCategories(args.month);
        break;

      case 'getCategoryBalance':
        result = await ynab.getCategoryBalance(args.categoryId, args.month);
        break;

      case 'getAllCategoryBalances':
        result = await ynab.getAllCategoryBalances(args.month);
        break;

      case 'assignFunds':
        result = await ynab.assignFunds(args.categoryId, args.amount, args.month);
        break;

      case 'moveFunds':
        result = await ynab.moveFunds(
          args.fromCategoryId,
          args.toCategoryId,
          args.amount,
          args.month
        );
        break;

      case 'getRecentTransactions':
        result = await ynab.getRecentTransactions(args.type, args.daysBack);
        break;

      case 'getCategorySpending':
        result = await ynab.getCategorySpending(args.categoryId, args.monthsBack);
        break;

      case 'getTransactionsByPayee':
        result = await ynab.getTransactionsByPayee(args.payeeName, args.daysBack);
        break;

      case 'health':
        result = await ynab.checkHealth();
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

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('YNAB MCP server running...');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});