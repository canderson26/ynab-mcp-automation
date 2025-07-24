/**
 * ChatManager - Handles chat interface and message flow
 */

import { Logger } from '/src/js/utils/logger.js';
import { ErrorHandler } from '/src/js/utils/errorHandler.js';

export class ChatManager {
    constructor(webSocket, loadingManager) {
        this.logger = new Logger('ChatManager');
        this.errorHandler = new ErrorHandler();
        this.webSocket = webSocket;
        this.loading = loadingManager;
        this.messages = [];
        this.currentMessageId = 0;
        
        // Chat state
        this.isTyping = false;
        this.currentChat = null;
        this.chatHistory = this.loadChatHistory();
        
        // DOM elements will be cached during init
        this.chatMessages = null;
        this.welcomeScreen = null;
        this.typingIndicator = null;
    }

    init() {
        try {
            this.logger.info('Initializing ChatManager');
            
            // Cache DOM elements
            this.cacheDOMElements();
            
            // Set up WebSocket message handlers
            this.setupWebSocketHandlers();
            
            // Set up example prompt handlers
            this.setupExamplePrompts();
            
            // Initialize chat view
            this.initializeChatView();
            
            this.logger.info('ChatManager initialized successfully');
            
        } catch (error) {
            this.errorHandler.handleError(error, 'Failed to initialize ChatManager');
        }
    }

    cacheDOMElements() {
        this.chatMessages = document.querySelector('.chat-messages');
        this.welcomeScreen = document.querySelector('.welcome-screen');
        this.typingIndicator = null; // Will be created dynamically
        
        if (!this.chatMessages) {
            throw new Error('Required chat messages container not found');
        }
    }

    setupWebSocketHandlers() {
        // Handle different message types from the bridge server
        this.webSocket.onMessage('claude_response', (message) => {
            this.handleAssistantResponse(message);
        });

        this.webSocket.onMessage('error', (message) => {
            this.handleErrorResponse(message);
        });

        this.webSocket.onMessage('status', (message) => {
            this.handleStatusUpdate(message);
        });
    }

    setupExamplePrompts() {
        const examplePrompts = document.querySelectorAll('.example-prompt');
        examplePrompts.forEach(prompt => {
            prompt.addEventListener('click', (e) => {
                const title = prompt.querySelector('.example-prompt-title');
                if (title) {
                    const text = title.textContent.replace(/^[^\s]*\s/, ''); // Remove emoji
                    this.sendMessage(text);
                }
            });
        });
    }

    initializeChatView() {
        // Show welcome screen if no messages
        if (this.messages.length === 0) {
            this.showWelcomeScreen();
        } else {
            this.hideWelcomeScreen();
            this.renderMessages();
        }
    }

    sendMessage(content) {
        try {
            if (!content || !content.trim()) {
                this.logger.warn('Cannot send empty message');
                return false;
            }

            const message = {
                id: ++this.currentMessageId,
                type: 'user',
                content: content.trim(),
                timestamp: new Date().toISOString()
            };

            // Add to local messages
            this.messages.push(message);
            
            // Hide welcome screen and render new message
            this.hideWelcomeScreen();
            this.renderUserMessage(message);
            
            // Show typing indicator
            this.showTypingIndicator();
            
            // Ensure we scroll to bottom after all UI updates - enhanced for follow-up messages
            this.scrollToBottom();
            
            // Additional scroll after UI settling for follow-up messages
            setTimeout(() => {
                this.scrollToBottom();
            }, 200);
            
            // Send to bridge server via WebSocket
            const success = this.webSocket.send({
                type: 'user_message',
                data: content.trim(),
                messageId: message.id
            });

            if (!success) {
                this.hideTypingIndicator();
                this.handleErrorMessage({
                    title: 'Connection Error',
                    text: 'Unable to send message. Please check your connection.',
                    action: 'Retrying connection...'
                });
            }

            return success;

        } catch (error) {
            this.errorHandler.handleError(error, 'Failed to send message');
            this.hideTypingIndicator();
            return false;
        }
    }

    handleAssistantResponse(message) {
        try {
            this.hideTypingIndicator();
            
            const assistantMessage = {
                id: ++this.currentMessageId,
                type: 'assistant',
                content: message.data || message.content || message.text || '',
                timestamp: new Date().toISOString()
            };

            this.messages.push(assistantMessage);
            this.renderAssistantMessage(assistantMessage);
            
            // Auto-save current conversation to history after each exchange
            this.autoSaveCurrentChat();
            
            // Ensure we scroll to show the new assistant response
            this.scrollToBottom();
            
        } catch (error) {
            this.errorHandler.handleError(error, 'Failed to handle assistant response');
        }
    }

    handleErrorResponse(message) {
        this.hideTypingIndicator();
        this.handleErrorMessage({
            title: message.title || 'Error',
            text: message.text || 'An error occurred',
            action: message.action || 'Please try again'
        });
    }

    handleStatusUpdate(message) {
        this.logger.info('Status update:', message.status);
        
        if (message.status === 'typing') {
            this.showTypingIndicator();
        } else if (message.status === 'done') {
            this.hideTypingIndicator();
        }
    }

    renderUserMessage(message) {
        const messageGroup = document.createElement('div');
        messageGroup.className = 'message-group user';
        messageGroup.dataset.messageId = message.id;
        
        messageGroup.innerHTML = `
            <div class="message-role">You</div>
            <div class="message">
                <div class="message-content">
                    <p>${this.escapeHtml(message.content)}</p>
                </div>
            </div>
        `;
        
        // Add message actions via MessageManager
        const messageManager = window.budgetApp?.components?.messages;
        if (messageManager) {
            messageManager.addMessageActions(messageGroup, 'user');
        }
        
        this.chatMessages.appendChild(messageGroup);
    }

    renderAssistantMessage(message) {
        const messageGroup = document.createElement('div');
        messageGroup.className = 'message-group assistant';
        messageGroup.dataset.messageId = message.id;
        
        messageGroup.innerHTML = `
            <div class="message-role emoji">🐦</div>
            <div class="message">
                <div class="message-content">
                    ${this.formatAssistantMessage(message.content)}
                </div>
            </div>
        `;
        
        this.chatMessages.appendChild(messageGroup);
        this.scrollToBottom();
    }

    formatAssistantMessage(content) {
        // Check if this is a budget analysis response
        const isBudgetAnalysis = content.includes('vs budgeted') && 
                               (content.includes('🚨 Over Budget') || 
                                content.includes('✅ Under Budget') || 
                                content.includes('ℹ️ Covered Overspending') ||
                                content.includes('balance $') ||
                                content.includes('balance -$'));
        
        console.log('DEBUG: formatAssistantMessage called');
        console.log('DEBUG: content includes vs budgeted:', content.includes('vs budgeted'));
        console.log('DEBUG: content includes 🚨 Over Budget:', content.includes('🚨 Over Budget'));
        console.log('DEBUG: isBudgetAnalysis:', isBudgetAnalysis);
        console.log('DEBUG: content preview:', content.substring(0, 200));
        
        if (isBudgetAnalysis) {
            console.log('DEBUG: Using formatBudgetAnalysis');
            return this.formatBudgetAnalysis(content);
        } else if (content.includes('## ')) {
            console.log('DEBUG: Using formatStructuredResponse');
            return this.formatStructuredResponse(content);
        } else {
            console.log('DEBUG: Using formatBasicResponse');
            return this.formatBasicResponse(content);
        }
    }
    
    formatBudgetAnalysis(content) {
        // Create a temporary container to build the content exactly like the original
        const tempContainer = document.createElement('div');
        
        const lines = content.split('\n');
        let currentSection = '';
        let i = 0;
        
        // Check if this actually has budget data
        const hasFullBudgetData = content.includes('vs budgeted') || 
                                content.includes('vs target') || 
                                content.includes('spent $') ||
                                content.includes('Budgeted:') || 
                                content.includes('Target:');
        
        if (!hasFullBudgetData) {
            // Fall back to regular formatting
            return this.formatStructuredResponse(content);
        }
        
        while (i < lines.length) {
            const line = lines[i].trim();
            
            // Markdown headers (## Section Name)
            if (line.startsWith('##')) {
                const headerText = line.replace(/^##\s*/, '').trim();
                const headerDiv = document.createElement('div');
                headerDiv.className = 'analysis-header';
                // Process markdown formatting in headers
                headerDiv.innerHTML = headerText
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\*(.*?)\*/g, '<em>$1</em>');
                tempContainer.appendChild(headerDiv);
                currentSection = headerText.includes('Over Budget') || headerText.includes('🔴') ? 'over' : 'under';
                i++;
            }
            // Budget category bullet points (• **Category**: details)
            else if (line.startsWith('•') && line.includes('**') && line.includes('$')) {
                const categoryData = this.parseBudgetCategory(lines, i);
                
                if (categoryData && categoryData.budgeted !== 0) {
                    const card = this.createBudgetCard(categoryData, currentSection);
                    tempContainer.appendChild(card);
                } else {
                    // Fallback to bullet point if parsing failed
                    const insightDiv = document.createElement('div');
                    insightDiv.className = 'insight-item';
                    insightDiv.innerHTML = line
                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                        .replace(/\*(.*?)\*/g, '<em>$1</em>');
                    tempContainer.appendChild(insightDiv);
                }
                i++;
            }
            // Regular bullet points (• text)
            else if (line.startsWith('•') || line.startsWith('-')) {
                const insightDiv = document.createElement('div');
                insightDiv.className = 'insight-item';
                // Process markdown formatting in bullet points
                insightDiv.innerHTML = line
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\*(.*?)\*/g, '<em>$1</em>')
                    .replace(/`(.*?)`/g, '<code>$1</code>');
                tempContainer.appendChild(insightDiv);
                i++;
            }
            // Number lists (1. text)
            else if (/^\d+\./.test(line)) {
                const insightDiv = document.createElement('div');
                insightDiv.className = 'insight-item';
                // Process markdown formatting in numbered lists
                insightDiv.innerHTML = line
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\*(.*?)\*/g, '<em>$1</em>')
                    .replace(/`(.*?)`/g, '<code>$1</code>');
                tempContainer.appendChild(insightDiv);
                i++;
            }
            // Regular paragraphs
            else if (line && !line.startsWith('#')) {
                const paragraphDiv = document.createElement('p');
                paragraphDiv.innerHTML = line
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\*(.*?)\*/g, '<em>$1</em>');
                tempContainer.appendChild(paragraphDiv);
                i++;
            } else {
                i++;
            }
        }
        
        return tempContainer.innerHTML;
    }
    
    parseBudgetCategory(lines, startIndex) {
        const categoryLine = lines[startIndex].trim();
        
        // Handle new format: • **Category Name**: details
        let categoryMatch = categoryLine.match(/^•\s*\*\*(.*?)\*\*:\s*(.*)/);
        if (!categoryMatch) {
            // Try old format: Category Name: details  
            categoryMatch = categoryLine.match(/^([^:]+):\s*(.*)/);
        }
        
        if (!categoryMatch) {
            return null;
        }
        
        const categoryName = categoryMatch[1].trim();
        const statusText = categoryMatch[2].trim();
        
        // Parse the status text for budget information
        let budgeted = 0, spent = 0, remaining = 0, currentBalance = null;
        
        // First, look for current balance in "balance $X" or "balance -$X" format
        const balancePattern = statusText.match(/balance \$?(-?[\d,\.]+)/);
        if (balancePattern) {
            currentBalance = parseFloat(balancePattern[1].replace(/,/g, ''));
        }
        
        // Look for "spent/transferred $X vs budgeted $Y" pattern (handle negative budgeted amounts)
        const vsPattern = statusText.match(/(?:spent|transferred) \$?([\d,\.]+) vs (?:budgeted|target) \$?([+-]?[\d,\.]+)/);
        if (vsPattern) {
            spent = parseFloat(vsPattern[1].replace(/,/g, ''));
            budgeted = parseFloat(vsPattern[2].replace(/,/g, ''));
            remaining = currentBalance !== null ? currentBalance : budgeted - spent;
        } else {
            // Look for remaining pattern: "$X remaining"
            const remainingPattern = statusText.match(/\$?([\d,\.]+) remaining/);
            if (remainingPattern) {
                remaining = parseFloat(remainingPattern[1].replace(/,/g, ''));
                
                // Try to find budgeted amount in parentheses
                const budgetedPattern = statusText.match(/budgeted \$?([\d,\.]+)/);
                if (budgetedPattern) {
                    budgeted = parseFloat(budgetedPattern[1].replace(/,/g, ''));
                    spent = budgeted - remaining;
                }
            }
        }
        
        // Calculate percentage if we have the data
        let percentage = 0;
        if (budgeted > 0) {
            percentage = Math.min((spent / budgeted) * 100, 100);
        }
        
        return {
            name: categoryName,
            budgeted: budgeted,
            spent: spent,
            remaining: remaining,
            percentage: percentage
        };
    }
    
    createBudgetCard(data, sectionType) {
        const card = document.createElement('div');
        card.className = 'budget-card';
        
        const isOverBudget = data.remaining < 0;
        const emoji = this.getCategoryEmoji(data.name);
        
        card.innerHTML = `
            <div class="budget-card-header">
                <div class="budget-card-title">
                    ${emoji} ${data.name}
                </div>
                <div class="budget-card-status">${Math.round(data.percentage)}% spent</div>
            </div>
            <div class="budget-row" style="border-bottom: 2px solid var(--border); margin-bottom: 8px; padding-bottom: 8px;">
                <span class="budget-label" style="font-weight: 600;">Current Balance</span>
                <span class="budget-amount ${isOverBudget ? 'amount-negative' : 'amount-positive'}" style="font-weight: 600; font-size: 16px;">
                    ${data.remaining < 0 ? '-' : ''}$${Math.abs(data.remaining).toLocaleString()}
                </span>
            </div>
            <div class="budget-row">
                <span class="budget-label">Budgeted</span>
                <span class="budget-amount amount-neutral">$${Math.abs(data.budgeted).toLocaleString()}</span>
            </div>
            <div class="budget-row">
                <span class="budget-label">Spent</span>
                <span class="budget-amount amount-neutral">$${data.spent.toLocaleString()}</span>
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${data.percentage}%; background: ${isOverBudget ? 'var(--danger)' : 'var(--success)'}"></div>
            </div>
        `;
        
        return card;
    }
    
    getCategoryEmoji(categoryName) {
        const name = categoryName.toLowerCase();
        if (name.includes('gas') || name.includes('transport')) return '⛽';
        if (name.includes('dog') || name.includes('pet')) return '🐕';
        if (name.includes('fun') || name.includes('entertainment')) return '🎉';
        if (name.includes('groceries') || name.includes('food')) return '🛒';
        if (name.includes('utilities')) return '⚡';
        if (name.includes('daycare') || name.includes('childcare')) return '👶';
        if (name.includes('brokerage') || name.includes('invest')) return '📈';
        if (name.includes('dining') || name.includes('restaurant')) return '🍽️';
        if (name.includes('haircut') || name.includes('beauty')) return '✂️';
        if (name.includes('misc') || name.includes('other')) return '📦';
        return '💰';
    }
    
    formatStructuredResponse(content) {
        const lines = content.split('\n');
        let html = '';
        
        for (let line of lines) {
            line = line.trim();
            if (!line) continue;
            
            if (line.startsWith('##')) {
                const headerText = line.replace(/^##\s*/, '').trim();
                // Process markdown in headers
                const formattedHeader = this.processMarkdown(headerText);
                html += `<div class="analysis-header">${formattedHeader}</div>`;
            } else if (line.startsWith('•') || line.startsWith('-')) {
                const cleanLine = line.replace(/^[•-]\s*/, '');
                // Process markdown in bullet points
                const formattedBullet = this.processMarkdown(cleanLine);
                html += `<div class="insight-item">${formattedBullet}</div>`;
            } else {
                // Process markdown in regular paragraphs
                const formattedParagraph = this.processMarkdown(line);
                html += `<p>${formattedParagraph}</p>`;
            }
        }
        
        return html;
    }
    
    processMarkdown(text) {
        // First escape HTML to prevent XSS, then process markdown
        let processed = this.escapeHtml(text);
        
        // Process markdown formatting
        processed = processed
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')  // **bold**
            .replace(/\*(.*?)\*/g, '<em>$1</em>')             // *italic*
            .replace(/`(.*?)`/g, '<code>$1</code>');          // `code`
        
        return processed;
    }
    
    formatBasicResponse(content) {
        let formatted = this.escapeHtml(content);
        formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
        formatted = formatted.replace(/\n/g, '<br>');
        return `<p>${formatted}</p>`;
    }

    handleErrorMessage(errorMessage) {
        const messageGroup = document.createElement('div');
        messageGroup.className = 'message-group assistant error';
        
        messageGroup.innerHTML = `
            <div class="message-role emoji">🐦</div>
            <div class="message">
                <div class="message-content">
                    <div class="error-message">
                        <div class="error-title">
                            <span class="error-icon">⚠️</span> ${this.escapeHtml(errorMessage.title)}
                        </div>
                        <div class="error-text">${this.escapeHtml(errorMessage.text)}</div>
                        <div class="error-action">${this.escapeHtml(errorMessage.action)}</div>
                        <button class="retry-button" onclick="window.budgetApp.components.chat.retryLastMessage()">
                            <span>🔄</span> Retry
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        this.chatMessages.appendChild(messageGroup);
        this.scrollToBottom();
    }

    showTypingIndicator() {
        if (this.isTyping) return;
        
        this.isTyping = true;
        
        // Create typing indicator
        const typingDiv = document.createElement('div');
        typingDiv.className = 'typing-indicator';
        typingDiv.innerHTML = `
            <div class="typing-message">
                <div class="message-role emoji">🐦</div>
                <div class="typing-content">
                    <span>Budgie is thinking</span>
                    <div class="typing-dots">
                        <div class="typing-dot"></div>
                        <div class="typing-dot"></div>
                        <div class="typing-dot"></div>
                    </div>
                </div>
            </div>
        `;
        
        this.typingIndicator = typingDiv;
        this.chatMessages.appendChild(typingDiv);
    }

    hideTypingIndicator() {
        if (this.typingIndicator) {
            this.typingIndicator.remove();
            this.typingIndicator = null;
        }
        this.isTyping = false;
    }

    showWelcomeScreen() {
        if (this.welcomeScreen) {
            this.welcomeScreen.style.display = 'flex';
        }
    }

    hideWelcomeScreen() {
        if (this.welcomeScreen) {
            this.welcomeScreen.style.display = 'none';
        }
    }

    renderMessages() {
        // Clear existing messages except welcome screen
        const messageGroups = this.chatMessages.querySelectorAll('.message-group');
        messageGroups.forEach(group => group.remove());
        
        // Render all messages
        this.messages.forEach(message => {
            if (message.type === 'user') {
                this.renderUserMessage(message);
            } else if (message.type === 'assistant') {
                this.renderAssistantMessage(message);
            }
        });
    }

    createNewChat() {
        try {
            // Save current chat if it has messages
            if (this.messages.length > 0) {
                this.saveChatToHistory();
            }
            
            // Clear current chat
            this.messages = [];
            this.currentMessageId = 0;
            this.currentChat = null;
            
            // Clear UI and show welcome screen
            const messageGroups = this.chatMessages.querySelectorAll('.message-group, .typing-indicator');
            messageGroups.forEach(group => group.remove());
            
            this.showWelcomeScreen();
            
            this.logger.info('Created new chat');
            
        } catch (error) {
            this.errorHandler.handleError(error, 'Failed to create new chat');
        }
    }

    clearChat() {
        try {
            this.messages = [];
            this.currentMessageId = 0;
            this.hideTypingIndicator();
            
            // Clear UI
            const messageGroups = this.chatMessages.querySelectorAll('.message-group, .typing-indicator');
            messageGroups.forEach(group => group.remove());
            
            this.showWelcomeScreen();
            
            this.logger.info('Chat cleared');
            
        } catch (error) {
            this.errorHandler.handleError(error, 'Failed to clear chat');
        }
    }

    retryLastMessage() {
        const lastUserMessage = [...this.messages].reverse().find(msg => msg.type === 'user');
        if (lastUserMessage) {
            this.sendMessage(lastUserMessage.content);
        }
    }

    autoSaveCurrentChat() {
        if (this.messages.length === 0) return;
        
        const chatTitle = this.generateChatTitle();
        
        // Check if we already have this chat in history (update existing)
        const existingChatIndex = this.chatHistory.findIndex(chat => 
            chat.title === chatTitle || 
            (this.currentChat && chat.id === this.currentChat.id)
        );
        
        const chatData = {
            id: this.currentChat?.id || Date.now().toString(),
            title: chatTitle,
            messages: [...this.messages],
            timestamp: new Date().toISOString()
        };
        
        if (existingChatIndex >= 0) {
            // Update existing chat
            this.chatHistory[existingChatIndex] = chatData;
        } else {
            // Add new chat to beginning of history
            this.chatHistory.unshift(chatData);
        }
        
        this.currentChat = chatData;
        this.saveChatHistory();
    }

    saveChatToHistory() {
        if (this.messages.length === 0) return;
        
        const chat = {
            id: Date.now().toString(),
            title: this.generateChatTitle(),
            messages: [...this.messages],
            timestamp: new Date().toISOString()
        };
        
        this.chatHistory.unshift(chat);
        this.saveChatHistory();
    }

    generateChatTitle() {
        const firstUserMessage = this.messages.find(msg => msg.type === 'user');
        if (firstUserMessage) {
            return firstUserMessage.content.substring(0, 50) + (firstUserMessage.content.length > 50 ? '...' : '');
        }
        return 'New Chat';
    }

    loadChatHistory() {
        try {
            const saved = localStorage.getItem('budgie_chat_history');
            return saved ? JSON.parse(saved) : [];
        } catch (error) {
            this.logger.warn('Failed to load chat history:', error);
            return [];
        }
    }

    saveChatHistory() {
        try {
            localStorage.setItem('budgie_chat_history', JSON.stringify(this.chatHistory));
        } catch (error) {
            this.logger.warn('Failed to save chat history:', error);
        }
    }

    getChatHistory() {
        return this.chatHistory;
    }

    loadChat(chatId) {
        const chat = this.chatHistory.find(c => c.id === chatId);
        if (chat) {
            this.messages = [...chat.messages];
            this.currentChat = chat;
            this.hideWelcomeScreen();
            this.renderMessages();
        }
    }

    scrollToBottom() {
        // Use multiple delays to ensure DOM updates, layout, and rendering are complete
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
                // Additional delayed scroll for complex content like budget cards
                setTimeout(() => {
                    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
                }, 100);
            });
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}