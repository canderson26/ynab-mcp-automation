# YNAB MCP Automation - Complete Deployment Guide

This guide walks you through deploying your YNAB automation system to Digital Ocean with balanced security.

## Overview

Your deployment will include:
- **3 MCP Servers** running in Docker containers
- **Daily automation** via cron job (10 AM)
- **Security monitoring** and API limits
- **SSH tunnel access** for Claude Code
- **Automated backups** and updates

## Step 1: Prepare API Keys

### YNAB Personal Access Token
1. Go to [YNAB](https://app.youneedabudget.com) → Account Settings
2. Click "Developer Settings" 
3. Click "New Token"
4. Copy the token (starts with `sk-`)
5. **Important**: This allows read/write to your budget only (no bank access)

### Claude API Key with Limits
1. Go to [Anthropic Console](https://console.anthropic.com)
2. Create API key
3. **Set spending limit**: $15/month
4. **Set notification**: Alert at $10
5. Copy the key (starts with `sk-ant-`)

### Telegram Bot (Optional but Recommended)
1. Message [@BotFather](https://t.me/botfather) 
2. Use `/newbot` command
3. Get your bot token
4. Message [@userinfobot](https://t.me/userinfobot) to get your chat ID

## Step 2: Create Digital Ocean VPS

### Sign Up
1. Go to [digitalocean.com](https://digitalocean.com)
2. Sign up (new users get $200 free credits = 33 months free!)
3. Verify email and add payment method

### Create Droplet
1. Click **"Create"** → **"Droplets"**
2. Choose **"Regular"** plan
3. Select **$6/month** option (1GB RAM, 1 vCPU, 25GB SSD)
4. **Image**: Ubuntu 22.04 LTS x64
5. **Region**: Choose closest to you (New York, San Francisco, etc.)
6. **Authentication**: 
   - **Option A**: SSH Key (recommended)
     - Add your public key from `~/.ssh/id_rsa.pub`
     - If you don't have one: `ssh-keygen -t rsa -b 4096`
   - **Option B**: Password (less secure but easier)
7. **Hostname**: `ynab-mcp-server`
8. Click **"Create Droplet"**

### Note Your IP
- Copy the droplet's IP address (e.g., `137.184.123.45`)
- You'll use this for SSH and Claude Code configuration

## Step 3: Deploy to VPS

### Initial Connection
```bash
# SSH to your new server (replace with your IP)
ssh root@YOUR_DROPLET_IP

# If using password, you'll be prompted to enter it
# If using SSH key, you should connect automatically
```

### Run Automated Setup
```bash
# Download and run the main setup script
curl -O https://raw.githubusercontent.com/YOUR_USERNAME/ynab-mcp-automation/main/deployment/setup-vps.sh
chmod +x setup-vps.sh
./setup-vps.sh
```

This script automatically:
- ✅ Updates system packages
- ✅ Installs Node.js, Docker, security tools
- ✅ Creates `ynab-mcp` user account
- ✅ Configures firewall (UFW) and fail2ban
- ✅ Sets up directory structure
- ✅ Creates systemd services
- ✅ Schedules daily backups

### Add Security Enhancements
```bash
# Download and run security setup
curl -O https://raw.githubusercontent.com/YOUR_USERNAME/ynab-mcp-automation/main/deployment/security-setup.sh
chmod +x security-setup.sh
./security-setup.sh
```

This adds:
- ✅ API usage limits and tracking
- ✅ Real-time security monitoring
- ✅ Intrusion detection
- ✅ Automated weekly updates

## Step 4: Deploy Your Code

### Switch to Application User
```bash
# Switch to the ynab-mcp user
sudo -u ynab-mcp -i
cd /opt/ynab-mcp

# You should now be in /opt/ynab-mcp as the ynab-mcp user
```

### Clone Repository
First, push your code to GitHub, then:

```bash
# Clone your repository (replace with your GitHub URL)
git clone https://github.com/YOUR_USERNAME/ynab-mcp-automation.git .

# Install dependencies for automation script
cd automation
npm install
cd ..
```

### Configure Environment
```bash
# Copy environment template
cp .env.template .env

# Edit with your API keys
nano .env
```

Fill in your actual values:
```env
# YNAB Configuration
YNAB_API_KEY=sk-your_actual_ynab_token_here
YNAB_BUDGET_ID=6abd0309-5bdb-40e3-ae88-746eabd102a2

# Claude API (for daily automation)
CLAUDE_API_KEY=sk-ant-your_claude_api_key_here

# Telegram (Optional - for alerts)
TELEGRAM_BOT_TOKEN=your_bot_token_from_botfather
TELEGRAM_CHAT_ID=your_telegram_chat_id

# Security (Auto-generated)
MCP_AUTH_TOKEN=$(openssl rand -base64 32)
NODE_ENV=production
DATABASE_PATH=/opt/ynab-mcp/data/merchant_data.db
```

Save with `Ctrl+X`, `Y`, `Enter`

### Initialize Database
```bash
# Initialize the merchant learning database
cd servers/merchant-server
npm install
npm run init-db
cd ../..
```

You should see output like:
```
Initializing database at: /opt/ynab-mcp/data/merchant_data.db
Adding example merchant rules...
Imported 9 merchant rules
Database initialized successfully!
```

## Step 5: Start Services

### Build and Start Docker Containers
```bash
# Build all MCP servers
docker-compose build

# Start all services
docker-compose up -d

# Check status
docker-compose ps
```

You should see:
```
Name                Command               State    Ports
--------------------------------------------------------
ynab-mcp-merchant-server-1   node index.js   Up    127.0.0.1:3001->3001/tcp
ynab-mcp-telegram-server-1   node index.js   Up    127.0.0.1:3002->3002/tcp  
ynab-mcp-ynab-server-1       node index.js   Up    127.0.0.1:3000->3000/tcp
```

### Test the System
```bash
# Run health check
./health-check.sh

# Test API limits
node api-limiter.js stats

# Test categorization (if you have transactions)
node automation/run-daily-categorization.js
```

## Step 6: Configure Claude Code

On your **local machine**, add to your MCP configuration:

### Find Your MCP Config File
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

### Add Server Configuration
```json
{
  "mcpServers": {
    "ynab-server": {
      "command": "ssh",
      "args": [
        "-o", "StrictHostKeyChecking=no",
        "-L", "3000:localhost:3000", 
        "ynab-mcp@YOUR_DROPLET_IP", 
        "docker", "exec", "-i", "ynab-mcp-ynab-server-1", "node", "index.js"
      ]
    },
    "merchant-server": {
      "command": "ssh",
      "args": [
        "-o", "StrictHostKeyChecking=no", 
        "-L", "3001:localhost:3001",
        "ynab-mcp@YOUR_DROPLET_IP",
        "docker", "exec", "-i", "ynab-mcp-merchant-server-1", "node", "index.js"
      ]
    }
  }
}
```

Replace `YOUR_DROPLET_IP` with your actual droplet IP address.

### Test Local Connection
1. Restart Claude Code
2. Start a new conversation
3. Try: "Let's do a budget session"
4. Claude should connect to your VPS and show your YNAB data

## Step 7: Verify Everything Works

### Test Daily Automation
```bash
# On VPS, check cron jobs are scheduled
sudo -u ynab-mcp crontab -l

# Should show:
# 0 2 * * * /opt/ynab-mcp/backup.sh >> /opt/ynab-mcp/logs/backup.log 2>&1
# 0 10 * * * cd /opt/ynab-mcp && node automation/run-daily-categorization.js >> /opt/ynab-mcp/logs/categorization.log 2>&1

# Run categorization manually to test
node automation/run-daily-categorization.js
```

### Test Security Monitoring
```bash
# Check security alerts (should show your SSH login)
tail /opt/ynab-mcp/logs/security.log

# Check API usage tracking
node api-limiter.js stats
```

### Test Interactive Budget Sessions
In Claude Code:
```
"Let's do a budget session"
"How much is ready to assign?"
"What bills need funding?"
```

## Maintenance

### Daily Monitoring
- Check Telegram for alerts
- Monitor Claude API usage in Anthropic console

### Weekly Tasks
```bash
# SSH to VPS and check status
ssh ynab-mcp@YOUR_DROPLET_IP

# Check health
/opt/ynab-mcp/health-check.sh

# View recent logs
tail -50 /opt/ynab-mcp/logs/categorization.log
tail -50 /opt/ynab-mcp/logs/security.log

# Check API usage
node /opt/ynab-mcp/api-limiter.js stats
```

### Monthly Tasks
- Review API billing (should be ~$5/month for Claude)
- Check Digital Ocean billing (should be $6/month)
- Verify backups exist: `ls -la /opt/ynab-mcp/backups/`

## Troubleshooting

### Common Issues

**"Permission denied" when SSH to ynab-mcp user:**
```bash
# Copy your SSH key to ynab-mcp user
ssh-copy-id ynab-mcp@YOUR_DROPLET_IP
```

**Docker containers not starting:**
```bash
# Check logs
docker-compose logs

# Restart services
docker-compose down
docker-compose up -d
```

**Claude Code can't connect:**
- Check SSH key is set up for ynab-mcp user
- Verify droplet IP is correct
- Test SSH connection manually: `ssh ynab-mcp@YOUR_DROPLET_IP`

**API limits exceeded:**
```bash
# Check current usage
node /opt/ynab-mcp/api-limiter.js stats

# Reset if needed (first day of month)
rm /opt/ynab-mcp/data/api-usage.json
```

### Getting Help

1. Check logs: `/opt/ynab-mcp/logs/`
2. Test individual components
3. Review security guide: `/opt/ynab-mcp/deployment/SECURITY_GUIDE.md`

## Success!

You now have a fully automated YNAB system that:
- ✅ Categorizes transactions daily at 10 AM
- ✅ Learns from your patterns
- ✅ Provides interactive budget sessions
- ✅ Monitors security and API usage
- ✅ Costs only ~$11/month total
- ✅ Replaces your n8n subscription

Your financial automation is now running securely in the cloud!