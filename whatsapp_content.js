// Viky AI - Isolated World Content Script for Web WhatsApp
console.log("[Viky AI] WhatsApp content script loaded.");

const waKeys = [
    'wa_private_mode_enabled', 'wa_blur_names', 'wa_blur_photos', 'wa_blur_recent', 'wa_blur_conversation',
    'wa_hide_typing', 'wa_hide_recording', 'wa_view_statuses_privately', 'wa_play_audio_privately', 
    'wa_disable_read_receipts', 'wa_hide_online', 'wa_restore_deleted',
    'wa_customizations_enabled', 'wa_custom_background', 'wa_custom_background_url',
    'wa_extra_buttons_enabled', 'wa_like_button', 'wa_mark_read_unread', 'wa_transcribe_audio',
    'wa_translate_message', 'wa_download_status'
];

function injectMainScript(settings) {
    // 1. Create a config element to share settings with the MAIN world
    let configEl = document.getElementById('viky-wa-config');
    if (!configEl) {
        configEl = document.createElement('div');
        configEl.id = 'viky-wa-config';
        configEl.style.display = 'none';
        document.documentElement.appendChild(configEl);
    }
    configEl.setAttribute('data-settings', JSON.stringify(settings));
    
    // Pass the extension's cute logo URL so the MAIN world can use it for the sidebar icon
    const iconUrl = chrome.runtime.getURL('icons/logo_cute_neon.png');
    configEl.setAttribute('data-icon-url', iconUrl);

    // 2. Inject the main context script (whatsapp_inject.js)
    const scriptPath = chrome.runtime.getURL('whatsapp_inject.js');
    if (!document.querySelector(`script[src="${scriptPath}"]`)) {
        const script = document.createElement('script');
        script.src = scriptPath;
        script.type = 'text/javascript';
        // Run as early as possible
        document.documentElement.appendChild(script);
    }
}

// Listen for the sidebar icon click event from the MAIN world
window.addEventListener('viky-open-wa-settings', () => {
    console.log('[Viky AI] Received request to open sidepanel WhatsApp settings.');
    chrome.runtime.sendMessage({ action: 'OPEN_SIDEPANEL_WA_SETTINGS' }, (response) => {
        if (chrome.runtime.lastError) {
            console.error('[Viky AI] Error opening sidepanel:', chrome.runtime.lastError.message);
        }
    });
});

// Initial settings load and script injection
chrome.storage.local.get(waKeys, (result) => {
    // Parse settings defaults if not present
    const settings = {};
    waKeys.forEach(k => {
        settings[k] = result[k] !== undefined ? result[k] : false;
    });
    // Default background URL
    if (result.wa_custom_background_url) {
        settings.wa_custom_background_url = result.wa_custom_background_url;
    }
    
    // Inject bridge and script
    injectMainScript(settings);
});

// Listen for live updates from the Sidepanel Settings tab
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "UPDATE_WA_SETTINGS") {
        chrome.storage.local.get(waKeys, (result) => {
            const settings = {};
            waKeys.forEach(k => {
                settings[k] = result[k] !== undefined ? result[k] : false;
            });
            if (result.wa_custom_background_url) {
                settings.wa_custom_background_url = result.wa_custom_background_url;
            }

            // Update the bridge element so the page script receives updates instantly
            const configEl = document.getElementById('viky-wa-config');
            if (configEl) {
                configEl.setAttribute('data-settings', JSON.stringify(settings));
                // Dispatch a custom event to notify main script of config change
                const event = new CustomEvent('viky-wa-config-updated');
                window.dispatchEvent(event);
            }
            sendResponse({ success: true });
        });
        return true; // async
    }
});

// Bridge messages from the MAIN world page script to the extension background script
window.addEventListener("message", (event) => {
    if (event.source !== window || !event.data || event.data.sender !== 'viky-wa-inject') return;

    const { action, payload, requestId } = event.data;

    // Route transcription or translation requests to extension services
    chrome.runtime.sendMessage(payload, (response) => {
        // Send the response back to the MAIN context (same-origin — no need for '*')
        window.postMessage({
            sender: 'viky-wa-content',
            action: action + '_RESPONSE',
            requestId: requestId,
            response: response
        }, location.origin);
    });
});
