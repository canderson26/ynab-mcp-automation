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
RUN adduser -S ynab -u 1001

# Create directories and set permissions
RUN mkdir -p /app/data /app/logs
RUN chown -R ynab:nodejs /app

USER ynab

EXPOSE 3000

CMD ["node", "index.js"]