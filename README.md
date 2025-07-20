# YNAB MCP Automation

An MCP-powered automation system for YNAB (You Need A Budget) that provides intelligent transaction categorization and interactive budget management through Claude.

## Features

- 🤖 **Smart Transaction Categorization**: Uses Claude to intelligently categorize transactions with learning capabilities
- 📊 **Interactive Budget Sessions**: Natural language budget allocation with Claude
- 🧠 **Merchant Learning**: Builds confidence scores and learns from your corrections
- 📱 **Telegram Integration**: Daily summaries and security alerts
- 🔒 **Balanced Security**: API limits, monitoring, and server hardening
- ⚡ **Automated**: Daily cron job handles categorization automatically
- 💰 **Cost Effective**: $6/month VPS + ~$5/month Claude API usage

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

## Quick Start

### 1. Create Digital Ocean VPS
- Sign up at [digitalocean.com](https://digitalocean.com) ($200 free credits)
- Create $6/month Basic Droplet with Ubuntu 22.04
- Choose region closest to you

### 2. Deploy to VPS
```bash
# SSH to your new droplet
ssh root@YOUR_DROPLET_IP

# Run automated setup
curl -O https://raw.githubusercontent.com/YOUR_USERNAME/ynab-mcp-automation/main/deployment/setup-vps.sh
chmod +x setup-vps.sh
./setup-vps.sh

# Add security enhancements
curl -O https://raw.githubusercontent.com/YOUR_USERNAME/ynab-mcp-automation/main/deployment/security-setup.sh
chmod +x security-setup.sh
./security-setup.sh
```

### 3. Configure API Keys
```bash
# Switch to app user
sudo -u ynab-mcp -i
cd /opt/ynab-mcp

# Clone your repository
git clone YOUR_REPO_URL .

# Configure environment
cp .env.template .env
nano .env  # Add your API keys (see Security Guide)

# Start services
docker-compose up -d
```

### 4. Setup Claude Code MCP
Add to your local MCP configuration:
```json
{
  "ynab-server": {
    "command": "ssh",
    "args": ["-L", "3000:localhost:3000", "ynab-mcp@YOUR_SERVER_IP", "docker", "exec", "-i", "ynab-mcp-ynab-server-1", "node", "index.js"]
  },
  "merchant-server": {
    "command": "ssh", 
    "args": ["-L", "3001:localhost:3001", "ynab-mcp@YOUR_SERVER_IP", "docker", "exec", "-i", "ynab-mcp-merchant-server-1", "node", "index.js"]
  }
}
```

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

### Manual Commands
```bash
# Check system health
/opt/ynab-mcp/health-check.sh

# View API usage
node /opt/ynab-mcp/api-limiter.js stats

# Manual categorization run
node /opt/ynab-mcp/automation/run-daily-categorization.js

# Security status
tail -f /opt/ynab-mcp/logs/security.log
```

## License

MIT