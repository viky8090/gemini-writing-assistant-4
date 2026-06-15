// Viky AI - Background Service Worker
importScripts('config.js');

// ===== State & Cache =====
const STATE = {
    chatHistory: []
};

// Simple in-memory prompt cache (key: hash, value: {text, timestamp})
const promptCache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const CACHE_MAX_SIZE = 50;

// System instruction prepended to all text analysis prompts
const SYSTEM_RULE = "IMPORTANT: Return ONLY the rewritten/transformed text. No explanations, no preamble, no quotes, no markdown formatting. Output the result directly. You MUST preserve the exact paragraph breaks, structure, line breaks, and spacing of the original text.";

// ===== Hash helper for cache keys =====
function djb2Hash(str) {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) + hash) + str.charCodeAt(i);
    }
    return hash.toString(16);
}

function getCachedResponse(prompt) {
    const key = djb2Hash(prompt);
    const entry = promptCache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
        promptCache.delete(key);
        return null;
    }
    return entry.text;
}

function setCachedResponse(prompt, text) {
    const key = djb2Hash(prompt);
    if (promptCache.size >= CACHE_MAX_SIZE) {
        const firstKey = promptCache.keys().next().value;
        promptCache.delete(firstKey);
    }
    promptCache.set(key, { text, timestamp: Date.now() });
}

// ===== Streaming Port Handler =====
chrome.runtime.onConnect.addListener((port) => {
    if (port.name !== 'viky-stream') return;

    port.onMessage.addListener(async (request) => {
        const { action, message, history, text, type, targetLanguage, stream, model } = request;

        if (stream) {
            try {
                await handleStreamingRequest(request, port);
            } catch (err) {
                port.postMessage({ error: err.message, done: true });
            }
        } else {
            // Fallback non-streaming
            try {
                let responseText;
                if (action === 'CHAT_MESSAGE') {
                    responseText = await handleChatMessageInternal(message, history, model);
                } else if (action === 'ANALYZE_TEXT') {
                    responseText = await handleAnalyzeTextInternal(text, type, targetLanguage, model);
                } else {
                    throw new Error('Unknown action for stream port');
                }
                port.postMessage({ chunk: responseText, done: true });
            } catch (err) {
                port.postMessage({ error: err.message, done: true });
            }
        }
    });
});

async function handleStreamingRequest(request, port) {
    const { action, message, history, text, type, targetLanguage, model } = request;

    let promptText;
    if (action === 'CHAT_MESSAGE') {
        promptText = buildChatPrompt(message, history);
    } else if (action === 'ANALYZE_TEXT') {
        promptText = buildAnalyzePrompt(text, type, targetLanguage);
    } else {
        throw new Error('Unknown streaming action');
    }

    // Check cache first (only for non-streaming feel, but we can still use it)
    const cached = getCachedResponse(promptText);
    if (cached) {
        // Send cached response in one chunk
        port.postMessage({ chunk: cached, done: true });
        return;
    }

    const FIREBASE_FUNCTION_URL = 'https://us-central1-viky-ai-backend.cloudfunctions.net/analyzeText';

    const token = await new Promise((resolve, reject) => {
        chrome.identity.getAuthToken({ interactive: false }, function (token) {
            if (chrome.runtime.lastError || !token) {
                reject(new Error("Please sign in from the Viky AI side panel first."));
            } else {
                resolve(token);
            }
        });
    });

    const payload = {
        prompt: promptText,
        stream: true
    };
    if (model) {
        payload.model = model;
    }

    const response = await fetch(FIREBASE_FUNCTION_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
    });

    // Check if response is JSON (error) or SSE stream
    const contentType = response.headers.get('content-type') || '';

    if (!response.ok) {
        let errorMessage = `HTTP Error: ${response.status}`;
        try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
        } catch (e) { }
        throw new Error(errorMessage);
    }

    // If the server returned JSON instead of a stream, handle it as a non-streaming response
    if (contentType.includes('application/json')) {
        const data = await response.json();
        if (data.success && data.text) {
            port.postMessage({ chunk: data.text, done: true });
            setCachedResponse(promptText, data.text);
        } else {
            throw new Error(data.error || 'Invalid response from server');
        }
        return;
    }

    // SSE stream parsing
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullText = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // keep incomplete line in buffer

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data:')) continue;

            const dataStr = trimmed.slice(5).trim();
            if (dataStr === '[DONE]') {
                port.postMessage({ done: true });
                setCachedResponse(promptText, fullText);
                return;
            }

            try {
                const data = JSON.parse(dataStr);

                // Check for error objects in stream
                if (data.error) {
                    throw new Error(data.error.message || data.error);
                }

                // OpenRouter format: choices[0].delta.content
                const chunkText = data.choices?.[0]?.delta?.content || data.text || '';
                if (chunkText) {
                    fullText += chunkText;
                    port.postMessage({ chunk: chunkText, done: false });
                }
            } catch (e) {
                // If it's a thrown error from above, re-throw it
                if (e.message && e.message !== 'Unexpected token') {
                    // Only re-throw real errors, not JSON parse errors
                    if (!e.message.includes('Unexpected') && !e.message.includes('JSON')) {
                        throw e;
                    }
                }
            }
        }
    }

    // Final buffer flush
    if (buffer.trim()) {
        const trimmed = buffer.trim();
        if (trimmed.startsWith('data:')) {
            const dataStr = trimmed.slice(5).trim();
            if (dataStr !== '[DONE]') {
                try {
                    const data = JSON.parse(dataStr);
                    const chunkText = data.choices?.[0]?.delta?.content || data.text || '';
                    if (chunkText) {
                        fullText += chunkText;
                        port.postMessage({ chunk: chunkText, done: false });
                    }
                } catch (e) {
                    // Ignore parse errors on final buffer
                }
            }
        }
    }

    port.postMessage({ done: true });
    if (fullText) setCachedResponse(promptText, fullText);
}

function buildChatPrompt(message, history) {
    let conversationContext = "You are Viky AI, a helpful and friendly writing assistant. ";
    conversationContext += "Keep your responses concise, helpful, and friendly.\n\n";

    if (history && history.length > 0) {
        const recentHistory = history.slice(-3); // trimmed from 10 to 3
        recentHistory.forEach(msg => {
            conversationContext += `${msg.role === 'user' ? 'User' : 'Viky AI'}: ${msg.content}\n`;
        });
    }

    return `${conversationContext}\nUser: ${message}\nViky AI:`;
}

function buildAnalyzePrompt(text, type, targetLanguage) {
    let task = '';
    switch (type) {
        case 'IMPROVE': task = 'Improve the clarity, flow, and quality of this text'; break;
        case 'FIX_GRAMMAR': task = 'Fix all grammar, spelling, and punctuation errors in this text'; break;
        case 'SHORTEN': task = 'Shorten this text while keeping the core meaning'; break;
        case 'EXPAND': task = 'Expand this text with more detail and depth'; break;
        case 'TONE_CASUAL': task = 'Rewrite this text in a casual, friendly, conversational tone'; break;
        case 'TONE_FUNNY': task = 'Rewrite this text to be funny, witty, and humorous'; break;
        case 'TWEETIFY': task = 'Convert this into a viral tweet (max 280 chars, use emojis if appropriate)'; break;
        case 'TONE_FORMAL': task = 'Rewrite this text in a professional, formal tone'; break;
        case 'SUMMARIZE': task = 'Summarize this text concisely'; break;
        case 'KEY_POINTS': task = 'List the key points of this text as bullet points'; break;
        case 'EXPLAIN_SIMPLE': task = 'Explain this text in very simple terms, as if to a 5-year-old'; break;
        case 'ANSWER_QUESTION': task = 'Answer this question based on its context. Provide a clear, concise, and accurate answer'; break;
        case 'EXPLAIN_CODE': task = 'Explain this code snippet step by step. Cover what it does, how it works, and any important concepts used'; break;
        case 'CONTINUE_WRITING': task = 'Continue writing this text naturally, maintaining the same style, tone, and context. Add 2-3 more sentences that logically follow'; break;
        case 'TRANSLATE':
            const lang = targetLanguage || 'Hindi';
            task = `Translate this text to ${lang}`;
            break;
        default: task = 'Improve this text';
    }
    return `${SYSTEM_RULE}\n\nTask: ${task}.\n\nText:\n"${text}"`;
}

async function handleChatMessageInternal(message, history, model) {
    const prompt = buildChatPrompt(message, history);
    const cached = getCachedResponse(prompt);
    if (cached) return cached;
    const text = await callGemini(prompt, model);
    setCachedResponse(prompt, text);
    return text;
}

async function handleAnalyzeTextInternal(text, type, targetLanguage, model) {
    const prompt = buildAnalyzePrompt(text, type, targetLanguage);
    const cached = getCachedResponse(prompt);
    if (cached) return cached;
    const result = await callGemini(prompt, model);
    setCachedResponse(prompt, result);
    return result;
}

// ===== Legacy Message Listener (non-streaming fallback) =====
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'ANALYZE_TEXT') {
        handleAnalyzeText(request, sendResponse);
        return true;
    }

    if (request.action === 'GENERATE_IMAGE') {
        handleGenerateImage(request, sendResponse);
        return true;
    }

    if (request.action === 'CHAT_MESSAGE') {
        handleChatMessage(request, sendResponse);
        return true;
    }

    if (request.action === 'TRANSLATE_TEXT') {
        handleTranslateText(request, sendResponse);
        return true;
    }

    if (request.action === 'TRANSCRIBE_AUDIO') {
        handleTranscribeAudio(request, sendResponse);
        return true;
    }

    if (request.action === 'TRANSCRIBE_AUDIO_PARAKEET') {
        handleParakeetTranscription(request, sendResponse);
        return true;
    }

    if (request.action === 'OPEN_SIDEPANEL_WA_SETTINGS') {
        // Open the sidepanel on the sender's tab, then navigate to WhatsApp settings
        const tabId = sender.tab?.id;
        if (tabId && chrome.sidePanel && chrome.sidePanel.open) {
            chrome.sidePanel.open({ tabId }).then(() => {
                // Small delay to let the sidepanel DOM load before sending navigation message
                setTimeout(() => {
                    chrome.runtime.sendMessage({ action: 'NAVIGATE_TO_WA_SETTINGS' });
                }, 500);
            }).catch(err => {
                console.error('[Viky AI] Failed to open sidepanel:', err);
            });
        }
        sendResponse({ success: true });
        return true;
    }

    return false;
});

// ===== WhatsApp Action Handlers =====
async function handleTranslateText(request, sendResponse) {
    chrome.storage.local.get(['defaultLanguage', 'selectedModel'], async (res) => {
        try {
            const lang = res.defaultLanguage || 'Hindi';
            const model = res.selectedModel || 'google/gemma-2-9b-it:free';
            const prompt = `Translate this WhatsApp message to ${lang}. Return ONLY the direct translation text. Keep the exact paragraphs, casing, and emojis if possible. Do NOT add notes, intros, explanations, or quotes:\n\n"${request.text}"`;
            
            const responseText = await callGemini(prompt, model);
            sendResponse({ success: true, text: responseText });
        } catch (error) {
            console.error("[Viky AI] WhatsApp Translation Error:", error);
            sendResponse({ success: false, error: error.message });
        }
    });
}

async function handleTranscribeAudio(request, sendResponse) {
    chrome.storage.local.get(['selectedModel'], async (res) => {
        try {
            // We need a multimodal model to process audio files.
            // Let's use google/gemini-2.5-flash or google/gemini-2.0-flash-exp:free which is multimodal and extremely fast!
            let model = res.selectedModel || 'google/gemma-2-9b-it:free';
            if (model.includes('gemma') || model.includes('llama') || model.includes('mistral') || model.includes('qwen') || model.includes('deepseek')) {
                model = 'google/gemini-2.5-flash';
            }

            const promptPayload = [
                {
                    type: "text",
                    text: "Transcribe this audio message exactly. Return ONLY the transcribed text. If there is no talking or only silence/noise, return '[Silence/Noise]'. Do NOT add preamble or explanations."
                },
                {
                    type: "file_data",
                    file_data: {
                        mime_type: "audio/ogg",
                        data: request.audioBase64
                    }
                }
            ];

            const responseText = await callGemini(promptPayload, model);
            sendResponse({ success: true, text: responseText });
        } catch (error) {
            console.error("[Viky AI] WhatsApp Audio Transcription Error:", error);
            sendResponse({ success: false, error: error.message });
        }
    });
}

async function handleParakeetTranscription(request, sendResponse) {
    try {
        const { audioBase64, audioFormat } = request;

        if (!audioBase64) {
            sendResponse({ success: false, error: 'No audio data provided' });
            return;
        }

        const FIREBASE_TRANSCRIBE_URL = 'https://us-central1-viky-ai-backend.cloudfunctions.net/transcribeAudio';

        const token = await new Promise((resolve, reject) => {
            chrome.identity.getAuthToken({ interactive: false }, function (token) {
                if (chrome.runtime.lastError || !token) {
                    reject(new Error("Please sign in from the Viky AI side panel first."));
                } else {
                    resolve(token);
                }
            });
        });

        const response = await fetch(FIREBASE_TRANSCRIBE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                audioBase64: audioBase64,
                audioFormat: audioFormat || 'wav',
                model: 'nvidia/parakeet-tdt-0.6b-v3'
            })
        });

        if (!response.ok) {
            let errorMessage = `HTTP Error: ${response.status}`;
            try {
                const errorData = await response.json();
                errorMessage = errorData.error || errorMessage;
            } catch (e) { }
            throw new Error(errorMessage);
        }

        const data = await response.json();

        if (data.success && data.text) {
            sendResponse({ success: true, text: data.text });
        } else {
            throw new Error(data.error || 'Transcription failed');
        }
    } catch (error) {
        console.error("[Viky AI] Parakeet Transcription Error:", error);
        sendResponse({ success: false, error: error.message });
    }
}

// ===== Text Analysis Handler =====
async function handleAnalyzeText(request, sendResponse) {
    const { text, type, targetLanguage, model } = request;
    try {
        const responseText = await handleAnalyzeTextInternal(text, type, targetLanguage, model);
        sendResponse({ success: true, data: responseText });
    } catch (error) {
        console.error("OpenRouter API Error:", error);
        sendResponse({ success: false, error: error.message });
    }
}

// ===== Chat Message Handler =====
async function handleChatMessage(request, sendResponse) {
    const { message, history, model } = request;
    try {
        const responseText = await handleChatMessageInternal(message, history, model);
        sendResponse({ success: true, data: responseText });
    } catch (error) {
        console.error("Chat Error:", error);
        sendResponse({ success: false, error: error.message });
    }
}

// ===== Image Generation Handler (OpenRouter - Grok Imagine) =====
async function handleGenerateImage(request, sendResponse) {
    const { prompt, style } = request;

    try {
        let enhancedPrompt = `Generate an image: ${prompt}`;
        if (style) {
            switch (style) {
                case 'vivid': enhancedPrompt += '. Style: vivid colors, highly detailed, cinematic lighting'; break;
                case 'anime': enhancedPrompt += '. Style: anime, Japanese manga, cel shaded'; break;
                case 'cyberpunk': enhancedPrompt += '. Style: cyberpunk, neon lights, futuristic city, dystopian, high contrast'; break;
                case '3d': enhancedPrompt += '. Style: 3D render, octane render, blender, soft lighting, studio quality'; break;
                case 'natural':
                default: enhancedPrompt += '. Style: natural, photorealistic'; break;
            }
        }

        const FIREBASE_FUNCTION_URL = 'https://us-central1-viky-ai-backend.cloudfunctions.net/analyzeText';

        const token = await new Promise((resolve, reject) => {
            chrome.identity.getAuthToken({ interactive: false }, function (token) {
                if (chrome.runtime.lastError || !token) {
                    reject(new Error("Please sign in from the Viky AI side panel first."));
                } else {
                    resolve(token);
                }
            });
        });

        const payload = {
            prompt: enhancedPrompt,
            model: 'x-ai/grok-imagine-image-quality',
            isImageGeneration: true
        };

        const response = await fetch(FIREBASE_FUNCTION_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            let errorMessage = `HTTP Error: ${response.status}`;
            try {
                const errorData = await response.json();
                errorMessage = errorData.error || errorMessage;
            } catch (e) { }
            throw new Error(errorMessage);
        }

        const data = await response.json();

        if (data.success) {
            if (data.image) {
                const mimeType = data.mimeType || 'image/png';
                const dataUrl = `data:${mimeType};base64,${data.image}`;
                sendResponse({ success: true, data: dataUrl });
            } else if (data.imageUrl) {
                sendResponse({ success: true, data: data.imageUrl });
            } else {
                throw new Error('No image data in response');
            }
        } else {
            throw new Error(data.error || 'Image generation failed');
        }
    } catch (error) {
        console.error("Image Generation Error:", error);
        sendResponse({ success: false, error: error.message });
    }
}

// ===== OpenRouter API Call (Via Firebase Proxy) =====
async function callGemini(promptText, model) {
    const FIREBASE_FUNCTION_URL = 'https://us-central1-viky-ai-backend.cloudfunctions.net/analyzeText';

    const token = await new Promise((resolve, reject) => {
        chrome.identity.getAuthToken({ interactive: false }, function (token) {
            if (chrome.runtime.lastError || !token) {
                reject(new Error("Please sign in from the Viky AI side panel first."));
            } else {
                resolve(token);
            }
        });
    });

    const payload = { prompt: promptText };
    if (model) {
        payload.model = model;
    }

    const response = await fetch(FIREBASE_FUNCTION_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        let errorMessage = `HTTP Error: ${response.status}`;
        try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
        } catch (e) { }
        throw new Error(errorMessage);
    }

    const data = await response.json();

    if (!data.success || !data.text) {
        if (data.error) throw new Error(data.error);
        throw new Error("Invalid response from Firebase function");
    }

    return data.text;
}

// ===== Context Menu Setup =====
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: 'viky-ai-menu',
        title: 'Viky AI',
        contexts: ['selection']
    });

    const menuItems = [
        { id: 'improve', title: 'Improve Writing', parentId: 'viky-ai-menu' },
        { id: 'fix-grammar', title: 'Fix Grammar', parentId: 'viky-ai-menu' },
        { id: 'shorten', title: 'Shorten', parentId: 'viky-ai-menu' },
        { id: 'expand', title: 'Expand', parentId: 'viky-ai-menu' },
        { id: 'casual', title: 'Casual Tone', parentId: 'viky-ai-menu' },
        { id: 'formal', title: 'Formal Tone', parentId: 'viky-ai-menu' }
    ];

    menuItems.forEach(item => {
        chrome.contextMenus.create(item);
    });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (!info.selectionText) return;

    const actionMap = {
        'improve': 'IMPROVE',
        'fix-grammar': 'FIX_GRAMMAR',
        'shorten': 'SHORTEN',
        'expand': 'EXPAND',
        'casual': 'TONE_CASUAL',
        'formal': 'TONE_FORMAL'
    };

    const action = actionMap[info.menuItemId];
    if (!action) return;

    try {
        await chrome.tabs.sendMessage(tab.id, {
            action: 'CONTEXT_MENU_ANALYZE',
            text: info.selectionText,
            type: action
        });
    } catch (error) {
        console.error("Context menu error:", error);
    }
});

// ===== Side Panel Action =====
if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
        .catch((error) => console.error("Error setting side panel behavior:", error));
}
