# YNAB MCP Automation - Documentation

Complete documentation for the YNAB MCP automation system.

## 📚 Documentation Index

### Getting Started
- **[Main README](../README.md)** - Project overview and quick start
- **[Deployment Guide](../deployment/DEPLOYMENT_GUIDE.md)** - Complete step-by-step deployment
- **[Security Guide](../deployment/SECURITY_GUIDE.md)** - Security features and best practices

### System Architecture
- **[Architecture Diagram](../ynab-mcp-architecture.md)** - Technical diagrams and workflows
- **[CLAUDE.md](../automation/CLAUDE.md)** - Budget rules and context for AI

### Automation Workflows
- **[Daily Categorization](../automation/daily-categorization.md)** - Automated transaction processing
- **[Budget Sessions](../automation/budget-session.md)** - Interactive budget allocation

### Deployment & Operations
- **[VPS Setup Script](../deployment/setup-vps.sh)** - Automated server configuration
- **[Security Setup Script](../deployment/security-setup.sh)** - Enhanced security features

## 🏗️ System Components

### MCP Servers
1. **[YNAB Server](../servers/ynab-server/)** - YNAB API operations
2. **[Merchant Server](../servers/merchant-server/)** - Learning and intelligence
3. **[Telegram Server](../servers/telegram-server/)** - Notifications (optional)

### Automation Scripts
- **[Daily Categorization](../automation/run-daily-categorization.js)** - Main automation logic
- **[API Limiter](../deployment/security-setup.sh#L47)** - Usage tracking and limits

## 🔧 Configuration Files

### Core Configuration
- **[Environment Template](../deployment/setup-vps.sh#L47)** - API keys and settings
- **[Docker Compose](../deployment/setup-vps.sh#L67)** - Container orchestration
- **[Budget Context](../automation/CLAUDE.md)** - Your budget rules

### Security Configuration
- **[Firewall Rules](../deployment/setup-vps.sh#L30)** - Network security
- **[Monitoring Setup](../deployment/security-setup.sh#L13)** - Real-time alerts
- **[API Limits](../deployment/security-setup.sh#L47)** - Usage enforcement

## 📊 Monitoring & Maintenance

### Health Checks
```bash
# System health
/opt/ynab-mcp/health-check.sh

# API usage
node /opt/ynab-mcp/api-limiter.js stats

# Security status
tail -f /opt/ynab-mcp/logs/security.log
```

### Log Files
- `/opt/ynab-mcp/logs/categorization.log` - Daily automation
- `/opt/ynab-mcp/logs/security.log` - Security alerts
- `/opt/ynab-mcp/logs/backup.log` - Database backups

### Scheduled Tasks
- **10:00 AM Daily** - Transaction categorization
- **2:00 AM Daily** - Database backup
- **3:00 AM Sunday** - Security updates
- **Every 30 minutes** - Security monitoring

## 💰 Cost Breakdown

| Component | Monthly Cost | Purpose |
|-----------|-------------|---------|
| Digital Ocean VPS | $6 | Server hosting |
| Claude API | ~$5 | AI categorization |
| **Total** | **~$11** | Complete automation |

Compare to n8n subscription: **Saves $9-19/month**

## 🔒 Security Features

### Protection Layers
- **Server Hardening** - Firewall, fail2ban, dedicated user
- **API Limits** - 50 Claude calls/day, $10/month cap
- **Access Control** - SSH keys only, localhost binding
- **Monitoring** - Real-time alerts, intrusion detection

### Data Security
- **API Keys** - Stored only on VPS with restricted access
- **No Bank Access** - YNAB API cannot access bank accounts
- **Isolated Environment** - Containerized applications
- **Regular Backups** - Daily SQLite database backups

## 🚀 Usage Examples

### Interactive Budget Session
```
User: "Let's do a budget session"
Claude: You have $5,247.92 ready to assign...

User: "Fund all the bills"
Claude: ✅ Funded mortgage ($2,400), daycare ($800)...

User: "10% to emergency fund"  
Claude: ✅ Added $524.79 to emergency fund
```

### Daily Automation Results
```
📊 Daily Summary (Jan 15, 2024)
• Processed: 12 transactions
• Auto-approved: 9 ✅
• Need review: 3 ⏳
• New merchants: 2
• Accuracy: 94%
```

## 🛠️ Troubleshooting

### Common Issues
1. **SSH Connection Failed** - Check SSH keys and IP address
2. **Docker Won't Start** - Check logs: `docker-compose logs`
3. **API Limits Hit** - Check usage: `node api-limiter.js stats`
4. **Missing Transactions** - Verify YNAB API key permissions

### Support Resources
- Check system logs in `/opt/ynab-mcp/logs/`
- Review [Security Guide](../deployment/SECURITY_GUIDE.md)
- Test individual components with health checks

## 📈 Performance Metrics

### Target Performance
- **Categorization Accuracy**: >90% after 1 month
- **Auto-approval Rate**: >75% of transactions
- **Processing Time**: <2 minutes daily review
- **System Uptime**: >99.9%

### Learning Progress
- **Merchant Database**: Grows with each transaction
- **Confidence Scores**: Improve through corrections
- **Pattern Recognition**: Better categorization over time

## 🔄 Update Process

### Regular Updates
```bash
# SSH to VPS
ssh ynab-mcp@YOUR_DROPLET_IP

# Pull latest code
cd /opt/ynab-mcp
git pull origin main

# Restart services
docker-compose down
docker-compose build
docker-compose up -d
```

### Security Updates
- **Automatic**: Weekly via cron job
- **Manual**: Run `/opt/ynab-mcp/security-update.sh`

This documentation provides everything needed to deploy, operate, and maintain your YNAB MCP automation system.