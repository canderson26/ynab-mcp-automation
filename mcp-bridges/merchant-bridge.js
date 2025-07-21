#!/usr/bin/env node

/**
 * Merchant MCP Bridge
 * Converts stdio MCP protocol to HTTP calls for Claude Code integration
 */

import fetch from 'node-fetch';

const MCP_SERVER_URL = process.env.MERCHANT_MCP_URL || 'http://localhost:3002/mcp';

// Set up stdio handling
process.stdin.setEncoding('utf8');
let buffer = '';

process.stdin.on('data', async (chunk) => {
  buffer += chunk;
  const lines = buffer.split('\n');
  buffer = lines.pop() || '';
  
  for (const line of lines) {
    if (line.trim()) {
      try {
        const request = JSON.parse(line);
        
        const response = await fetch(MCP_SERVER_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(request)
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        process.stdout.write(JSON.stringify(result) + '\n');
        
      } catch (error) {
        const errorResponse = {
          jsonrpc: '2.0',
          id: null,
          error: {
            code: -32603,
            message: error.message || 'Internal error'
          }
        };
        
        try {
          const request = JSON.parse(line);
          errorResponse.id = request.id || null;
        } catch {}
        
        process.stdout.write(JSON.stringify(errorResponse) + '\n');
      }
    }
  }
});

process.stdin.on('end', () => {
  process.exit(0);
});

// Handle termination signals
process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));