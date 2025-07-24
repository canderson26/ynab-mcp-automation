/**
 * ErrorHandler - Centralized error management and reporting
 */

export class ErrorHandler {
    constructor() {
        this.errors = [];
        this.maxErrors = 100; // Limit stored errors
        this.reportingEnabled = true;
        this.consoleLogging = true;
        
        // Error categories
        this.categories = {
            NETWORK: 'network',
            WEBSOCKET: 'websocket',
            UI: 'ui',
            COMPONENT: 'component',
            VALIDATION: 'validation',
            UNKNOWN: 'unknown'
        };
        
        // Error severity levels
        this.severity = {
            LOW: 'low',
            MEDIUM: 'medium',
            HIGH: 'high',
            CRITICAL: 'critical'
        };
    }

    handleError(error, context = '', category = null, severity = null) {
        try {
            const errorInfo = this.processError(error, context, category, severity);
            
            // Store error
            this.storeError(errorInfo);
            
            // Log to console if enabled
            if (this.consoleLogging) {
                this.logToConsole(errorInfo);
            }
            
            // Show user-friendly notification for critical errors
            if (errorInfo.severity === this.severity.CRITICAL) {
                this.showUserNotification(errorInfo);
            }
            
            // Report to monitoring service (if configured)
            if (this.reportingEnabled) {
                this.reportError(errorInfo);
            }
            
            return errorInfo;
            
        } catch (handlerError) {
            // Fallback error handling
            console.error('Error in ErrorHandler:', handlerError);
            console.error('Original error:', error);
        }
    }

    processError(error, context, category, severity) {
        const errorInfo = {
            id: this.generateErrorId(),
            timestamp: new Date().toISOString(),
            message: this.extractErrorMessage(error),
            context: context || 'Unknown context',
            category: category || this.categorizeError(error),
            severity: severity || this.determineSeverity(error),
            stack: this.extractStack(error),
            userAgent: navigator.userAgent,
            url: window.location.href,
            userId: this.getUserId(), // For future authentication
            sessionId: this.getSessionId()
        };

        // Add additional error details
        if (error instanceof Error) {
            errorInfo.name = error.name;
            errorInfo.fileName = error.fileName;
            errorInfo.lineNumber = error.lineNumber;
            errorInfo.columnNumber = error.columnNumber;
        }

        return errorInfo;
    }

    extractErrorMessage(error) {
        if (typeof error === 'string') {
            return error;
        }
        
        if (error instanceof Error) {
            return error.message;
        }
        
        if (error && error.message) {
            return error.message;
        }
        
        return 'Unknown error occurred';
    }

    extractStack(error) {
        if (error instanceof Error && error.stack) {
            return error.stack;
        }
        
        // Try to get current stack trace
        try {
            throw new Error();
        } catch (e) {
            return e.stack || 'Stack trace not available';
        }
    }

    categorizeError(error) {
        const message = this.extractErrorMessage(error).toLowerCase();
        
        if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
            return this.categories.NETWORK;
        }
        
        if (message.includes('websocket') || message.includes('socket')) {
            return this.categories.WEBSOCKET;
        }
        
        if (message.includes('element') || message.includes('dom') || message.includes('ui')) {
            return this.categories.UI;
        }
        
        if (message.includes('component') || message.includes('manager')) {
            return this.categories.COMPONENT;
        }
        
        if (message.includes('validation') || message.includes('invalid')) {
            return this.categories.VALIDATION;
        }
        
        return this.categories.UNKNOWN;
    }

    determineSeverity(error) {
        const message = this.extractErrorMessage(error).toLowerCase();
        
        // Critical errors that break core functionality
        if (message.includes('failed to initialize') || 
            message.includes('cannot connect') ||
            message.includes('critical') ||
            message.includes('fatal')) {
            return this.severity.CRITICAL;
        }
        
        // High severity errors that impact user experience
        if (message.includes('failed to send') ||
            message.includes('connection error') ||
            message.includes('timeout')) {
            return this.severity.HIGH;
        }
        
        // Medium severity errors that are noticeable but not critical
        if (message.includes('warning') ||
            message.includes('failed to load') ||
            message.includes('not found')) {
            return this.severity.MEDIUM;
        }
        
        // Low severity errors that don't significantly impact functionality
        return this.severity.LOW;
    }

    storeError(errorInfo) {
        this.errors.unshift(errorInfo);
        
        // Limit stored errors
        if (this.errors.length > this.maxErrors) {
            this.errors = this.errors.slice(0, this.maxErrors);
        }
        
        // Store in localStorage for persistence across sessions
        try {
            const recentErrors = this.errors.slice(0, 10); // Store only recent errors
            localStorage.setItem('budgie_recent_errors', JSON.stringify(recentErrors));
        } catch (storageError) {
            console.warn('Failed to store errors in localStorage:', storageError);
        }
    }

    logToConsole(errorInfo) {
        const logMessage = `[${errorInfo.category.toUpperCase()}] ${errorInfo.context}: ${errorInfo.message}`;
        
        switch (errorInfo.severity) {
            case this.severity.CRITICAL:
                console.error('🚨', logMessage, errorInfo);
                break;
            case this.severity.HIGH:
                console.error('⚠️', logMessage, errorInfo);
                break;
            case this.severity.MEDIUM:
                console.warn('⚠️', logMessage, errorInfo);
                break;
            case this.severity.LOW:
                console.info('ℹ️', logMessage, errorInfo);
                break;
            default:
                console.log(logMessage, errorInfo);
        }
    }

    showUserNotification(errorInfo) {
        // Create a user-friendly error notification
        const notification = document.createElement('div');
        notification.className = 'error-notification critical';
        notification.innerHTML = `
            <div class="error-notification-content">
                <div class="error-notification-header">
                    <span class="error-notification-icon">⚠️</span>
                    <span class="error-notification-title">Something went wrong</span>
                    <button class="error-notification-close" onclick="this.parentElement.parentElement.parentElement.remove()">×</button>
                </div>
                <div class="error-notification-message">
                    ${this.getUserFriendlyMessage(errorInfo)}
                </div>
                <div class="error-notification-actions">
                    <button class="error-notification-retry" onclick="window.location.reload()">Reload Page</button>
                    <button class="error-notification-dismiss" onclick="this.parentElement.parentElement.parentElement.remove()">Dismiss</button>
                </div>
            </div>
        `;
        
        // Add to page
        document.body.appendChild(notification);
        
        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 10000);
    }

    getUserFriendlyMessage(errorInfo) {
        switch (errorInfo.category) {
            case this.categories.NETWORK:
                return "We're having trouble connecting to the server. Please check your internet connection and try again.";
            case this.categories.WEBSOCKET:
                return "Connection to Budgie was lost. We're trying to reconnect automatically.";
            case this.categories.UI:
                return "There was a problem with the interface. Try refreshing the page.";
            case this.categories.COMPONENT:
                return "A component failed to load properly. Please refresh the page.";
            case this.categories.VALIDATION:
                return "There was a validation error. Please check your input and try again.";
            default:
                return "An unexpected error occurred. Please try refreshing the page.";
        }
    }

    reportError(errorInfo) {
        // In a production environment, this would send to a monitoring service
        // For now, we'll just log it
        if (window.budgetApp?.config?.errorReporting) {
            // Future: Send to monitoring service
            console.log('Error reported to monitoring service:', errorInfo.id);
        }
    }

    // Utility methods
    generateErrorId() {
        return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    getUserId() {
        // Future: Get from authentication system
        return localStorage.getItem('budgie_user_id') || 'anonymous';
    }

    getSessionId() {
        let sessionId = sessionStorage.getItem('budgie_session_id');
        if (!sessionId) {
            sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            sessionStorage.setItem('budgie_session_id', sessionId);
        }
        return sessionId;
    }

    // Public API methods
    getRecentErrors(limit = 10) {
        return this.errors.slice(0, limit);
    }

    getErrorsByCategory(category) {
        return this.errors.filter(error => error.category === category);
    }

    getErrorsBySeverity(severity) {
        return this.errors.filter(error => error.severity === severity);
    }

    clearErrors() {
        this.errors = [];
        try {
            localStorage.removeItem('budgie_recent_errors');
        } catch (e) {
            console.warn('Failed to clear errors from localStorage:', e);
        }
    }

    getErrorStats() {
        const stats = {
            total: this.errors.length,
            categories: {},
            severity: {},
            recent: this.errors.filter(e => 
                new Date() - new Date(e.timestamp) < 24 * 60 * 60 * 1000
            ).length
        };

        // Count by category
        Object.values(this.categories).forEach(category => {
            stats.categories[category] = this.errors.filter(e => e.category === category).length;
        });

        // Count by severity
        Object.values(this.severity).forEach(level => {
            stats.severity[level] = this.errors.filter(e => e.severity === level).length;
        });

        return stats;
    }

    // Configuration methods
    enableReporting() {
        this.reportingEnabled = true;
    }

    disableReporting() {
        this.reportingEnabled = false;
    }

    enableConsoleLogging() {
        this.consoleLogging = true;
    }

    disableConsoleLogging() {
        this.consoleLogging = false;
    }
}