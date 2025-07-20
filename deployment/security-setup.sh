#!/bin/bash
# Enhanced Security Setup for YNAB MCP Server
# Run this after the main setup script

set -e

echo "🔒 Setting up enhanced security monitoring..."

# Create security monitoring script
sudo -u ynab-mcp tee /opt/ynab-mcp/security-monitor.sh << 'EOF'
#!/bin/bash

LOG_FILE="/opt/ynab-mcp/logs/security.log"
TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN}"
TELEGRAM_CHAT_ID="${TELEGRAM_CHAT_ID}"

# Function to send Telegram alert via MCP server
send_alert() {
    local message="$1"
    local alert_type="${2:-ssh_login}"
    local severity="${3:-medium}"
    
    # Try to use MCP Telegram server first
    if command -v docker >/dev/null 2>&1; then
        docker exec -i ynab-mcp-telegram-server-1 node -e "
            const { spawn } = require('child_process');
            const mcpInput = JSON.stringify({
                jsonrpc: '2.0',
                id: Date.now(),
                method: 'tools/call',
                params: {
                    name: 'sendSecurityAlert',
                    arguments: {
                        alertType: '$alert_type',
                        details: '$message',
                        severity: '$severity'
                    }
                }
            });
            process.stdout.write(mcpInput + '\n');
        " 2>/dev/null || {
            # Fallback to direct Telegram API
            if [ -n "$TELEGRAM_BOT_TOKEN" ] && [ -n "$TELEGRAM_CHAT_ID" ]; then
                curl -s -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
                    -d "chat_id=$TELEGRAM_CHAT_ID" \
                    -d "text=🚨 YNAB Server Alert: $message" \
                    -d "parse_mode=HTML" > /dev/null 2>&1
            fi
        }
    fi
    echo "$(date): $message" >> "$LOG_FILE"
}

# Monitor for new SSH connections
monitor_ssh() {
    tail -f /var/log/auth.log | while read line; do
        if echo "$line" | grep -q "Accepted publickey"; then
            IP=$(echo "$line" | grep -oP 'from \K[0-9.]+')
            USER=$(echo "$line" | grep -oP 'for \K\w+')
            send_alert "SSH login: User $USER from IP $IP"
        fi
    done &
}

# Monitor API usage patterns
monitor_api_usage() {
    local log_file="/opt/ynab-mcp/logs/categorization.log"
    if [ -f "$log_file" ]; then
        # Check for unusual API activity
        daily_requests=$(grep "$(date '+%Y-%m-%d')" "$log_file" | grep -c "Claude API" || echo "0")
        if [ "$daily_requests" -gt 100 ]; then
            send_alert "High API usage detected: $daily_requests Claude API calls today"
        fi
    fi
}

# Check for failed authentication attempts
monitor_auth_failures() {
    failed_attempts=$(grep "$(date '+%Y-%m-%d')" /var/log/auth.log | grep -c "Failed password" || echo "0")
    if [ "$failed_attempts" -gt 10 ]; then
        send_alert "High failed login attempts: $failed_attempts today"
    fi
}

# Main monitoring loop
case "$1" in
    "ssh")
        monitor_ssh
        ;;
    "api")
        monitor_api_usage
        ;;
    "auth")
        monitor_auth_failures
        ;;
    "daily")
        monitor_api_usage
        monitor_auth_failures
        ;;
    *)
        echo "Usage: $0 {ssh|api|auth|daily}"
        exit 1
        ;;
esac
EOF

chmod +x /opt/ynab-mcp/security-monitor.sh

# Create API usage limiter script
sudo -u ynab-mcp tee /opt/ynab-mcp/api-limiter.js << 'EOF'
#!/usr/bin/env node

/**
 * API Rate Limiter and Usage Tracker
 * Prevents excessive API usage and tracks spending
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';

const USAGE_FILE = '/opt/ynab-mcp/data/api-usage.json';
const LIMITS = {
  claude: {
    daily: 50,   // Max 50 Claude API calls per day
    monthly: 1000, // Max 1000 per month
    cost_limit: 10 // Max $10/month estimated
  },
  ynab: {
    daily: 200,  // Max 200 YNAB API calls per day
    monthly: 5000 // Max 5000 per month
  }
};

// Load current usage
function loadUsage() {
  if (!existsSync(USAGE_FILE)) {
    return {
      claude: { daily: 0, monthly: 0, cost_estimate: 0, last_reset: new Date().toISOString() },
      ynab: { daily: 0, monthly: 0, last_reset: new Date().toISOString() }
    };
  }
  
  try {
    return JSON.parse(readFileSync(USAGE_FILE, 'utf8'));
  } catch {
    return loadUsage(); // Return default if file is corrupted
  }
}

// Save usage data
function saveUsage(usage) {
  writeFileSync(USAGE_FILE, JSON.stringify(usage, null, 2));
}

// Reset counters if needed
function resetCountersIfNeeded(usage) {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  
  for (const service of ['claude', 'ynab']) {
    const lastReset = new Date(usage[service].last_reset);
    const lastResetDate = lastReset.toISOString().split('T')[0];
    
    // Reset daily counter if it's a new day
    if (today !== lastResetDate) {
      usage[service].daily = 0;
    }
    
    // Reset monthly counter if it's a new month
    if (now.getMonth() !== lastReset.getMonth() || now.getYear() !== lastReset.getYear()) {
      usage[service].monthly = 0;
      if (service === 'claude') {
        usage[service].cost_estimate = 0;
      }
    }
    
    usage[service].last_reset = now.toISOString();
  }
  
  return usage;
}

// Check if API call is allowed
function checkLimit(service, type = 'request') {
  const usage = resetCountersIfNeeded(loadUsage());
  
  const limits = LIMITS[service];
  if (!limits) {
    console.log(`Unknown service: ${service}`);
    return false;
  }
  
  // Check daily limit
  if (usage[service].daily >= limits.daily) {
    console.log(`Daily limit exceeded for ${service}: ${usage[service].daily}/${limits.daily}`);
    return false;
  }
  
  // Check monthly limit
  if (usage[service].monthly >= limits.monthly) {
    console.log(`Monthly limit exceeded for ${service}: ${usage[service].monthly}/${limits.monthly}`);
    return false;
  }
  
  // Check cost limit for Claude
  if (service === 'claude' && usage[service].cost_estimate >= limits.cost_limit) {
    console.log(`Cost limit exceeded for Claude: $${usage[service].cost_estimate}/$${limits.cost_limit}`);
    return false;
  }
  
  return true;
}

// Record API usage
function recordUsage(service, cost = 0) {
  const usage = resetCountersIfNeeded(loadUsage());
  
  usage[service].daily++;
  usage[service].monthly++;
  
  if (service === 'claude') {
    usage[service].cost_estimate += cost;
  }
  
  saveUsage(usage);
  
  console.log(`${service} usage updated: daily=${usage[service].daily}, monthly=${usage[service].monthly}`);
}

// Get usage stats
function getStats() {
  const usage = resetCountersIfNeeded(loadUsage());
  return {
    claude: {
      daily: `${usage.claude.daily}/${LIMITS.claude.daily}`,
      monthly: `${usage.claude.monthly}/${LIMITS.claude.monthly}`,
      cost: `$${usage.claude.cost_estimate.toFixed(2)}/$${LIMITS.claude.cost_limit}`
    },
    ynab: {
      daily: `${usage.ynab.daily}/${LIMITS.ynab.daily}`,
      monthly: `${usage.ynab.monthly}/${LIMITS.ynab.monthly}`
    }
  };
}

// CLI interface
const command = process.argv[2];
const service = process.argv[3];
const cost = parseFloat(process.argv[4]) || 0;

switch (command) {
  case 'check':
    const allowed = checkLimit(service);
    process.exit(allowed ? 0 : 1);
    break;
    
  case 'record':
    recordUsage(service, cost);
    break;
    
  case 'stats':
    console.log(JSON.stringify(getStats(), null, 2));
    break;
    
  default:
    console.log('Usage: node api-limiter.js {check|record|stats} [service] [cost]');
    console.log('Services: claude, ynab');
    process.exit(1);
}
EOF

chmod +x /opt/ynab-mcp/api-limiter.js

# Add security monitoring to crontab
echo "📊 Setting up security monitoring cron jobs..."
(sudo -u ynab-mcp crontab -l 2>/dev/null; echo "*/30 * * * * /opt/ynab-mcp/security-monitor.sh daily >> /opt/ynab-mcp/logs/security.log 2>&1") | sudo -u ynab-mcp crontab -

# Create logrotate configuration for security logs
sudo tee /etc/logrotate.d/ynab-mcp << 'EOF'
/opt/ynab-mcp/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    su ynab-mcp ynab-mcp
    postrotate
        /bin/systemctl reload rsyslog > /dev/null 2>&1 || true
    endscript
}
EOF

# Create security update script
sudo tee /opt/ynab-mcp/security-update.sh << 'EOF'
#!/bin/bash
# Weekly security updates

echo "🔄 Running security updates..."

# Update system packages
apt update && apt upgrade -y

# Update Docker images
cd /opt/ynab-mcp
docker-compose pull
docker-compose up -d

# Check for suspicious processes
ps aux | grep -E "(crypto|mine|bitcoin)" | grep -v grep

# Check disk usage
df -h | grep -E "9[0-9]%|100%"

echo "✅ Security update complete"
EOF

chmod +x /opt/ynab-mcp/security-update.sh

# Add weekly security updates
(sudo crontab -l 2>/dev/null; echo "0 3 * * 0 /opt/ynab-mcp/security-update.sh >> /opt/ynab-mcp/logs/security-update.log 2>&1") | sudo crontab -

# Create intrusion detection script
sudo -u ynab-mcp tee /opt/ynab-mcp/intrusion-detection.sh << 'EOF'
#!/bin/bash

# Check for common attack patterns
ALERT_FILE="/opt/ynab-mcp/logs/intrusion-alerts.log"

# Monitor for suspicious file changes
find /opt/ynab-mcp -name "*.js" -newer /opt/ynab-mcp/last-check 2>/dev/null | while read file; do
    echo "$(date): Suspicious file change detected: $file" >> "$ALERT_FILE"
done

# Update timestamp
touch /opt/ynab-mcp/last-check

# Check for unexpected network connections
netstat -an | grep :3000 | grep -v 127.0.0.1 | while read connection; do
    echo "$(date): External connection to MCP server: $connection" >> "$ALERT_FILE"
done
EOF

chmod +x /opt/ynab-mcp/intrusion-detection.sh

# Add hourly intrusion detection
(sudo -u ynab-mcp crontab -l 2>/dev/null; echo "0 * * * * /opt/ynab-mcp/intrusion-detection.sh") | sudo -u ynab-mcp crontab -

echo "✅ Enhanced security setup complete!"
echo ""
echo "📋 Security Features Added:"
echo "- API usage limits and tracking"
echo "- Real-time SSH login monitoring"
echo "- Failed authentication alerts"
echo "- Weekly security updates"
echo "- Intrusion detection"
echo "- Log rotation (30 days)"
echo ""
echo "🔧 Next steps:"
echo "1. Configure Telegram bot for alerts (optional)"
echo "2. Test with: /opt/ynab-mcp/api-limiter.js stats"
echo "3. Monitor logs in /opt/ynab-mcp/logs/"