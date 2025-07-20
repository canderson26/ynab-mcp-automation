#!/bin/bash
# YNAB MCP Server Setup Script
# Run this on a fresh Ubuntu 22.04 VPS

set -e  # Exit on error

echo "🚀 Starting YNAB MCP Server Setup..."

# Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install required packages
echo "🔧 Installing dependencies..."
sudo apt install -y \
    curl \
    git \
    build-essential \
    python3-pip \
    sqlite3 \
    ufw \
    fail2ban \
    nginx \
    certbot \
    python3-certbot-nginx

# Install Node.js 20
echo "📗 Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install Docker
echo "🐳 Installing Docker..."
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER

# Create application user
echo "👤 Creating application user..."
sudo useradd -m -s /bin/bash ynab-mcp || true
sudo usermod -aG docker ynab-mcp

# Setup directory structure
echo "📁 Creating directory structure..."
sudo mkdir -p /opt/ynab-mcp/{servers,data,logs,backups}
sudo chown -R ynab-mcp:ynab-mcp /opt/ynab-mcp

# Setup firewall
echo "🔒 Configuring firewall..."
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
echo "y" | sudo ufw enable

# Setup fail2ban
echo "🛡️ Configuring fail2ban..."
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# Create environment file
echo "🔐 Creating environment template..."
sudo -u ynab-mcp tee /opt/ynab-mcp/.env.template << 'EOF'
# YNAB Configuration
YNAB_API_KEY=your_ynab_personal_access_token
YNAB_BUDGET_ID=your_budget_id

# Telegram Configuration
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_telegram_chat_id

# MCP Server Configuration
MCP_AUTH_TOKEN=generate_a_secure_token_here
NODE_ENV=production

# Database
DATABASE_PATH=/opt/ynab-mcp/data/merchant_data.db

# Ports (internal)
YNAB_SERVER_PORT=3000
MERCHANT_SERVER_PORT=3001
TELEGRAM_SERVER_PORT=3002
EOF

# Create docker-compose file
echo "🐳 Creating Docker Compose configuration..."
sudo -u ynab-mcp tee /opt/ynab-mcp/docker-compose.yml << 'EOF'
version: '3.8'

services:
  ynab-server:
    build: ./servers/ynab-server
    restart: unless-stopped
    ports:
      - "127.0.0.1:3000:3000"
    env_file: .env
    volumes:
      - ./logs:/logs
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  merchant-server:
    build: ./servers/merchant-server
    restart: unless-stopped
    ports:
      - "127.0.0.1:3001:3001"
    env_file: .env
    volumes:
      - ./data:/data
      - ./logs:/logs
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  telegram-server:
    build: ./servers/telegram-server
    restart: unless-stopped
    ports:
      - "127.0.0.1:3002:3002"
    env_file: .env
    volumes:
      - ./logs:/logs
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3002/health"]
      interval: 30s
      timeout: 10s
      retries: 3

networks:
  default:
    name: mcp-network
EOF

# Create systemd service for SSH tunnel
echo "🔧 Creating SSH tunnel service..."
sudo tee /etc/systemd/system/mcp-tunnel.service << 'EOF'
[Unit]
Description=MCP SSH Tunnel
After=network.target

[Service]
Type=simple
User=ynab-mcp
ExecStart=/usr/bin/ssh -N -L 2222:localhost:22 -o ServerAliveInterval=60 -o ExitOnForwardFailure=yes localhost
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Create backup script
echo "💾 Creating backup script..."
sudo -u ynab-mcp tee /opt/ynab-mcp/backup.sh << 'EOF'
#!/bin/bash
# Daily backup script

BACKUP_DIR="/opt/ynab-mcp/backups"
DB_PATH="/opt/ynab-mcp/data/merchant_data.db"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup
sqlite3 $DB_PATH ".backup $BACKUP_DIR/merchant_data_$DATE.db"

# Keep only last 7 days of backups
find $BACKUP_DIR -name "merchant_data_*.db" -mtime +7 -delete

echo "Backup completed: merchant_data_$DATE.db"
EOF
chmod +x /opt/ynab-mcp/backup.sh

# Create cron jobs
echo "⏰ Setting up automation and backups..."
(sudo -u ynab-mcp crontab -l 2>/dev/null; echo "0 2 * * * /opt/ynab-mcp/backup.sh >> /opt/ynab-mcp/logs/backup.log 2>&1") | sudo -u ynab-mcp crontab -
(sudo -u ynab-mcp crontab -l 2>/dev/null; echo "0 10 * * * cd /opt/ynab-mcp && node automation/run-daily-categorization.js >> /opt/ynab-mcp/logs/categorization.log 2>&1") | sudo -u ynab-mcp crontab -

# Create health check script
echo "🏥 Creating health check script..."
sudo -u ynab-mcp tee /opt/ynab-mcp/health-check.sh << 'EOF'
#!/bin/bash

echo "=== MCP Server Health Check ==="
echo "Time: $(date)"

# Check YNAB server
if curl -s http://localhost:3000/health > /dev/null; then
    echo "✅ YNAB Server: Healthy"
else
    echo "❌ YNAB Server: Unhealthy"
fi

# Check Merchant server
if curl -s http://localhost:3001/health > /dev/null; then
    echo "✅ Merchant Server: Healthy"
else
    echo "❌ Merchant Server: Unhealthy"
fi

# Check Telegram server
if curl -s http://localhost:3002/health > /dev/null; then
    echo "✅ Telegram Server: Healthy"
else
    echo "❌ Telegram Server: Unhealthy"
fi

# Check database
if [ -f /opt/ynab-mcp/data/merchant_data.db ]; then
    SIZE=$(du -h /opt/ynab-mcp/data/merchant_data.db | cut -f1)
    echo "✅ Database: $SIZE"
else
    echo "❌ Database: Not found"
fi
EOF
chmod +x /opt/ynab-mcp/health-check.sh

# Create setup completion script
echo "📝 Creating setup instructions..."
sudo -u ynab-mcp tee /opt/ynab-mcp/SETUP_COMPLETE.md << 'EOF'
# YNAB MCP Server Setup Complete! 🎉

## Next Steps:

1. **Clone your repository:**
   ```bash
   cd /opt/ynab-mcp
   git clone YOUR_REPO_URL .
   ```

2. **Configure environment:**
   ```bash
   cp .env.template .env
   nano .env  # Add your API keys
   ```

3. **Build and start services:**
   ```bash
   docker-compose build
   docker-compose up -d
   ```

4. **Setup SSH key for remote access:**
   On your local machine:
   ```bash
   ssh-copy-id ynab-mcp@YOUR_SERVER_IP
   ```

5. **Configure Claude Code MCP:**
   Add to your MCP config:
   ```json
   {
     "ynab-server": {
       "command": "ssh",
       "args": ["-t", "ynab-mcp@YOUR_SERVER_IP", "-L", "3000:localhost:3000", "docker exec -i ynab-mcp-ynab-server-1 node index.js"]
     }
   }
   ```

## Useful Commands:

- Check logs: `docker-compose logs -f`
- Health check: `/opt/ynab-mcp/health-check.sh`
- Manual backup: `/opt/ynab-mcp/backup.sh`
- Restart services: `docker-compose restart`

## Security Notes:

- Firewall is configured (only SSH + HTTP/HTTPS)
- Fail2ban is protecting SSH
- MCP servers only listen on localhost
- Regular backups are scheduled

## Support:

Check logs in `/opt/ynab-mcp/logs/` if you encounter issues.
EOF

echo "✅ Setup complete!"
echo ""
echo "📋 IMPORTANT - Manual steps required:"
echo "1. Copy your code to /opt/ynab-mcp/"
echo "2. Configure /opt/ynab-mcp/.env with your API keys"
echo "3. Run: cd /opt/ynab-mcp && docker-compose up -d"
echo ""
echo "See /opt/ynab-mcp/SETUP_COMPLETE.md for detailed instructions"