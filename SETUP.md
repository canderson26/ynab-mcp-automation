# YNAB MCP Automation Setup Guide

This guide walks you through all the prerequisites and setup steps needed to deploy your YNAB budget automation system.

## 📋 Prerequisites Checklist

### 1. YNAB Account & API Access
- [ ] Active YNAB subscription
- [ ] YNAB Personal Access Token
- [ ] Budget ID from your YNAB account

### 2. Claude API Access
- [ ] Anthropic Claude API key
- [ ] API credits/billing set up

### 3. Telegram Bot Setup
- [ ] Telegram Bot Token
- [ ] Your Telegram Chat ID

### 4. VPS/Server
- [ ] Ubuntu 22.04 VPS (minimum 1GB RAM, 10GB storage)
- [ ] SSH access to the server
- [ ] Domain name (optional, for SSL)

---

## 🔑 Getting Required API Keys & Tokens

### 1. YNAB Personal Access Token

1. **Log into YNAB** at [app.ynab.com](https://app.ynab.com)
2. **Go to Account Settings**:
   - Click your email address in the top right
   - Select "Account Settings"
3. **Generate Personal Access Token**:
   - Scroll down to "Developer Settings"
   - Click "New Token"
   - Give it a name like "Budget Automation"
   - Copy the token immediately (you can't see it again!)

**Example token format**: `your-long-ynab-token-here`

### 2. Get Your YNAB Budget ID

1. **In YNAB, open your budget**
2. **Look at the URL**: `https://app.ynab.com/[BUDGET-ID]/budget`
3. **Copy the Budget ID** from the URL

**Your Budget ID**: `6abd0309-5bdb-40e3-ae88-746eabd102a2` (already configured)

### 3. Claude API Key

1. **Go to** [console.anthropic.com](https://console.anthropic.com)
2. **Sign up/Log in** with your account
3. **Add billing information** (required for API access)
4. **Create API Key**:
   - Go to "API Keys" section
   - Click "Create Key"
   - Name it "YNAB Automation"
   - Copy the key immediately

**Example key format**: `sk-ant-api03-...` (starts with `sk-ant-`)

**Estimated costs**: ~$3-5/month for daily transaction categorization

### 4. Telegram Bot Setup

#### Create the Bot:
1. **Open Telegram** and search for `@BotFather`
2. **Start a chat** with BotFather
3. **Create new bot**:
   ```
   /newbot
   ```
4. **Choose bot name**: "YNAB Budget Bot" (or whatever you prefer)
5. **Choose username**: something like `your_name_ynab_bot`
6. **Copy the Bot Token** from BotFather's response

**Example token format**: `1234567890:ABCdefGHIjklMNOpqrsTUVwxyz`

#### Get Your Chat ID:
1. **Send a message** to your new bot (anything like "hello")
2. **Visit this URL** in your browser (replace YOUR_BOT_TOKEN):
   ```
   https://api.telegram.org/botYOUR_BOT_TOKEN/getUpdates
   ```
3. **Find your Chat ID** in the response:
   ```json
   {
     "result": [{
       "message": {
         "chat": {
           "id": 123456789,  ← This is your Chat ID
           "type": "private"
         }
       }
     }]
   }
   ```

**Example Chat ID**: `123456789` (just numbers)

---

## 🛠 VPS Setup Options

### Option 1: DigitalOcean (Recommended)
- **Droplet**: Basic plan ($6/month)
- **OS**: Ubuntu 22.04 LTS
- **Size**: 1GB RAM, 25GB SSD

### Option 2: Linode
- **Nanode**: 1GB plan ($5/month)
- **OS**: Ubuntu 22.04 LTS

### Option 3: AWS EC2
- **Instance**: t3.micro
- **OS**: Ubuntu 22.04 LTS
- **Note**: May cost more than dedicated VPS providers

### Option 4: Self-Hosted
- **Requirements**: Always-on computer with Ubuntu/Docker
- **Pros**: No monthly cost
- **Cons**: Need reliable internet, power, maintenance

---

## 📝 Environment Configuration

Once you have all the tokens, create your `.env` file:

```bash
# Copy the example file
cp .env.example .env

# Edit with your actual values
nano .env
```

**Fill in these values**:
```env
# YNAB Configuration
YNAB_API_KEY=your_ynab_personal_access_token_here
BUDGET_ID=6abd0309-5bdb-40e3-ae88-746eabd102a2

# Claude API Configuration  
CLAUDE_API_KEY=your_claude_api_key_starting_with_sk-ant

# Telegram Configuration
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
TELEGRAM_CHAT_ID=your_telegram_chat_id_number

# Security (generate a random 32-character string)
ENCRYPTION_KEY=your_random_32_character_encryption_key

# Environment
NODE_ENV=production
```

**To generate an encryption key**:
```bash
openssl rand -hex 16
```

---

## 🚀 Deployment Steps

### 1. Clone Repository to VPS
```bash
git clone https://github.com/your-username/ynab-mcp-automation.git
cd ynab-mcp-automation
```

### 2. Set Up Environment
```bash
cp .env.example .env
nano .env  # Add your API keys
```

### 3. Run Setup Script
```bash
chmod +x deployment/setup-vps.sh
./deployment/setup-vps.sh
```

### 4. Start Services
```bash
docker-compose up -d
```

### 5. Verify Everything Works
```bash
# Check services are running
docker-compose ps

# Test budget validation
npm test

# Check logs
docker-compose logs
```

---

## 📊 Cost Breakdown

| Service | Monthly Cost | Notes |
|---------|-------------|--------|
| VPS (DigitalOcean) | $6.00 | Basic droplet |
| Claude API | $3-5.00 | ~100 categorizations/month |
| YNAB | $14.99 | Your existing subscription |
| Telegram Bot | $0.00 | Free |
| **Total** | **~$24-26** | vs n8n at similar cost |

---

## 🔒 Security Notes

1. **Never commit `.env` file** to git (already in .gitignore)
2. **Use strong encryption key** (32+ random characters)
3. **Keep API keys private** - don't share in chat/email
4. **Regularly rotate keys** (quarterly recommended)
5. **Monitor API usage** to detect unauthorized access

---

## 🎯 Testing Your Setup

### Quick Validation:
```bash
# Test budget math
npm test

# Check Docker services
npm run health-check

# View live logs
npm run logs
```

### Full Integration Test:
```bash
# Test with real YNAB data (safe - read-only)
npm run test:integration
```

---

## 📞 Troubleshooting

### Common Issues:

**"YNAB API Error 401"**
- Check your YNAB_API_KEY is correct
- Ensure token hasn't expired

**"Telegram Bot Not Responding"**
- Verify TELEGRAM_BOT_TOKEN format
- Check TELEGRAM_CHAT_ID is numeric
- Send a message to your bot first

**"Claude API Error"**
- Confirm CLAUDE_API_KEY starts with `sk-ant-`
- Check you have API credits/billing setup

**"Docker Services Won't Start"**
- Ensure .env file exists with all required values
- Check Docker daemon is running: `sudo systemctl start docker`

---

## ✅ Ready to Deploy!

Once you have:
- ✅ All API keys and tokens
- ✅ VPS set up with Ubuntu 22.04
- ✅ .env file configured
- ✅ Tests passing

You're ready to deploy your automated YNAB budget system! 🎉

**Next**: Run the deployment script and start automating your finances with Claude.