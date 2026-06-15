// Viky AI - Configuration
const CONFIG = {
    // OpenRouter API Configuration
    // API key is stored server-side in Firebase Functions .env
    OPENROUTER_API_KEY: '',

    // OpenRouter API Endpoint (proxied via Firebase Functions)
    OPENROUTER_API_URL: 'https://openrouter.ai/api/v1/chat/completions',

    // Default Models
    TEXT_MODEL: 'deepseek/deepseek-v4-flash:free',
    IMAGE_MODEL: 'x-ai/grok-imagine-image-quality',

    // API Configuration
    API_CONFIG: {
        temperature: 0.7,
        maxOutputTokens: 2048,
        topP: 0.95,
        topK: 40
    }
};

// Export for use in modules
if (typeof self !== 'undefined') {
    self.CONFIG = CONFIG;
}
