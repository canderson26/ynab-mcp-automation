/**
 * InputManager - Handles message input, composition, and submission
 */

import { Logger } from '/src/js/utils/logger.js';
import { ErrorHandler } from '/src/js/utils/errorHandler.js';

export class InputManager {
    constructor(chatManager, loadingManager) {
        this.logger = new Logger('InputManager');
        this.errorHandler = new ErrorHandler();
        this.chatManager = chatManager;
        this.loading = loadingManager;
        
        // Input state
        this.isSubmitting = false;
        this.lastSubmittedMessage = '';
        
        // DOM elements will be cached during init
        this.inputForm = null;
        this.inputField = null;
        this.sendButton = null;
        this.clearButton = null;
    }

    init() {
        try {
            this.logger.info('Initializing InputManager');
            
            // Cache DOM elements
            this.cacheDOMElements();
            
            // Set up event listeners
            this.setupFormSubmission();
            this.setupInputField();
            this.setupClearButton();
            this.setupKeyboardShortcuts();
            
            // Initialize input state
            this.updateSendButtonState();
            
            this.logger.info('InputManager initialized successfully');
            
        } catch (error) {
            this.errorHandler.handleError(error, 'Failed to initialize InputManager');
        }
    }

    cacheDOMElements() {
        this.inputForm = document.querySelector('.input-area');
        this.inputField = document.getElementById('chat-input');
        this.sendButton = document.querySelector('.send-btn');
        this.clearButton = document.querySelector('.clear-chat-btn');
        
        if (!this.inputForm || !this.inputField || !this.sendButton) {
            throw new Error('Required input elements not found');
        }
    }

    setupFormSubmission() {
        this.inputForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSubmit();
        });
    }

    setupInputField() {
        // Auto-resize functionality
        this.inputField.addEventListener('input', () => {
            this.autoResizeInput();
            this.updateSendButtonState();
        });

        // Handle Enter key for submission
        this.inputField.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleSubmit();
            }
        });

        // Handle paste events
        this.inputField.addEventListener('paste', (e) => {
            // Allow paste but auto-resize after
            setTimeout(() => {
                this.autoResizeInput();
                this.updateSendButtonState();
            }, 0);
        });

        // Focus handling
        this.inputField.addEventListener('focus', () => {
            this.inputForm.classList.add('focused');
        });

        this.inputField.addEventListener('blur', () => {
            this.inputForm.classList.remove('focused');
        });
    }

    setupClearButton() {
        if (this.clearButton) {
            this.clearButton.addEventListener('click', () => {
                this.handleClearChat();
            });
        }
    }

    setupKeyboardShortcuts() {
        // These are set up in the main app, but we can handle input-specific shortcuts here
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + L to clear input
            if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
                e.preventDefault();
                this.clearInput();
                this.inputField.focus();
            }
            
            // Escape to clear input
            if (e.key === 'Escape' && document.activeElement === this.inputField) {
                this.clearInput();
            }
        });
    }

    handleSubmit() {
        try {
            if (this.isSubmitting) {
                this.logger.warn('Already submitting, ignoring additional submit');
                return;
            }

            const message = this.inputField.value.trim();
            if (!message) {
                this.logger.warn('Cannot submit empty message');
                return;
            }

            // Prevent duplicate submissions
            if (message === this.lastSubmittedMessage) {
                this.logger.warn('Preventing duplicate message submission');
                return;
            }

            this.isSubmitting = true;
            this.lastSubmittedMessage = message;
            
            // Show loading state on input
            this.loading.setComponentLoadingState(this.inputForm, this.loading.loadingStates.LOADING, {
                showSpinner: true,
                size: 'small'
            });
            
            // Update UI state
            this.updateSendButtonState();
            
            // Send message via chat manager
            const success = this.chatManager.sendMessage(message);
            
            if (success) {
                // Clear input on successful send
                this.clearInput();
                this.autoResizeInput();
                
                // Show success state briefly
                this.loading.setComponentLoadingState(this.inputForm, this.loading.loadingStates.SUCCESS, {
                    showSuccess: true
                });
            } else {
                // Show error state
                this.loading.setComponentLoadingState(this.inputForm, this.loading.loadingStates.ERROR);
                this.isSubmitting = false;
            }
            
            // Reset to idle state after a short delay
            setTimeout(() => {
                this.loading.setComponentLoadingState(this.inputForm, this.loading.loadingStates.IDLE);
                this.isSubmitting = false;
                this.updateSendButtonState();
            }, success ? 1500 : 3000);
            
        } catch (error) {
            this.isSubmitting = false;
            this.loading.setComponentLoadingState(this.inputForm, this.loading.loadingStates.ERROR);
            this.updateSendButtonState();
            this.errorHandler.handleError(error, 'Failed to submit message');
            
            // Reset to idle after error
            setTimeout(() => {
                this.loading.setComponentLoadingState(this.inputForm, this.loading.loadingStates.IDLE);
            }, 3000);
        }
    }

    handleClearChat() {
        try {
            // Show confirmation dialog
            const confirmed = confirm('Are you sure you want to clear this chat? This action cannot be undone.');
            
            if (confirmed) {
                this.chatManager.clearChat();
                this.clearInput();
                this.inputField.focus();
                this.logger.info('Chat cleared by user');
            }
            
        } catch (error) {
            this.errorHandler.handleError(error, 'Failed to clear chat');
        }
    }

    autoResizeInput() {
        try {
            // Reset height to auto to get the correct scrollHeight
            this.inputField.style.height = 'auto';
            
            // Calculate new height based on content
            const scrollHeight = this.inputField.scrollHeight;
            const minHeight = 52; // Matches CSS min-height
            const maxHeight = 200; // Matches CSS max-height
            
            const newHeight = Math.max(minHeight, Math.min(scrollHeight, maxHeight));
            this.inputField.style.height = `${newHeight}px`;
            
        } catch (error) {
            this.logger.warn('Failed to auto-resize input:', error);
        }
    }

    updateSendButtonState() {
        const hasContent = this.inputField.value.trim().length > 0;
        const canSend = hasContent && !this.isSubmitting;
        
        this.sendButton.disabled = !canSend;
        
        // Update button appearance
        if (this.isSubmitting) {
            this.sendButton.style.opacity = '0.5';
        } else {
            this.sendButton.style.opacity = canSend ? '1' : '0.5';
        }
    }

    clearInput() {
        this.inputField.value = '';
        this.lastSubmittedMessage = '';
        this.updateSendButtonState();
    }

    setInputValue(value) {
        this.inputField.value = value;
        this.autoResizeInput();
        this.updateSendButtonState();
        this.inputField.focus();
        
        // Move cursor to end
        setTimeout(() => {
            this.inputField.setSelectionRange(value.length, value.length);
        }, 0);
    }

    appendToInput(text) {
        const currentValue = this.inputField.value;
        const newValue = currentValue + (currentValue ? ' ' : '') + text;
        this.setInputValue(newValue);
    }

    focusInput() {
        this.inputField.focus();
    }

    getInputValue() {
        return this.inputField.value;
    }

    insertAtCursor(text) {
        const input = this.inputField;
        const startPos = input.selectionStart;
        const endPos = input.selectionEnd;
        const currentValue = input.value;
        
        const newValue = currentValue.substring(0, startPos) + text + currentValue.substring(endPos);
        
        this.setInputValue(newValue);
        
        // Set cursor position after inserted text
        const newCursorPos = startPos + text.length;
        setTimeout(() => {
            input.setSelectionRange(newCursorPos, newCursorPos);
        }, 0);
    }

    // Handle input events from other components
    handleExamplePromptClick(promptText) {
        // Extract meaningful text from example prompt (remove emoji, etc.)
        const cleanText = promptText.replace(/^[^\w]*/, '').trim();
        this.setInputValue(cleanText);
    }

    // Handle WebSocket connection state changes
    handleConnectionStateChange(isConnected) {
        if (!isConnected) {
            this.sendButton.disabled = true;
            this.sendButton.title = 'Not connected to server';
        } else {
            this.updateSendButtonState();
            this.sendButton.title = 'Send message';
        }
    }

    // Public API methods
    disable() {
        this.inputField.disabled = true;
        this.sendButton.disabled = true;
        if (this.clearButton) {
            this.clearButton.disabled = true;
        }
    }

    enable() {
        this.inputField.disabled = false;
        this.updateSendButtonState();
        if (this.clearButton) {
            this.clearButton.disabled = false;
        }
    }

    getState() {
        return {
            value: this.inputField.value,
            isSubmitting: this.isSubmitting,
            disabled: this.inputField.disabled
        };
    }
}