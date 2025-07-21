# Security Guide - Balanced Security Setup

## Overview
This setup provides balanced security for your YNAB MCP automation while maintaining usability.

## Security Measures Implemented

### 🔒 **Server Hardening**
- Firewall configured (UFW) - only SSH, HTTP, HTTPS allowed
- Fail2ban installed - prevents brute force attacks
- Dedicated user account (ynab-mcp) - no root access needed
- MCP servers only listen on localhost - not accessible from internet

### 📊 **API Usage Limits**
- **Claude API**: 50 calls/day, 1000/month, $10 cost limit
- **YNAB API**: 200 calls/day, 5000/month
- Automatic tracking and enforcement
- Logs all API usage for monitoring

### 🚨 **Real-Time Monitoring**
- SSH login alerts (via Telegram)
- Failed authentication tracking
- Unusual API usage alerts
- File change detection
- External connection monitoring

### 🔄 **Automated Security**
- Weekly security updates (Sundays 3 AM)
- Daily log rotation (30 days retention)
- Hourly intrusion detection
- API usage monitoring every 30 minutes

## API Key Security Best Practices

### **YNAB API Key Setup**
1. Go to YNAB → Account Settings → Developer Settings
2. Create **Personal Access Token**
3. **Important**: This key can read/write your budget but cannot:
   - Access your bank accounts
   - Make real financial transactions
   - See your banking credentials
4. Store in `/opt/ynab-mcp/.env` on server only

### **Claude API Key Setup**
1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Create API key with **spending limits**:
   - Set monthly limit: $15 (covers normal usage + buffer)
   - Set usage notifications at $10
3. Store in `/opt/ynab-mcp/.env` on server only

### **Telegram Bot Setup** (Optional but Recommended)
1. Create bot via [@BotFather](https://t.me/botfather)
2. Get your chat ID: message [@userinfobot](https://t.me/userinfobot)
3. Used only for security alerts and transaction summaries

## Environment File Template

```bash
# /opt/ynab-mcp/.env

# YNAB Configuration (Required)
YNAB_API_KEY=sk-your_ynab_personal_access_token
YNAB_BUDGET_ID=6abd0309-5bdb-40e3-ae88-746eabd102a2

# Claude API (Required for automation)
CLAUDE_API_KEY=sk-ant-your_claude_api_key_with_limits

# Telegram (Optional - for alerts)
TELEGRAM_BOT_TOKEN=your_bot_token_from_botfather
TELEGRAM_CHAT_ID=your_telegram_chat_id

# Security (Generated automatically)
MCP_AUTH_TOKEN=$(openssl rand -base64 32)
NODE_ENV=production
DATABASE_PATH=/opt/ynab-mcp/data/merchant_data.db
```

## Risk Assessment

### **What Attackers Could Access**
- ✅ Your YNAB budget data (categories, balances, transactions)
- ✅ Ability to categorize and approve transactions
- ✅ Claude API usage (could increase your bill)
- ✅ Telegram bot (could send messages)

### **What They CANNOT Access**
- ❌ Your bank accounts (YNAB doesn't have this access)
- ❌ Ability to make real financial transactions
- ❌ Your banking credentials or passwords
- ❌ Other systems (isolated environment)

### **Maximum Damage Potential**
- **Financial**: ~$15/month in Claude API charges (rate limited)
- **YNAB**: Could mess up categorizations (fixable, no money lost)
- **Data**: Could see your budget patterns (but not account details)

## Monitoring Commands

### **Check API Usage**
```bash
# Current usage stats
node /opt/ynab-mcp/api-limiter.js stats

# View API usage log
tail -f /opt/ynab-mcp/logs/categorization.log
```

### **Security Monitoring**
```bash
# Check security alerts
tail -f /opt/ynab-mcp/logs/security.log

# Check intrusion detection
tail -f /opt/ynab-mcp/logs/intrusion-alerts.log

# View SSH login history
sudo tail /var/log/auth.log | grep "Accepted publickey"
```

### **Health Check**
```bash
# Overall system health
/opt/ynab-mcp/health-check.sh

# Docker container status
docker-compose ps

# Check for updates
sudo apt list --upgradable
```

## Incident Response

### **If You Suspect Compromise**
1. **Immediate Actions**:
   ```bash
   # Stop all services
   cd /opt/ynab-mcp && docker-compose down
   
   # Check for unauthorized changes
   find /opt/ynab-mcp -name "*.js" -newer /opt/ynab-mcp/last-check
   
   # Review recent logins
   sudo tail -100 /var/log/auth.log
   ```

2. **Revoke API Keys**:
   - YNAB: Delete token in Account Settings
   - Claude: Revoke key in Anthropic console
   - Telegram: Revoke bot token via @BotFather

3. **Investigate**:
   ```bash
   # Check API usage patterns
   grep "Claude API" /opt/ynab-mcp/logs/categorization.log | tail -50
   
   # Check for unusual YNAB activity
   grep "updateTransaction" /opt/ynab-mcp/logs/categorization.log | tail -20
   ```

4. **Recovery**:
   - Rebuild server from scratch if needed
   - Generate new API keys
   - Restore merchant database from backup

### **False Alarm Indicators**
- Login alerts from your own IP address
- API usage spikes during normal categorization times
- File changes after legitimate updates

## Monthly Security Checklist

- [ ] Review API usage: `node /opt/ynab-mcp/api-limiter.js stats`
- [ ] Check security logs: `tail -50 /opt/ynab-mcp/logs/security.log`
- [ ] Verify no unauthorized YNAB changes in app
- [ ] Review Claude API billing in Anthropic console
- [ ] Confirm system updates: `sudo apt list --upgradable`
- [ ] Test backup restore: `sqlite3 backup.db .tables`

## Support

If you detect suspicious activity:
1. Stop services immediately: `docker-compose down`
2. Check logs and API usage
3. Revoke and regenerate API keys if needed
4. Consider rebuilding server if compromised

The balanced security approach provides strong protection while maintaining the convenience of automated budgeting.