// Viky AI - Background Service Worker
importScripts('config.js');

// ===== State & Cache =====
// In-memory cache for hot reads (writes through to chrome.storage.session so it survives SW restarts).
// SW dies after 30s idle — anything purely in-memory is effectively useless for repeat queries.
const promptCache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const CACHE_MAX_SIZE = 50;
const SCHEMA_VERSION = 1;

// System instruction prepended to all text analysis prompts
const SYSTEM_RULE = "IMPORTANT: Return ONLY the rewritten/transformed text. No explanations, no preamble, no quotes, no markdown formatting. Output the result directly. You MUST preserve the exact paragraph breaks, structure, line breaks, and spacing of the original text.";

// ===== Proxy endpoints =====
// Text + image generation route through the Cloudflare Worker for
// sub-50ms cold starts and AI Gateway caching. Audio transcription
// also routes through the Worker using multimodal models.
const WORKER_PROXY_URL = 'https://viky-ai-proxy.vikranty301.workers.dev';

// ===== Free-model fallback list (loaded lazily from free_models.json) =====
// Used when the selected model returns 429/5xx — we retry with the next free model.
let freeModelList = null;
let freeModelLoadPromise = null;

async function loadFreeModels() {
    if (freeModelList) return freeModelList;
    if (freeModelLoadPromise) return freeModelLoadPromise;
    freeModelLoadPromise = (async () => {
        try {
            const url = chrome.runtime.getURL('free_models.json');
            const res = await fetch(url);
            const list = await res.json();
            freeModelList = Array.isArray(list) ? list : [];
            console.log('[Viky AI] Loaded', freeModelList.length, 'free models for fallback chain');
            return freeModelList;
        } catch (e) {
            console.warn('[Viky AI] Failed to load free_models.json — fallback disabled:', e.message);
            freeModelList = [];
            return freeModelList;
        } finally {
            freeModelLoadPromise = null;
        }
    })();
    return freeModelLoadPromise;
}

// Pick the next model to try after a failure.
// Heuristic: prefer models that are NOT the one that just failed, and prefer
// smaller/faster models first (lower cost, faster response).
function pickFallbackModel(failedModel) {
    if (!freeModelList || freeModelList.length === 0) return null;
    // Prefer the "auto-route" model first if available — let OpenRouter pick.
    const autoRoute = freeModelList.find(m => m === 'openrouter/free');
    if (autoRoute && autoRoute !== failedModel) return autoRoute;
    // Then try stable, well-known models.
    const preferred = [
        'meta-llama/llama-3.3-70b-instruct:free',
        'meta-llama/llama-3.2-3b-instruct:free',
        'google/gemma-4-26b-a4b-it:free',
        'qwen/qwen3-next-80b-a3b-instruct:free'
    ];
    for (const m of preferred) {
        if (m !== failedModel && freeModelList.includes(m)) return m;
    }
    // Otherwise, just pick the next one in the list that isn't the failed model.
    return freeModelList.find(m => m !== failedModel) || null;
}

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
        // Also remove from session storage
        try { chrome.storage.session.remove(['cache_' + key]); } catch (e) {}
        return null;
    }
    return entry.text;
}

function setCachedResponse(prompt, text) {
    const key = djb2Hash(prompt);
    if (promptCache.size >= CACHE_MAX_SIZE) {
        const firstKey = promptCache.keys().next().value;
        promptCache.delete(firstKey);
        try { chrome.storage.session.remove(['cache_' + firstKey]); } catch (e) {}
    }
    const entry = { text, timestamp: Date.now() };
    promptCache.set(key, entry);
    // Persist to session storage so it survives SW restarts
    try {
        const obj = {};
        obj['cache_' + key] = entry;
        chrome.storage.session.set(obj);
    } catch (e) {}
}

// Restore session-cached prompts on SW startup
async function restoreSessionCache() {
    try {
        const all = await chrome.storage.session.get(null);
        for (const k in all) {
            if (k.startsWith('cache_')) {
                const key = k.slice(6);
                const entry = all[k];
                if (entry && Date.now() - entry.timestamp <= CACHE_TTL_MS) {
                    promptCache.set(key, entry);
                } else {
                    chrome.storage.session.remove([k]);
                }
            }
        }
    } catch (e) {
        console.warn('[Viky AI] Failed to restore session cache:', e.message);
    }
}

// ===== Streaming Port Handler =====
chrome.runtime.onConnect.addListener((port) => {
    if (port.name !== 'viky-stream') return;

    let aborted = false;
    let activeAbortController = null;
    let heartbeatInterval = null;

    // When the side panel closes mid-stream, abort the upstream fetch and stop the heartbeat.
    // Without this, the SW keeps fetching after the port is dead, wasting bandwidth and SW lifetime.
    port.onDisconnect.addListener(() => {
        aborted = true;
        if (activeAbortController) {
            try { activeAbortController.abort(); } catch (e) {}
            activeAbortController = null;
        }
        if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
            heartbeatInterval = null;
        }
    });

    port.onMessage.addListener(async (request) => {
        const { action, message, history, text, type, targetLanguage, stream, model } = request;

        if (stream) {
            try {
                await handleStreamingRequest(request, port, {
                    getAborted: () => aborted,
                    setAbortController: (ac) => { activeAbortController = ac; },
                    setHeartbeat: (fn, ms) => {
                        if (heartbeatInterval) clearInterval(heartbeatInterval);
                        heartbeatInterval = setInterval(fn, ms);
                    },
                    clearHeartbeat: () => {
                        if (heartbeatInterval) { clearInterval(heartbeatInterval); heartbeatInterval = null; }
                    }
                });
            } catch (err) {
                try { port.postMessage({ error: err.message, done: true }); } catch (e) {}
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
                try { port.postMessage({ chunk: responseText, done: true }); } catch (e) {}
            } catch (err) {
                try { port.postMessage({ error: err.message, done: true }); } catch (e) {}
            }
        }
    });
});

// Safe port.postMessage — never throws on disconnected port
function safePostMessage(port, msg, ctx) {
    if (ctx && ctx.getAborted && ctx.getAborted()) return;
    try { port.postMessage(msg); } catch (e) {
        // Port disconnected — caller's onDisconnect handler will clean up
    }
}

async function handleStreamingRequest(request, port, ctx) {
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
        safePostMessage(port, { chunk: cached, done: true }, ctx);
        return;
    }

    const FIREBASE_FUNCTION_URL = `${WORKER_PROXY_URL}/analyzeText`;

    const token = await new Promise((resolve, reject) => {
        chrome.identity.getAuthToken({ interactive: false }, function (token) {
            if (chrome.runtime.lastError || !token) {
                reject(new Error("Please sign in from the Viky AI side panel first."));
            } else {
                resolve(token);
            }
        });
    });

    // ===== Retry loop with free-model fallback =====
    // Try the user's selected model first. On 429/5xx, retry with a different free model.
    let currentModel = model;
    const triedModels = new Set();
    const MAX_RETRIES = 3;
    let response, payload;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        if (ctx.getAborted && ctx.getAborted()) return;
        triedModels.add(currentModel);

        payload = { prompt: promptText, stream: true };
        if (currentModel) payload.model = currentModel;

        const ac = new AbortController();
        if (ctx.setAbortController) ctx.setAbortController(ac);

        // 60-second timeout — if upstream hangs, abort and treat as failure for retry
        const timeoutId = setTimeout(() => ac.abort(), 60000);

        try {
            response = await fetch(FIREBASE_FUNCTION_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload),
                signal: ac.signal
            });
            clearTimeout(timeoutId);

            // Retry on 429 (rate limit) or 5xx (server error)
            if ((response.status === 429 || response.status >= 500) && attempt < MAX_RETRIES - 1) {
                console.warn(`[Viky AI] Model ${currentModel} returned ${response.status} — retrying with fallback`);
                // Surface a transient "retrying" message to the user
                safePostMessage(port, { chunk: `\n\n_[Retrying with a different model — ${response.status} from ${currentModel}]_\n`, done: false }, ctx);
                const next = pickFallbackModel(currentModel);
                if (next) {
                    currentModel = next;
                    // Drain the response body so the connection is released
                    try { await response.body?.cancel(); } catch (e) {}
                    continue;
                }
            }
            break; // Success or final-attempt failure — proceed to parse
        } catch (err) {
            clearTimeout(timeoutId);
            if (err.name === 'AbortError' && (ctx.getAborted && ctx.getAborted())) {
                // User-initiated abort (side panel closed) — bail out silently
                return;
            }
            if (attempt < MAX_RETRIES - 1) {
                console.warn(`[Viky AI] Fetch failed (${err.message}) — retrying with fallback model`);
                const next = pickFallbackModel(currentModel);
                if (next) {
                    currentModel = next;
                    continue;
                }
            }
            throw err;
        }
    }

    if (!response) throw new Error('No response from server after retries');

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
            safePostMessage(port, { chunk: data.text, done: true }, ctx);
            setCachedResponse(promptText, data.text);
        } else {
            throw new Error(data.error || 'Invalid response from server');
        }
        return;
    }

    // ===== SSE stream parsing =====
    // Start a heartbeat so the SW doesn't die during long gaps in upstream output.
    // Chrome kills an idle SW after 30s; sending an empty chunk every 25s counts as port activity.
    if (ctx.setHeartbeat) {
        ctx.setHeartbeat(() => {
            safePostMessage(port, { chunk: '', done: false }, ctx);
        }, 25000);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullText = '';

    try {
        while (true) {
            if (ctx.getAborted && ctx.getAborted()) return;
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
                    if (ctx.clearHeartbeat) ctx.clearHeartbeat();
                    safePostMessage(port, { done: true }, ctx);
                    setCachedResponse(promptText, fullText);
                    return;
                }

                try {
                    const data = JSON.parse(dataStr);

                    // Check for error objects in stream
                    if (data.error) {
                        if (ctx.clearHeartbeat) ctx.clearHeartbeat();
                        throw new Error(data.error.message || data.error);
                    }

                    // OpenRouter format: choices[0].delta.content
                    const chunkText = data.choices?.[0]?.delta?.content || data.text || '';
                    if (chunkText) {
                        fullText += chunkText;
                        safePostMessage(port, { chunk: chunkText, done: false }, ctx);
                    }
                } catch (e) {
                    // Re-throw real errors (not JSON parse failures)
                    if (e instanceof SyntaxError) continue;
                    throw e;
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
                            safePostMessage(port, { chunk: chunkText, done: false }, ctx);
                        }
                    } catch (e) {
                        // Ignore parse errors on final buffer
                    }
                }
            }
        }

        if (ctx.clearHeartbeat) ctx.clearHeartbeat();
        safePostMessage(port, { done: true }, ctx);
        if (fullText) setCachedResponse(promptText, fullText);
    } finally {
        // Always release the reader and clear heartbeat
        if (ctx.clearHeartbeat) ctx.clearHeartbeat();
        try { reader.releaseLock(); } catch (e) {}
    }
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

// ===== Message Router =====
// Wraps all onMessage handlers with try/catch, ensures `return true` for async responses,
// checks `chrome.runtime.lastError` for sendMessage calls, and logs every message + duration.
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    const startTs = Date.now();
    const safeSend = (payload) => {
        try { sendResponse(payload); } catch (e) {
            console.warn('[Viky AI] sendResponse failed:', e.message);
        }
    };

    try {
        if (request.action === 'ANALYZE_TEXT') {
            handleAnalyzeText(request, safeSend);
            return true; // async
        }

        if (request.action === 'GENERATE_IMAGE') {
            handleGenerateImage(request, safeSend);
            return true;
        }

        if (request.action === 'CHAT_MESSAGE') {
            handleChatMessage(request, safeSend);
            return true;
        }

        if (request.action === 'TRANSLATE_TEXT') {
            handleTranslateText(request, safeSend);
            return true;
        }

        if (request.action === 'TRANSCRIBE_AUDIO') {
            handleTranscribeAudio(request, safeSend);
            return true;
        }

        if (request.action === 'OPEN_SIDEPANEL_WA_SETTINGS') {
            handleOpenSidepanelWaSettings(sender, safeSend);
            return true;
        }

        // Unknown action — return false synchronously so the channel closes immediately
        // (avoids the default 30s timeout)
        safeSend({ success: false, error: 'Unknown action: ' + request.action });
        return false;
    } catch (err) {
        console.error('[Viky AI] Message router error for', request.action, ':', err);
        safeSend({ success: false, error: err.message });
        return false;
    } finally {
        // Log message duration for debugging (only log slow ones to avoid spam)
        const duration = Date.now() - startTs;
        if (duration > 1000) {
            console.log(`[Viky AI] Slow message: ${request.action} took ${duration}ms`);
        }
    }
});

// ===== WhatsApp Action Handlers =====
async function handleTranslateText(request, sendResponse) {
    chrome.storage.local.get(['defaultLanguage', 'selectedModel'], async (res) => {
        try {
            const lang = res.defaultLanguage || 'Hindi';
            const model = res.selectedModel || 'meta-llama/llama-3.3-70b-instruct:free';
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
            // Text-only models (gemma, llama, mistral, qwen, deepseek, gpt-oss,
            // nemotron, etc.) cannot accept audio — fall back to a multimodal one.
            const MULTIMODAL_FALLBACK = (typeof CONFIG !== 'undefined' && CONFIG.MULTIMODAL_MODEL)
                || 'google/gemini-2.0-flash-exp:free';
            let model = res.selectedModel || MULTIMODAL_FALLBACK;
            const textOnly = /gemma|llama|mistral|qwen|deepseek|gpt-oss|nemotron|hermes|llama-3|laguna|trinity|minimax|glm|baidu/i;
            if (textOnly.test(model)) {
                model = MULTIMODAL_FALLBACK;
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

        const IMAGE_GEN_URL = `${WORKER_PROXY_URL}/generateImage`;

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
            model: (typeof CONFIG !== "undefined" && CONFIG.IMAGE_MODEL) || "x-ai/grok-imagine-image-quality",
            isImageGeneration: true
        };

        const ac = new AbortController();
        const timeoutId = setTimeout(() => ac.abort(), 45000); // 45s timeout for image gen

        const response = await fetch(IMAGE_GEN_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload),
            signal: ac.signal
        }).catch(err => {
            clearTimeout(timeoutId);
            // If the paid image model fails with 402/403 (payment required / forbidden),
            // fall back to the free pollinations.ai endpoint — host permission is already granted.
            if (err.name === 'AbortError') throw new Error('Image generation timed out');
            throw err;
        });
        clearTimeout(timeoutId);

        if (response.status === 402 || response.status === 403) {
            console.warn('[Viky AI] Paid image model unavailable (' + response.status + ') — falling back to pollinations.ai');
            const freeUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedPrompt)}`;
            sendResponse({ success: true, data: freeUrl });
            return;
        }

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
        // Final fallback: pollinations.ai (always works, free, no auth)
        try {
            const enhancedPrompt = `Generate an image: ${prompt}. Style: ${style || 'natural, photorealistic'}`;
            const freeUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedPrompt)}`;
            sendResponse({ success: true, data: freeUrl });
        } catch (fallbackErr) {
            sendResponse({ success: false, error: error.message });
        }
    }
}

// ===== OpenRouter API Call (Via Firebase Proxy) — with retry/fallback for non-streaming =====
async function callGemini(promptText, model) {
    const FIREBASE_FUNCTION_URL = `${WORKER_PROXY_URL}/analyzeText`;

    const token = await new Promise((resolve, reject) => {
        chrome.identity.getAuthToken({ interactive: false }, function (token) {
            if (chrome.runtime.lastError || !token) {
                reject(new Error("Please sign in from the Viky AI side panel first."));
            } else {
                resolve(token);
            }
        });
    });

    let currentModel = model;
    const MAX_RETRIES = 3;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        const payload = { prompt: promptText };
        if (currentModel) payload.model = currentModel;

        const ac = new AbortController();
        const timeoutId = setTimeout(() => ac.abort(), 30000);

        try {
            const response = await fetch(FIREBASE_FUNCTION_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload),
                signal: ac.signal
            });
            clearTimeout(timeoutId);

            if ((response.status === 429 || response.status >= 500) && attempt < MAX_RETRIES - 1) {
                console.warn(`[Viky AI] callGemini: ${currentModel} returned ${response.status} — retrying with fallback`);
                const next = pickFallbackModel(currentModel);
                if (next) { currentModel = next; continue; }
            }

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
        } catch (err) {
            clearTimeout(timeoutId);
            if (err.name === 'AbortError') {
                if (attempt < MAX_RETRIES - 1) {
                    console.warn('[Viky AI] callGemini timed out — retrying with fallback');
                    const next = pickFallbackModel(currentModel);
                    if (next) { currentModel = next; continue; }
                }
                throw new Error('Request timed out');
            }
            throw err;
        }
    }
    throw new Error('All retries exhausted');
}

// ===== Context Menu Setup =====
chrome.runtime.onInstalled.addListener(() => {
    // Remove any existing menus first to avoid "duplicate id" errors on extension reload
    chrome.contextMenus.removeAll(() => {
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
            try { chrome.contextMenus.create(item); } catch (e) {
                console.warn('[Viky AI] contextMenu create failed:', e.message);
            }
        });
    });

    // Seed schema version on first install
    chrome.storage.local.get(['schemaVersion'], (result) => {
        if (result.schemaVersion === undefined) {
            chrome.storage.local.set({ schemaVersion: SCHEMA_VERSION });
        }
    });

    // Pre-load free models list so the fallback chain is ready before the first request
    loadFreeModels();
});

// Handle context menu clicks — with error handling for tabs without content scripts
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

    if (!tab || !tab.id) {
        console.warn('[Viky AI] Context menu: no tab to message');
        return;
    }

    try {
        await chrome.tabs.sendMessage(tab.id, {
            action: 'CONTEXT_MENU_ANALYZE',
            text: info.selectionText,
            type: action
        });
    } catch (error) {
        // Common on chrome:// pages, Web Store, devtools, PDF viewer where content scripts don't run
        console.warn('[Viky AI] Could not deliver context-menu action to tab', tab.id, '—', error.message);
        // Optionally: try to inject the content script on-demand via chrome.scripting.executeScript here
    }
});

// ===== Side Panel Action =====
if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
        .catch((error) => console.error("Error setting side panel behavior:", error));
}

// ===== Browser startup handler — pre-warm caches =====
chrome.runtime.onStartup.addListener(() => {
    console.log('[Viky AI] Browser startup — restoring session cache');
    restoreSessionCache();
    loadFreeModels();
});

// Also restore session cache on SW startup (covers install/reload cases that onStartup doesn't fire for)
restoreSessionCache();

// ===== Handler: open side panel to WhatsApp settings =====
function handleOpenSidepanelWaSettings(sender, sendResponse) {
    const tabId = sender.tab?.id;
    if (tabId && chrome.sidePanel && chrome.sidePanel.open) {
        chrome.sidePanel.open({ tabId }).then(() => {
            // Small delay to let the sidepanel DOM load before sending navigation message.
            // We retry the NAVIGATE message on failure for up to 5 attempts — the original
            // single-shot 500ms timeout would silently fail if the side panel hadn't registered
            // its listener yet.
            let attempts = 0;
            const tryNavigate = () => {
                attempts++;
                chrome.runtime.sendMessage({ action: 'NAVIGATE_TO_WA_SETTINGS' }, (resp) => {
                    if (chrome.runtime.lastError || !resp) {
                        if (attempts < 5) {
                            setTimeout(tryNavigate, 300);
                        }
                    }
                });
            };
            setTimeout(tryNavigate, 500);
        }).catch(err => {
            console.error('[Viky AI] Failed to open sidepanel:', err);
        });
    }
    sendResponse({ success: true });
}

