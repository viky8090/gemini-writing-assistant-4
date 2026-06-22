// Viky AI - Configuration
// Defaults read by background.js via importScripts.
// Anything API-secret lives server-side in Firebase Functions (.env).
const CONFIG = {
    // ----- OpenRouter (text + multimodal via Firebase proxy) -----
    // Empty on purpose — the Firebase function holds the real key.
    OPENROUTER_API_KEY: '',

    // Default free models that are actually live on OpenRouter as of writing.
    // Override these if a model rotates or you swap to a paid tier.
    TEXT_MODEL: 'meta-llama/llama-3.3-70b-instruct:free',
    IMAGE_MODEL: 'x-ai/grok-imagine-image-quality',

    // Multimodal model used for audio transcription (must accept audio input).
    MULTIMODAL_MODEL: 'google/gemini-2.0-flash-exp:free',

    // Generation defaults
    API_CONFIG: {
        temperature: 0.7,
        maxOutputTokens: 2048,
        topP: 0.95,
        topK: 40
    }
};

// Service-worker module export (background.js uses importScripts).
if (typeof self !== 'undefined') {
    self.CONFIG = CONFIG;
}