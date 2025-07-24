/**
 * SidebarManager - Handles sidebar navigation and quick actions
 */

import { Logger } from '/src/js/utils/logger.js';
import { ErrorHandler } from '/src/js/utils/errorHandler.js';

export class SidebarManager {
    constructor() {
        this.logger = new Logger('SidebarManager');
        this.errorHandler = new ErrorHandler();
        
        // Sidebar state
        this.isCollapsed = false;
        this.isResizing = false;
        this.startX = 0;
        this.startWidth = 0;
        this.minWidth = 60;
        this.maxWidth = 400;
        this.defaultWidth = 180;
        
        // DOM elements will be cached during init
        this.sidebar = null;
        this.toggleButton = null;
        this.toggleIcon = null;
        this.resizeHandle = null;
        this.actionButtons = [];
        this.navItems = [];
    }

    init() {
        try {
            this.logger.info('Initializing SidebarManager');
            
            // Cache DOM elements
            this.cacheDOMElements();
            
            // Set up event listeners
            this.setupToggleButton();
            this.setupResizeHandle();
            this.setupQuickActions();
            this.setupNavigation();
            
            // Load saved state
            this.loadSidebarState();
            
            this.logger.info('SidebarManager initialized successfully');
            
        } catch (error) {
            this.errorHandler.handleError(error, 'Failed to initialize SidebarManager');
        }
    }

    cacheDOMElements() {
        this.sidebar = document.querySelector('.sidebar');
        this.toggleButton = document.querySelector('.toggle-sidebar');
        this.toggleIcon = document.getElementById('toggle-icon');
        this.resizeHandle = document.querySelector('.resize-handle');
        this.actionButtons = Array.from(document.querySelectorAll('.sidebar-action-btn'));
        this.navItems = Array.from(document.querySelectorAll('.nav-item'));
        
        if (!this.sidebar || !this.toggleButton) {
            throw new Error('Required sidebar elements not found');
        }
    }

    setupToggleButton() {
        this.toggleButton.addEventListener('click', () => {
            this.toggle();
        });
    }

    setupResizeHandle() {
        if (!this.resizeHandle) return;
        
        this.resizeHandle.addEventListener('mousedown', (e) => {
            this.startResize(e);
        });
        
        document.addEventListener('mousemove', (e) => {
            this.handleResize(e);
        });
        
        document.addEventListener('mouseup', () => {
            this.stopResize();
        });
    }

    setupQuickActions() {
        // Fund Bills action
        const fundBillsBtn = this.actionButtons.find(btn => 
            btn.querySelector('.sidebar-action-text')?.textContent.includes('Fund Bills')
        );
        if (fundBillsBtn) {
            fundBillsBtn.addEventListener('click', () => {
                this.triggerQuickAction('Fund upcoming bills based on due dates and amounts');
            });
        }

        // Categorize action
        const categorizeBtn = this.actionButtons.find(btn => 
            btn.querySelector('.sidebar-action-text')?.textContent.includes('Categorize')
        );
        if (categorizeBtn) {
            categorizeBtn.addEventListener('click', () => {
                this.triggerQuickAction('Show me unapproved transactions that need categorizing');
            });
        }

        // Analyze Spending action
        const analyzeBtn = this.actionButtons.find(btn => 
            btn.querySelector('.sidebar-action-text')?.textContent.includes('Analyze')
        );
        if (analyzeBtn) {
            analyzeBtn.addEventListener('click', () => {
                this.triggerQuickAction('Analyze my spending patterns and budget performance');
            });
        }

        // Rebalance action
        const rebalanceBtn = this.actionButtons.find(btn => 
            btn.querySelector('.sidebar-action-text')?.textContent.includes('Rebalance')
        );
        if (rebalanceBtn) {
            rebalanceBtn.addEventListener('click', () => {
                this.triggerQuickAction('Help me rebalance my budget by moving money between categories');
            });
        }
    }

    setupNavigation() {
        this.navItems.forEach((navItem, index) => {
            navItem.addEventListener('click', () => {
                this.handleNavigation(index);
            });
        });
    }

    toggle() {
        try {
            this.isCollapsed = !this.isCollapsed;
            
            if (this.isCollapsed) {
                this.collapse();
            } else {
                this.expand();
            }
            
            // Save state
            this.saveSidebarState();
            
            this.logger.info(`Sidebar ${this.isCollapsed ? 'collapsed' : 'expanded'}`);
            
        } catch (error) {
            this.errorHandler.handleError(error, 'Failed to toggle sidebar');
        }
    }

    collapse() {
        this.sidebar.classList.add('collapsed');
        this.toggleIcon.textContent = '›';
        this.toggleButton.setAttribute('aria-expanded', 'false');
        
        // Update CSS custom property for responsive layout
        document.documentElement.style.setProperty('--sidebar-width', '60px');
        
        // Dispatch event for other components
        this.dispatchSidebarEvent('collapsed');
    }

    expand() {
        this.sidebar.classList.remove('collapsed');
        this.toggleIcon.textContent = '‹';
        this.toggleButton.setAttribute('aria-expanded', 'true');
        
        // Restore width
        const savedWidth = localStorage.getItem('budgie_sidebar_width') || this.defaultWidth;
        document.documentElement.style.setProperty('--sidebar-width', `${savedWidth}px`);
        
        // Dispatch event for other components
        this.dispatchSidebarEvent('expanded');
    }

    startResize(e) {
        if (this.isCollapsed) return;
        
        this.isResizing = true;
        this.startX = e.clientX;
        this.startWidth = parseInt(document.defaultView.getComputedStyle(this.sidebar).width, 10);
        
        document.body.style.cursor = 'ew-resize';
        document.body.style.userSelect = 'none';
        
        e.preventDefault();
    }

    handleResize(e) {
        if (!this.isResizing) return;
        
        const delta = e.clientX - this.startX;
        let newWidth = this.startWidth + delta;
        
        // Constrain width
        newWidth = Math.max(this.minWidth, Math.min(newWidth, this.maxWidth));
        
        // Apply new width
        document.documentElement.style.setProperty('--sidebar-width', `${newWidth}px`);
        
        e.preventDefault();
    }

    stopResize() {
        if (!this.isResizing) return;
        
        this.isResizing = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        
        // Save the new width
        const currentWidth = parseInt(getComputedStyle(this.sidebar).width, 10);
        localStorage.setItem('budgie_sidebar_width', currentWidth.toString());
        
        this.logger.info(`Sidebar resized to ${currentWidth}px`);
    }

    triggerQuickAction(message) {
        try {
            // Get the chat manager from the main app
            const chatManager = window.budgetApp?.components?.chat;
            if (chatManager) {
                chatManager.sendMessage(message);
                this.logger.info(`Quick action triggered: ${message}`);
            } else {
                this.logger.warn('ChatManager not available for quick action');
            }
        } catch (error) {
            this.errorHandler.handleError(error, 'Failed to trigger quick action');
        }
    }

    handleNavigation(navIndex) {
        try {
            // Remove active state from all nav items
            this.navItems.forEach(item => {
                item.classList.remove('active');
                item.setAttribute('aria-selected', 'false');
            });
            
            // Add active state to clicked nav item
            const clickedItem = this.navItems[navIndex];
            if (clickedItem) {
                clickedItem.classList.add('active');
                clickedItem.setAttribute('aria-selected', 'true');
            }
            
            // Handle navigation based on index
            switch (navIndex) {
                case 0: // Chat view
                    this.showChatView();
                    break;
                case 1: // Chat history
                    this.showChatHistory();
                    break;
                case 2: // New chat
                    this.createNewChat();
                    break;
                default:
                    this.logger.warn(`Unknown navigation index: ${navIndex}`);
            }
            
        } catch (error) {
            this.errorHandler.handleError(error, 'Failed to handle navigation');
        }
    }

    showChatView() {
        const navigationManager = window.budgetApp?.components?.navigation;
        if (navigationManager) {
            navigationManager.showView('chat');
        }
    }

    showChatHistory() {
        const navigationManager = window.budgetApp?.components?.navigation;
        if (navigationManager) {
            navigationManager.showView('history');
        }
    }

    createNewChat() {
        const chatManager = window.budgetApp?.components?.chat;
        if (chatManager) {
            chatManager.createNewChat();
            // Switch back to chat view
            this.showChatView();
            // Update navigation to show chat as active
            this.handleNavigation(0);
        }
    }

    loadSidebarState() {
        try {
            // Load collapsed state
            const collapsed = localStorage.getItem('budgie_sidebar_collapsed') === 'true';
            if (collapsed) {
                this.isCollapsed = false; // Set to false so toggle() will collapse it
                this.toggle();
            }
            
            // Load width
            const savedWidth = localStorage.getItem('budgie_sidebar_width');
            if (savedWidth && !this.isCollapsed) {
                const width = parseInt(savedWidth, 10);
                if (width >= this.minWidth && width <= this.maxWidth) {
                    document.documentElement.style.setProperty('--sidebar-width', `${width}px`);
                }
            }
            
        } catch (error) {
            this.logger.warn('Failed to load sidebar state:', error);
        }
    }

    saveSidebarState() {
        try {
            localStorage.setItem('budgie_sidebar_collapsed', this.isCollapsed.toString());
        } catch (error) {
            this.logger.warn('Failed to save sidebar state:', error);
        }
    }

    dispatchSidebarEvent(action) {
        const event = new CustomEvent('sidebarChange', {
            detail: { action, isCollapsed: this.isCollapsed }
        });
        document.dispatchEvent(event);
    }

    // Public API methods
    getState() {
        return {
            isCollapsed: this.isCollapsed,
            width: parseInt(getComputedStyle(this.sidebar).width, 10)
        };
    }

    setWidth(width) {
        if (this.isCollapsed) return;
        
        const constrainedWidth = Math.max(this.minWidth, Math.min(width, this.maxWidth));
        document.documentElement.style.setProperty('--sidebar-width', `${constrainedWidth}px`);
        localStorage.setItem('budgie_sidebar_width', constrainedWidth.toString());
    }
}