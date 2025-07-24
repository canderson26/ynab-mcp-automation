/**
 * FileUploadManager - Handles drag-and-drop file uploads for financial documents
 */

import { Logger } from '/src/js/utils/logger.js';
import { ErrorHandler } from '/src/js/utils/errorHandler.js';

export class FileUploadManager {
    constructor(chatManager, loadingManager) {
        this.logger = new Logger('FileUploadManager');
        this.errorHandler = new ErrorHandler();
        this.chatManager = chatManager;
        this.loading = loadingManager;
        
        // File upload state
        this.isDragging = false;
        this.activeUploads = new Map();
        
        // Supported file types for financial documents
        this.supportedTypes = {
            'text/csv': { extension: 'csv', category: 'transactions' },
            'application/pdf': { extension: 'pdf', category: 'statements' },
            'text/plain': { extension: 'txt', category: 'data' },
            'application/vnd.ms-excel': { extension: 'xls', category: 'spreadsheet' },
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { extension: 'xlsx', category: 'spreadsheet' },
            'image/png': { extension: 'png', category: 'image' },
            'image/jpeg': { extension: 'jpg', category: 'image' },
            'image/jpg': { extension: 'jpg', category: 'image' }
        };
        
        // File size limits (in bytes)
        this.maxFileSize = 10 * 1024 * 1024; // 10MB
        this.maxFiles = 5; // Maximum files per upload
        
        // DOM elements
        this.dropZone = null;
        this.fileInput = null;
        this.uploadArea = null;
    }

    init() {
        try {
            this.logger.info('Initializing FileUploadManager');
            
            // Create upload interface
            this.createUploadInterface();
            
            // Set up drag and drop
            this.setupDragAndDrop();
            
            // Set up file input
            this.setupFileInput();
            
            // Inject upload styles
            this.injectUploadStyles();
            
            this.logger.info('FileUploadManager initialized successfully');
            
        } catch (error) {
            this.errorHandler.handleError(error, 'Failed to initialize FileUploadManager');
        }
    }

    createUploadInterface() {
        // Find input area and add upload functionality
        const inputArea = document.querySelector('.input-area');
        if (!inputArea) return;

        // Create upload area
        this.uploadArea = document.createElement('div');
        this.uploadArea.className = 'upload-area';
        this.uploadArea.innerHTML = `
            <div class="upload-dropzone" id="file-dropzone">
                <div class="upload-content">
                    <div class="upload-icon">📎</div>
                    <div class="upload-text">
                        <span class="upload-primary">Drop financial documents here</span>
                        <span class="upload-secondary">or <button class="upload-browse-btn">browse files</button></span>
                    </div>
                    <div class="upload-types">
                        Supports: CSV, PDF, Excel, Images (max 10MB each)
                    </div>
                </div>
                <div class="upload-progress-container" style="display: none;">
                    <div class="upload-progress-bar">
                        <div class="upload-progress-fill"></div>
                    </div>
                    <div class="upload-progress-text">Uploading...</div>
                </div>
            </div>
            <input type="file" id="file-input" multiple accept=".csv,.pdf,.txt,.xls,.xlsx,.png,.jpg,.jpeg" style="display: none;">
        `;

        // Insert before input container
        const inputContainer = inputArea.querySelector('.input-container');
        inputArea.insertBefore(this.uploadArea, inputContainer);

        // Cache elements
        this.dropZone = this.uploadArea.querySelector('#file-dropzone');
        this.fileInput = this.uploadArea.querySelector('#file-input');
        
        // Initially hide upload area
        this.uploadArea.style.display = 'none';
    }

    setupDragAndDrop() {
        // Set up drag and drop on the entire chat area
        const chatView = document.querySelector('.chat-view');
        if (!chatView) return;

        // Prevent default drag behaviors
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            chatView.addEventListener(eventName, this.preventDefaults.bind(this), false);
            document.body.addEventListener(eventName, this.preventDefaults.bind(this), false);
        });

        // Highlight drop zone when dragging
        ['dragenter', 'dragover'].forEach(eventName => {
            chatView.addEventListener(eventName, this.handleDragEnter.bind(this), false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            chatView.addEventListener(eventName, this.handleDragLeave.bind(this), false);
        });

        // Handle dropped files
        chatView.addEventListener('drop', this.handleDrop.bind(this), false);
    }

    setupFileInput() {
        if (!this.fileInput) return;

        // Handle file input change
        this.fileInput.addEventListener('change', (e) => {
            this.handleFiles(Array.from(e.target.files));
            e.target.value = ''; // Reset input
        });

        // Handle browse button click
        const browseBtn = this.uploadArea.querySelector('.upload-browse-btn');
        if (browseBtn) {
            browseBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.fileInput.click();
            });
        }
    }

    injectUploadStyles() {
        const styleId = 'file-upload-styles';
        if (document.getElementById(styleId)) return;

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            /* Upload area */
            .upload-area {
                margin: 0 auto 12px;
                max-width: 742px;
                width: 100%;
            }

            .upload-dropzone {
                border: 2px dashed var(--border);
                border-radius: 12px;
                padding: 24px;
                text-align: center;
                transition: all 0.2s ease;
                background: var(--bg-secondary);
                position: relative;
                overflow: hidden;
            }

            .upload-dropzone.drag-over {
                border-color: var(--accent);
                background: rgba(22, 163, 74, 0.05);
                transform: scale(1.02);
            }

            .upload-content {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 8px;
            }

            .upload-icon {
                font-size: 32px;
                opacity: 0.7;
            }

            .upload-text {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 4px;
            }

            .upload-primary {
                color: var(--text-primary);
                font-weight: 500;
                font-size: 16px;
            }

            .upload-secondary {
                color: var(--text-secondary);
                font-size: 14px;
            }

            .upload-browse-btn {
                background: none;
                border: none;
                color: var(--accent);
                cursor: pointer;
                text-decoration: underline;
                font-size: inherit;
                padding: 0;
            }

            .upload-browse-btn:hover {
                color: #15803d;
            }

            .upload-types {
                color: var(--text-secondary);
                font-size: 12px;
                margin-top: 4px;
            }

            /* Upload progress */
            .upload-progress-container {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: var(--bg-secondary);
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 12px;
            }

            .upload-progress-bar {
                width: 200px;
                height: 6px;
                background: var(--border);
                border-radius: 3px;
                overflow: hidden;
            }

            .upload-progress-fill {
                height: 100%;
                background: var(--accent);
                border-radius: 3px;
                transition: width 0.3s ease;
                width: 0%;
            }

            .upload-progress-text {
                color: var(--text-primary);
                font-size: 14px;
                font-weight: 500;
            }

            /* File preview cards */
            .file-preview-container {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                margin: 12px 0;
                max-width: 742px;
                margin-left: auto;
                margin-right: auto;
            }

            .file-preview-card {
                background: var(--bg-secondary);
                border: 1px solid var(--border);
                border-radius: 8px;
                padding: 12px;
                display: flex;
                align-items: center;
                gap: 12px;
                min-width: 200px;
                max-width: 300px;
                transition: all 0.2s ease;
            }

            .file-preview-card:hover {
                border-color: var(--accent);
            }

            .file-preview-icon {
                width: 32px;
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: var(--bg-hover);
                border-radius: 6px;
                font-size: 16px;
                flex-shrink: 0;
            }

            .file-preview-info {
                flex: 1;
                min-width: 0;
            }

            .file-preview-name {
                font-weight: 500;
                color: var(--text-primary);
                font-size: 14px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .file-preview-meta {
                color: var(--text-secondary);
                font-size: 12px;
                margin-top: 2px;
            }

            .file-preview-remove {
                background: none;
                border: none;
                color: var(--text-secondary);
                cursor: pointer;
                padding: 4px;
                border-radius: 4px;
                transition: all 0.2s ease;
                flex-shrink: 0;
            }

            .file-preview-remove:hover {
                background: rgba(220, 38, 38, 0.1);
                color: var(--danger);
            }

            /* Upload animation */
            .upload-dropzone.uploading {
                pointer-events: none;
            }

            .upload-dropzone.uploading::before {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                right: 100%;
                bottom: 0;
                background: linear-gradient(90deg, transparent, rgba(22, 163, 74, 0.1), transparent);
                animation: upload-shimmer 2s infinite;
            }

            @keyframes upload-shimmer {
                0% { left: -100%; right: 100%; }
                100% { left: 100%; right: -100%; }
            }

            /* Error states */
            .file-preview-card.error {
                border-color: var(--danger);
                background: rgba(220, 38, 38, 0.05);
            }

            .file-preview-card.error .file-preview-icon {
                background: rgba(220, 38, 38, 0.1);
                color: var(--danger);
            }

            /* Success states */
            .file-preview-card.success {
                border-color: var(--success);
                background: rgba(22, 163, 74, 0.05);
            }

            .file-preview-card.success .file-preview-icon {
                background: rgba(22, 163, 74, 0.1);
                color: var(--success);
            }
        `;
        document.head.appendChild(style);
    }

    // Event handlers
    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    handleDragEnter(e) {
        if (!this.isDragging) {
            this.isDragging = true;
            this.showUploadArea();
        }
        this.dropZone.classList.add('drag-over');
    }

    handleDragLeave(e) {
        // Only hide if we're leaving the chat view entirely
        if (!e.relatedTarget || !document.querySelector('.chat-view').contains(e.relatedTarget)) {
            this.isDragging = false;
            this.hideUploadArea();
        }
        this.dropZone.classList.remove('drag-over');
    }

    handleDrop(e) {
        this.isDragging = false;
        this.dropZone.classList.remove('drag-over');
        
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            this.handleFiles(files);
        } else {
            this.hideUploadArea();
        }
    }

    // File handling
    handleFiles(files) {
        try {
            this.logger.info(`Processing ${files.length} files`);
            
            // Validate files
            const validFiles = this.validateFiles(files);
            if (validFiles.length === 0) {
                this.hideUploadArea();
                return;
            }

            // Show file previews
            this.showFilePreviews(validFiles);
            
            // Process files
            this.processFiles(validFiles);
            
        } catch (error) {
            this.errorHandler.handleError(error, 'Failed to handle files');
            this.hideUploadArea();
        }
    }

    validateFiles(files) {
        const validFiles = [];
        const errors = [];

        for (const file of files) {
            // Check file count
            if (validFiles.length >= this.maxFiles) {
                errors.push(`Maximum ${this.maxFiles} files allowed`);
                break;
            }

            // Check file size
            if (file.size > this.maxFileSize) {
                errors.push(`${file.name}: File too large (max ${this.formatFileSize(this.maxFileSize)})`);
                continue;
            }

            // Check file type
            if (!this.supportedTypes[file.type]) {
                errors.push(`${file.name}: Unsupported file type`);
                continue;
            }

            validFiles.push(file);
        }

        // Show errors if any
        if (errors.length > 0) {
            this.showUploadErrors(errors);
        }

        return validFiles;
    }

    showFilePreviews(files) {
        // Remove existing previews
        const existingContainer = document.querySelector('.file-preview-container');
        if (existingContainer) {
            existingContainer.remove();
        }

        // Create preview container
        const container = document.createElement('div');
        container.className = 'file-preview-container';

        files.forEach((file, index) => {
            const card = this.createFilePreviewCard(file, index);
            container.appendChild(card);
        });

        // Insert before input area
        const inputArea = document.querySelector('.input-area');
        inputArea.parentElement.insertBefore(container, inputArea);
    }

    createFilePreviewCard(file, index) {
        const fileType = this.supportedTypes[file.type];
        const icon = this.getFileIcon(fileType.category);
        
        const card = document.createElement('div');
        card.className = 'file-preview-card';
        card.dataset.fileIndex = index;
        
        card.innerHTML = `
            <div class="file-preview-icon">${icon}</div>
            <div class="file-preview-info">
                <div class="file-preview-name" title="${file.name}">${file.name}</div>
                <div class="file-preview-meta">${this.formatFileSize(file.size)} • ${fileType.category}</div>
            </div>
            <button class="file-preview-remove" onclick="window.budgetApp.components.fileUpload.removeFile(${index})" title="Remove file">
                ×
            </button>
        `;

        return card;
    }

    async processFiles(files) {
        try {
            // Show upload progress
            this.showUploadProgress();

            // Simulate upload process (in real implementation, this would upload to server)
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const progress = ((i + 1) / files.length) * 100;
                
                this.updateUploadProgress(progress, `Uploading ${file.name}...`);
                
                // Simulate upload delay
                await this.delay(500);
                
                // Process file based on type
                await this.processFile(file, i);
            }

            // Complete upload
            this.completeUpload(files);
            
        } catch (error) {
            this.errorHandler.handleError(error, 'Failed to process files');
            this.showUploadError('Upload failed. Please try again.');
        }
    }

    async processFile(file, index) {
        const fileType = this.supportedTypes[file.type];
        const card = document.querySelector(`[data-file-index="${index}"]`);
        
        try {
            // Read file content for text files
            if (['csv', 'txt'].includes(fileType.extension)) {
                const content = await this.readFileAsText(file);
                this.logger.info(`Read ${content.length} characters from ${file.name}`);
            }
            
            // Mark as success
            if (card) {
                card.classList.add('success');
            }
            
        } catch (error) {
            this.logger.error(`Failed to process ${file.name}:`, error);
            if (card) {
                card.classList.add('error');
            }
        }
    }

    completeUpload(files) {
        // Hide upload progress
        this.hideUploadProgress();
        
        // Generate message about uploaded files
        const message = this.generateUploadMessage(files);
        
        // Send message via chat manager
        if (this.chatManager) {
            this.chatManager.sendMessage(message);
        }
        
        // Clean up
        setTimeout(() => {
            this.hideUploadArea();
            this.removeFilePreviews();
        }, 1000);
        
        this.logger.info(`Successfully processed ${files.length} files`);
    }

    generateUploadMessage(files) {
        const fileList = files.map(file => {
            const fileType = this.supportedTypes[file.type];
            return `• ${file.name} (${this.formatFileSize(file.size)}, ${fileType.category})`;
        }).join('\n');

        return `I've uploaded ${files.length} financial document${files.length > 1 ? 's' : ''} for analysis:\n\n${fileList}\n\nPlease analyze these documents and help me understand my financial data.`;
    }

    // UI methods
    showUploadArea() {
        if (this.uploadArea) {
            this.uploadArea.style.display = 'block';
        }
    }

    hideUploadArea() {
        if (this.uploadArea) {
            this.uploadArea.style.display = 'none';
        }
    }

    showUploadProgress() {
        const progressContainer = this.uploadArea.querySelector('.upload-progress-container');
        const content = this.uploadArea.querySelector('.upload-content');
        
        if (progressContainer && content) {
            content.style.display = 'none';
            progressContainer.style.display = 'flex';
            this.dropZone.classList.add('uploading');
        }
    }

    hideUploadProgress() {
        const progressContainer = this.uploadArea.querySelector('.upload-progress-container');
        const content = this.uploadArea.querySelector('.upload-content');
        
        if (progressContainer && content) {
            progressContainer.style.display = 'none';
            content.style.display = 'flex';
            this.dropZone.classList.remove('uploading');
        }
    }

    updateUploadProgress(percentage, text) {
        const progressFill = this.uploadArea.querySelector('.upload-progress-fill');
        const progressText = this.uploadArea.querySelector('.upload-progress-text');
        
        if (progressFill) {
            progressFill.style.width = `${percentage}%`;
        }
        
        if (progressText) {
            progressText.textContent = text;
        }
    }

    removeFile(index) {
        const card = document.querySelector(`[data-file-index="${index}"]`);
        if (card) {
            card.remove();
        }
        
        // If no more files, hide upload area
        const remainingCards = document.querySelectorAll('.file-preview-card');
        if (remainingCards.length === 0) {
            this.hideUploadArea();
        }
    }

    removeFilePreviews() {
        const container = document.querySelector('.file-preview-container');
        if (container) {
            container.remove();
        }
    }

    showUploadErrors(errors) {
        const errorMessage = `Upload errors:\n${errors.join('\n')}`;
        
        // Create temporary error notification
        const notification = document.createElement('div');
        notification.className = 'upload-error-notification';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--danger);
            color: white;
            padding: 12px 16px;
            border-radius: 8px;
            font-size: 14px;
            max-width: 300px;
            z-index: 1000;
            animation: slide-in 0.3s ease;
        `;
        notification.textContent = errorMessage;

        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    showUploadError(message) {
        this.hideUploadProgress();
        this.showUploadErrors([message]);
    }

    // Utility methods
    getFileIcon(category) {
        const icons = {
            'transactions': '📊',
            'statements': '📄',
            'data': '📝',
            'spreadsheet': '📈',
            'image': '🖼️'
        };
        return icons[category] || '📎';
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            reader.readAsText(file);
        });
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Public API
    isUploading() {
        return this.activeUploads.size > 0;
    }

    getSupportedTypes() {
        return Object.keys(this.supportedTypes);
    }

    getMaxFileSize() {
        return this.maxFileSize;
    }
}