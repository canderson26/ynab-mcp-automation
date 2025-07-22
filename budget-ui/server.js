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
const crypto = require('crypto');

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

    sendMessage(message, retryCount = 0) {
        console.log('Sending to Claude Code:', message.substring(0, 100) + '...');
        
        // Use spawn with stdin approach - more reliable than exec
        const claudeProcess = spawn('claude', ['--print'], {
            cwd: CLAUDE_WORKSPACE,
            stdio: ['pipe', 'pipe', 'pipe'],
            env: {
                ...process.env,
                PATH: process.env.PATH
            }
        });

        let response = '';
        let errorOutput = '';
        let processTimeout = null;

        // Set a timeout for the process
        processTimeout = setTimeout(() => {
            console.log('Claude Code process timeout, killing...');
            claudeProcess.kill('SIGTERM');
        }, 30000); // 30 second timeout

        claudeProcess.stdout.on('data', (data) => {
            response += data.toString();
        });

        claudeProcess.stderr.on('data', (data) => {
            errorOutput += data.toString();
            console.error('Claude Code stderr:', data.toString());
        });

        claudeProcess.on('close', (code) => {
            if (processTimeout) {
                clearTimeout(processTimeout);
                processTimeout = null;
            }

            console.log(`Claude Code process closed with code: ${code}`);
            console.log(`Claude Code response received (${response.length} chars)`);
            
            // Check if we got "Execution error" or other failure indicators
            const isExecutionError = response.trim() === 'Execution error' || 
                                   response.trim().length < 50 || 
                                   (code !== 0 && response.trim().length < 100);
            
            if (isExecutionError && retryCount < 2) {
                console.log(`Execution error detected, retrying... (attempt ${retryCount + 1})`);
                setTimeout(() => {
                    this.sendMessage(message, retryCount + 1);
                }, 1000); // Wait 1 second before retry
                return;
            }

            if (code !== 0) {
                console.error(`Claude Code exited with non-zero code: ${code}`);
                console.error('Error output:', errorOutput);
            }
            
            if (response.length < 100) {
                console.log('Short response content:', JSON.stringify(response));
                console.log('Raw response:', response);
                console.log('Error output:', errorOutput);
            }
            
            console.log('First 200 chars of response:', response.substring(0, 200));
            
            // If still getting execution error after retries, send a helpful message
            if (response.trim() === 'Execution error') {
                response = 'I encountered an issue processing your request. Please try again or rephrase your question.';
            }
            
            // Broadcast to all connected clients
            wss.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({
                        type: 'claude_response',
                        data: response.trim()
                    }));
                }
            });
        });

        claudeProcess.on('error', (error) => {
            if (processTimeout) {
                clearTimeout(processTimeout);
                processTimeout = null;
            }

            console.error('Claude Code process error:', error);
            
            // Retry on process errors too
            if (retryCount < 2) {
                console.log(`Process error, retrying... (attempt ${retryCount + 1})`);
                setTimeout(() => {
                    this.sendMessage(message, retryCount + 1);
                }, 1000);
                return;
            }
            
            // Send error message to client
            wss.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({
                        type: 'claude_response',
                        data: 'Sorry, there was an error processing your request. Please try again.'
                    }));
                }
            });
        });

        // Send the message to Claude
        try {
            claudeProcess.stdin.write(message);
            claudeProcess.stdin.end();
        } catch (writeError) {
            console.error('Failed to write to Claude process:', writeError);
            
            if (processTimeout) {
                clearTimeout(processTimeout);
                processTimeout = null;
            }
        }
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