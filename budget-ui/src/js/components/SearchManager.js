/**
 * SearchManager - Advanced search and filtering system for chat history and budget data
 */

import { Logger } from '/src/js/utils/logger.js';
import { ErrorHandler } from '/src/js/utils/errorHandler.js';

export class SearchManager {
    constructor(chatManager, navigationManager, loadingManager) {
        this.logger = new Logger('SearchManager');
        this.errorHandler = new ErrorHandler();
        this.chatManager = chatManager;
        this.navigationManager = navigationManager;
        this.loading = loadingManager;
        
        // Search state
        this.currentQuery = '';
        this.searchResults = [];
        this.searchHistory = this.loadSearchHistory();
        this.searchFilters = {
            dateRange: 'all',
            messageType: 'all',
            category: 'all',
            amount: { min: null, max: null }
        };
        
        // Search index for fast searching
        this.searchIndex = new Map();
        this.isIndexBuilt = false;
        
        // Debounce timer
        this.searchTimer = null;
        this.searchDelay = 300;
        
        // DOM elements
        this.searchInput = null;
        this.searchResults = null;
        this.searchFilters = null;
    }

    init() {
        try {
            this.logger.info('Initializing SearchManager');
            
            // Create search interface
            this.createSearchInterface();
            
            // Set up search functionality
            this.setupSearchHandlers();
            
            // Build search index
            this.buildSearchIndex();
            
            // Inject search styles
            this.injectSearchStyles();
            
            this.logger.info('SearchManager initialized successfully');
            
        } catch (error) {
            this.errorHandler.handleError(error, 'Failed to initialize SearchManager');
        }
    }

    createSearchInterface() {
        // Enhanced search for chat history page
        const existingSearch = document.querySelector('#chat-search');
        if (existingSearch) {
            this.enhanceExistingSearch(existingSearch);
        }
        
        // Create global search overlay
        this.createGlobalSearchOverlay();
    }

    enhanceExistingSearch(searchInput) {
        this.searchInput = searchInput;
        
        // Create advanced search panel
        const searchContainer = searchInput.closest('.chat-history-search');
        if (!searchContainer) return;
        
        const advancedPanel = document.createElement('div');
        advancedPanel.className = 'advanced-search-panel';
        advancedPanel.innerHTML = `
            <div class="search-filters">
                <div class="filter-group">
                    <label class="filter-label">Date Range</label>
                    <select class="filter-select" id="date-filter">
                        <option value="all">All time</option>
                        <option value="today">Today</option>
                        <option value="week">This week</option>
                        <option value="month">This month</option>
                        <option value="quarter">This quarter</option>
                        <option value="year">This year</option>
                        <option value="custom">Custom range</option>
                    </select>
                </div>
                
                <div class="filter-group">
                    <label class="filter-label">Message Type</label>
                    <select class="filter-select" id="type-filter">
                        <option value="all">All messages</option>
                        <option value="user">My messages</option>
                        <option value="assistant">Budgie responses</option>
                        <option value="system">System messages</option>
                    </select>
                </div>
                
                <div class="filter-group">
                    <label class="filter-label">Category</label>
                    <select class="filter-select" id="category-filter">
                        <option value="all">All categories</option>
                        <option value="budgeting">Budgeting</option>
                        <option value="spending">Spending Analysis</option>
                        <option value="goals">Goals & Targets</option>
                        <option value="reports">Reports</option>
                        <option value="transactions">Transactions</option>
                    </select>
                </div>
                
                <div class="filter-actions">
                    <button class="filter-btn clear" id="clear-filters">Clear</button>
                    <button class="filter-btn apply" id="apply-filters">Apply</button>
                </div>
            </div>
            
            <div class="search-suggestions" id="search-suggestions" style="display: none;">
                <div class="suggestions-header">Recent Searches</div>
                <div class="suggestions-list"></div>
            </div>
        `;
        
        searchContainer.appendChild(advancedPanel);
        
        // Initially hide advanced panel
        advancedPanel.style.display = 'none';
        
        // Add toggle button
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'search-toggle-btn';
        toggleBtn.innerHTML = '⚙️';
        toggleBtn.title = 'Advanced search options';
        toggleBtn.addEventListener('click', () => {
            const isVisible = advancedPanel.style.display !== 'none';
            advancedPanel.style.display = isVisible ? 'none' : 'block';
            toggleBtn.classList.toggle('active', !isVisible);
        });
        
        searchContainer.appendChild(toggleBtn);
    }

    createGlobalSearchOverlay() {
        const overlay = document.createElement('div');
        overlay.className = 'global-search-overlay';
        overlay.id = 'global-search-overlay';
        overlay.innerHTML = `
            <div class="global-search-container">
                <div class="global-search-header">
                    <div class="global-search-input-container">
                        <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="11" cy="11" r="8"></circle>
                            <path d="m21 21-4.35-4.35"></path>
                        </svg>
                        <input type="text" class="global-search-input" placeholder="Search messages, amounts, categories..." id="global-search-input">
                        <button class="global-search-close" id="global-search-close">×</button>
                    </div>
                    <div class="search-shortcuts">
                        <span class="shortcut">Type to search</span>
                        <span class="shortcut">↑↓ Navigate</span>
                        <span class="shortcut">Enter Select</span>
                        <span class="shortcut">Esc Close</span>
                    </div>
                </div>
                
                <div class="global-search-content">
                    <div class="search-categories">
                        <button class="search-category-btn active" data-category="all">
                            All <span class="category-count">0</span>
                        </button>
                        <button class="search-category-btn" data-category="messages">
                            Messages <span class="category-count">0</span>
                        </button>
                        <button class="search-category-btn" data-category="amounts">
                            Amounts <span class="category-count">0</span>
                        </button>
                        <button class="search-category-btn" data-category="categories">
                            Categories <span class="category-count">0</span>
                        </button>
                        <button class="search-category-btn" data-category="files">
                            Files <span class="category-count">0</span>
                        </button>
                    </div>
                    
                    <div class="global-search-results" id="global-search-results">
                        <div class="search-empty-state">
                            <div class="empty-icon">🔍</div>
                            <div class="empty-title">Search your budget conversations</div>
                            <div class="empty-text">Find messages, amounts, categories, and files instantly</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
    }

    setupSearchHandlers() {
        // Enhanced search input handler
        if (this.searchInput) {
            this.searchInput.addEventListener('input', (e) => {
                this.handleSearch(e.target.value);
            });
            
            this.searchInput.addEventListener('focus', () => {
                this.showSearchSuggestions();
            });
        }
        
        // Global search handlers
        const globalInput = document.getElementById('global-search-input');
        if (globalInput) {
            globalInput.addEventListener('input', (e) => {
                this.handleGlobalSearch(e.target.value);
            });
            
            globalInput.addEventListener('keydown', (e) => {
                this.handleGlobalSearchKeydown(e);
            });
        }
        
        // Global search overlay handlers
        const closeBtn = document.getElementById('global-search-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.hideGlobalSearch();
            });
        }
        
        const overlay = document.getElementById('global-search-overlay');
        if (overlay) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    this.hideGlobalSearch();
                }
            });
        }
        
        // Category filter handlers
        const categoryBtns = document.querySelectorAll('.search-category-btn');
        categoryBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.handleCategoryFilter(btn.dataset.category);
            });
        });
        
        // Filter handlers
        this.setupFilterHandlers();
        
        // Keyboard shortcut to open global search
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === '/') {
                e.preventDefault();
                this.showGlobalSearch();
            }
        });
    }

    setupFilterHandlers() {
        const applyBtn = document.getElementById('apply-filters');
        const clearBtn = document.getElementById('clear-filters');
        
        if (applyBtn) {
            applyBtn.addEventListener('click', () => {
                this.applyFilters();
            });
        }
        
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.clearFilters();
            });
        }
    }

    buildSearchIndex() {
        try {
            this.logger.info('Building search index');
            
            // Get chat history
            const chatHistory = this.chatManager.getChatHistory();
            
            chatHistory.forEach(chat => {
                if (chat.messages) {
                    chat.messages.forEach(message => {
                        this.indexMessage(message, chat.id);
                    });
                }
            });
            
            this.isIndexBuilt = true;
            this.logger.info(`Search index built with ${this.searchIndex.size} entries`);
            
        } catch (error) {
            this.errorHandler.handleError(error, 'Failed to build search index');
        }
    }

    indexMessage(message, chatId) {
        const indexEntry = {
            id: message.id,
            chatId: chatId,
            type: message.type,
            content: message.content.toLowerCase(),
            timestamp: message.timestamp,
            category: this.extractCategory(message.content),
            amounts: this.extractAmounts(message.content),
            keywords: this.extractKeywords(message.content)
        };
        
        this.searchIndex.set(message.id, indexEntry);
    }

    extractCategory(content) {
        const categoryPatterns = {
            'budgeting': /budget|allocat|assign|available|ready to assign/i,
            'spending': /spend|spent|expense|cost|purchase|buy|bought/i,
            'goals': /goal|target|save|saving|emergency fund/i,
            'reports': /report|analysis|summary|overview|trend/i,
            'transactions': /transaction|transfer|payment|deposit|withdrawal/i
        };
        
        for (const [category, pattern] of Object.entries(categoryPatterns)) {
            if (pattern.test(content)) {
                return category;
            }
        }
        
        return 'general';
    }

    extractAmounts(content) {
        const amountPattern = /\$?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g;
        const amounts = [];
        let match;
        
        while ((match = amountPattern.exec(content)) !== null) {
            amounts.push(parseFloat(match[1].replace(/,/g, '')));
        }
        
        return amounts;
    }

    extractKeywords(content) {
        // Remove common words and extract meaningful keywords
        const commonWords = new Set(['the', 'is', 'at', 'which', 'on', 'and', 'a', 'to', 'are', 'as', 'was', 'will', 'be']);
        const words = content.toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 2 && !commonWords.has(word));
        
        return [...new Set(words)]; // Remove duplicates
    }

    handleSearch(query) {
        clearTimeout(this.searchTimer);
        this.searchTimer = setTimeout(() => {
            this.performSearch(query);
        }, this.searchDelay);
    }

    handleGlobalSearch(query) {
        clearTimeout(this.searchTimer);
        this.searchTimer = setTimeout(() => {
            this.performGlobalSearch(query);
        }, this.searchDelay);
    }

    performSearch(query) {
        try {
            if (!query.trim()) {
                this.navigationManager.refreshChatHistory();
                return;
            }
            
            this.currentQuery = query;
            this.saveSearchToHistory(query);
            
            const results = this.searchMessages(query);
            this.displaySearchResults(results);
            
        } catch (error) {
            this.errorHandler.handleError(error, 'Failed to perform search');
        }
    }

    performGlobalSearch(query) {
        try {
            if (!query.trim()) {
                this.showEmptySearchState();
                return;
            }
            
            const results = this.searchMessages(query, true);
            this.displayGlobalSearchResults(results);
            
        } catch (error) {
            this.errorHandler.handleError(error, 'Failed to perform global search');
        }
    }

    searchMessages(query, includeDetails = false) {
        if (!this.isIndexBuilt) {
            this.buildSearchIndex();
        }
        
        const queryLower = query.toLowerCase();
        const results = {
            messages: [],
            amounts: [],
            categories: [],
            files: []
        };
        
        for (const [messageId, entry] of this.searchIndex) {
            let score = 0;
            let matches = [];
            
            // Content matching
            if (entry.content.includes(queryLower)) {
                score += 10;
                matches.push('content');
            }
            
            // Keyword matching
            if (entry.keywords.some(keyword => keyword.includes(queryLower))) {
                score += 5;
                matches.push('keywords');
            }
            
            // Amount matching
            if (this.isAmountQuery(query)) {
                const queryAmount = this.parseAmount(query);
                if (entry.amounts.some(amount => Math.abs(amount - queryAmount) < 0.01)) {
                    score += 15;
                    matches.push('amount');
                }
            }
            
            // Category matching
            if (entry.category && entry.category.includes(queryLower)) {
                score += 8;
                matches.push('category');
            }
            
            if (score > 0) {
                const result = {
                    ...entry,
                    score,
                    matches,
                    snippet: this.generateSnippet(entry.content, queryLower)
                };
                
                // Categorize results
                if (matches.includes('amount')) {
                    results.amounts.push(result);
                } else if (matches.includes('category')) {
                    results.categories.push(result);
                } else {
                    results.messages.push(result);
                }
            }
        }
        
        // Sort by score
        Object.keys(results).forEach(key => {
            results[key].sort((a, b) => b.score - a.score);
        });
        
        return results;
    }

    generateSnippet(content, query, maxLength = 150) {
        const queryIndex = content.toLowerCase().indexOf(query);
        if (queryIndex === -1) return content.substring(0, maxLength) + '...';
        
        const start = Math.max(0, queryIndex - 50);
        const end = Math.min(content.length, queryIndex + query.length + 50);
        
        let snippet = content.substring(start, end);
        if (start > 0) snippet = '...' + snippet;
        if (end < content.length) snippet = snippet + '...';
        
        // Highlight query
        const regex = new RegExp(`(${query})`, 'gi');
        snippet = snippet.replace(regex, '<mark>$1</mark>');
        
        return snippet;
    }

    displaySearchResults(results) {
        const historyList = document.querySelector('#chat-history-items');
        if (!historyList) return;
        
        historyList.innerHTML = '';
        
        const totalResults = Object.values(results).flat().length;
        
        if (totalResults === 0) {
            historyList.innerHTML = `
                <div class="search-no-results">
                    <div class="no-results-icon">🔍</div>
                    <div class="no-results-title">No results found</div>
                    <div class="no-results-text">Try adjusting your search or filters</div>
                </div>
            `;
            return;
        }
        
        // Show results summary
        const summary = document.createElement('div');
        summary.className = 'search-results-summary';
        summary.innerHTML = `Found ${totalResults} result${totalResults > 1 ? 's' : ''} for "${this.escapeHtml(this.currentQuery)}"`;
        historyList.appendChild(summary);
        
        // Display results by category
        this.displayResultsSection(historyList, 'Messages', results.messages);
        this.displayResultsSection(historyList, 'Amount References', results.amounts);
        this.displayResultsSection(historyList, 'Categories', results.categories);
    }

    displayResultsSection(container, title, results) {
        if (results.length === 0) return;
        
        const section = document.createElement('div');
        section.className = 'search-results-section';
        section.innerHTML = `
            <div class="search-section-header">${title} (${results.length})</div>
            <div class="search-section-results"></div>
        `;
        
        const resultsContainer = section.querySelector('.search-section-results');
        
        results.slice(0, 10).forEach(result => {
            const resultItem = this.createSearchResultItem(result);
            resultsContainer.appendChild(resultItem);
        });
        
        container.appendChild(section);
    }

    createSearchResultItem(result) {
        const item = document.createElement('div');
        item.className = 'search-result-item';
        item.innerHTML = `
            <div class="search-result-header">
                <span class="search-result-type">${result.type === 'user' ? 'You' : 'Budgie'}</span>
                <span class="search-result-date">${this.formatDate(result.timestamp)}</span>
                <span class="search-result-score">${result.score} pts</span>
            </div>
            <div class="search-result-content">${result.snippet}</div>
            <div class="search-result-meta">
                <span class="search-result-category">${result.category}</span>
                ${result.amounts.length > 0 ? `<span class="search-result-amounts">${result.amounts.map(a => '$' + a.toFixed(2)).join(', ')}</span>` : ''}
            </div>
        `;
        
        item.addEventListener('click', () => {
            this.openSearchResult(result);
        });
        
        return item;
    }

    displayGlobalSearchResults(results) {
        const resultsContainer = document.getElementById('global-search-results');
        if (!resultsContainer) return;
        
        const totalResults = Object.values(results).flat().length;
        
        // Update category counts
        document.querySelector('[data-category="all"] .category-count').textContent = totalResults;
        document.querySelector('[data-category="messages"] .category-count').textContent = results.messages.length;
        document.querySelector('[data-category="amounts"] .category-count').textContent = results.amounts.length;
        document.querySelector('[data-category="categories"] .category-count').textContent = results.categories.length;
        document.querySelector('[data-category="files"] .category-count').textContent = results.files.length;
        
        if (totalResults === 0) {
            this.showEmptySearchState();
            return;
        }
        
        // Show all results
        resultsContainer.innerHTML = '';
        const allResults = [...results.messages, ...results.amounts, ...results.categories, ...results.files];
        allResults.slice(0, 50).forEach(result => {
            const item = this.createGlobalSearchResultItem(result);
            resultsContainer.appendChild(item);
        });
    }

    createGlobalSearchResultItem(result) {
        const item = document.createElement('div');
        item.className = 'global-search-result-item';
        item.innerHTML = `
            <div class="global-result-icon">${this.getResultIcon(result)}</div>
            <div class="global-result-content">
                <div class="global-result-title">${result.snippet}</div>
                <div class="global-result-meta">
                    <span class="result-type">${result.type === 'user' ? 'You' : 'Budgie'}</span>
                    <span class="result-date">${this.formatDate(result.timestamp)}</span>
                    <span class="result-category">${result.category}</span>
                </div>
            </div>
            <div class="global-result-score">${result.score}</div>
        `;
        
        item.addEventListener('click', () => {
            this.openSearchResult(result);
            this.hideGlobalSearch();
        });
        
        return item;
    }

    // UI Control Methods
    showGlobalSearch() {
        const overlay = document.getElementById('global-search-overlay');
        const input = document.getElementById('global-search-input');
        
        if (overlay && input) {
            overlay.style.display = 'flex';
            setTimeout(() => {
                overlay.classList.add('visible');
                input.focus();
            }, 10);
        }
    }

    hideGlobalSearch() {
        const overlay = document.getElementById('global-search-overlay');
        if (overlay) {
            overlay.classList.remove('visible');
            setTimeout(() => {
                overlay.style.display = 'none';
            }, 200);
        }
    }

    showEmptySearchState() {
        const resultsContainer = document.getElementById('global-search-results');
        if (resultsContainer) {
            resultsContainer.innerHTML = `
                <div class="search-empty-state">
                    <div class="empty-icon">🔍</div>
                    <div class="empty-title">Search your budget conversations</div>
                    <div class="empty-text">Find messages, amounts, categories, and files instantly</div>
                </div>
            `;
        }
    }

    openSearchResult(result) {
        // Load the chat containing this result
        if (this.chatManager) {
            this.chatManager.loadChat(result.chatId);
            this.navigationManager.showView('chat');
        }
    }

    handleCategoryFilter(category) {
        // Update active category button
        document.querySelectorAll('.search-category-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.category === category);
        });
        
        // Filter current results
        // Implementation would filter the displayed results
    }

    handleGlobalSearchKeydown(e) {
        const results = document.querySelectorAll('.global-search-result-item');
        const currentActive = document.querySelector('.global-search-result-item.active');
        
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                this.navigateResults(results, currentActive, 'down');
                break;
            case 'ArrowUp':
                e.preventDefault();
                this.navigateResults(results, currentActive, 'up');
                break;
            case 'Enter':
                e.preventDefault();
                if (currentActive) {
                    currentActive.click();
                }
                break;
            case 'Escape':
                this.hideGlobalSearch();
                break;
        }
    }

    navigateResults(results, currentActive, direction) {
        if (results.length === 0) return;
        
        let nextIndex = 0;
        
        if (currentActive) {
            currentActive.classList.remove('active');
            const currentIndex = Array.from(results).indexOf(currentActive);
            nextIndex = direction === 'down' 
                ? (currentIndex + 1) % results.length
                : (currentIndex - 1 + results.length) % results.length;
        }
        
        results[nextIndex].classList.add('active');
        results[nextIndex].scrollIntoView({ block: 'nearest' });
    }

    // Utility methods
    isAmountQuery(query) {
        return /^\$?\d+(\.\d{2})?$/.test(query.trim());
    }

    parseAmount(query) {
        return parseFloat(query.replace(/[$,]/g, ''));
    }

    getResultIcon(result) {
        const icons = {
            'user': '👤',
            'assistant': '🐦',
            'budgeting': '💰',
            'spending': '💳',
            'goals': '🎯',
            'reports': '📊',
            'transactions': '🔄'
        };
        return icons[result.type] || icons[result.category] || '💬';
    }

    formatDate(timestamp) {
        const date = new Date(timestamp);
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

    saveSearchToHistory(query) {
        this.searchHistory.unshift(query);
        this.searchHistory = [...new Set(this.searchHistory)]; // Remove duplicates
        this.searchHistory = this.searchHistory.slice(0, 10); // Keep only recent 10
        
        try {
            localStorage.setItem('budgie_search_history', JSON.stringify(this.searchHistory));
        } catch (e) {
            this.logger.warn('Failed to save search history:', e);
        }
    }

    loadSearchHistory() {
        try {
            const saved = localStorage.getItem('budgie_search_history');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            this.logger.warn('Failed to load search history:', e);
            return [];
        }
    }

    injectSearchStyles() {
        const styleId = 'search-manager-styles';
        if (document.getElementById(styleId)) return;

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            /* Advanced search panel */
            .advanced-search-panel {
                background: var(--bg-secondary);
                border: 1px solid var(--border);
                border-radius: 8px;
                padding: 16px;
                margin-top: 12px;
            }

            .search-filters {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                gap: 12px;
                margin-bottom: 16px;
            }

            .filter-group {
                display: flex;
                flex-direction: column;
                gap: 4px;
            }

            .filter-label {
                font-size: 12px;
                font-weight: 500;
                color: var(--text-secondary);
                text-transform: uppercase;
                letter-spacing: 0.05em;
            }

            .filter-select {
                padding: 6px 8px;
                background: var(--bg-primary);
                border: 1px solid var(--border);
                border-radius: 4px;
                color: var(--text-primary);
                font-size: 13px;
            }

            .filter-actions {
                grid-column: 1 / -1;
                display: flex;
                gap: 8px;
                justify-content: flex-end;
            }

            .filter-btn {
                padding: 6px 12px;
                border: 1px solid var(--border);
                border-radius: 4px;
                font-size: 12px;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .filter-btn.clear {
                background: transparent;
                color: var(--text-secondary);
            }

            .filter-btn.apply {
                background: var(--accent);
                color: white;
                border-color: var(--accent);
            }

            .search-toggle-btn {
                position: absolute;
                right: 40px;
                top: 50%;
                transform: translateY(-50%);
                width: 24px;
                height: 24px;
                background: transparent;
                border: none;
                color: var(--text-secondary);
                cursor: pointer;
                border-radius: 4px;
                transition: all 0.2s ease;
            }

            .search-toggle-btn:hover,
            .search-toggle-btn.active {
                background: var(--bg-hover);
                color: var(--text-primary);
            }

            /* Global search overlay */
            .global-search-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.8);
                backdrop-filter: blur(4px);
                z-index: 2000;
                display: none;
                align-items: flex-start;
                justify-content: center;
                padding-top: 10vh;
                opacity: 0;
                transition: opacity 0.2s ease;
            }

            .global-search-overlay.visible {
                opacity: 1;
            }

            .global-search-container {
                width: 90%;
                max-width: 800px;
                background: var(--bg-primary);
                border: 1px solid var(--border);
                border-radius: 12px;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
                overflow: hidden;
                transform: translateY(-20px);
                transition: transform 0.2s ease;
            }

            .global-search-overlay.visible .global-search-container {
                transform: translateY(0);
            }

            .global-search-header {
                padding: 20px;
                border-bottom: 1px solid var(--border);
            }

            .global-search-input-container {
                position: relative;
                display: flex;
                align-items: center;
                margin-bottom: 12px;
            }

            .search-icon {
                position: absolute;
                left: 12px;
                width: 20px;
                height: 20px;
                color: var(--text-secondary);
            }

            .global-search-input {
                width: 100%;
                padding: 12px 40px 12px 40px;
                background: var(--bg-secondary);
                border: 1px solid var(--border);
                border-radius: 8px;
                color: var(--text-primary);
                font-size: 16px;
                outline: none;
                transition: border-color 0.2s ease;
            }

            .global-search-input:focus {
                border-color: var(--accent);
            }

            .global-search-close {
                position: absolute;
                right: 8px;
                width: 28px;
                height: 28px;
                background: transparent;
                border: none;
                color: var(--text-secondary);
                font-size: 18px;
                cursor: pointer;
                border-radius: 6px;
                transition: all 0.2s ease;
            }

            .global-search-close:hover {
                background: var(--bg-hover);
                color: var(--text-primary);
            }

            .search-shortcuts {
                display: flex;
                gap: 16px;
                font-size: 12px;
                color: var(--text-secondary);
            }

            .shortcut {
                display: flex;
                align-items: center;
                gap: 4px;
            }

            .search-categories {
                display: flex;
                gap: 8px;
                padding: 16px 20px;
                border-bottom: 1px solid var(--border);
                overflow-x: auto;
            }

            .search-category-btn {
                padding: 6px 12px;
                background: transparent;
                border: 1px solid var(--border);
                border-radius: 20px;
                color: var(--text-secondary);
                font-size: 12px;
                cursor: pointer;
                transition: all 0.2s ease;
                white-space: nowrap;
                display: flex;
                align-items: center;
                gap: 6px;
            }

            .search-category-btn:hover,
            .search-category-btn.active {
                background: var(--accent);
                color: white;
                border-color: var(--accent);
            }

            .category-count {
                background: var(--bg-hover);
                color: var(--text-primary);
                padding: 2px 6px;
                border-radius: 10px;
                font-size: 10px;
                font-weight: 500;
            }

            .search-category-btn.active .category-count {
                background: rgba(255, 255, 255, 0.2);
                color: white;
            }

            .global-search-results {
                max-height: 60vh;
                overflow-y: auto;
                padding: 0;
            }

            .global-search-result-item {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 12px 20px;
                border-bottom: 1px solid var(--border);
                cursor: pointer;
                transition: background-color 0.2s ease;
            }

            .global-search-result-item:hover,
            .global-search-result-item.active {
                background: var(--bg-secondary);
            }

            .global-result-icon {
                width: 32px;
                height: 32px;
                background: var(--bg-secondary);
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 16px;
                flex-shrink: 0;
            }

            .global-result-content {
                flex: 1;
                min-width: 0;
            }

            .global-result-title {
                font-weight: 500;
                color: var(--text-primary);
                margin-bottom: 2px;
                line-height: 1.3;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            .global-result-meta {
                display: flex;
                gap: 8px;
                font-size: 11px;
                color: var(--text-secondary);
            }

            .global-result-score {
                font-size: 10px;
                color: var(--text-secondary);
                background: var(--bg-hover);
                padding: 2px 6px;
                border-radius: 10px;
                flex-shrink: 0;
            }

            /* Search results */
            .search-results-summary {
                padding: 12px;
                background: var(--bg-hover);
                color: var(--text-primary);
                font-weight: 500;
                text-align: center;
                border-radius: 6px;
                margin-bottom: 16px;
            }

            .search-results-section {
                margin-bottom: 24px;
            }

            .search-section-header {
                font-weight: 600;
                color: var(--text-primary);
                margin-bottom: 12px;
                padding-bottom: 4px;
                border-bottom: 1px solid var(--border);
            }

            .search-result-item {
                background: var(--bg-secondary);
                border: 1px solid var(--border);
                border-radius: 6px;
                padding: 12px;
                margin-bottom: 8px;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .search-result-item:hover {
                border-color: var(--accent);
                background: var(--bg-hover);
            }

            .search-result-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 6px;
                font-size: 12px;
            }

            .search-result-type {
                font-weight: 500;
                color: var(--text-primary);
            }

            .search-result-date {
                color: var(--text-secondary);
            }

            .search-result-score {
                background: var(--accent);
                color: white;
                padding: 2px 6px;
                border-radius: 10px;
                font-size: 10px;
            }

            .search-result-content {
                color: var(--text-primary);
                line-height: 1.4;
                margin-bottom: 6px;
            }

            .search-result-content mark {
                background: rgba(22, 163, 74, 0.2);
                color: var(--accent);
                padding: 0;
            }

            .search-result-meta {
                display: flex;
                gap: 12px;
                font-size: 11px;
                color: var(--text-secondary);
            }

            .search-no-results,
            .search-empty-state {
                text-align: center;
                padding: 60px 20px;
                color: var(--text-secondary);
            }

            .no-results-icon,
            .empty-icon {
                font-size: 48px;
                margin-bottom: 16px;
                opacity: 0.6;
            }

            .no-results-title,
            .empty-title {
                font-size: 18px;
                font-weight: 500;
                color: var(--text-primary);
                margin-bottom: 8px;
            }

            .no-results-text,
            .empty-text {
                font-size: 14px;
                max-width: 300px;
                margin: 0 auto;
                line-height: 1.4;
            }
        `;
        document.head.appendChild(style);
    }

    // Public API
    rebuildIndex() {
        this.searchIndex.clear();
        this.buildSearchIndex();
    }

    getSearchHistory() {
        return this.searchHistory;
    }

    clearSearchHistory() {
        this.searchHistory = [];
        try {
            localStorage.removeItem('budgie_search_history');
        } catch (e) {
            this.logger.warn('Failed to clear search history:', e);
        }
    }
}