import { Modal, MarkdownView, Setting } from 'obsidian';
import {
    ImageSelectionModal, EmojiSelectionModal, TargetPositionModal, WebAddressModal,
    IconImageSelectionModal
} from '../modals';
import { flags } from '../../resources/flags.js';
import { semver } from '../../utils/semver.js';

export class SelectPixelBannerModal extends Modal {
    constructor(app, plugin) {
        super(app);
        this.plugin = plugin;
        this.isLoading = false;
        this.isVerifyingAPI = true; // Track API verification state
    }

    async onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        
        // Initialize the basic modal UI immediately
        await this.initializeBasicUI();

    }
    
    // Initialize the basic UI (non-API dependent)
    async initializeBasicUI() {
        const { contentEl } = this;
        
        // Create title with the selected flag icon
        const titleContainer = contentEl.createEl('h2', {
            cls: 'pixel-banner-selector-title',
            attr: {
                style: `
                    display: flex;
                    align-items: center;
                    justify-content: flex-start;
                    margin-top: 5px;
                `
            }
        });
        
        // Add the flag image
        const flagImg = titleContainer.createEl('img', {
            attr: {
                src: flags[this.plugin.settings.selectImageIconFlag] || flags['red'],
                alt: 'Pixel Banner',
                style: `
                    width: 20px;
                    height: 25px;
                    vertical-align: middle;
                    margin: -5px 10px 0 20px;
                `
            }
        });
        
        // Add the text
        titleContainer.appendChild(document.createTextNode('Pixel Banner'));
        
        // Add version text
        const versionText = titleContainer.createEl('span', {
            text: `v${this.plugin.settings.lastVersion}`,
            attr: {
                style: `
                    font-size: 12px;
                    opacity: 0.7;
                    margin-left: 10px;
                    font-weight: normal;
                `
            }
        });

        // Add settings button to the title container
        const settingsButton = titleContainer.createEl('button', {
            cls: 'pixel-banner-settings-button',
            attr: {
                style: `
                    margin-left: auto;
                    margin-right: 20px;
                    padding: 4px 10px;
                    // background: transparent;
                    border: none;
                    cursor: pointer;
                    font-size: 14px;
                    text-transform: uppercase;
                `
            }
        });
        settingsButton.innerHTML = '⚙️ Plugin Settings';
        settingsButton.title = 'Open Pixel Banner Plugin Settings';
        settingsButton.addEventListener('click', () => {
            this.close();
            
            // Open settings and navigate to Pixel Banner tab
            const openSettings = async () => {
                await this.app.setting.open();
                await new Promise(resolve => setTimeout(resolve, 300)); // Wait for settings to load
                
                // Find and click the Pixel Banner item in the settings sidebar
                const settingsTabs = document.querySelectorAll('.vertical-tab-header-group .vertical-tab-nav-item');
                for (const tab of settingsTabs) {
                    if (tab.textContent.includes('Pixel Banner')) {
                        tab.click();
                        break;
                    }
                }
            };
            
            openSettings();
        });

        // Check if the current note has a banner
        const activeFile = this.app.workspace.getActiveFile();
        const hasBanner = activeFile ? (
            this.plugin.hasBannerFrontmatter(activeFile) || 
            (this.plugin.app.metadataCache.getFileCache(activeFile)?.frontmatter && 
             this.plugin.settings.customBannerShuffleField.some(field => 
                this.plugin.app.metadataCache.getFileCache(activeFile)?.frontmatter?.[field]
             ))
        ) : false;

        // Create main container
        const mainContainer = contentEl.createDiv({ cls: 'pixel-banner-main-container' });
        
        // Create banner source section with heading
        const bannerSourceSection = mainContainer.createDiv({ cls: 'pixel-banner-section' });
        bannerSourceSection.createEl('h3', {
            text: 'Choose a Banner',
            cls: 'pixel-banner-section-title',
            attr: {
                style: `
                    margin: 0;
                `
            }
        });
        
        // Banner source buttons container
        const bannerSourceButtons = bannerSourceSection.createDiv({
            cls: 'pixel-banner-source-buttons',
        });

        // Vault Selection Button (immediately available)
        const vaultButton = bannerSourceButtons.createEl('button', {
            cls: 'pixel-banner-source-button'
        });
        const vaultButtonContent = vaultButton.createDiv({ cls: 'pixel-banner-button-content' });
        vaultButtonContent.createEl('span', { text: '💾', cls: 'pixel-banner-button-icon' });
        vaultButtonContent.createEl('div', { cls: 'pixel-banner-button-text-container' }).createEl('span', { 
            text: 'Your Vault', 
            cls: 'pixel-banner-button-text' 
        });
        
        // Vault Selection Button Click Event
        vaultButton.addEventListener('click', () => {
            this.close();
            new ImageSelectionModal(
                this.app, 
                this.plugin,
                async (file) => {
                    // This is the onChoose callback that will be used when an image is selected
                    const activeFile = this.app.workspace.getActiveFile();
                    if (activeFile) {
                        await this.plugin.app.fileManager.processFrontMatter(activeFile, (frontmatter) => {
                            const bannerField = this.plugin.settings.customBannerField[0];
                            const format = this.plugin.settings.imagePropertyFormat;
                            // Apply the format based on the user's setting
                            let bannerValue;
                            if (format === 'image') {
                                bannerValue = file.path;  // Plain path
                            } else if (format === '[[image]]') {
                                bannerValue = `[[${file.path}]]`;  // Wiki link
                            } else {  // format === '![[image]]'
                                bannerValue = `![[${file.path}]]`;  // Embedded image
                            }
                            frontmatter[bannerField] = bannerValue;
                        });
                        
                        // If not opening the banner icon modal, check if we should open the targeting modal
                        if (this.plugin.settings.openTargetingModalAfterSelectingBannerOrIcon) {
                            new TargetPositionModal(this.app, this.plugin).open();
                        }
                    }
                },
                this.plugin.settings.defaultSelectImagePath
            ).open();
        });

        // Web Address Button (immediately available)
        const webAddressButton = bannerSourceButtons.createEl('button', {
            cls: 'pixel-banner-source-button'
        });
        const webAddressButtonContent = webAddressButton.createDiv({ cls: 'pixel-banner-button-content' });
        webAddressButtonContent.createEl('span', { text: '🌐', cls: 'pixel-banner-button-icon' });
        webAddressButtonContent.createEl('div', { cls: 'pixel-banner-button-text-container' }).createEl('span', { 
            text: 'URL', 
            cls: 'pixel-banner-button-text' 
        });

        // Web Address Button Click Event
        webAddressButton.addEventListener('click', () => {
            this.close();
            new WebAddressModal(this.app, this.plugin).open();
        });

        // Customization section
        const customizationSection = mainContainer.createDiv({ cls: 'pixel-banner-section' });
        customizationSection.createEl('h3', {
            text: 'Customize Banner',
            cls: 'pixel-banner-section-title',
            attr: {
                style: `
                    margin: 0;
                `
            }
        });
        
        // Customization options container
        const customizationOptions = customizationSection.createDiv({ cls: 'pixel-banner-customization-options' });
        
        // Banner Icon Image Button
        const bannerIconImageButton = customizationOptions.createEl('button', {
            cls: 'pixel-banner-customize-button'
        });
        const bannerIconImageContent = bannerIconImageButton.createDiv({ cls: 'pixel-banner-button-content' });
        bannerIconImageContent.createEl('span', { text: '⭐', cls: 'pixel-banner-button-icon' });
        bannerIconImageContent.createEl('div', { cls: 'pixel-banner-button-text-container' }).createEl('span', { 
            text: 'Icon Image', 
            cls: 'pixel-banner-button-text' 
        });

        // Disable the Icon Image button if no banner exists
        if (!hasBanner) {
            bannerIconImageButton.disabled = true;
            bannerIconImageButton.classList.add('pixel-banner-button-disabled');
            bannerIconImageButton.title = 'You need to add a banner first';
        }

        // Add click handler for the Icon Image button
        bannerIconImageButton.addEventListener('click', () => {
            this.close();
            
            // Function to handle image selection
            const onChooseBannerIconImage = async (filePath) => {
                if (!filePath) {
                    return;
                }
                
                // Handle case where filePath might be a file object instead of string
                let pathString = filePath;
                if (typeof filePath === 'object' && filePath.path) {
                    pathString = filePath.path;
                } else if (typeof filePath !== 'string') {
                    return;
                }
                
                const activeFile = this.app.workspace.getActiveFile();
                if (!activeFile) return;
                
                // Get the file object from the vault using the path
                const file = this.app.vault.getAbstractFileByPath(pathString);
                
                // Check if this is a web URL or local file
                if (typeof pathString === 'string' && (pathString.startsWith('http://') || pathString.startsWith('https://'))) {
                    // For web URLs, use the URL directly
                    this.app.fileManager.processFrontMatter(activeFile, (fm) => {
                        // Get the correct field name
                        const iconImageField = Array.isArray(this.plugin.settings.customBannerIconImageField) 
                            ? this.plugin.settings.customBannerIconImageField[0].split(',')[0].trim()
                            : this.plugin.settings.customBannerIconImageField;
                        
                        // Set the frontmatter value as direct URL
                        fm[iconImageField] = pathString;
                    });
                    
                    // Open the targeting modal after selecting an icon image
                    new TargetPositionModal(this.app, this.plugin).open();
                    return;
                }
                
                // For local files, preload the image into the cache
                const extensionPart = pathString.split('.').pop();
                const fileExtension = extensionPart ? extensionPart.toLowerCase() : '';
                if (fileExtension && fileExtension.match(/^(jpg|jpeg|png|gif|bmp|svg|webp|avif)$/)) {
                    try {
                        // Get the vault URL for the image and load it into the cache
                        const imageUrl = await this.plugin.getVaultImageUrl(pathString);
                        if (imageUrl) {
                            this.plugin.loadedImages.set(pathString, imageUrl);
                            
                            // Force a preload of the image to ensure it's in browser cache
                            const preloadImg = new Image();
                            preloadImg.src = imageUrl;
                        }
                    } catch (error) {
                        console.error("Error preloading icon image:", error);
                    }
                }
                
                // Update frontmatter with the image path
                this.app.fileManager.processFrontMatter(activeFile, (fm) => {
                    // Get the correct field name
                    const iconImageField = Array.isArray(this.plugin.settings.customBannerIconImageField) 
                        ? this.plugin.settings.customBannerIconImageField[0].split(',')[0].trim()
                        : this.plugin.settings.customBannerIconImageField;
                    
                    // Apply the format based on the user's setting
                    const format = this.plugin.settings.imagePropertyFormat;
                    let iconValue;
                    if (format === 'image') {
                        iconValue = pathString;  // Plain path
                    } else if (format === '[[image]]') {
                        iconValue = `[[${pathString}]]`;  // Wiki link
                    } else {  // format === '![[image]]'
                        iconValue = `![[${pathString}]]`;  // Embedded image
                    }
                    
                    // Set the frontmatter value
                    fm[iconImageField] = iconValue;
                });
                
                // Open the targeting modal after selecting an icon image
                new TargetPositionModal(this.app, this.plugin).open();
            };
            
            // Open the Banner Image Selection modal with the default icon path
            new IconImageSelectionModal(
                this.app,
                this.plugin,
                onChooseBannerIconImage,
                this.plugin.settings.defaultSelectIconPath
            ).open();
        });

        // Banner Icon Button
        const bannerIconButton = customizationOptions.createEl('button', {
            cls: 'pixel-banner-customize-button'
        });
        const bannerIconContent = bannerIconButton.createDiv({ cls: 'pixel-banner-button-content' });
        bannerIconContent.createEl('span', { text: '📰', cls: 'pixel-banner-button-icon' });
        bannerIconContent.createEl('div', { cls: 'pixel-banner-button-text-container' }).createEl('span', { 
            text: 'Icon Emoji & Text', 
            cls: 'pixel-banner-button-text' 
        });
        
        // Disable the button if no banner exists
        if (!hasBanner) {
            bannerIconButton.disabled = true;
            bannerIconButton.classList.add('pixel-banner-button-disabled');
            bannerIconButton.title = 'You need to add a banner first';
        }
        
        bannerIconButton.addEventListener('click', () => {
            if (!hasBanner) return; // Extra safety check
            
            this.close();
            new EmojiSelectionModal(
                this.app, 
                this.plugin,
                async (emoji) => {
                    const activeFile = this.app.workspace.getActiveFile();
                    if (activeFile) {
                        await this.plugin.app.fileManager.processFrontMatter(activeFile, (frontmatter) => {
                            const iconField = this.plugin.settings.customBannerIconField[0];
                            if (emoji) {
                                frontmatter[iconField] = emoji;
                            } else {
                                // If emoji is empty, remove the field from frontmatter
                                delete frontmatter[iconField];
                            }
                        });
                    }
                }
            ).open();
        });

        // Targeting Icon Button
        const targetingIconButton = customizationOptions.createEl('button', {
            cls: 'pixel-banner-customize-button'
        });
        const targetingIconContent = targetingIconButton.createDiv({ cls: 'pixel-banner-button-content' });
        targetingIconContent.createEl('span', { text: '🎯', cls: 'pixel-banner-button-icon' });
        targetingIconContent.createEl('div', { cls: 'pixel-banner-button-text-container' }).createEl('span', { 
            text: 'Position, Size, & Style', 
            cls: 'pixel-banner-button-text' 
        });

        // Disable the button if no banner exists
        if (!hasBanner) {
            targetingIconButton.disabled = true;
            targetingIconButton.classList.add('pixel-banner-button-disabled');
            targetingIconButton.title = 'You need to add a banner first';
        }

        targetingIconButton.addEventListener('click', () => {
            this.close();
            new TargetPositionModal(this.app, this.plugin).open();
        });
        
        // Set focus on the targeting icon button
        setTimeout(() => {
            if (hasBanner && targetingIconButton) {
                targetingIconButton.focus();
            }
        }, 1000);
        
        // No Banner Message
        if (!hasBanner) {
            const noBannerMessage = customizationSection.createDiv({ cls: 'pixel-banner-no-banner-message' });
            noBannerMessage.createEl('p', { 
                text: 'Add a banner first to enable customization options.',
                cls: 'pixel-banner-message-text'
            });
        }
    }

    addStyle() {
        const style = document.createElement('style');
        style.textContent = `            
            .pixel-banner-main-container {
                display: flex;
                flex-direction: column;
                gap: 15px;
                padding: 0 16px 16px;
                max-height: 80vh;
                width: 100%;
                box-sizing: border-box;
            }
            
            .pixel-banner-section {
                display: flex;
                flex-direction: column;
                gap: 16px;
                width: 100%;
                padding: 14px;
            }
            
            .pixel-banner-section-title {
                font-size: 16px;
                margin: 0;
                color: var(--text-normal);
                font-weight: 600;
            }
            
            .pixel-banner-source-buttons {
                display: flex;
                flex-wrap: wrap;
                gap: 12px;
                width: 100%;
                justify-content: space-between;
            }
            
            .pixel-banner-source-button {
                display: flex;
                flex-direction: column;
                align-items: center;
                padding: 12px 8px;
                border-radius: 8px;
                border: 1px solid var(--background-modifier-border);
                background: var(--background-primary);
                cursor: pointer;
                transition: all 0.2s ease;
                flex: auto;
                min-width: 80px;
                height: 100%;
                box-sizing: border-box;
                overflow: hidden;
            }
            
            .pixel-banner-source-button:hover {
                background: var(--background-modifier-hover);
                transform: translateY(-2px);
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }
            
            .pixel-banner-button-content {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 12px;
                width: 100%;
                height: 100%;
            }
            
            .pixel-banner-button-icon {
                font-size: 24px;
                line-height: 1;
                flex-shrink: 0;
            }
            
            .pixel-banner-button-text-container {
                text-align: center;
                width: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-grow: 1;
                overflow: hidden;
            }
            
            .pixel-banner-button-text {
                font-size: 13px;
                font-weight: 500;
                white-space: normal;
                word-break: break-word;
                line-height: 1.2;
                hyphens: auto;
                overflow-wrap: break-word;
                max-width: 100%;
            }
            
            .pixel-banner-customization-options {
                display: flex;
                flex-wrap: wrap;
                gap: 12px;
                width: 100%;
                justify-content: space-between;
            }
            
            .pixel-banner-customize-button {
                display: flex;
                flex-direction: column;
                align-items: center;
                padding: 12px 8px;
                border-radius: 8px;
                border: 1px solid var(--background-modifier-border);
                background: var(--background-primary);
                cursor: pointer;
                transition: all 0.2s ease;
                flex: auto;
                min-width: 80px;
                height: 100%;
                box-sizing: border-box;
                overflow: hidden;
            }
            
            .pixel-banner-customize-button:hover {
                background: var(--background-modifier-hover);
                transform: translateY(-2px);
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }
            
            .pixel-banner-button-disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }
            
            .pixel-banner-button-disabled:hover {
                background: var(--background-primary);
                transform: none;
                box-shadow: none;
            }
            
            .pixel-banner-no-banner-message {
                background: var(--background-modifier-error-rgb);
                border-radius: 8px;
                width: 100%;
                box-sizing: border-box;
            }
            
            .pixel-banner-message-text {
                margin: 0;
                color: var(--text-accent-hover);
                font-size: 14px;
                text-align: center;
                text-transform: uppercase;
            }
            
            .pixel-banner-settings-button:hover {
                opacity: 0.8;
            }
            
            /* Account styles */
            .pixel-banner-account-info {
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: flex-start;
                flex-wrap: wrap;
                gap: 10px;
                width: 100%;
            }
            
            .pixel-banner-status-value {
                padding: 3px 7px;
                border-radius: 15px;
                font-size: .8em;
                letter-spacing: 1px;
                background-color: var(--background-primary);
                display: inline-flex;
                align-items: center;
            }
            
            .pixel-banner-account-button {
                display: flex;
                flex-direction: column;
                align-items: center;
                padding: 12px 8px;
                border-radius: 8px;
                border: 1px solid var(--background-modifier-border);
                background: var(--background-primary);
                cursor: pointer;
                transition: all 0.2s ease;
                flex: 1;
                min-width: 80px;
                height: 100%;
                box-sizing: border-box;
                overflow: hidden;
            }
            
            .pixel-banner-account-button:hover {
                opacity: 0.9;
                transform: translateY(-2px);
            }
            
            .pixel-banner-buy-tokens-button {
                background-color: darkgreen !important;
                color: papayawhip !important;
                opacity: 0.7;
            }
            
            .pixel-banner-signup-button {
                background-color: var(--interactive-accent) !important;
                color: var(--text-on-accent) !important;
            }
            
            .pixel-banner-retry-button {
                background-color: var(--background-accent) !important;
                color: var(--text-on-accent) !important;
                font-size: 0.8em !important;
                padding: 4px 8px !important;
                animation: pixel-banner-pulse 2s infinite;
            }
            
            @keyframes pixel-banner-pulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.05); }
                100% { transform: scale(1); }
            }
            
            /* Loading spinner styles */
            @keyframes pixel-banner-spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            @keyframes pixel-banner-fade-in {
                0% { opacity: 0; }
                100% { opacity: 1; }
            }
            
            @keyframes pixel-banner-scale-up-down {
                0% { transform: scale(1); }
                50% { transform: scale(1.05); }
                100% { transform: scale(1); }
            }
            
            @media (min-width: 400px) {
                .pixel-banner-source-button,
                .pixel-banner-customize-button {
                    padding: 16px 8px;
                }
            }
            
            @media (max-width: 590px) {
                .pixel-banner-daily-game-container {
                    flex-direction: column !important;
                    align-items: flex-start !important;
                }
            }
            
            @media (max-width: 399px) {
                .pixel-banner-source-button,
                .pixel-banner-customize-button {
                    min-height: 90px;
                }
                
                .pixel-banner-button-icon {
                    font-size: 20px;
                }
                
                .pixel-banner-button-text {
                    font-size: 12px;
                }
            }
        `;
        document.head.appendChild(style);
        this.style = style;
    }

    onClose() {
        this.contentEl.empty();
        if (this.style) {
            this.style.remove();
        }
    }
} 