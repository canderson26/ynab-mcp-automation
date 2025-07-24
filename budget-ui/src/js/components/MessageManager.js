/**
 * MessageManager - Handles message editing, deletion, and management features
 */

import { Logger } from '/src/js/utils/logger.js';
import { ErrorHandler } from '/src/js/utils/errorHandler.js';

export class MessageManager {
    constructor(chatManager, loadingManager) {
        this.logger = new Logger('MessageManager');
        this.errorHandler = new ErrorHandler();
        this.chatManager = chatManager;
        this.loading = loadingManager;
        
        // Edit state
        this.currentlyEditing = null;
        this.editHistory = new Map();
        
        // UI elements
        this.activeMenus = new Set();
    }

    init() {
        try {
            this.logger.info('Initializing MessageManager');
            
            // Inject message action styles
            this.injectMessageActionStyles();
            
            // Set up event delegation for message actions
            this.setupEventDelegation();
            
            this.logger.info('MessageManager initialized successfully');
            
        } catch (error) {
            this.errorHandler.handleError(error, 'Failed to initialize MessageManager');
        }
    }

    injectMessageActionStyles() {
        const styleId = 'message-action-styles';
        if (document.getElementById(styleId)) return;

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            /* Message action menu */
            .message-group {
                position: relative;
            }

            .message-group:hover .message-actions {
                opacity: 1;
                visibility: visible;
            }

            .message-actions {
                position: absolute;
                top: 8px;
                right: 8px;
                display: flex;
                gap: 4px;
                opacity: 0;
                visibility: hidden;
                transition: all 0.2s ease;
                z-index: 10;
            }

            .message-action-btn {
                width: 28px;
                height: 28px;
                background: var(--bg-secondary);
                border: 1px solid var(--border);
                border-radius: 6px;
                color: var(--text-secondary);
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 12px;
                transition: all 0.2s ease;
                backdrop-filter: blur(4px);
            }

            .message-action-btn:hover {
                background: var(--bg-hover);
                color: var(--text-primary);
                border-color: var(--accent);
            }

            .message-action-btn.delete:hover {
                background: rgba(220, 38, 38, 0.1);
                color: var(--danger);
                border-color: var(--danger);
            }

            /* Edit mode styles */
            .message-content.editing {
                background: var(--bg-secondary);
                border: 1px solid var(--accent);
                border-radius: 8px;
                padding: 12px;
                margin: 4px 0;
            }

            .edit-textarea {
                width: 100%;
                min-height: 60px;
                max-height: 200px;
                padding: 8px;
                background: var(--bg-primary);
                border: 1px solid var(--border);
                border-radius: 6px;
                color: var(--text-primary);
                font-family: inherit;
                font-size: 14px;
                line-height: 1.5;
                resize: vertical;
                outline: none;
            }

            .edit-textarea:focus {
                border-color: var(--accent);
                box-shadow: 0 0 0 1px rgba(22, 163, 74, 0.3);
            }

            .edit-actions {
                display: flex;
                gap: 8px;
                margin-top: 8px;
                justify-content: flex-end;
            }

            .edit-btn {
                padding: 6px 12px;
                border: 1px solid var(--border);
                border-radius: 6px;
                font-size: 12px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .edit-btn.save {
                background: var(--accent);
                color: white;
                border-color: var(--accent);
            }

            .edit-btn.save:hover {
                background: #15803d;
            }

            .edit-btn.save:disabled {
                background: var(--border);
                color: var(--text-secondary);
                cursor: not-allowed;
            }

            .edit-btn.cancel {
                background: transparent;
                color: var(--text-secondary);
            }

            .edit-btn.cancel:hover {
                background: var(--bg-hover);
                color: var(--text-primary);
            }

            /* Message metadata */
            .message-metadata {
                font-size: 11px;
                color: var(--text-secondary);
                margin-top: 4px;
                font-style: italic;
            }

            .message-metadata .edited-indicator {
                color: var(--accent);
            }

            /* Confirmation dialog */
            .confirmation-dialog {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: var(--bg-secondary);
                border: 1px solid var(--border);
                border-radius: 12px;
                padding: 24px;
                max-width: 400px;
                z-index: 1000;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            }

            .confirmation-backdrop {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                z-index: 999;
                backdrop-filter: blur(2px);
            }

            .confirmation-title {
                font-size: 16px;
                font-weight: 600;
                color: var(--text-primary);
                margin-bottom: 8px;
            }

            .confirmation-text {
                color: var(--text-secondary);
                margin-bottom: 20px;
                line-height: 1.4;
            }

            .confirmation-actions {
                display: flex;
                gap: 12px;
                justify-content: flex-end;
            }

            .confirmation-btn {
                padding: 8px 16px;
                border: 1px solid var(--border);
                border-radius: 6px;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .confirmation-btn.danger {
                background: var(--danger);
                color: white;
                border-color: var(--danger);
            }

            .confirmation-btn.danger:hover {
                background: #b91c1c;
            }

            .confirmation-btn.cancel {
                background: transparent;
                color: var(--text-secondary);
            }

            .confirmation-btn.cancel:hover {
                background: var(--bg-hover);
                color: var(--text-primary);
            }
        `;
        document.head.appendChild(style);
    }

    setupEventDelegation() {
        // Set up event delegation on chat messages container
        const chatMessages = document.querySelector('.chat-messages');
        if (chatMessages) {
            chatMessages.addEventListener('click', (e) => {
                this.handleMessageClick(e);
            });
        }
    }

    handleMessageClick(e) {
        const target = e.target;
        
        // Handle edit button click
        if (target.classList.contains('edit-message-btn')) {
            e.preventDefault();
            const messageGroup = target.closest('.message-group');
            this.startEdit(messageGroup);
        }
        
        // Handle delete button click
        else if (target.classList.contains('delete-message-btn')) {
            e.preventDefault();
            const messageGroup = target.closest('.message-group');
            this.showDeleteConfirmation(messageGroup);
        }
        
        // Handle save edit button
        else if (target.classList.contains('save-edit-btn')) {
            e.preventDefault();
            this.saveEdit();
        }
        
        // Handle cancel edit button
        else if (target.classList.contains('cancel-edit-btn')) {
            e.preventDefault();
            this.cancelEdit();
        }
    }

    addMessageActions(messageGroup, messageType) {
        // Only add actions to user messages for now
        if (messageType !== 'user') return;

        const actionsContainer = document.createElement('div');
        actionsContainer.className = 'message-actions';
        
        actionsContainer.innerHTML = `
            <button class="message-action-btn edit-message-btn" title="Edit message" aria-label="Edit message">
                ✏️
            </button>
            <button class="message-action-btn delete-message-btn delete" title="Delete message" aria-label="Delete message">
                🗑️
            </button>
        `;
        
        messageGroup.appendChild(actionsContainer);
    }

    startEdit(messageGroup) {
        try {
            // Cancel any existing edit
            if (this.currentlyEditing) {
                this.cancelEdit();
            }

            const messageContent = messageGroup.querySelector('.message-content');
            const currentText = messageContent.textContent.trim();
            
            // Store original content and element
            this.currentlyEditing = {
                messageGroup,
                messageContent,
                originalText: currentText
            };

            // Add editing class
            messageContent.classList.add('editing');
            
            // Create edit interface
            const editContainer = document.createElement('div');
            editContainer.className = 'edit-container';
            editContainer.innerHTML = `
                <textarea class="edit-textarea" placeholder="Edit your message...">${this.escapeHtml(currentText)}</textarea>
                <div class="edit-actions">
                    <button class="edit-btn cancel cancel-edit-btn">Cancel</button>
                    <button class="edit-btn save save-edit-btn">Save</button>
                </div>
            `;

            // Replace content with edit interface
            messageContent.innerHTML = '';
            messageContent.appendChild(editContainer);
            
            // Focus textarea and select all text
            const textarea = editContainer.querySelector('.edit-textarea');
            textarea.focus();
            textarea.select();
            
            // Auto-resize textarea
            this.autoResizeTextarea(textarea);
            textarea.addEventListener('input', () => {
                this.autoResizeTextarea(textarea);
                this.updateSaveButtonState();
            });

            // Handle keyboard shortcuts
            textarea.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    this.cancelEdit();
                } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    this.saveEdit();
                }
            });

            this.updateSaveButtonState();
            this.logger.info('Started editing message');
            
        } catch (error) {
            this.errorHandler.handleError(error, 'Failed to start message edit');
        }
    }

    saveEdit() {
        try {
            if (!this.currentlyEditing) return;

            const textarea = this.currentlyEditing.messageContent.querySelector('.edit-textarea');
            const newText = textarea.value.trim();
            
            // Validate input
            if (!newText) {
                this.showValidationError('Message cannot be empty');
                return;
            }

            if (newText === this.currentlyEditing.originalText) {
                // No changes made
                this.cancelEdit();
                return;
            }

            // Show loading state
            const saveBtn = this.currentlyEditing.messageContent.querySelector('.save-edit-btn');
            this.loading.setComponentLoadingState(saveBtn, this.loading.loadingStates.LOADING, {
                showSpinner: true,
                size: 'small'
            });

            // Update message content
            this.updateMessageContent(newText);
            
            // Store edit history
            const messageId = this.getMessageId(this.currentlyEditing.messageGroup);
            this.editHistory.set(messageId, {
                originalText: this.currentlyEditing.originalText,
                editedText: newText,
                editedAt: new Date().toISOString()
            });

            this.logger.info('Message edited successfully');
            
        } catch (error) {
            this.errorHandler.handleError(error, 'Failed to save message edit');
        }
    }

    updateMessageContent(newText) {
        const { messageContent } = this.currentlyEditing;
        
        // Restore original structure with new content
        messageContent.classList.remove('editing');
        messageContent.innerHTML = `<p>${this.escapeHtml(newText)}</p>`;
        
        // Add edited indicator
        this.addEditedIndicator(this.currentlyEditing.messageGroup);
        
        // Clear editing state
        this.currentlyEditing = null;
    }

    addEditedIndicator(messageGroup) {
        // Remove existing metadata
        const existingMetadata = messageGroup.querySelector('.message-metadata');
        if (existingMetadata) {
            existingMetadata.remove();
        }

        // Add edited indicator
        const metadata = document.createElement('div');
        metadata.className = 'message-metadata';
        metadata.innerHTML = '<span class="edited-indicator">(edited)</span>';
        
        const messageContent = messageGroup.querySelector('.message-content');
        messageContent.appendChild(metadata);
    }

    cancelEdit() {
        try {
            if (!this.currentlyEditing) return;

            const { messageContent, originalText } = this.currentlyEditing;
            
            // Restore original content
            messageContent.classList.remove('editing');
            messageContent.innerHTML = `<p>${this.escapeHtml(originalText)}</p>`;
            
            // Clear editing state
            this.currentlyEditing = null;
            
            this.logger.info('Message edit cancelled');
            
        } catch (error) {
            this.errorHandler.handleError(error, 'Failed to cancel message edit');
        }
    }

    showDeleteConfirmation(messageGroup) {
        const backdrop = document.createElement('div');
        backdrop.className = 'confirmation-backdrop';
        
        const dialog = document.createElement('div');
        dialog.className = 'confirmation-dialog';
        dialog.innerHTML = `
            <div class="confirmation-title">Delete Message</div>
            <div class="confirmation-text">
                Are you sure you want to delete this message? This action cannot be undone.
            </div>
            <div class="confirmation-actions">
                <button class="confirmation-btn cancel">Cancel</button>
                <button class="confirmation-btn danger">Delete</button>
            </div>
        `;

        // Event handlers
        const cancelBtn = dialog.querySelector('.confirmation-btn.cancel');
        const deleteBtn = dialog.querySelector('.confirmation-btn.danger');

        const cleanup = () => {
            backdrop.remove();
        };

        cancelBtn.addEventListener('click', cleanup);
        backdrop.addEventListener('click', cleanup);
        
        deleteBtn.addEventListener('click', () => {
            this.deleteMessage(messageGroup);
            cleanup();
        });

        // Add to DOM
        backdrop.appendChild(dialog);
        document.body.appendChild(backdrop);
    }

    deleteMessage(messageGroup) {
        try {
            // Cancel edit if this message is being edited
            if (this.currentlyEditing && this.currentlyEditing.messageGroup === messageGroup) {
                this.cancelEdit();
            }

            // Remove from edit history
            const messageId = this.getMessageId(messageGroup);
            this.editHistory.delete(messageId);
            
            // Animate removal
            messageGroup.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            messageGroup.style.opacity = '0';
            messageGroup.style.transform = 'translateX(-20px)';
            
            setTimeout(() => {
                if (messageGroup.parentElement) {
                    messageGroup.remove();
                }
            }, 300);

            this.logger.info('Message deleted');
            
        } catch (error) {
            this.errorHandler.handleError(error, 'Failed to delete message');
        }
    }

    // Utility methods
    autoResizeTextarea(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }

    updateSaveButtonState() {
        if (!this.currentlyEditing) return;

        const textarea = this.currentlyEditing.messageContent.querySelector('.edit-textarea');
        const saveBtn = this.currentlyEditing.messageContent.querySelector('.save-edit-btn');
        
        const hasChanges = textarea.value.trim() !== this.currentlyEditing.originalText;
        const hasContent = textarea.value.trim().length > 0;
        
        saveBtn.disabled = !hasChanges || !hasContent;
    }

    showValidationError(message) {
        // Create temporary error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'edit-error';
        errorDiv.style.cssText = `
            color: var(--danger);
            font-size: 12px;
            margin-top: 4px;
            animation: fade-in-out 3s ease forwards;
        `;
        errorDiv.textContent = message;

        // Add animation if not already present
        if (!document.querySelector('#edit-error-animation')) {
            const style = document.createElement('style');
            style.id = 'edit-error-animation';
            style.textContent = `
                @keyframes fade-in-out {
                    0% { opacity: 0; }
                    20% { opacity: 1; }
                    80% { opacity: 1; }
                    100% { opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }

        const editActions = this.currentlyEditing.messageContent.querySelector('.edit-actions');
        editActions.parentElement.insertBefore(errorDiv, editActions);

        setTimeout(() => {
            if (errorDiv.parentElement) {
                errorDiv.remove();
            }
        }, 3000);
    }

    getMessageId(messageGroup) {
        // Generate or get unique ID for message
        let id = messageGroup.dataset.messageId;
        if (!id) {
            id = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            messageGroup.dataset.messageId = id;
        }
        return id;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Public API
    isEditing() {
        return this.currentlyEditing !== null;
    }

    getEditHistory(messageId) {
        return this.editHistory.get(messageId);
    }

    clearEditHistory() {
        this.editHistory.clear();
    }
}