/**
 * Message Link Button Extension for SillyTavern
 * Adds a button to each message that calls an API and inserts a clickable link
 */

// Extension module name - must be unique
const MODULE_NAME = 'message_link_button';

// Default settings
const defaultSettings = Object.freeze({
    enabled: true,
    apiEndpoint: 'https://api.example.com/get-link',
    buttonText: '🔗',
    buttonPosition: 'right' // 'left' or 'right'
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
        const response = await fetch(settings.apiEndpoint, {
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
        return data.url || data.link || data;
    } catch (error) {
        console.error('[Message Link Button] Error fetching link:', error);
        throw error;
    }
}

/**
 * Add a clickable link to the message
 * @param {HTMLElement} messageElement - The message container element
 * @param {string} url - The URL to add
 */
function addLinkToMessage(messageElement, url) {
    // Find the message text container
    const mesText = messageElement.querySelector('.mes_text');
    if (!mesText) return;
    
    // Create link element
    const linkContainer = document.createElement('div');
    linkContainer.className = 'message-link-container';
    linkContainer.style.marginTop = '8px';
    
    const link = document.createElement('a');
    link.href = url;
    link.textContent = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.className = 'message-generated-link';
    
    linkContainer.appendChild(link);
    mesText.appendChild(linkContainer);
}

/**
 * Handle button click
 * @param {Event} event - Click event
 */
async function handleButtonClick(event) {
    const button = event.currentTarget;
    const messageElement = button.closest('.mes');
    
    if (!messageElement) return;
    
    // Disable button during API call
    button.disabled = true;
    button.textContent = '⏳';
    
    try {
        // Get message text
        const mesText = messageElement.querySelector('.mes_text');
        const messageText = mesText ? mesText.textContent.trim() : '';
        
        // Fetch URL from API
        const url = await fetchLinkFromAPI(messageText);
        
        // Add link to message
        addLinkToMessage(messageElement, url);
        
        // Update button to show success
        button.textContent = '✓';
        button.style.color = '#4CAF50';
        
        // Optional: hide button after success
        setTimeout(() => {
            button.style.display = 'none';
        }, 1000);
        
    } catch (error) {
        // Show error state
        button.textContent = '✗';
        button.style.color = '#f44336';
        button.disabled = false;
        
        // Reset button after delay
        setTimeout(() => {
            button.textContent = settings.buttonText;
            button.style.color = '';
        }, 2000);
        
        console.error('[Message Link Button] Failed to fetch link:', error);
    }
}

/**
 * Add button to a message element
 * @param {HTMLElement} messageElement - The message container element
 */
function addButtonToMessage(messageElement) {
    // Don't add if button already exists
    if (messageElement.querySelector('.message-link-button')) {
        return;
    }
    
    // Create button
    const button = document.createElement('button');
    button.className = 'message-link-button menu_button';
    button.textContent = settings.buttonText;
    button.title = 'Get Link';
    button.addEventListener('click', handleButtonClick);
    
    // Find the message buttons container
    const mesButtons = messageElement.querySelector('.mes_buttons');
    
    if (mesButtons) {
        // Add to existing buttons container
        if (settings.buttonPosition === 'left') {
            mesButtons.insertBefore(button, mesButtons.firstChild);
        } else {
            mesButtons.appendChild(button);
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
    
    // Get the message element from the event data
    const messageId = event.detail?.messageId;
    if (!messageId) return;
    
    const messageElement = document.querySelector(`#chat .mes[mesid="${messageId}"]`);
    if (messageElement) {
        addButtonToMessage(messageElement);
    }
}

/**
 * Create settings UI
 */
function createSettingsUI() {
    const html = `
        <div class="message-link-button-settings">
            <h3>Message Link Button Settings</h3>
            
            <div class="settings-row">
                <label for="mlb_enabled">
                    <input type="checkbox" id="mlb_enabled" ${settings.enabled ? 'checked' : ''} />
                    Enable Extension
                </label>
            </div>
            
            <div class="settings-row">
                <label for="mlb_api_endpoint">API Endpoint:</label>
                <input type="text" id="mlb_api_endpoint" class="text_pole" value="${settings.apiEndpoint}" />
                <small>The API endpoint that returns a URL</small>
            </div>
            
            <div class="settings-row">
                <label for="mlb_button_text">Button Text:</label>
                <input type="text" id="mlb_button_text" class="text_pole" value="${settings.buttonText}" />
                <small>Text or emoji to display on the button</small>
            </div>
            
            <div class="settings-row">
                <label for="mlb_button_position">Button Position:</label>
                <select id="mlb_button_position" class="text_pole">
                    <option value="left" ${settings.buttonPosition === 'left' ? 'selected' : ''}>Left</option>
                    <option value="right" ${settings.buttonPosition === 'right' ? 'selected' : ''}>Right</option>
                </select>
            </div>
        </div>
    `;
    
    const settingsContainer = document.createElement('div');
    settingsContainer.innerHTML = html;
    
    // Add event listeners for settings
    settingsContainer.querySelector('#mlb_enabled').addEventListener('change', (e) => {
        settings.enabled = e.target.checked;
        saveSettings();
        if (settings.enabled) {
            addButtonsToAllMessages();
        }
    });
    
    settingsContainer.querySelector('#mlb_api_endpoint').addEventListener('input', (e) => {
        settings.apiEndpoint = e.target.value;
        saveSettings();
    });
    
    settingsContainer.querySelector('#mlb_button_text').addEventListener('input', (e) => {
        settings.buttonText = e.target.value;
        saveSettings();
    });
    
    settingsContainer.querySelector('#mlb_button_position').addEventListener('change', (e) => {
        settings.buttonPosition = e.target.value;
        saveSettings();
    });
    
    return settingsContainer.firstElementChild;
}

/**
 * Initialize the extension
 */
async function init() {
    const { eventSource, event_types } = SillyTavern.getContext();
    
    // Load settings
    loadSettings();
    
    console.log('[Message Link Button] Extension initialized');
    
    // Listen for messages being rendered
    eventSource.on(event_types.CHARACTER_MESSAGE_RENDERED, handleMessageRendered);
    eventSource.on(event_types.USER_MESSAGE_RENDERED, handleMessageRendered);
    
    // Listen for chat changes to re-add buttons
    eventSource.on(event_types.CHAT_CHANGED, addButtonsToAllMessages);
    
    // Add buttons to existing messages when the app is ready
    eventSource.on(event_types.APP_READY, addButtonsToAllMessages);
    
    // Add settings UI
    const settingsHTML = createSettingsUI();
    document.getElementById('extensions_settings').appendChild(settingsHTML);
}

// Initialize the extension
init();