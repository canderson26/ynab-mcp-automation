/**
 * ShortcutManager - Comprehensive keyboard shortcuts and power user features
 */

import { Logger } from '/src/js/utils/logger.js';
import { ErrorHandler } from '/src/js/utils/errorHandler.js';

export class ShortcutManager {
    constructor(app) {
        this.logger = new Logger('ShortcutManager');
        this.errorHandler = new ErrorHandler();
        this.app = app;
        
        // Shortcut registry
        this.shortcuts = new Map();
        this.sequences = new Map(); // For multi-key sequences
        this.currentSequence = [];
        this.sequenceTimeout = null;
        this.sequenceTimeoutDuration = 1000;
        
        // Modal state
        this.activeModals = new Set();
        
        // Command palette state
        this.commandPalette = null;
        this.commandPaletteVisible = false;
        
        // Power user features
        this.quickActions = [];
        this.recentCommands = this.loadRecentCommands();
        this.customShortcuts = this.loadCustomShortcuts();
    }

    init() {
        try {
            this.logger.info('Initializing ShortcutManager');
            
            // Register default shortcuts
            this.registerDefaultShortcuts();
            
            // Create command palette
            this.createCommandPalette();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Create shortcut help overlay
            this.createShortcutHelp();
            
            // Inject styles
            this.injectShortcutStyles();
            
            this.logger.info('ShortcutManager initialized successfully');
            
        } catch (error) {
            this.errorHandler.handleError(error, 'Failed to initialize ShortcutManager');
        }
    }

    registerDefaultShortcuts() {
        // Navigation shortcuts
        this.register('ctrl+1', () => this.app.components.navigation.showView('chat'), 'Switch to Chat');
        this.register('ctrl+2', () => this.app.components.navigation.showView('history'), 'Switch to History');
        this.register('ctrl+n', () => this.app.components.chat.createNewChat(), 'New Chat');
        this.register('ctrl+shift+n', () => this.createNewWindow(), 'New Window');
        
        // Search shortcuts
        this.register('ctrl+/', () => this.app.components.search.showGlobalSearch(), 'Global Search');
        this.register('ctrl+f', () => this.focusSearch(), 'Search in Page');
        this.register('ctrl+shift+f', () => this.showAdvancedSearch(), 'Advanced Search');
        
        // Input shortcuts
        this.register('ctrl+k', () => this.focusInput(), 'Focus Input');
        this.register('ctrl+enter', () => this.submitMessage(), 'Send Message');
        this.register('ctrl+shift+enter', () => this.submitWithOptions(), 'Send with Options');
        this.register('ctrl+l', () => this.clearInput(), 'Clear Input');
        
        // Interface shortcuts  
        this.register('ctrl+b', () => this.app.components.sidebar.toggle(), 'Toggle Sidebar');
        this.register('ctrl+shift+b', () => this.toggleFullscreen(), 'Toggle Fullscreen');
        this.register('ctrl+,', () => this.showSettings(), 'Show Settings');
        
        // File operations
        this.register('ctrl+o', () => this.openFileDialog(), 'Open File');
        this.register('ctrl+s', () => this.saveChat(), 'Save Chat');
        this.register('ctrl+shift+s', () => this.exportChat(), 'Export Chat');
        
        // Power user shortcuts
        this.register('ctrl+shift+p', () => this.showCommandPalette(), 'Command Palette');
        this.register('ctrl+shift+k', () => this.showShortcutHelp(), 'Show Shortcuts');
        this.register('ctrl+shift+d', () => this.toggleDebugMode(), 'Toggle Debug Mode');
        
        // Quick actions (sequences)
        this.registerSequence(['g', 'h'], () => this.app.components.navigation.showView('history'), 'Go to History');
        this.registerSequence(['g', 'c'], () => this.app.components.navigation.showView('chat'), 'Go to Chat');
        this.registerSequence(['g', 'n'], () => this.app.components.chat.createNewChat(), 'Go to New Chat');
        
        // Financial shortcuts
        this.registerSequence(['f', 'b'], () => this.triggerQuickAction('Fund Bills'), 'Fund Bills');
        this.registerSequence(['f', 'c'], () => this.triggerQuickAction('Categorize'), 'Categorize Transactions');
        this.registerSequence(['f', 'a'], () => this.triggerQuickAction('Analyze Spending'), 'Analyze Spending');
        this.registerSequence(['f', 'r'], () => this.triggerQuickAction('Rebalance'), 'Rebalance Budget');
        
        // Developer shortcuts (only in dev mode)
        if (import.meta.env?.DEV) {
            this.register('ctrl+shift+i', () => this.toggleDevTools(), 'Toggle Dev Tools');
            this.register('ctrl+shift+r', () => window.location.reload(), 'Reload App');
            this.register('ctrl+shift+c', () => this.copyDebugInfo(), 'Copy Debug Info');
        }
    }

    register(shortcut, action, description) {
        const normalizedShortcut = this.normalizeShortcut(shortcut);
        this.shortcuts.set(normalizedShortcut, {
            action,
            description,
            shortcut: normalizedShortcut
        });
    }

    registerSequence(sequence, action, description) {
        const sequenceKey = sequence.join(' ');
        this.sequences.set(sequenceKey, {
            sequence,
            action,
            description,
        });
    }

    normalizeShortcut(shortcut) {
        return shortcut.toLowerCase()
            .replace(/\s+/g, '')
            .replace(/cmd/g, 'ctrl') // Normalize cmd to ctrl
            .split('+')
            .sort((a, b) => {
                const order = ['ctrl', 'alt', 'shift'];
                const aIndex = order.indexOf(a);
                const bIndex = order.indexOf(b);
                if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
                if (aIndex !== -1) return -1;
                if (bIndex !== -1) return 1;
                return a.localeCompare(b);
            })
            .join('+');
    }

    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            this.handleKeyDown(e);
        });
        
        document.addEventListener('keyup', (e) => {
            this.handleKeyUp(e);
        });
    }

    handleKeyDown(e) {
        try {
            // Skip if typing in input fields (unless it's a global shortcut)
            if (this.isTypingContext(e.target) && !this.isGlobalShortcut(e)) {
                return;
            }
            
            // Handle escape key (universal)
            if (e.key === 'Escape') {
                this.handleEscape();
                return;
            }
            
            // Build shortcut string
            const shortcut = this.buildShortcutString(e);
            
            // Check for registered shortcuts
            if (this.shortcuts.has(shortcut)) {
                e.preventDefault();
                const shortcutData = this.shortcuts.get(shortcut);
                this.executeShortcut(shortcutData);
                return;
            }
            
            // Handle sequence shortcuts
            this.handleSequenceInput(e);
            
        } catch (error) {
            this.errorHandler.handleError(error, 'Failed to handle keyboard shortcut');
        }
    }

    handleKeyUp(e) {
        // Handle any key up events if needed
    }

    buildShortcutString(e) {
        const parts = [];
        
        if (e.ctrlKey || e.metaKey) parts.push('ctrl');
        if (e.altKey) parts.push('alt');
        if (e.shiftKey) parts.push('shift');
        
        const key = e.key.toLowerCase();
        if (!['control', 'alt', 'shift', 'meta'].includes(key)) {
            parts.push(key);
        }
        
        return parts.join('+');
    }

    handleSequenceInput(e) {
        // Only handle single character keys for sequences
        if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
            this.currentSequence.push(e.key.toLowerCase());
            
            // Clear sequence timeout
            if (this.sequenceTimeout) {
                clearTimeout(this.sequenceTimeout);
            }
            
            // Check for matching sequences
            const sequenceKey = this.currentSequence.join(' ');
            
            if (this.sequences.has(sequenceKey)) {
                e.preventDefault();
                const sequenceData = this.sequences.get(sequenceKey);
                this.executeSequence(sequenceData);
                this.currentSequence = [];
                return;
            }
            
            // Check if current sequence could be part of a longer sequence
            let hasPartialMatch = false;
            for (const [key] of this.sequences) {
                if (key.startsWith(sequenceKey + ' ')) {
                    hasPartialMatch = true;
                    break;
                }
            }
            
            if (!hasPartialMatch) {
                this.currentSequence = [];
            } else {
                // Show sequence indicator
                this.showSequenceIndicator(this.currentSequence);
                
                // Set timeout to clear sequence
                this.sequenceTimeout = setTimeout(() => {
                    this.currentSequence = [];
                    this.hideSequenceIndicator();
                }, this.sequenceTimeoutDuration);
            }
        } else if (this.currentSequence.length > 0) {
            // Reset sequence if non-sequence key is pressed
            this.currentSequence = [];
            this.hideSequenceIndicator();
        }
    }

    executeShortcut(shortcutData) {
        try {
            this.logger.info(`Executing shortcut: ${shortcutData.description}`);
            this.addRecentCommand(shortcutData.description);
            shortcutData.action();
        } catch (error) {
            this.errorHandler.handleError(error, `Failed to execute shortcut: ${shortcutData.description}`);
        }
    }

    executeSequence(sequenceData) {
        try {
            this.logger.info(`Executing sequence: ${sequenceData.description}`);
            this.addRecentCommand(sequenceData.description);
            this.hideSequenceIndicator();
            sequenceData.action();
        } catch (error) {
            this.errorHandler.handleError(error, `Failed to execute sequence: ${sequenceData.description}`);
        }
    }

    isTypingContext(element) {
        const typingElements = ['input', 'textarea', 'select'];
        const elementName = element.tagName.toLowerCase();
        const isContentEditable = element.contentEditable === 'true';
        
        return typingElements.includes(elementName) || isContentEditable;
    }

    isGlobalShortcut(e) {
        const globalShortcuts = [
            'ctrl+shift+p', // Command palette
            'ctrl+/', // Global search
            'ctrl+shift+k' // Shortcut help
        ];
        
        const shortcut = this.buildShortcutString(e);
        return globalShortcuts.includes(shortcut);
    }

    handleEscape() {
        // Close command palette
        if (this.commandPaletteVisible) {
            this.hideCommandPalette();
            return;
        }
        
        // Close global search
        if (this.app.components.search) {
            this.app.components.search.hideGlobalSearch();
        }
        
        // Close any active modals
        if (this.activeModals.size > 0) {
            this.closeTopModal();
            return;
        }
        
        // Collapse sidebar if expanded
        if (this.app.components.sidebar && !this.app.components.sidebar.isCollapsed) {
            this.app.components.sidebar.toggle();
        }
    }

    // Command Palette
    createCommandPalette() {
        const palette = document.createElement('div');
        palette.className = 'command-palette-overlay';
        palette.id = 'command-palette';
        palette.innerHTML = `
            <div class="command-palette-container">
                <div class="command-palette-header">
                    <div class="command-input-container">
                        <svg class="command-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="3"></circle>
                            <path d="M12 1v6m0 6v6"></path>
                            <path d="m9 9 3-3 3 3"></path>
                            <path d="m9 15 3 3 3-3"></path>
                        </svg>
                        <input type="text" class="command-input" placeholder="Type a command..." id="command-input">
                    </div>
                </div>
                <div class="command-palette-content">
                    <div class="command-sections">
                        <div class="command-section">
                            <div class="command-section-title">Recent Commands</div>
                            <div class="command-list" id="recent-commands"></div>
                        </div>
                        <div class="command-section">
                            <div class="command-section-title">Available Commands</div>
                            <div class="command-list" id="available-commands"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(palette);
        this.commandPalette = palette;
        
        // Set up command palette handlers
        this.setupCommandPaletteHandlers();
    }

    setupCommandPaletteHandlers() {
        const input = document.getElementById('command-input');
        if (input) {
            input.addEventListener('input', (e) => {
                this.filterCommands(e.target.value);
            });
            
            input.addEventListener('keydown', (e) => {
                this.handleCommandPaletteKeydown(e);
            });
        }
        
        // Click outside to close
        this.commandPalette.addEventListener('click', (e) => {
            if (e.target === this.commandPalette) {
                this.hideCommandPalette();
            }
        });
    }

    showCommandPalette() {
        this.commandPaletteVisible = true;
        this.commandPalette.style.display = 'flex';
        
        setTimeout(() => {
            this.commandPalette.classList.add('visible');
            const input = document.getElementById('command-input');
            if (input) {
                input.focus();
            }
        }, 10);
        
        this.populateCommands();
    }

    hideCommandPalette() {
        this.commandPaletteVisible = false;
        this.commandPalette.classList.remove('visible');
        
        setTimeout(() => {
            this.commandPalette.style.display = 'none';
            const input = document.getElementById('command-input');
            if (input) {
                input.value = '';
            }
        }, 200);
    }

    populateCommands() {
        const recentContainer = document.getElementById('recent-commands');
        const availableContainer = document.getElementById('available-commands');
        
        // Populate recent commands
        recentContainer.innerHTML = '';
        this.recentCommands.slice(0, 5).forEach(command => {
            const item = this.createCommandItem(command, 'recent');
            recentContainer.appendChild(item);
        });
        
        // Populate available commands
        availableContainer.innerHTML = '';
        const allCommands = [
            ...Array.from(this.shortcuts.values()),
            ...Array.from(this.sequences.values())
        ];
        
        allCommands.slice(0, 10).forEach(command => {
            const item = this.createCommandItem(command, 'available');
            availableContainer.appendChild(item);
        });
    }

    createCommandItem(command, type) {
        const item = document.createElement('div');
        item.className = 'command-item';
        
        const description = typeof command === 'string' ? command : command.description;
        const shortcut = command.shortcut || (command.sequence ? command.sequence.join(' ') : '');
        
        item.innerHTML = `
            <div class="command-item-content">
                <div class="command-item-title">${description}</div>
                ${shortcut ? `<div class="command-item-shortcut">${this.formatShortcut(shortcut)}</div>` : ''}
            </div>
        `;
        
        item.addEventListener('click', () => {
            if (typeof command === 'string') {
                // Recent command - try to find and execute
                this.executeCommandByDescription(command);
            } else {
                // Direct command
                command.action();
            }
            this.hideCommandPalette();
        });
        
        return item;
    }

    filterCommands(query) {
        const items = document.querySelectorAll('.command-item');
        const queryLower = query.toLowerCase();
        
        items.forEach(item => {
            const title = item.querySelector('.command-item-title').textContent.toLowerCase();
            const matches = title.includes(queryLower);
            item.style.display = matches ? 'block' : 'none';
        });
    }

    handleCommandPaletteKeydown(e) {
        const items = Array.from(document.querySelectorAll('.command-item:not([style*="display: none"])'));
        const currentActive = document.querySelector('.command-item.active');
        
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                this.navigateCommandItems(items, currentActive, 'down');
                break;
            case 'ArrowUp':
                e.preventDefault();
                this.navigateCommandItems(items, currentActive, 'up');
                break;
            case 'Enter':
                e.preventDefault();
                if (currentActive) {
                    currentActive.click();
                }
                break;
        }
    }

    navigateCommandItems(items, currentActive, direction) {
        if (items.length === 0) return;
        
        let nextIndex = 0;
        
        if (currentActive) {
            currentActive.classList.remove('active');
            const currentIndex = items.indexOf(currentActive);
            nextIndex = direction === 'down' 
                ? (currentIndex + 1) % items.length
                : (currentIndex - 1 + items.length) % items.length;
        }
        
        items[nextIndex].classList.add('active');
        items[nextIndex].scrollIntoView({ block: 'nearest' });
    }

    // Shortcut Actions
    focusInput() {
        const input = document.getElementById('chat-input');
        if (input) {
            input.focus();
        }
    }

    focusSearch() {
        const search = document.getElementById('chat-search');
        if (search) {
            search.focus(); 
        }
    }

    submitMessage() {
        const input = document.getElementById('chat-input');
        if (input && input.value.trim()) {
            const form = input.closest('form');
            if (form) {
                form.dispatchEvent(new Event('submit'));
            }
        }
    }

    clearInput() {
        const input = document.getElementById('chat-input');
        if (input) {
            input.value = '';
            input.dispatchEvent(new Event('input'));
        }
    }

    triggerQuickAction(action) {
        const buttons = {
            'Fund Bills': () => document.querySelector('[aria-label="Fund upcoming bills based on due dates"]')?.click(),
            'Categorize': () => document.querySelector('[aria-label="Show and categorize unapproved transactions"]')?.click(),
            'Analyze Spending': () => document.querySelector('[aria-label="Analyze spending patterns and budget performance"]')?.click(),
            'Rebalance': () => document.querySelector('[aria-label="Move money between categories to rebalance budget"]')?.click()
        };
        
        const actionFn = buttons[action];
        if (actionFn) {
            actionFn();
        }
    }

    // Utility functions
    showSequenceIndicator(sequence) {
        let indicator = document.getElementById('sequence-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'sequence-indicator';
            indicator.className = 'sequence-indicator';
            document.body.appendChild(indicator);
        }
        
        indicator.textContent = sequence.join(' ') + '...';
        indicator.style.display = 'block';
    }

    hideSequenceIndicator() {
        const indicator = document.getElementById('sequence-indicator');
        if (indicator) {
            indicator.style.display = 'none';
        }
    }

    formatShortcut(shortcut) {
        return shortcut
            .replace(/ctrl/g, '⌘')
            .replace(/alt/g, '⌥')
            .replace(/shift/g, '⇧')
            .replace(/\+/g, ' + ')
            .toUpperCase();
    }

    addRecentCommand(command) {
        this.recentCommands = this.recentCommands.filter(c => c !== command);
        this.recentCommands.unshift(command);
        this.recentCommands = this.recentCommands.slice(0, 10);
        this.saveRecentCommands();
    }

    loadRecentCommands() {
        try {
            const saved = localStorage.getItem('budgie_recent_commands');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            return [];
        }
    }

    saveRecentCommands() {
        try {
            localStorage.setItem('budgie_recent_commands', JSON.stringify(this.recentCommands));
        } catch (e) {
            this.logger.warn('Failed to save recent commands:', e);
        }
    }

    loadCustomShortcuts() {
        try {
            const saved = localStorage.getItem('budgie_custom_shortcuts');
            return saved ? JSON.parse(saved) : {};
        } catch (e) {
            return {};
        }
    }

    createShortcutHelp() {
        const help = document.createElement('div');
        help.className = 'shortcut-help-overlay';
        help.id = 'shortcut-help';
        help.innerHTML = `
            <div class="shortcut-help-container">
                <div class="shortcut-help-header">
                    <h2>Keyboard Shortcuts</h2>
                    <button class="shortcut-help-close" onclick="window.budgetApp.components.shortcuts.hideShortcutHelp()">×</button>
                </div>
                <div class="shortcut-help-content">
                    <div class="shortcut-help-sections">
                        <div class="shortcut-section">
                            <h3>Navigation</h3>
                            <div class="shortcut-list" id="navigation-shortcuts"></div>
                        </div>
                        <div class="shortcut-section">
                            <h3>Chat</h3>
                            <div class="shortcut-list" id="chat-shortcuts"></div>
                        </div>
                        <div class="shortcut-section">
                            <h3>Quick Actions</h3>
                            <div class="shortcut-list" id="action-shortcuts"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(help);
        this.populateShortcutHelp();
    }

    populateShortcutHelp() {
        const sections = {
            'navigation-shortcuts': [
                { shortcut: 'ctrl+1', description: 'Switch to Chat' },
                { shortcut: 'ctrl+2', description: 'Switch to History' },
                { shortcut: 'ctrl+n', description: 'New Chat' },
                { shortcut: 'ctrl+b', description: 'Toggle Sidebar' }
            ],
            'chat-shortcuts': [
                { shortcut: 'ctrl+k', description: 'Focus Input' },
                { shortcut: 'ctrl+enter', description: 'Send Message' },
                { shortcut: 'ctrl+/', description: 'Global Search' },
                { shortcut: 'ctrl+l', description: 'Clear Input' }
            ],
            'action-shortcuts': [
                { shortcut: 'f b', description: 'Fund Bills' },
                { shortcut: 'f c', description: 'Categorize Transactions' },
                { shortcut: 'f a', description: 'Analyze Spending' },
                { shortcut: 'f r', description: 'Rebalance Budget' }
            ]
        };
        
        Object.entries(sections).forEach(([sectionId, shortcuts]) => {
            const container = document.getElementById(sectionId);
            if (container) {
                container.innerHTML = shortcuts.map(({ shortcut, description }) => `
                    <div class="shortcut-item">
                        <span class="shortcut-key">${this.formatShortcut(shortcut)}</span>
                        <span class="shortcut-desc">${description}</span>
                    </div>
                `).join('');
            }
        });
    }

    showShortcutHelp() {
        const help = document.getElementById('shortcut-help');
        if (help) {
            help.style.display = 'flex';
            setTimeout(() => help.classList.add('visible'), 10);
        }
    }

    hideShortcutHelp() {
        const help = document.getElementById('shortcut-help');
        if (help) {
            help.classList.remove('visible');
            setTimeout(() => help.style.display = 'none', 200);
        }
    }

    injectShortcutStyles() {
        const styleId = 'shortcut-manager-styles';
        if (document.getElementById(styleId)) return;

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            /* Command Palette */
            .command-palette-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.8);
                backdrop-filter: blur(4px);
                z-index: 3000;
                display: none;
                align-items: flex-start;
                justify-content: center;
                padding-top: 15vh;
                opacity: 0;
                transition: opacity 0.2s ease;
            }

            .command-palette-overlay.visible {
                opacity: 1;
            }

            .command-palette-container {
                width: 90%;
                max-width: 600px;
                background: var(--bg-primary);
                border: 1px solid var(--border);
                border-radius: 12px;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
                overflow: hidden;
                transform: translateY(-20px);
                transition: transform 0.2s ease;
            }

            .command-palette-overlay.visible .command-palette-container {
                transform: translateY(0);
            }

            .command-palette-header {
                padding: 16px;
                border-bottom: 1px solid var(--border);
            }

            .command-input-container {
                position: relative;
                display: flex;
                align-items: center;
            }

            .command-icon {
                position: absolute;
                left: 12px;
                width: 18px;
                height: 18px;
                color: var(--text-secondary);
            }

            .command-input {
                width: 100%;
                padding: 12px 16px 12px 40px;
                background: var(--bg-secondary);
                border: 1px solid var(--border);
                border-radius: 8px;
                color: var(--text-primary);
                font-size: 16px;
                outline: none;
                transition: border-color 0.2s ease;
            }

            .command-input:focus {
                border-color: var(--accent);
            }

            .command-palette-content {
                max-height: 50vh;
                overflow-y: auto;
            }

            .command-section {
                padding: 16px;
                border-bottom: 1px solid var(--border);
            }

            .command-section:last-child {
                border-bottom: none;
            }

            .command-section-title {
                font-size: 12px;
                font-weight: 600;
                color: var(--text-secondary);
                text-transform: uppercase;
                letter-spacing: 0.05em;
                margin-bottom: 8px;
            }

            .command-item {
                padding: 8px 12px;
                border-radius: 6px;
                cursor: pointer;
                transition: background-color 0.2s ease;
                margin-bottom: 2px;
            }

            .command-item:hover,
            .command-item.active {
                background: var(--bg-secondary);
            }

            .command-item-content {
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .command-item-title {
                color: var(--text-primary);
                font-weight: 500;
            }

            .command-item-shortcut {
                color: var(--text-secondary);
                font-size: 12px;
                font-family: monospace;
            }

            /* Sequence Indicator */
            .sequence-indicator {
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: var(--bg-secondary);
                color: var(--text-primary);
                padding: 8px 12px;
                border-radius: 6px;
                font-family: monospace;
                font-size: 14px;
                z-index: 1000;
                border: 1px solid var(--border);
                display: none;
                animation: sequence-fade-in 0.2s ease;
            }

            @keyframes sequence-fade-in {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }

            /* Shortcut Help */
            .shortcut-help-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.8);
                backdrop-filter: blur(4px);
                z-index: 2500;
                display: none;
                align-items: center;
                justify-content: center;
                opacity: 0;
                transition: opacity 0.2s ease;
            }

            .shortcut-help-overlay.visible {
                opacity: 1;
            }

            .shortcut-help-container {
                width: 90%;
                max-width: 800px;
                max-height: 80vh;
                background: var(--bg-primary);
                border: 1px solid var(--border);
                border-radius: 12px;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
                overflow: hidden;
                transform: scale(0.95);
                transition: transform 0.2s ease;
            }

            .shortcut-help-overlay.visible .shortcut-help-container {
                transform: scale(1);
            }

            .shortcut-help-header {
                padding: 20px;
                border-bottom: 1px solid var(--border);
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .shortcut-help-header h2 {
                margin: 0;
                color: var(--text-primary);
                font-size: 24px;
                font-weight: 600;
            }

            .shortcut-help-close {
                width: 32px;
                height: 32px;
                background: transparent;
                border: none;
                color: var(--text-secondary);
                font-size: 24px;
                cursor: pointer;
                border-radius: 8px;
                transition: all 0.2s ease;
            }

            .shortcut-help-close:hover {
                background: var(--bg-hover);
                color: var(--text-primary);
            }

            .shortcut-help-content {
                padding: 20px;
                max-height: 60vh;
                overflow-y: auto;
            }

            .shortcut-help-sections {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 32px;
            }

            .shortcut-section h3 {
                margin: 0 0 16px 0;
                color: var(--text-primary);
                font-size: 18px;
                font-weight: 600;
                border-bottom: 2px solid var(--accent);
                padding-bottom: 8px;
            }

            .shortcut-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px 0;
                border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            }

            .shortcut-item:last-child {
                border-bottom: none;
            }

            .shortcut-key {
                background: var(--bg-secondary);
                color: var(--text-primary);
                padding: 4px 8px;
                border-radius: 4px;
                font-family: monospace;
                font-size: 12px;
                font-weight: 500;
                border: 1px solid var(--border);
            }

            .shortcut-desc {
                color: var(--text-secondary);
                flex: 1;
                text-align: right;
                margin-left: 12px;
            }
        `;
        document.head.appendChild(style);
    }

    // Public API
    getRegisteredShortcuts() {
        return Array.from(this.shortcuts.values());
    }

    getRegisteredSequences() {
        return Array.from(this.sequences.values());
    }

    isShortcutRegistered(shortcut) {
        return this.shortcuts.has(this.normalizeShortcut(shortcut));
    }

    executeCommandByDescription(description) {
        for (const shortcutData of this.shortcuts.values()) {
            if (shortcutData.description === description) {
                shortcutData.action();
                return true;
            }
        }
        
        for (const sequenceData of this.sequences.values()) {
            if (sequenceData.description === description) {
                sequenceData.action();
                return true;
            }
        }
        
        return false;
    }
}