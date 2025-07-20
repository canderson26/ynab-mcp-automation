# YNAB MCP Automation

🤖 **Automated budget management system** using YNAB API, Claude MCP servers, and intelligent transaction categorization.

Replace your n8n subscription with a Claude-powered budget automation system that learns your spending patterns and manages your YNAB budget intelligently.

## ✨ What This Does

- **📊 Daily Transaction Categorization**: Claude analyzes your transactions and auto-categorizes them
- **🧠 Merchant Learning**: System learns your preferences and gets smarter over time  
- **💬 Interactive Budget Sessions**: Chat with Claude to allocate funds using natural language
- **📱 Telegram Notifications**: Get daily summaries and security alerts on your phone
- **🔒 Secure & Private**: Runs on your own VPS with encrypted API keys

## 💰 Your Budget (Configured)

- **Monthly Income**: $16,904.22 (Accenture + OrthoVA)
- **Fixed Bills**: $5,535.32/month (auto-scheduled by due dates)
- **Savings Rate**: 44.4% ($7,509.84/month to Brokerage + Emergency)
- **Categories**: 40+ categories with intelligent auto-approval limits

## Architecture

The system consists of three MCP servers:

1. **YNAB Server**: Pure YNAB API operations (read balances, assign funds)
2. **Merchant Server**: SQLite-backed learning system for merchant patterns
3. **Telegram Server**: Notifications and mobile interface

Claude Code acts as the orchestrator, using your local context (CLAUDE.md) for budget rules and intelligence.

## Project Structure

```
ynab-mcp-automation/
├── servers/
│   ├── ynab-server/         # YNAB API wrapper
│   ├── merchant-server/     # Merchant learning database
│   └── telegram-server/     # Telegram bot integration
├── automation/
│   ├── CLAUDE.md           # Your budget rules and context
│   ├── daily-categorization.md
│   └── budget-session.md
├── deployment/
│   └── docker-compose.yml
└── data/
    └── merchant_data.db    # Merchant learning database
```

## 🚀 Quick Start

### Prerequisites
You'll need API keys for:
- YNAB Personal Access Token
- Claude API Key  
- Telegram Bot Token & Chat ID

**👉 See [SETUP.md](SETUP.md) for detailed instructions on getting these**

### Installation
```bash
git clone https://github.com/your-username/ynab-mcp-automation.git
cd ynab-mcp-automation
cp .env.example .env
# Edit .env with your API keys (see SETUP.md)
npm run build
npm start
```

### Validate Setup
```bash
npm test  # Validates budget math and configuration
npm run health-check  # Checks all services are running
```

## 📋 What You Need to Get Started

| Requirement | Where to Get It | Cost | Time |
|------------|----------------|------|------|
| YNAB API Token | YNAB Account Settings | Free | 2 min |
| Claude API Key | console.anthropic.com | ~$3-5/month | 5 min |
| Telegram Bot | @BotFather on Telegram | Free | 3 min |
| VPS Server | DigitalOcean/Linode | $5-6/month | 10 min |

**Total setup time**: ~20 minutes  
**Monthly cost**: ~$9-12 (vs n8n subscription)

## Usage

### Daily Categorization (Automatic)
- Runs every day at 10 AM via cron job
- Categorizes unapproved transactions using AI + merchant history
- Auto-approves high confidence transactions (>75%)
- Sends Telegram summary of actions taken
- Learns from patterns to improve accuracy

### Interactive Budget Sessions
Start anytime with Claude Code:
```
"Let's do a budget session"
"Show me what needs funding"  
"Put $1200 in mortgage"
"Fill groceries to $600"
"Fund all the bills"
"10% to emergency fund"
```

### Security Monitoring
- Real-time SSH login alerts
- API usage tracking and limits
- Weekly automated security updates
- Intrusion detection and logging

## 🔧 Commands

```bash
npm start          # Start all services
npm stop           # Stop all services  
npm test           # Validate budget configuration
npm run logs       # View live logs
npm run backup     # Backup merchant database
npm run deploy     # Deploy to VPS
```

## 📊 Cost Breakdown

| Service | Monthly Cost |
|---------|-------------|
| VPS (DigitalOcean) | $6.00 |
| Claude API | $3-5.00 |
| Telegram Bot | $0.00 |
| **Total** | **$9-11/month** |

Compare to n8n Pro ($20/month) + your time managing workflows.

## 📖 Documentation

- **[SETUP.md](SETUP.md)** - Complete setup guide with API key instructions
- **[DEPLOYMENT_GUIDE.md](deployment/DEPLOYMENT_GUIDE.md)** - VPS deployment
- **[SECURITY_GUIDE.md](deployment/SECURITY_GUIDE.md)** - Security best practices
- **[automation/CLAUDE.md](automation/CLAUDE.md)** - Your budget rules and categories

## 🎉 Ready to Deploy?

1. **Read [SETUP.md](SETUP.md)** to get your API keys
2. **Configure your .env** file with the tokens
3. **Run the tests** to validate everything works
4. **Deploy to your VPS** and start automating!

Your budget will thank you. 🚀

## License

MIT