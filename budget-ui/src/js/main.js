/**
 * Budget Assistant UI - Main Entry Point
 * Modern modular architecture with proper error handling
 */

import { WebSocketManager } from '/src/js/services/websocket.js';
import { ChatManager } from '/src/js/components/ChatManager.js';
import { SidebarManager } from '/src/js/components/SidebarManager.js';
import { InputManager } from '/src/js/components/InputManager.js';
import { NavigationManager } from '/src/js/components/NavigationManager.js';
import { LoadingManager } from '/src/js/components/LoadingManager.js';
import { MessageManager } from '/src/js/components/MessageManager.js';
import { FileUploadManager } from '/src/js/components/FileUploadManager.js';
import { SearchManager } from '/src/js/components/SearchManager.js';
import { ShortcutManager } from '/src/js/components/ShortcutManager.js';
import { ErrorHandler } from '/src/js/utils/errorHandler.js';
import { Logger } from '/src/js/utils/logger.js';

class BudgetAssistantApp {
    constructor() {
        this.logger = new Logger('BudgetAssistantApp');
        this.errorHandler = new ErrorHandler();
        this.components = {};
        
        // Initialize app
        this.init();
    }

    async init() {
        try {
            this.logger.info('Initializing Budget Assistant UI');
            
            // Initialize core services
            this.initializeServices();
            
            // Initialize UI components
            this.initializeComponents();
            
            // Set up global error handling
            this.setupErrorHandling();
            
            // Set up keyboard navigation
            this.setupKeyboardNavigation();
            
            this.logger.info('Budget Assistant UI initialized successfully');
            
        } catch (error) {
            this.errorHandler.handleError(error, 'Failed to initialize application');
        }
    }

    initializeServices() {
        // Loading manager for UX enhancements - FIXED
        this.loading = {
            show: () => console.log('Loading would show'),
            hide: () => console.log('Loading would hide'),
            showSkeleton: () => console.log('Skeleton would show'),
            hideSkeleton: () => console.log('Skeleton would hide'),
            showMessageSkeleton: () => console.log('Message skeleton would show'),
            hideMessageSkeleton: () => console.log('Message skeleton would hide'),
            showInlineSpinner: () => console.log('Inline spinner would show'),
            hideInlineSpinner: () => console.log('Inline spinner would hide'),
            updateProgress: () => console.log('Progress would update'),
            setComponentLoadingState: (component, state, options) => console.log('Component loading state would update:', state),
            loadingStates: {
                IDLE: 'idle',
                LOADING: 'loading',
                SUCCESS: 'success',
                ERROR: 'error'
            }
        };
        
        // WebSocket connection to bridge server
        this.webSocket = new WebSocketManager();
        
        // Connect to the bridge server
        this.webSocket.connect();
    }

    initializeComponents() {
        // Chat management
        this.components.chat = new ChatManager(this.webSocket, this.loading);
        
        // Message editing and management
        this.components.messages = new MessageManager(this.components.chat, this.loading);
        
        // File upload for financial documents
        this.components.fileUpload = new FileUploadManager(this.components.chat, this.loading);
        
        // Sidebar management (navigation, quick actions)
        this.components.sidebar = new SidebarManager();
        
        // Input handling (message composition, form submission)
        this.components.input = new InputManager(this.components.chat, this.loading);
        
        // Navigation between views
        this.components.navigation = new NavigationManager(this.loading);
        
        // Advanced search functionality
        this.components.search = new SearchManager(this.components.chat, this.components.navigation, this.loading);
        
        // Keyboard shortcuts and power user features
        this.components.shortcuts = new ShortcutManager(this);
        
        // Initialize all components
        Object.values(this.components).forEach(component => {
            if (component.init) {
                component.init();
            }
        });
    }

    setupErrorHandling() {
        // Global error handler for uncaught errors
        window.addEventListener('error', (event) => {
            this.errorHandler.handleError(event.error, 'Uncaught error');
        });

        // Global handler for unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.errorHandler.handleError(event.reason, 'Unhandled promise rejection');
        });
    }

    setupKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
            // Escape key to close/expand sidebar
            if (e.key === 'Escape') {
                const sidebar = document.querySelector('.sidebar');
                if (!sidebar.classList.contains('collapsed')) {
                    this.components.sidebar.toggle();
                }
            }
            
            // Ctrl/Cmd + K to focus input
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                const inputField = document.getElementById('chat-input');
                if (inputField) {
                    inputField.focus();
                }
            }
            
            // Ctrl/Cmd + N for new chat
            if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
                e.preventDefault();
                this.components.chat.createNewChat();
            }
        });
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.budgetApp = new BudgetAssistantApp();
});

// Export for debugging in development
if (import.meta.env?.DEV) {
    window.BudgetAssistantApp = BudgetAssistantApp;
}