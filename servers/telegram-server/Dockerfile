FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S telegram -u 1001

# Create directories and set permissions
RUN mkdir -p /app/logs
RUN chown -R telegram:nodejs /app

USER telegram

CMD ["node", "index.js"]