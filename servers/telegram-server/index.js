import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  CallToolRequestSchema, 
  ListToolsRequestSchema 
} from '@modelcontextprotocol/sdk/types.js';
import dotenv from 'dotenv';
import { TelegramClient } from './telegram-client.js';

// Load environment variables
dotenv.config({ path: '../../.env' });

// Initialize Telegram client
const telegram = new TelegramClient(
  process.env.TELEGRAM_BOT_TOKEN,
  process.env.TELEGRAM_CHAT_ID
);

// Create MCP server
const server = new Server(
  {
    name: 'telegram-server',
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
          description: 'Chat ID to send to (optional, uses default if not provided)'
        }
      },
      required: ['message']
    }
  },
  {
    name: 'sendDailySummary',
    description: 'Send formatted daily categorization summary',
    inputSchema: {
      type: 'object',
      properties: {
        stats: {
          type: 'object',
          description: 'Categorization statistics',
          properties: {
            processed: { type: 'number' },
            approved: { type: 'number' },
            pending: { type: 'number' },
            errors: { type: 'number' }
          }
        },
        transactions: {
          type: 'array',
          description: 'List of processed transactions',
          items: {
            type: 'object',
            properties: {
              payee: { type: 'string' },
              amount: { type: 'number' },
              category: { type: 'string' },
              confidence: { type: 'number' },
              approved: { type: 'boolean' }
            }
          }
        },
        date: {
          type: 'string',
          description: 'Date of processing (YYYY-MM-DD format)'
        }
      },
      required: ['stats', 'transactions']
    }
  },
  {
    name: 'sendSecurityAlert',
    description: 'Send security alert message',
    inputSchema: {
      type: 'object',
      properties: {
        alertType: {
          type: 'string',
          enum: ['ssh_login', 'api_limit', 'failed_auth', 'intrusion'],
          description: 'Type of security alert'
        },
        details: {
          type: 'string',
          description: 'Alert details'
        },
        severity: {
          type: 'string',
          enum: ['low', 'medium', 'high', 'critical'],
          description: 'Alert severity level',
          default: 'medium'
        }
      },
      required: ['alertType', 'details']
    }
  },
  {
    name: 'sendBudgetAlert',
    description: 'Send budget-related alert',
    inputSchema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description: 'Budget category name'
        },
        percentageUsed: {
          type: 'number',
          description: 'Percentage of budget used'
        },
        amount: {
          type: 'number',
          description: 'Amount spent'
        },
        budget: {
          type: 'number',
          description: 'Total budget amount'
        }
      },
      required: ['category', 'percentageUsed']
    }
  },
  {
    name: 'sendPaycheckAlert',
    description: 'Send paycheck detection notification',
    inputSchema: {
      type: 'object',
      properties: {
        amount: {
          type: 'number',
          description: 'Paycheck amount'
        },
        source: {
          type: 'string',
          description: 'Paycheck source (e.g., Accenture, OrthoVA)'
        },
        readyToAssign: {
          type: 'number',
          description: 'Total ready to assign amount'
        }
      },
      required: ['amount', 'source']
    }
  },
  {
    name: 'sendApiUsageAlert',
    description: 'Send API usage warning',
    inputSchema: {
      type: 'object',
      properties: {
        service: {
          type: 'string',
          description: 'API service name (claude, ynab)'
        },
        usage: {
          type: 'object',
          properties: {
            current: { type: 'number' },
            limit: { type: 'number' },
            percentage: { type: 'number' }
          }
        },
        timeframe: {
          type: 'string',
          enum: ['daily', 'monthly'],
          description: 'Usage timeframe'
        }
      },
      required: ['service', 'usage', 'timeframe']
    }
  },
  {
    name: 'getLastMessages',
    description: 'Get recent messages from the chat',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Number of messages to retrieve',
          default: 10
        }
      }
    }
  },
  {
    name: 'health',
    description: 'Check Telegram bot health',
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
      case 'sendMessage':
        result = await telegram.sendMessage(
          args.message,
          args.parseMode || 'Markdown',
          args.chatId
        );
        break;

      case 'sendDailySummary':
        result = await telegram.sendDailySummary(
          args.stats,
          args.transactions,
          args.date
        );
        break;

      case 'sendSecurityAlert':
        result = await telegram.sendSecurityAlert(
          args.alertType,
          args.details,
          args.severity || 'medium'
        );
        break;

      case 'sendBudgetAlert':
        result = await telegram.sendBudgetAlert(
          args.category,
          args.percentageUsed,
          args.amount,
          args.budget
        );
        break;

      case 'sendPaycheckAlert':
        result = await telegram.sendPaycheckAlert(
          args.amount,
          args.source,
          args.readyToAssign
        );
        break;

      case 'sendApiUsageAlert':
        result = await telegram.sendApiUsageAlert(
          args.service,
          args.usage,
          args.timeframe
        );
        break;

      case 'getLastMessages':
        result = await telegram.getLastMessages(args.limit || 10);
        break;

      case 'health':
        result = await telegram.checkHealth();
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
  console.error('Shutting down Telegram server...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error('Shutting down Telegram server...');
  process.exit(0);
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Telegram MCP server running...');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});