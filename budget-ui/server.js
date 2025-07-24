#!/usr/bin/env node

/**
 * Budget Assistant UI Bridge Server
 * Connects beautiful web UI to Claude Code running locally
 */

require('dotenv').config();

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

// Environment configuration
const PORT = process.env.PORT || 3000;
const CLAUDE_WORKSPACE = process.env.CLAUDE_WORKSPACE || '/Users/charlie/claude-budget-workspace';
const CLAUDE_TIMEOUT = parseInt(process.env.CLAUDE_TIMEOUT) || 120000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

// Error types and user-friendly messages
const ErrorTypes = {
    CLAUDE_UNAVAILABLE: 'claude_unavailable',
    TIMEOUT: 'timeout', 
    PROCESS_ERROR: 'process_error',
    WORKSPACE_ERROR: 'workspace_error',
    NETWORK_ERROR: 'network_error',
    UNKNOWN: 'unknown'
};

const ErrorMessages = {
    [ErrorTypes.CLAUDE_UNAVAILABLE]: {
        title: 'Claude Code Unavailable',
        message: 'Claude Code is not available. Please ensure it\'s installed and accessible.',
        userAction: 'Try refreshing the page or contact support if the issue persists.'
    },
    [ErrorTypes.TIMEOUT]: {
        title: 'Request Timeout',
        message: 'Your request took longer than expected to process.',
        userAction: 'Please try asking a simpler question or try again later.'
    },
    [ErrorTypes.PROCESS_ERROR]: {
        title: 'Processing Error',
        message: 'There was an error processing your request.',
        userAction: 'Please try rephrasing your question or try again.'
    },
    [ErrorTypes.WORKSPACE_ERROR]: {
        title: 'Configuration Error',
        message: 'Budget workspace configuration is incorrect.',
        userAction: 'Please contact support for assistance.'
    },
    [ErrorTypes.NETWORK_ERROR]: {
        title: 'Connection Error',
        message: 'Unable to connect to the budget service.',
        userAction: 'Please check your connection and try again.'
    },
    [ErrorTypes.UNKNOWN]: {
        title: 'Unexpected Error',
        message: 'An unexpected error occurred.',
        userAction: 'Please try again or contact support if the issue persists.'
    }
};

// Enhanced logging function
function logError(errorType, details, context = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
        timestamp,
        level: 'ERROR',
        type: errorType,
        details,
        context,
        environment: NODE_ENV
    };
    
    if (LOG_LEVEL === 'debug' || NODE_ENV === 'development') {
        console.error(JSON.stringify(logEntry, null, 2));
    } else {
        console.error(`[${timestamp}] ERROR: ${errorType} - ${details}`);
    }
}

// Format error for client
function formatErrorForClient(errorType, additionalContext = {}) {
    const errorInfo = ErrorMessages[errorType] || ErrorMessages[ErrorTypes.UNKNOWN];
    return {
        type: 'error',
        errorType,
        ...errorInfo,
        timestamp: new Date().toISOString(),
        context: additionalContext
    };
}

// Validate required environment variables
if (!fs.existsSync(CLAUDE_WORKSPACE)) {
    logError(ErrorTypes.WORKSPACE_ERROR, `Workspace directory not found: ${CLAUDE_WORKSPACE}`);
    console.error('Please set CLAUDE_WORKSPACE environment variable to a valid directory');
    process.exit(1);
}

// Input validation and sanitization middleware
function validateInput(input) {
    if (typeof input !== 'string') {
        return null;
    }
    
    // Basic validation
    if (input.length > 2000) {
        return null; // Too long
    }
    
    // Remove dangerous patterns
    const sanitized = input
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .trim();
    
    return sanitized;
}

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
        this.conversationHistory = [];
    }

    start() {
        console.log('🚀 Claude Code initialized');
        
        // Test Claude Code is available
        const testProcess = spawn('claude', ['--print', '--dangerously-skip-permissions'], {
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
                logError(ErrorTypes.CLAUDE_UNAVAILABLE, 'Claude Code test failed', { exitCode: code });
            }
        });

        testProcess.on('error', (error) => {
            logError(ErrorTypes.CLAUDE_UNAVAILABLE, 'Claude Code not available', { 
                error: error.message,
                code: error.code 
            });
        });
    }

    sendMessage(message, retryCount = 0) {
        console.log('Sending to Claude Code:', message.substring(0, 100) + '...');
        
        // Add to conversation history
        this.conversationHistory.push({
            role: 'user',
            content: message,
            timestamp: new Date().toISOString()
        });
        
        // Build conversation context - include recent history
        let conversationContext = '';
        if (this.conversationHistory.length > 1) {
            // Include last 10 exchanges to maintain context while avoiding token limits
            const recentHistory = this.conversationHistory.slice(-20);
            conversationContext = recentHistory.map(entry => {
                if (entry.role === 'user') {
                    return `Human: ${entry.content}`;
                } else {
                    return `Assistant: ${entry.content}`;
                }
            }).join('\n\n') + '\n\n';
        }
        
        const messageWithContext = conversationContext + `Human: ${message}`;
        
        // Use spawn with stdin approach - more reliable than exec
        const claudeProcess = spawn('claude', ['--print', '--dangerously-skip-permissions'], {
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
            logError(ErrorTypes.TIMEOUT, 'Claude Code process timeout', { 
                timeout: CLAUDE_TIMEOUT,
                retryCount 
            });
            claudeProcess.kill('SIGTERM');
            
            // Send timeout error to client
            wss.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify(formatErrorForClient(ErrorTypes.TIMEOUT, {
                        retryCount,
                        canRetry: retryCount < 2
                    })));
                }
            });
        }, CLAUDE_TIMEOUT);

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
            const responseText = response.trim();
            const isExecutionError = responseText === 'Execution error' || 
                                   responseText === '' ||
                                   (responseText.length < 20 && !responseText.includes(' ')) ||
                                   (responseText.startsWith('{') && responseText.length < 50) ||
                                   (code !== 0 && responseText.length < 30);
            
            if (isExecutionError && retryCount < 2) {
                logError(ErrorTypes.PROCESS_ERROR, 'Execution error detected, retrying', { 
                    attempt: retryCount + 1,
                    responseLength: response.length,
                    exitCode: code
                });
                // Remove the failed attempt from history before retrying
                this.conversationHistory.pop();
                setTimeout(() => {
                    this.sendMessage(message, retryCount + 1);
                }, 1000); // Wait 1 second before retry
                return;
            }

            if (code !== 0) {
                logError(ErrorTypes.PROCESS_ERROR, 'Claude Code exited with non-zero code', {
                    exitCode: code,
                    errorOutput: errorOutput.substring(0, 500), // Limit error output size
                    responseLength: response.length
                });
            }
            
            if (response.length < 100) {
                logError(ErrorTypes.PROCESS_ERROR, 'Short response received', {
                    responseLength: response.length,
                    response: response.substring(0, 200),
                    errorOutput: errorOutput.substring(0, 200)
                });
            }
            
            console.log('First 200 chars of response:', response.substring(0, 200));
            
            // If still getting execution error after retries, send structured error
            if (responseText === 'Execution error' || (isExecutionError && retryCount >= 2)) {
                // Remove failed attempt from history
                this.conversationHistory.pop();
                wss.clients.forEach(client => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify(formatErrorForClient(ErrorTypes.PROCESS_ERROR, {
                            retriesExhausted: true,
                            originalResponse: response.trim()
                        })));
                    }
                });
                return;
            }
            
            // Add successful response to conversation history
            this.conversationHistory.push({
                role: 'assistant',
                content: responseText,
                timestamp: new Date().toISOString()
            });
            
            // Keep conversation history manageable (last 50 exchanges)
            if (this.conversationHistory.length > 50) {
                this.conversationHistory = this.conversationHistory.slice(-50);
            }
            
            // Broadcast to all connected clients
            wss.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({
                        type: 'claude_response',
                        data: responseText
                    }));
                }
            });
        });

        claudeProcess.on('error', (error) => {
            if (processTimeout) {
                clearTimeout(processTimeout);
                processTimeout = null;
            }

            logError(ErrorTypes.PROCESS_ERROR, 'Claude Code process error', {
                error: error.message,
                code: error.code,
                retryCount
            });
            
            // Retry on process errors too
            if (retryCount < 2) {
                // Remove the failed attempt from history before retrying
                this.conversationHistory.pop();
                setTimeout(() => {
                    this.sendMessage(message, retryCount + 1);
                }, 1000);
                return;
            }
            
            // Remove failed attempt from history
            this.conversationHistory.pop();
            
            // Send structured error message to client after exhausting retries
            wss.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify(formatErrorForClient(ErrorTypes.PROCESS_ERROR, {
                        retriesExhausted: true,
                        errorCode: error.code
                    })));
                }
            });
        });

        // Send the message with context to Claude
        try {
            claudeProcess.stdin.write(messageWithContext);
            claudeProcess.stdin.end();
        } catch (writeError) {
            logError(ErrorTypes.PROCESS_ERROR, 'Failed to write to Claude process', {
                error: writeError.message,
                retryCount
            });
            
            if (processTimeout) {
                clearTimeout(processTimeout);
                processTimeout = null;
            }
            
            // Remove failed attempt from history
            this.conversationHistory.pop();
            
            // Send error to client
            wss.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify(formatErrorForClient(ErrorTypes.PROCESS_ERROR, {
                        phase: 'message_write',
                        canRetry: retryCount < 2
                    })));
                }
            });
        }
    }

    clearHistory() {
        this.conversationHistory = [];
        console.log('🧹 Conversation history cleared');
    }

    stop() {
        console.log('🛑 Claude Code manager stopped');
        this.isReady = false;
        this.conversationHistory = [];
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
                    // Validate and sanitize user input
                    const sanitizedMessage = validateInput(message.data);
                    if (!sanitizedMessage) {
                        ws.send(JSON.stringify(formatErrorForClient(ErrorTypes.PROCESS_ERROR, {
                            phase: 'input_validation',
                            reason: 'Invalid or malicious input detected'
                        })));
                        return;
                    }
                    claude.sendMessage(sanitizedMessage);
                    break;
                    
                case 'ping':
                    ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
                    break;
                    
                default:
                    console.log('Unknown message type:', message.type);
            }
        } catch (error) {
            logError(ErrorTypes.UNKNOWN, 'Error processing WebSocket message', {
                error: error.message,
                messageType: message.type
            });
            
            ws.send(JSON.stringify(formatErrorForClient(ErrorTypes.UNKNOWN, {
                phase: 'message_processing'
            })));
        }
    });

    ws.on('close', () => {
        console.log('👋 Client disconnected');
    });

    ws.on('error', (error) => {
        logError(ErrorTypes.NETWORK_ERROR, 'WebSocket error', {
            error: error.message,
            code: error.code
        });
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