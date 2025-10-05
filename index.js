/**
 * Video Link Extension for SillyTavern
 * Adds a button to each message that calls an API and inserts a clickable video link
 */

// Extension module name - must be unique
const MODULE_NAME = 'video_link';

// Default settings
let defaultSettings = Object.freeze({
    enabled: true,    
    apiEndpoint: 'https://api.example.com/get-link',
    buttonText: '🔗',
    buttonPosition: 'bottom' // 'top' or 'bottom'
});

// Extension state
let settings = {};

/**
 * Initialize settings for the extension
 */
function loadSettings() {
    const { extensionSettings } = SillyTavern.getContext();
    
    // Initialize settings if they don't exist
    if (!extensionSettings[MODULE_NAME]) {
        extensionSettings[MODULE_NAME] = structuredClone(defaultSettings);
    }
    
    // Ensure all default keys exist
    for (const key of Object.keys(defaultSettings)) {
        if (!Object.hasOwn(extensionSettings[MODULE_NAME], key)) {
            extensionSettings[MODULE_NAME][key] = defaultSettings[key];
        }
    }
    
    settings = extensionSettings[MODULE_NAME];
}

/**
 * Save settings
 */
function saveSettings() {
    const { saveSettingsDebounced } = SillyTavern.getContext();
    saveSettingsDebounced();
}

/**
 * Make API call to get the URL
 * @param {string} messageText - The text content of the message
 * @returns {Promise<string>} The URL from the API
 */
async function fetchLinkFromAPI(messageText) {
    try {
        const response = await fetch(settings.apiEndpoint+'/v1/txt2vid', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: messageText,
                timestamp: Date.now()
            })
        });
        
        if (!response.ok) {
            throw new Error(`API returned status ${response.status}`);
        }
        
        const data = await response.json();
        
        // Assuming the API returns { url: "https://..." }
        // Adjust this based on your actual API response structure
        return data.filename;
    } catch (error) {
        console.error('[Video Link] Error fetching link:', error);
        throw error;
    }
}

/**
 * Add a clickable link to the message
 * @param {HTMLElement} messageElement - The message container element
 * @param {string} url - The URL to add
 * @param {boolean} saveToChat - Whether to save the link to chat metadata
 */
function addLinkToMessage(messageElement, url, saveToChat = true) {
    // Find the message text container
    const mesText = messageElement.querySelector('.mes_text');
    if (!mesText) return;
    
    // Check if link already exists
    if (messageElement.querySelector('.message-link-container')) {
        console.log('[Video Link] Link already exists for this message');
        return;
    }
    
    // Create link element
    const linkContainer = document.createElement('div');
    linkContainer.className = 'message-link-container';
    
    const link = document.createElement('a');
    link.href = url;
    link.textContent = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.className = 'message-generated-link';
    
    linkContainer.appendChild(link);
    mesText.appendChild(linkContainer);
    
    // Save to chat metadata if requested
    if (saveToChat) {
        saveVideoLinkToMessage(messageElement, url);
    }
}

/**
 * Save video link to message metadata
 * @param {HTMLElement} messageElement - The message container element
 * @param {string} url - The URL to save
 */
async function saveVideoLinkToMessage(messageElement, url) {
    try {
        const context = SillyTavern.getContext();
        const { chat } = context;
        
        // Get message ID from the element
        const mesId = messageElement.getAttribute('mesid');
        if (mesId === null || mesId === undefined) {
            console.error('[Video Link] No message ID found');
            return;
        }
        
        const messageIndex = parseInt(mesId);
        if (isNaN(messageIndex) || messageIndex < 0 || messageIndex >= chat.length) {
            console.error('[Video Link] Invalid message index:', messageIndex);
            return;
        }
        
        // Get the message object
        const message = chat[messageIndex];
        
        // Initialize extra field if it doesn't exist
        if (!message.extra) {
            message.extra = {};
        }
        
        // Save the video link
        message.extra.video_link = url;
        
        // Save the chat - use the correct function name
        if (typeof context.saveChat === 'function') {
            await context.saveChat();
        } else if (typeof context.saveChatConditional === 'function') {
            await context.saveChatConditional();
        } else {
            console.warn('[Video Link] No save function available, link may not persist');
        }
        
        console.log('[Video Link] Saved link to message:', messageIndex, url);
    } catch (error) {
        console.error('[Video Link] Failed to save link to message:', error);
    }
}

/**
 * Load saved video links for all messages
 */
function loadSavedVideoLinks() {
    try {
        const { chat } = SillyTavern.getContext();
        
        if (!chat || chat.length === 0) {
            console.log('[Video Link] No chat loaded yet');
            return;
        }
        
        console.log('[Video Link] Loading saved video links for', chat.length, 'messages');
        
        let loadedCount = 0;
        
        // Iterate through all messages in the chat
        chat.forEach((message, index) => {
            // Check if message has a saved video link
            if (message.extra && message.extra.video_link) {
                console.log('[Video Link] Found saved link for message', index, ':', message.extra.video_link);
                
                // Find the corresponding message element in the DOM
                const messageElement = document.querySelector(`#chat .mes[mesid="${index}"]`);
                
                if (messageElement) {
                    console.log('[Video Link] Found DOM element for message', index);
                    
                    // Check if link is already displayed
                    if (!messageElement.querySelector('.message-link-container')) {
                        // Add the link without saving (it's already saved)
                        addLinkToMessage(messageElement, message.extra.video_link, false);
                        loadedCount++;
                    }
                } else {
                    console.log('[Video Link] DOM element not found for message', index);
                }
            }
        });
        
        console.log('[Video Link] Loaded', loadedCount, 'saved video links');
    } catch (error) {
        console.error('[Video Link] Error loading saved video links:', error);
    }
}

/**
 * Handle button click
 * @param {Event} event - Click event
 */
async function handleButtonClick(event) {
    const button = event.currentTarget;
    const messageElement = button.closest('.mes');
    
    if (!messageElement) return;
    
    // Get message text - extract only the text content, not HTML
    const mesText = messageElement.querySelector('.mes_text');
    if (!mesText) {
        console.error('[Video Link] No message text found');
        return;
    }
    
    // Get the actual text content, stripping out any HTML
    let messageText = mesText.innerText || mesText.textContent || '';
    messageText = messageText.trim();
    
    if (!messageText) {
        console.error('[Video Link] Message text is empty');
        return;
    }
    
    console.log('[Video Link] Sending message to API:', messageText);
    
    // Disable button during API call
    button.disabled = true;
    const originalText = button.textContent;
    button.textContent = '⏳';
    
    try {
        // Remove existing link if present (for regeneration)
        const existingLink = messageElement.querySelector('.message-link-container');
        if (existingLink) {
            existingLink.remove();
        }
        
        // Fetch URL from API
        const filename = await fetchLinkFromAPI(messageText);
        
        const url = `${apiEndpoint}/v1/player?id=${filename}`;

        // Add link to message
        addLinkToMessage(messageElement, url);
        
        // Update button to show success
        button.textContent = '✓';
        button.classList.add('success');
        
        // Reset button after short delay
        setTimeout(() => {
            button.textContent = originalText;
            button.classList.remove('success');
            button.disabled = false;
        }, 1500);
        
    } catch (error) {
        // Show error state
        button.textContent = '✗';
        button.classList.add('error');
        button.disabled = false;
        
        // Reset button after delay
        setTimeout(() => {
            button.textContent = originalText;
            button.classList.remove('error');
        }, 2000);
        
        console.error('[Video Link] Failed to fetch link:', error);
    }
}

/**
 * Add button to a message element
 * @param {HTMLElement} messageElement - The message container element
 */
function addButtonToMessage(messageElement) {
    // Don't add if button already exists
    if (messageElement.querySelector('.video-link-button')) {
        return;
    }
    
    // Create button container that will appear below the message text
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'video-link-button-container';
    
    // Create button
    const button = document.createElement('button');
    button.className = 'video-link-button menu_button';
    button.textContent = settings.buttonText;
    button.title = 'Get Video Link';
    button.addEventListener('click', handleButtonClick);
    
    buttonContainer.appendChild(button);
    
    // Find the message text container and add button relative to it
    const mesText = messageElement.querySelector('.mes_text');
    
    if (mesText) {
        // Insert before or after the message text based on settings
        if (settings.buttonPosition === 'top') {
            mesText.parentNode.insertBefore(buttonContainer, mesText);
        } else {
            mesText.parentNode.insertBefore(buttonContainer, mesText.nextSibling);
        }
    }
}

/**
 * Add buttons to all existing messages
 */
function addButtonsToAllMessages() {
    if (!settings.enabled) return;
    
    const messages = document.querySelectorAll('#chat .mes');
    messages.forEach(addButtonToMessage);
}

/**
 * Handle new messages being rendered
 */
function handleMessageRendered(event) {
    if (!settings.enabled) return;
    
    // Small delay to ensure message is fully rendered
    setTimeout(() => {
        // Load any saved links first
        loadSavedVideoLinks();
        // Then add buttons to messages that don't have links
        const messages = document.querySelectorAll('#chat .mes');
        messages.forEach(addButtonToMessage);
    }, 100);
}

/**
 * Create settings UI using SillyTavern's standard pattern
 */
function createSettingsUI() {
    const settingsHtml = `
        <div class="video-link-settings">
            <div class="inline-drawer">
                <div class="inline-drawer-toggle inline-drawer-header">
                    <b>Video Link</b>
                    <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
                </div>
                <div class="inline-drawer-content">
                    <label class="checkbox_label">
                        <input id="vl_enabled" type="checkbox" ${settings.enabled ? 'checked' : ''} />
                        <span>Enable Extension</span>
                    </label>
                    
                    <label for="vl_api_endpoint">
                        <small>API Endpoint</small>
                    </label>
                    <input id="vl_api_endpoint" class="text_pole" type="text" value="${settings.apiEndpoint}" />
                    <small>The API endpoint that returns a video URL</small>
                    
                    <label for="vl_button_text">
                        <small>Button Text</small>
                    </label>
                    <input id="vl_button_text" class="text_pole" type="text" value="${settings.buttonText}" maxlength="10" />
                    <small>Text or emoji to display on the button</small>
                    
                    <label for="vl_button_position">
                        <small>Button Position</small>
                    </label>
                    <select id="vl_button_position" class="text_pole">
                        <option value="top" ${settings.buttonPosition === 'top' ? 'selected' : ''}>Above message</option>
                        <option value="bottom" ${settings.buttonPosition === 'bottom' ? 'selected' : ''}>Below message</option>
                    </select>
                </div>
            </div>
        </div>
    `;
    
    $('#extensions_settings2').append(settingsHtml);
    
    // Make the drawer collapsible - bind directly after DOM insertion and prevent event bubbling
    $('.video-link-settings .inline-drawer-toggle').off('click').on('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const drawer = $(this).closest('.inline-drawer');
        const icon = drawer.find('.inline-drawer-icon');
        const content = drawer.find('.inline-drawer-content');
        
        const isOpen = content.is(':visible');
        
        if (isOpen) {
            content.slideUp(200);
            icon.removeClass('up fa-circle-chevron-up').addClass('down fa-circle-chevron-down');
        } else {
            content.slideDown(200);
            icon.removeClass('down fa-circle-chevron-down').addClass('up fa-circle-chevron-up');
        }
    });
    
    // Add event listeners for settings
    $('#vl_enabled').on('change', function() {
        settings.enabled = $(this).is(':checked');
        saveSettings();
        if (settings.enabled) {
            addButtonsToAllMessages();
        } else {
            // Remove all buttons when disabled
            $('.video-link-button').remove();
        }
    });
    
    $('#vl_api_endpoint').on('input', function() {
        settings.apiEndpoint = $(this).val();
        saveSettings();
    });
    
    $('#vl_button_text').on('input', function() {
        settings.buttonText = $(this).val();
        saveSettings();
        // Update existing buttons
        $('.video-link-button').text(settings.buttonText);
    });
    
    $('#vl_button_position').on('change', function() {
        settings.buttonPosition = $(this).val();
        saveSettings();
    });
}

/**
 * Initialize the extension
 */
async function init() {
    const { eventSource, event_types } = SillyTavern.getContext();
    
    // Load settings
    loadSettings();
    
    console.log('[Video Link] Extension initialized');
    
    // Listen for messages being rendered
    eventSource.on(event_types.CHARACTER_MESSAGE_RENDERED, handleMessageRendered);
    eventSource.on(event_types.USER_MESSAGE_RENDERED, handleMessageRendered);
    
    // Listen for chat changes to re-add buttons and load saved links
    eventSource.on(event_types.CHAT_CHANGED, () => {
        console.log('[Video Link] Chat changed, loading saved links...');
        setTimeout(() => {
            loadSavedVideoLinks();
            addButtonsToAllMessages();
        }, 300);
    });
    
    // Add buttons to existing messages when the app is ready
    eventSource.on(event_types.APP_READY, () => {
        console.log('[Video Link] App ready, loading saved links...');
        setTimeout(() => {
            loadSavedVideoLinks();
            addButtonsToAllMessages();
        }, 800);
    });
    
    // Add settings UI
    createSettingsUI();
}

// Initialize the extension
init();