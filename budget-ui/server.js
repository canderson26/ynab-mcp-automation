#!/usr/bin/env node

/**
 * Budget Assistant UI Bridge Server
 * Connects beautiful web UI to Claude Code running locally
 */

const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;
const CLAUDE_WORKSPACE = '/Users/charlie/claude-budget-workspace';

// Serve static files (our beautiful UI)
app.use(express.static('public'));

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Claude Code process management
class ClaudeCodeManager {
    constructor() {
        this.process = null;
        this.isReady = false;
        this.messageQueue = [];
    }

    start() {
        console.log('🚀 Claude Code initialized');
        
        // Test Claude Code is available
        const testProcess = spawn('claude', ['--print'], {
            cwd: CLAUDE_WORKSPACE,
            stdio: ['pipe', 'pipe', 'pipe'],
            env: { ...process.env }
        });

        testProcess.stdin.write('test');
        testProcess.stdin.end();

        testProcess.on('close', (code) => {
            if (code === 0) {
                this.isReady = true;
                console.log('✅ Claude Code is ready');
            } else {
                console.error('❌ Claude Code test failed');
            }
        });

        testProcess.on('error', (error) => {
            console.error('❌ Claude Code not available:', error.message);
        });
    }

    sendMessage(message) {
        console.log('Sending to Claude Code:', message.substring(0, 100) + '...');
        
        // Try using exec instead of spawn for better shell handling
        const command = `cd "${CLAUDE_WORKSPACE}" && echo "${message.replace(/"/g, '\\"')}" | claude --print`;
        console.log('Executing command:', command.substring(0, 150) + '...');
        
        exec(command, {
            env: {
                ...process.env,
                PATH: process.env.PATH
            },
            maxBuffer: 1024 * 1024 * 10, // 10MB buffer
            timeout: 60000 // 60 second timeout
        }, (error, stdout, stderr) => {
            console.log(`Claude Code exec completed`);
            console.log(`Claude Code response received (${stdout.length} chars)`);
            
            if (error) {
                console.error(`Claude Code execution error:`, error);
                console.error('Error output:', stderr);
            }
            
            if (stderr) {
                console.error('Claude Code stderr:', stderr);
            }
            
            if (stdout.length < 100) {
                console.log('Short response content:', JSON.stringify(stdout));
                console.log('Raw response:', stdout);
                console.log('Error output:', stderr);
            }
            
            console.log('First 200 chars of response:', stdout.substring(0, 200));
            
            // Broadcast to all connected clients
            wss.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({
                        type: 'claude_response',
                        data: stdout.trim()
                    }));
                }
            });
        });
    }

    stop() {
        console.log('🛑 Claude Code manager stopped');
        this.isReady = false;
    }
}

// Global Claude Code manager
const claude = new ClaudeCodeManager();

// WebSocket connection handling
wss.on('connection', (ws) => {
    console.log('🔗 New client connected');
    
    // Send connection status
    ws.send(JSON.stringify({
        type: 'connection_status',
        data: {
            connected: true,
            claude_ready: claude.isReady,
            timestamp: new Date().toISOString()
        }
    }));

    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data);
            console.log('📨 Received:', message.type);

            switch (message.type) {
                case 'user_message':
                    claude.sendMessage(message.data);
                    break;
                    
                case 'ping':
                    ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
                    break;
                    
                default:
                    console.log('Unknown message type:', message.type);
            }
        } catch (error) {
            console.error('Error processing message:', error);
        }
    });

    ws.on('close', () => {
        console.log('👋 Client disconnected');
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
});

// Start the server
server.listen(PORT, () => {
    console.log('🌟 Budget Assistant UI running!');
    console.log(`📱 Web interface: http://localhost:${PORT}`);
    console.log(`💰 Claude workspace: ${CLAUDE_WORKSPACE}`);
    console.log('');
    
    // Start Claude Code
    claude.start();
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down gracefully...');
    claude.stop();
    server.close(() => {
        console.log('👋 Server closed');
        process.exit(0);
    });
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Received SIGTERM, shutting down...');
    claude.stop();
    server.close(() => {
        process.exit(0);
    });
});