/**
 * LoadingManager - Handles loading states, skeleton screens, and progress indicators
 */

import { Logger } from '/src/js/utils/logger.js';
import { ErrorHandler } from '/src/js/utils/errorHandler.js';

export class LoadingManager {
    constructor() {
        this.logger = new Logger('LoadingManager');
        this.errorHandler = new ErrorHandler();
        
        // Loading state tracking
        this.activeLoaders = new Map();
        this.loadingStates = {
            IDLE: 'idle',
            LOADING: 'loading',
            SUCCESS: 'success',
            ERROR: 'error'
        };
        
        // Animation timing
        this.animationDuration = 200;
        this.skeletonPulseSpeed = 1.5;
    }

    init() {
        try {
            this.logger.info('Initializing LoadingManager');
            
            // Create loading overlay container
            this.createLoadingContainer();
            
            // Add skeleton CSS if not already present
            this.injectSkeletonStyles();
            
            this.logger.info('LoadingManager initialized successfully');
            
        } catch (error) {
            this.errorHandler.handleError(error, 'Failed to initialize LoadingManager');
        }
    }

    createLoadingContainer() {
        // Create global loading overlay container
        this.loadingContainer = document.createElement('div');
        this.loadingContainer.id = 'loading-overlays';
        this.loadingContainer.className = 'loading-overlays';
        document.body.appendChild(this.loadingContainer);
    }

    injectSkeletonStyles() {
        const styleId = 'skeleton-styles';
        if (document.getElementById(styleId)) return;

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            /* Loading overlay styles */
            .loading-overlays {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                pointer-events: none;
                z-index: 9999;
            }

            .loading-overlay {
                position: absolute;
                background: rgba(30, 41, 59, 0.8);
                backdrop-filter: blur(2px);
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                transition: opacity ${this.animationDuration}ms ease;
                pointer-events: auto;
            }

            .loading-overlay.visible {
                opacity: 1;
            }

            /* Skeleton animation */
            @keyframes skeleton-pulse {
                0% { opacity: 0.6; }
                50% { opacity: 1; }
                100% { opacity: 0.6; }
            }

            .skeleton {
                background: linear-gradient(90deg, var(--bg-secondary) 25%, var(--bg-hover) 50%, var(--bg-secondary) 75%);
                background-size: 200% 100%;
                animation: skeleton-loading ${this.skeletonPulseSpeed}s infinite ease-in-out;
                border-radius: 4px;
            }

            @keyframes skeleton-loading {
                0% { background-position: 200% 0; }
                100% { background-position: -200% 0; }
            }

            /* Skeleton components */
            .skeleton-message {
                padding: 24px 0;
                border-bottom: 1px solid var(--border);
            }

            .skeleton-message-header {
                display: flex;
                align-items: center;
                gap: 16px;
                margin-bottom: 16px;
            }

            .skeleton-avatar {
                width: 40px;
                height: 40px;
                border-radius: 50%;
            }

            .skeleton-name {
                width: 80px;
                height: 16px;
            }

            .skeleton-text {
                height: 16px;
                margin-bottom: 8px;
                border-radius: 4px;
            }

            .skeleton-text:last-child {
                margin-bottom: 0;
            }

            .skeleton-text.short {
                width: 60%;
            }

            .skeleton-text.medium {
                width: 80%;
            }

            .skeleton-text.long {
                width: 100%;
            }

            /* Skeleton card */
            .skeleton-card {
                background: var(--bg-secondary);
                border: 1px solid var(--border);
                border-radius: 8px;
                padding: 16px;
                margin: 16px 0;
            }

            .skeleton-card-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 12px;
            }

            .skeleton-card-title {
                width: 120px;
                height: 18px;
            }

            .skeleton-card-value {
                width: 80px;
                height: 18px;
            }

            .skeleton-card-body {
                height: 14px;
                width: 90%;
            }

            /* Loading spinner */
            .spinner {
                width: 40px;
                height: 40px;
                border: 3px solid var(--border);
                border-top: 3px solid var(--accent);
                border-radius: 50%;
                animation: spinner-rotate 1s linear infinite;
            }

            @keyframes spinner-rotate {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }

            .spinner-small {
                width: 20px;
                height: 20px;
                border-width: 2px;
            }

            /* Progress bar */
            .progress-container {
                width: 200px;
                height: 4px;
                background: var(--border);
                border-radius: 2px;
                overflow: hidden;
                margin: 8px 0;
            }

            .progress-bar {
                height: 100%;
                background: var(--accent);
                border-radius: 2px;
                transition: width 0.3s ease;
                width: 0%;
            }

            .progress-indeterminate {
                width: 30%;
                animation: progress-indeterminate 2s infinite linear;
            }

            @keyframes progress-indeterminate {
                0% { transform: translateX(-100%); }
                100% { transform: translateX(400%); }
            }

            /* Loading states for components */
            .chat-messages.loading .welcome-screen {
                display: none;
            }

            .sidebar.loading .sidebar-actions {
                opacity: 0.5;
                pointer-events: none;
            }

            .input-area.loading .input-wrapper {
                opacity: 0.7;
            }

            .input-area.loading .send-btn {
                opacity: 0.5;
                pointer-events: none;
            }
        `;
        document.head.appendChild(style);
    }

    // Loading overlay methods
    showOverlay(targetElement, options = {}) {
        try {
            const overlay = this.createOverlay(targetElement, options);
            const loaderId = this.generateLoaderId();
            
            this.activeLoaders.set(loaderId, {
                overlay,
                targetElement,
                startTime: Date.now()
            });

            return loaderId;
            
        } catch (error) {
            this.errorHandler.handleError(error, 'Failed to show loading overlay');
            return null;
        }
    }

    hideOverlay(loaderId) {
        try {
            const loader = this.activeLoaders.get(loaderId);
            if (!loader) return;

            const duration = Date.now() - loader.startTime;
            this.logger.debug(`Loading completed in ${duration}ms`);

            // Fade out animation
            loader.overlay.classList.remove('visible');
            
            setTimeout(() => {
                if (loader.overlay.parentElement) {
                    loader.overlay.remove();
                }
                this.activeLoaders.delete(loaderId);
            }, this.animationDuration);
            
        } catch (error) {
            this.errorHandler.handleError(error, 'Failed to hide loading overlay');
        }
    }

    createOverlay(targetElement, options = {}) {
        const overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        
        // Position overlay over target element
        const rect = targetElement.getBoundingClientRect();
        overlay.style.top = `${rect.top}px`;
        overlay.style.left = `${rect.left}px`;
        overlay.style.width = `${rect.width}px`;
        overlay.style.height = `${rect.height}px`;

        // Create loading content
        const content = document.createElement('div');
        content.className = 'loading-content';
        
        if (options.type === 'spinner') {
            content.innerHTML = `
                <div class="spinner ${options.size === 'small' ? 'spinner-small' : ''}"></div>
                ${options.text ? `<div style="margin-top: 12px; color: var(--text-primary);">${options.text}</div>` : ''}
            `;
        } else if (options.type === 'progress') {
            content.innerHTML = `
                <div class="progress-container">
                    <div class="progress-bar ${options.indeterminate ? 'progress-indeterminate' : ''}" 
                         style="width: ${options.progress || 0}%"></div>
                </div>
                ${options.text ? `<div style="margin-top: 8px; color: var(--text-primary); font-size: 14px;">${options.text}</div>` : ''}
            `;
        } else {
            // Default spinner
            content.innerHTML = `<div class="spinner"></div>`;
        }

        overlay.appendChild(content);
        this.loadingContainer.appendChild(overlay);

        // Trigger animation
        requestAnimationFrame(() => {
            overlay.classList.add('visible');
        });

        return overlay;
    }

    // Skeleton screen methods
    showMessageSkeleton(container, count = 2) {
        try {
            const skeletonContainer = document.createElement('div');
            skeletonContainer.className = 'skeleton-container';
            
            for (let i = 0; i < count; i++) {
                const messageDiv = document.createElement('div');
                messageDiv.className = 'skeleton-message';
                messageDiv.innerHTML = `
                    <div class="skeleton-message-header">
                        <div class="skeleton skeleton-avatar"></div>
                        <div class="skeleton skeleton-name"></div>
                    </div>
                    <div class="skeleton skeleton-text long"></div>
                    <div class="skeleton skeleton-text medium"></div>
                    <div class="skeleton skeleton-text short"></div>
                `;
                skeletonContainer.appendChild(messageDiv);
            }
            
            container.appendChild(skeletonContainer);
            return skeletonContainer;
            
        } catch (error) {
            this.errorHandler.handleError(error, 'Failed to show message skeleton');
            return null;
        }
    }

    showCardSkeleton(container, count = 3) {
        try {
            const skeletonContainer = document.createElement('div');
            skeletonContainer.className = 'skeleton-container';
            
            for (let i = 0; i < count; i++) {
                const cardDiv = document.createElement('div');
                cardDiv.className = 'skeleton-card';
                cardDiv.innerHTML = `
                    <div class="skeleton-card-header">
                        <div class="skeleton skeleton-card-title"></div>
                        <div class="skeleton skeleton-card-value"></div>
                    </div>
                    <div class="skeleton skeleton-card-body"></div>
                `;
                skeletonContainer.appendChild(cardDiv);
            }
            
            container.appendChild(skeletonContainer);
            return skeletonContainer;
            
        } catch (error) {
            this.errorHandler.handleError(error, 'Failed to show card skeleton');
            return null;
        }
    }

    hideSkeleton(skeletonElement) {
        try {
            if (skeletonElement && skeletonElement.parentElement) {
                skeletonElement.style.opacity = '0';
                setTimeout(() => {
                    if (skeletonElement.parentElement) {
                        skeletonElement.remove();
                    }
                }, this.animationDuration);
            }
        } catch (error) {
            this.errorHandler.handleError(error, 'Failed to hide skeleton');
        }
    }

    // Component loading states
    setComponentLoadingState(element, state, options = {}) {
        try {
            // Remove existing loading classes
            element.classList.remove('loading', 'success', 'error');
            
            switch (state) {
                case this.loadingStates.LOADING:
                    element.classList.add('loading');
                    if (options.showSpinner) {
                        this.addInlineSpinner(element, options);
                    }
                    break;
                    
                case this.loadingStates.SUCCESS:
                    element.classList.add('success');
                    this.removeInlineSpinner(element);
                    if (options.showSuccess) {
                        this.showSuccessIndicator(element);
                    }
                    break;
                    
                case this.loadingStates.ERROR:
                    element.classList.add('error');
                    this.removeInlineSpinner(element);
                    break;
                    
                case this.loadingStates.IDLE:
                default:
                    this.removeInlineSpinner(element);
                    break;
            }
            
        } catch (error) {
            this.errorHandler.handleError(error, 'Failed to set component loading state');
        }
    }

    addInlineSpinner(element, options = {}) {
        const existing = element.querySelector('.inline-spinner');
        if (existing) return;

        const spinner = document.createElement('div');
        spinner.className = `inline-spinner spinner ${options.size === 'small' ? 'spinner-small' : ''}`;
        spinner.style.position = 'absolute';
        spinner.style.top = '50%';
        spinner.style.right = '12px';
        spinner.style.transform = 'translateY(-50%)';
        spinner.style.zIndex = '10';

        element.style.position = 'relative';
        element.appendChild(spinner);
    }

    removeInlineSpinner(element) {
        const spinner = element.querySelector('.inline-spinner');
        if (spinner) {
            spinner.remove();
        }
    }

    showSuccessIndicator(element) {
        const indicator = document.createElement('div');
        indicator.className = 'success-indicator';
        indicator.innerHTML = '✓';
        indicator.style.cssText = `
            position: absolute;
            top: 50%;
            right: 12px;
            transform: translateY(-50%);
            color: var(--success);
            font-weight: bold;
            z-index: 10;
            animation: success-fade 2s ease forwards;
        `;

        // Add animation keyframes if not already present
        if (!document.querySelector('#success-animation')) {
            const style = document.createElement('style');
            style.id = 'success-animation';
            style.textContent = `
                @keyframes success-fade {
                    0% { opacity: 0; transform: translateY(-50%) scale(0.5); }
                    20% { opacity: 1; transform: translateY(-50%) scale(1.1); }
                    100% { opacity: 0; transform: translateY(-50%) scale(1); }
                }
            `;
            document.head.appendChild(style);
        }

        element.style.position = 'relative';
        element.appendChild(indicator);

        setTimeout(() => {
            if (indicator.parentElement) {
                indicator.remove();
            }
        }, 2000);
    }

    // Utility methods
    generateLoaderId() {
        return `loader_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    updateProgress(loaderId, progress) {
        try {
            const loader = this.activeLoaders.get(loaderId);
            if (!loader) return;

            const progressBar = loader.overlay.querySelector('.progress-bar');
            if (progressBar && !progressBar.classList.contains('progress-indeterminate')) {
                progressBar.style.width = `${Math.min(100, Math.max(0, progress))}%`;
            }
        } catch (error) {
            this.errorHandler.handleError(error, 'Failed to update progress');
        }
    }

    // Cleanup
    clearAllLoaders() {
        this.activeLoaders.forEach((loader, id) => {
            this.hideOverlay(id);
        });
    }

    getActiveLoadersCount() {
        return this.activeLoaders.size;
    }
}