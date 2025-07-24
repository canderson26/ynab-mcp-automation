/**
 * WebSocket Manager - Handles connection to budget bridge server
 */

import { Logger } from '/src/js/utils/logger.js';
import { ErrorHandler } from '/src/js/utils/errorHandler.js';

export class WebSocketManager {
    constructor() {
        this.logger = new Logger('WebSocketManager');
        this.errorHandler = new ErrorHandler();
        this.ws = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectInterval = 2000;
        this.messageHandlers = new Map();
        
        // Connection state callbacks
        this.onConnectCallbacks = [];
        this.onDisconnectCallbacks = [];
    }

    connect() {
        try {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            // In development, connect to the backend server on port 3000
            const isDev = window.location.port === '3001';
            const wsUrl = isDev 
                ? `${protocol}//localhost:3000`
                : `${protocol}//${window.location.host}`;
            
            this.logger.info(`Connecting to WebSocket: ${wsUrl}`);
            
            this.ws = new WebSocket(wsUrl);
            this.setupEventHandlers();
            
        } catch (error) {
            this.errorHandler.handleError(error, 'Failed to create WebSocket connection');
        }
    }

    setupEventHandlers() {
        this.ws.onopen = () => {
            this.logger.info('WebSocket connected');
            this.isConnected = true;
            this.reconnectAttempts = 0;
            this.updateConnectionStatus('Budgie Online');
            
            // Notify listeners
            this.onConnectCallbacks.forEach(callback => callback());
        };

        this.ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                this.handleMessage(message);
            } catch (error) {
                this.logger.error('Failed to parse WebSocket message', error);
            }
        };

        this.ws.onclose = () => {
            this.logger.warn('WebSocket disconnected');
            this.isConnected = false;
            this.updateConnectionStatus('Disconnected - Reconnecting...');
            
            // Notify listeners
            this.onDisconnectCallbacks.forEach(callback => callback());
            
            // Attempt reconnection
            this.attemptReconnect();
        };

        this.ws.onerror = (error) => {
            this.logger.error('WebSocket error', error);
            this.errorHandler.handleError(error, 'WebSocket connection error');
        };
    }

    handleMessage(message) {
        this.logger.debug('Received message', message.type);
        
        // Route message to appropriate handler
        const handler = this.messageHandlers.get(message.type);
        if (handler) {
            handler(message);
        } else {
            this.logger.warn(`No handler for message type: ${message.type}`);
        }
    }

    attemptReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            this.logger.error('Max reconnection attempts reached');
            this.updateConnectionStatus('Connection Failed');
            return;
        }

        this.reconnectAttempts++;
        this.logger.info(`Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
        
        setTimeout(() => {
            this.connect();
        }, this.reconnectInterval);
    }

    send(message) {
        if (!this.isConnected || !this.ws) {
            this.logger.warn('Cannot send message: WebSocket not connected');
            return false;
        }

        try {
            this.ws.send(JSON.stringify(message));
            return true;
        } catch (error) {
            this.errorHandler.handleError(error, 'Failed to send WebSocket message');
            return false;
        }
    }

    // Message handler registration
    onMessage(type, handler) {
        this.messageHandlers.set(type, handler);
    }

    // Connection state callbacks
    onConnect(callback) {
        this.onConnectCallbacks.push(callback);
    }

    onDisconnect(callback) {
        this.onDisconnectCallbacks.push(callback);
    }

    updateConnectionStatus(status) {
        const statusElement = document.querySelector('.connection-status span');
        if (statusElement) {
            statusElement.textContent = status;
        }
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.isConnected = false;
    }
}