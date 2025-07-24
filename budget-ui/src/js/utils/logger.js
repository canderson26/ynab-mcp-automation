/**
 * Logger - Structured logging utility with multiple levels and outputs
 */

export class Logger {
    constructor(context = 'Default') {
        this.context = context;
        this.logs = [];
        this.maxLogs = 500; // Limit stored logs
        
        // Log levels
        this.levels = {
            DEBUG: 0,
            INFO: 1,
            WARN: 2,
            ERROR: 3
        };
        
        // Current log level (can be configured)
        this.currentLevel = this.levels.INFO;
        
        // Output configuration
        this.outputs = {
            console: true,
            storage: true,
            remote: false // For future monitoring integration
        };
        
        // Log colors for console output
        this.colors = {
            DEBUG: '#808080',   // Gray
            INFO: '#0066cc',    // Blue  
            WARN: '#ff9900',    // Orange
            ERROR: '#cc0000'    // Red
        };
        
        // Session info
        this.sessionId = this.getSessionId();
        this.startTime = Date.now();
    }

    debug(message, ...args) {
        this.log('DEBUG', message, ...args);
    }

    info(message, ...args) {
        this.log('INFO', message, ...args);
    }

    warn(message, ...args) {
        this.log('WARN', message, ...args);
    }

    error(message, ...args) {
        this.log('ERROR', message, ...args);
    }

    log(level, message, ...args) {
        // Check if level is enabled
        if (this.levels[level] < this.currentLevel) {
            return;
        }

        const logEntry = this.createLogEntry(level, message, args);
        
        // Store log entry
        this.storeLogs(logEntry);
        
        // Output to console
        if (this.outputs.console) {
            this.outputToConsole(logEntry);
        }
        
        // Store in localStorage
        if (this.outputs.storage) {
            this.outputToStorage(logEntry);
        }
        
        // Send to remote service (future)
        if (this.outputs.remote) {
            this.outputToRemote(logEntry);
        }
    }

    createLogEntry(level, message, args) {
        const timestamp = new Date().toISOString();
        const relativeTime = Date.now() - this.startTime;
        
        return {
            id: this.generateLogId(),
            timestamp,
            relativeTime,
            level,
            context: this.context,
            message: this.formatMessage(message),
            args: this.serializeArgs(args),
            sessionId: this.sessionId,
            url: window.location.href,
            userAgent: navigator.userAgent.substring(0, 100) // Truncate for storage
        };
    }

    formatMessage(message) {
        if (typeof message === 'string') {
            return message;
        }
        
        if (message instanceof Error) {
            return `${message.name}: ${message.message}`;
        }
        
        try {
            return JSON.stringify(message);
        } catch (e) {
            return String(message);
        }
    }

    serializeArgs(args) {
        return args.map(arg => {
            if (arg instanceof Error) {
                return {
                    type: 'Error',
                    name: arg.name,
                    message: arg.message,
                    stack: arg.stack
                };
            }
            
            if (typeof arg === 'object' && arg !== null) {
                try {
                    return JSON.parse(JSON.stringify(arg));
                } catch (e) {
                    return '[Circular Reference]';
                }
            }
            
            return arg;
        });
    }

    storeLogs(logEntry) {
        this.logs.unshift(logEntry);
        
        // Limit stored logs
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(0, this.maxLogs);
        }
    }

    outputToConsole(logEntry) {
        const style = `color: ${this.colors[logEntry.level]}; font-weight: bold;`;
        const timeStyle = 'color: #666; font-size: 0.9em;';
        const contextStyle = 'color: #333; font-weight: bold;';
        
        const timeString = new Date(logEntry.timestamp).toLocaleTimeString();
        const relativeString = `+${logEntry.relativeTime}ms`;
        
        console.groupCollapsed(
            `%c[${logEntry.level}]%c %c${timeString}%c %c(${relativeString})%c %c[${logEntry.context}]%c ${logEntry.message}`,
            style, '',
            timeStyle, '',
            timeStyle, '',
            contextStyle, '',
        );
        
        if (logEntry.args.length > 0) {
            logEntry.args.forEach((arg, index) => {
                console.log(`Arg ${index}:`, arg);
            });
        }
        
        console.groupEnd();
    }

    outputToStorage(logEntry) {
        try {
            // Store recent logs in localStorage
            const recentLogs = this.logs.slice(0, 50); // Keep only recent 50 logs
            const storageKey = 'budgie_logs';
            
            localStorage.setItem(storageKey, JSON.stringify(recentLogs));
        } catch (e) {
            // Storage might be full or disabled
            console.warn('Failed to store logs in localStorage:', e);
        }
    }

    outputToRemote(logEntry) {
        // Future: Send to monitoring service
        // This would be implemented when we have a remote logging service
        if (window.budgetApp?.config?.remoteLogging) {
            // Send to remote service
        }
    }

    // Public API methods
    setLevel(level) {
        if (typeof level === 'string' && this.levels[level] !== undefined) {
            this.currentLevel = this.levels[level];
            this.info(`Log level set to ${level}`);
        } else if (typeof level === 'number' && level >= 0 && level <= 3) {
            this.currentLevel = level;
            this.info(`Log level set to ${level}`);
        } else {
            this.warn(`Invalid log level: ${level}`);
        }
    }

    setContext(context) {
        this.context = context;
        this.info(`Logger context changed to: ${context}`);
    }

    enableOutput(output) {
        if (this.outputs.hasOwnProperty(output)) {
            this.outputs[output] = true;
            this.info(`${output} output enabled`);
        } else {
            this.warn(`Unknown output type: ${output}`);
        }
    }

    disableOutput(output) {
        if (this.outputs.hasOwnProperty(output)) {
            this.outputs[output] = false;
            this.info(`${output} output disabled`);
        } else {
            this.warn(`Unknown output type: ${output}`);
        }
    }

    getRecentLogs(limit = 20) {
        return this.logs.slice(0, limit);
    }

    getLogsByLevel(level) {
        return this.logs.filter(log => log.level === level);
    }

    getLogsByContext(context) {
        return this.logs.filter(log => log.context === context);
    }

    searchLogs(query) {
        const lowerQuery = query.toLowerCase();
        return this.logs.filter(log => 
            log.message.toLowerCase().includes(lowerQuery) ||
            log.context.toLowerCase().includes(lowerQuery)
        );
    }

    clearLogs() {
        this.logs = [];
        this.info('Log history cleared');
        
        try {
            localStorage.removeItem('budgie_logs');
        } catch (e) {
            console.warn('Failed to clear logs from localStorage:', e);
        }
    }

    exportLogs(format = 'json') {
        switch (format) {
            case 'json':
                return JSON.stringify(this.logs, null, 2);
            case 'csv':
                return this.exportToCsv();
            case 'txt':
                return this.exportToText();
            default:
                this.warn(`Unknown export format: ${format}`);
                return null;
        }
    }

    exportToCsv() {
        const headers = ['Timestamp', 'Level', 'Context', 'Message', 'Args'];
        const rows = this.logs.map(log => [
            log.timestamp,
            log.level,
            log.context,
            log.message.replace(/"/g, '""'), // Escape quotes
            JSON.stringify(log.args).replace(/"/g, '""')
        ]);
        
        const csvContent = [headers, ...rows]
            .map(row => row.map(field => `"${field}"`).join(','))
            .join('\n');
            
        return csvContent;
    }

    exportToText() {
        return this.logs.map(log => {
            const time = new Date(log.timestamp).toLocaleString();
            const argsStr = log.args.length > 0 ? ` | Args: ${JSON.stringify(log.args)}` : '';
            return `[${time}] [${log.level}] [${log.context}] ${log.message}${argsStr}`;
        }).join('\n');
    }

    getLogStats() {
        const stats = {
            total: this.logs.length,
            levels: {},
            contexts: {},
            session: {
                id: this.sessionId,
                duration: Date.now() - this.startTime,
                startTime: new Date(this.startTime).toISOString()
            }
        };

        // Count by level
        Object.keys(this.levels).forEach(level => {
            stats.levels[level] = this.logs.filter(log => log.level === level).length;
        });

        // Count by context
        const contexts = [...new Set(this.logs.map(log => log.context))];
        contexts.forEach(context => {
            stats.contexts[context] = this.logs.filter(log => log.context === context).length;
        });

        return stats;
    }

    // Utility methods
    generateLogId() {
        return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    getSessionId() {
        let sessionId = sessionStorage.getItem('budgie_session_id');
        if (!sessionId) {
            sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            sessionStorage.setItem('budgie_session_id', sessionId);
        }
        return sessionId;
    }

    // Performance logging helpers
    time(label) {
        this.debug(`Timer started: ${label}`);
        console.time(label);
    }

    timeEnd(label) {
        console.timeEnd(label);
        this.debug(`Timer ended: ${label}`);
    }

    // Memory usage logging
    logMemoryUsage() {
        if (performance.memory) {
            const memory = performance.memory;
            this.info('Memory usage:', {
                used: `${Math.round(memory.usedJSHeapSize / 1024 / 1024)} MB`,
                total: `${Math.round(memory.totalJSHeapSize / 1024 / 1024)} MB`,
                limit: `${Math.round(memory.jsHeapSizeLimit / 1024 / 1024)} MB`
            });
        } else {
            this.warn('Memory usage information not available');
        }
    }
}

// Create default logger instance
export const logger = new Logger('App');