FROM node:20-alpine

WORKDIR /app

# Install sqlite3
RUN apk add --no-cache sqlite

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S merchant -u 1001

# Create directories and set permissions
RUN mkdir -p /app/data /app/logs
RUN chown -R merchant:nodejs /app

USER merchant

# Initialize database on startup
CMD ["sh", "-c", "node init-database.js && node index.js"]