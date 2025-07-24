/**
 * NavigationManager - Handles view switching and navigation state
 */

import { Logger } from '/src/js/utils/logger.js';
import { ErrorHandler } from '/src/js/utils/errorHandler.js';

export class NavigationManager {
    constructor(loadingManager) {
        this.logger = new Logger('NavigationManager');
        this.errorHandler = new ErrorHandler();
        this.loading = loadingManager;
        
        // Navigation state
        this.currentView = 'chat';
        this.previousView = null;
        this.viewHistory = [];
        
        // Available views
        this.views = {
            chat: {
                element: null,
                title: 'Chat with Budgie',
                showInput: true
            },
            history: {
                element: null,
                title: 'Chat History',
                showInput: false
            }
        };
        
        // DOM elements will be cached during init
        this.chatView = null;
        this.historyView = null;
        this.inputArea = null;
    }

    init() {
        try {
            this.logger.info('Initializing NavigationManager');
            
            // Cache DOM elements
            this.cacheDOMElements();
            
            // Set up view configuration
            this.setupViews();
            
            // Set up chat history functionality
            this.setupChatHistory();
            
            // Set up logo click handler
            this.setupLogoHandler();
            
            // Initialize with chat view
            this.showView('chat');
            
            this.logger.info('NavigationManager initialized successfully');
            
        } catch (error) {
            this.errorHandler.handleError(error, 'Failed to initialize NavigationManager');
        }
    }

    cacheDOMElements() {
        this.chatView = document.querySelector('.chat-view');
        this.historyView = document.querySelector('.chat-history-page');
        this.inputArea = document.querySelector('.input-area');
        
        if (!this.chatView || !this.historyView) {
            throw new Error('Required view elements not found');
        }
    }

    setupViews() {
        // Configure view objects
        this.views.chat.element = this.chatView;
        this.views.history.element = this.historyView;
        
        // Set up history-specific elements
        this.setupHistoryView();
    }

    setupHistoryView() {
        // Set up new chat button in history view
        const newChatBtn = this.historyView.querySelector('.new-chat-btn-large');
        if (newChatBtn) {
            newChatBtn.addEventListener('click', () => {
                this.createNewChatFromHistory();
            });
        }
        
        // Set up chat search
        const searchInput = this.historyView.querySelector('#chat-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterChatHistory(e.target.value);
            });
        }
    }

    setupLogoHandler() {
        const logoElement = document.getElementById('budgie-logo');
        if (logoElement) {
            this.logger.info('Logo handler setup successfully');
            logoElement.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('DEBUG: Logo clicked!');
                this.logger.info('Logo clicked - navigating to chat view');
                this.showView('chat');
            });
        } else {
            this.logger.warn('Budgie logo element not found');
            console.warn('DEBUG: Logo element not found during setup');
        }
    }

    setupChatHistory() {
        // This will be called to populate the chat history view
        this.refreshChatHistory();
    }

    showView(viewName) {
        try {
            if (!this.views[viewName]) {
                this.logger.warn(`Unknown view: ${viewName}`);
                return false;
            }
            
            // Store previous view
            this.previousView = this.currentView;
            this.viewHistory.push(this.currentView);
            
            // Hide all views
            Object.values(this.views).forEach(view => {
                if (view.element) {
                    view.element.classList.remove('active');
                    view.element.style.display = 'none';
                }
            });
            
            // Show target view
            const targetView = this.views[viewName];
            if (targetView.element) {
                targetView.element.style.display = 'flex';
                targetView.element.classList.add('active');
            }
            
            // Handle input area visibility
            if (this.inputArea) {
                if (targetView.showInput) {
                    this.inputArea.style.display = 'block';
                } else {
                    this.inputArea.style.display = 'none';
                }
            }
            
            // Update current view
            this.currentView = viewName;
            
            // Update document title
            document.title = `${targetView.title} - Budgie`;
            
            // Refresh view-specific content
            this.refreshViewContent(viewName);
            
            // Dispatch navigation event
            this.dispatchNavigationEvent(viewName);
            
            this.logger.info(`Navigated to view: ${viewName}`);
            return true;
            
        } catch (error) {
            this.errorHandler.handleError(error, `Failed to show view: ${viewName}`);
            return false;
        }
    }

    refreshViewContent(viewName) {
        switch (viewName) {
            case 'history':
                this.refreshChatHistory();
                break;
            case 'chat':
                // Focus input if returning to chat
                setTimeout(() => {
                    const inputField = document.getElementById('chat-input');
                    if (inputField) {
                        inputField.focus();
                    }
                }, 100);
                break;
        }
    }

    refreshChatHistory() {
        try {
            const chatManager = window.budgetApp?.components?.chat;
            if (!chatManager) {
                this.logger.warn('ChatManager not available for history refresh');
                return;
            }
            
            // Show loading skeleton while fetching history
            const historyList = this.historyView.querySelector('#chat-history-items');
            if (historyList) {
                historyList.innerHTML = '';
                const skeleton = this.loading.showCardSkeleton(historyList, 4);
                
                // Simulate async loading
                setTimeout(() => {
                    this.loading.hideSkeleton(skeleton);
                    const chatHistory = chatManager.getChatHistory();
                    this.renderChatHistory(chatHistory);
                }, 300);
            }
            
        } catch (error) {
            this.errorHandler.handleError(error, 'Failed to refresh chat history');
        }
    }

    renderChatHistory(chatHistory) {
        const historyList = this.historyView.querySelector('#chat-history-items');
        const chatCount = this.historyView.querySelector('#chat-count');
        
        if (!historyList) return;
        
        // Update chat count
        if (chatCount) {
            chatCount.textContent = chatHistory.length.toString();
        }
        
        // Clear existing items
        historyList.innerHTML = '';
        
        if (chatHistory.length === 0) {
            historyList.innerHTML = `
                <div class="empty-history">
                    <div class="empty-history-icon">💬</div>
                    <div class="empty-history-title">No chat history yet</div>
                    <div class="empty-history-text">Start a conversation with Budgie to see your chat history here.</div>
                </div>
            `;
            return;
        }
        
        // Render chat items
        chatHistory.forEach(chat => {
            const chatItem = this.createChatHistoryItem(chat);
            historyList.appendChild(chatItem);
        });
    }

    createChatHistoryItem(chat) {
        const item = document.createElement('div');
        item.className = 'chat-history-item';
        item.setAttribute('data-chat-id', chat.id);
        
        const messageCount = chat.messages ? chat.messages.length : 0;
        const lastMessage = chat.messages ? chat.messages[chat.messages.length - 1] : null;
        const preview = lastMessage ? this.truncateText(lastMessage.content, 120) : 'No messages';
        
        const date = new Date(chat.timestamp);
        const formattedDate = this.formatDate(date);
        
        item.innerHTML = `
            <div class="chat-history-item-header">
                <div class="chat-history-item-title">${this.escapeHtml(chat.title)}</div>
                <div class="chat-history-item-date">${formattedDate}</div>
            </div>
            <div class="chat-history-item-preview">${this.escapeHtml(preview)}</div>
            <div class="chat-history-item-meta">
                <span class="chat-history-item-count">${messageCount} messages</span>
                <div class="chat-history-item-actions">
                    <button class="chat-action-btn" onclick="window.budgetApp.components.navigation.loadChat('${chat.id}')" title="Load chat">
                        💬
                    </button>
                    <button class="chat-action-btn delete" onclick="window.budgetApp.components.navigation.deleteChat('${chat.id}')" title="Delete chat">
                        🗑️
                    </button>
                </div>
            </div>
        `;
        
        // Add click handler to load chat
        item.addEventListener('click', (e) => {
            // Don't trigger if clicking on action buttons
            if (!e.target.closest('.chat-action-btn')) {
                this.loadChat(chat.id);
            }
        });
        
        return item;
    }

    filterChatHistory(searchTerm) {
        const historyItems = this.historyView.querySelectorAll('.chat-history-item');
        const normalizedSearch = searchTerm.toLowerCase().trim();
        
        historyItems.forEach(item => {
            const title = item.querySelector('.chat-history-item-title')?.textContent || '';
            const preview = item.querySelector('.chat-history-item-preview')?.textContent || '';
            
            const matches = title.toLowerCase().includes(normalizedSearch) || 
                          preview.toLowerCase().includes(normalizedSearch);
            
            item.style.display = matches ? 'block' : 'none';
        });
    }

    loadChat(chatId) {
        try {
            const chatManager = window.budgetApp?.components?.chat;
            if (chatManager) {
                chatManager.loadChat(chatId);
                this.showView('chat');
                this.logger.info(`Loaded chat: ${chatId}`);
            }
        } catch (error) {
            this.errorHandler.handleError(error, `Failed to load chat: ${chatId}`);
        }
    }

    deleteChat(chatId) {
        try {
            const confirmed = confirm('Are you sure you want to delete this chat? This action cannot be undone.');
            if (!confirmed) return;
            
            const chatManager = window.budgetApp?.components?.chat;
            if (chatManager) {
                const chatHistory = chatManager.getChatHistory();
                const updatedHistory = chatHistory.filter(chat => chat.id !== chatId);
                
                // Update chat manager's history
                chatManager.chatHistory = updatedHistory;
                chatManager.saveChatHistory();
                
                // Refresh the history view
                this.refreshChatHistory();
                
                this.logger.info(`Deleted chat: ${chatId}`);
            }
        } catch (error) {
            this.errorHandler.handleError(error, `Failed to delete chat: ${chatId}`);
        }
    }

    createNewChatFromHistory() {
        try {
            const chatManager = window.budgetApp?.components?.chat;
            if (chatManager) {
                chatManager.createNewChat();
                this.showView('chat');
            }
        } catch (error) {
            this.errorHandler.handleError(error, 'Failed to create new chat from history');
        }
    }

    goBack() {
        if (this.viewHistory.length > 0) {
            const previousView = this.viewHistory.pop();
            this.showView(previousView);
        }
    }

    getCurrentView() {
        return this.currentView;
    }

    isCurrentView(viewName) {
        return this.currentView === viewName;
    }

    dispatchNavigationEvent(viewName) {
        const event = new CustomEvent('navigationChange', {
            detail: { 
                currentView: viewName, 
                previousView: this.previousView 
            }
        });
        document.dispatchEvent(event);
    }

    // Utility methods
    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    formatDate(date) {
        const now = new Date();
        const diffMs = now - date;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if (diffDays === 1) {
            return 'Yesterday';
        } else if (diffDays < 7) {
            return `${diffDays} days ago`;
        } else {
            return date.toLocaleDateString();
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}