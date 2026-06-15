const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require('cors')({ origin: true });

admin.initializeApp();

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
const DEFAULT_TEXT_MODEL = 'google/gemma-4-26b-a4b-it:free';
const DEFAULT_IMAGE_MODEL = 'x-ai/grok-imagine-image-quality';

// Ordered by reliability — openrouter/free auto-routes to available models
const FALLBACK_TEXT_MODELS = [
    'google/gemma-4-26b-a4b-it:free',
    'openrouter/free',
    'nvidia/nemotron-3-super-120b-a12b:free',
    'nvidia/nemotron-3-nano-30b-a3b:free',
    'nvidia/nemotron-nano-9b-v2:free',
    'google/gemma-4-31b-it:free',
    'meta-llama/llama-3.3-70b-instruct:free',
    'nousresearch/hermes-3-llama-3.1-405b:free'
];

exports.analyzeText = functions.https.onRequest((req, res) => {
    return cors(req, res, async () => {
        if (req.method !== 'POST') {
            return res.status(405).json({ error: 'Method Not Allowed' });
        }

        try {
            // 1. Authenticate Request
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return res.status(401).json({ error: 'Unauthorized. A valid Bearer token is required.' });
            }

            const idToken = authHeader.split('Bearer ')[1];
            try {
                const tokenInfoResponse = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${idToken}`);
                if (!tokenInfoResponse.ok) {
                    throw new Error(`Google API returned ${tokenInfoResponse.status}`);
                }
                await tokenInfoResponse.json();
            } catch (authError) {
                console.error("Auth Token Verification Failed:", authError);
                return res.status(403).json({ error: 'Forbidden. Invalid or expired token.' });
            }

            // 2. Validate Payload
            const { prompt, isImageGeneration, model, stream } = req.body;

            if (!prompt) {
                return res.status(400).json({ error: 'Prompt is required' });
            }

            // 3. Resolve OpenRouter API Key
            const apiKey = process.env.OPENROUTER_API_KEY ? process.env.OPENROUTER_API_KEY.trim() : null;

            if (!apiKey) {
                console.error("OpenRouter API key not configured on server");
                return res.status(500).json({ error: 'Server configuration error' });
            }

            // 4. Route to appropriate handler
            if (isImageGeneration) {
                return await handleImageGeneration(apiKey, prompt, model, res);
            } else if (stream === true) {
                return await handleStreamingTextGeneration(apiKey, prompt, model, res);
            } else {
                return await handleTextGeneration(apiKey, prompt, model, res);
            }

        } catch (error) {
            console.error("Cloud Function Error:", error);
            return res.status(500).json({ success: false, error: error.message || 'Internal Server Error' });
        }
    });
});

// ===== SSE Streaming Text Generation =====
async function handleStreamingTextGeneration(apiKey, prompt, model, res) {
    const primaryModel = model || DEFAULT_TEXT_MODEL;
    const modelsToTry = [primaryModel, ...FALLBACK_TEXT_MODELS.filter(m => m !== primaryModel)];

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.status(200);
    res.flushHeaders();

    let success = false;

    for (const modelId of modelsToTry) {
        try {
            console.log(`[Stream] Trying model: ${modelId}`);
            await streamFromOpenRouter(apiKey, prompt, modelId, res);
            success = true;
            break;
        } catch (err) {
            console.warn(`[Stream] Model ${modelId} failed: ${err.message}`);
            // If this isn't the last model, try the next one
            continue;
        }
    }

    if (!success) {
        res.write(`data: ${JSON.stringify({ error: 'All models are currently unavailable. Please try again shortly.' })}\n\n`);
    }

    res.write(`data: [DONE]\n\n`);
    res.end();
}

async function streamFromOpenRouter(apiKey, prompt, modelId, res) {
    const url = `${OPENROUTER_BASE_URL}/chat/completions`;

    const payload = {
        model: modelId,
        messages: [{ role: 'user', content: prompt }],
        stream: true,
        temperature: 0.7,
        max_tokens: 2048,
        top_p: 0.95
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': 'https://viky-ai-backend.web.app',
            'X-Title': 'Viky AI'
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    let hasData = false;
    const decoder = new TextDecoder();
    for await (const chunk of response.body) {
        const lines = decoder.decode(chunk).split('\n');
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data:')) continue;

            const dataStr = trimmed.slice(5).trim();

            if (dataStr === '[DONE]') {
                return;
            }

            try {
                const data = JSON.parse(dataStr);

                // Check for inline errors from OpenRouter
                if (data.error) {
                    throw new Error(data.error.message || 'Provider error');
                }

                if (data.choices && data.choices[0] && data.choices[0].delta) {
                    hasData = true;
                    res.write(`data: ${JSON.stringify(data)}\n\n`);
                }
            } catch (e) {
                // Rethrow semantic errors so the fallback loop can catch them
                if (e.message && !e.message.includes('Unexpected') && !e.message.includes('JSON')) {
                    throw e;
                }
            }
        }
    }

    if (!hasData) {
        throw new Error('No data received from model');
    }
}

// ===== Standard (Non-Streaming) Text Generation =====
async function callOpenRouterText(apiKey, prompt, modelId) {
    const url = `${OPENROUTER_BASE_URL}/chat/completions`;

    const payload = {
        model: modelId,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 2048,
        top_p: 0.95
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': 'https://viky-ai-backend.web.app',
            'X-Title': 'Viky AI'
        },
        body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok || data.error) {
        const msg = data.error?.message || `HTTP ${response.status}`;
        throw new Error(msg);
    }

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error("Invalid response format from OpenRouter");
    }

    return data.choices[0].message.content;
}

async function handleTextGeneration(apiKey, prompt, model, res) {
    const primaryModel = model || DEFAULT_TEXT_MODEL;
    const modelsToTry = [primaryModel, ...FALLBACK_TEXT_MODELS.filter(m => m !== primaryModel)];

    let lastError = null;

    for (const modelId of modelsToTry) {
        try {
            console.log(`Trying model: ${modelId}`);
            const text = await callOpenRouterText(apiKey, prompt, modelId);
            return res.status(200).json({ success: true, text });
        } catch (err) {
            console.warn(`Model ${modelId} failed: ${err.message}`);
            lastError = err;
        }
    }

    throw lastError || new Error("All text models failed");
}

// ===== Image Generation =====
async function handleImageGeneration(apiKey, prompt, model, res) {
    const selectedModel = model || DEFAULT_IMAGE_MODEL;
    const url = `${OPENROUTER_BASE_URL}/chat/completions`;

    const payload = {
        model: selectedModel,
        messages: [
            {
                role: "user",
                content: prompt
            }
        ]
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': 'https://viky-ai-backend.web.app',
            'X-Title': 'Viky AI'
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("OpenRouter Image API Error:", errorData);
        throw new Error(errorData.error?.message || errorData.message || `HTTP Error: ${response.status}`);
    }

    const data = await response.json();

    if (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.images && data.choices[0].message.images[0]) {
        const imgObj = data.choices[0].message.images[0];
        if (imgObj.image_url && imgObj.image_url.url) {
            return res.status(200).json({
                success: true,
                imageUrl: imgObj.image_url.url,
            });
        }
    }

    throw new Error("No image data in OpenRouter response");
}

// ===== Polar.sh Integration =====
const { Polar } = require("@polar-sh/sdk");
const { validateEvent, WebhookVerificationError } = require("@polar-sh/sdk/webhooks");

// Product ID mapping
const PRODUCT_MAP = {
    basic_monthly: process.env.POLAR_PRODUCT_ID_BASIC_MONTHLY,
    basic_yearly: process.env.POLAR_PRODUCT_ID_BASIC_YEARLY,
    plus_monthly: process.env.POLAR_PRODUCT_ID_PLUS_MONTHLY,
    plus_yearly: process.env.POLAR_PRODUCT_ID_PLUS_YEARLY,
    ultra_monthly: process.env.POLAR_PRODUCT_ID_ULTRA_MONTHLY,
    ultra_yearly: process.env.POLAR_PRODUCT_ID_ULTRA_YEARLY,
};

// Credit allocations per tier (same regardless of monthly/yearly billing)
const TIER_CREDITS = {
    basic: { basic_credits: 3600, advanced_credits: 200, elite_credits: 80 },
    plus: { basic_credits: 999999, advanced_credits: 1500, elite_credits: 250 },
    ultra: { basic_credits: 999999, advanced_credits: 10000, elite_credits: 2500 },
    free: { basic_credits: 50, advanced_credits: 0, elite_credits: 0 },
};

// Reverse lookup: product_id -> tier name
function getTierFromProductId(productId) {
    for (const [key, val] of Object.entries(PRODUCT_MAP)) {
        if (val === productId) return key.split('_')[0]; // 'basic', 'plus', 'ultra'
    }
    return null;
}

exports.createCheckoutSession = functions.https.onRequest((req, res) => {
    return cors(req, res, async () => {
        if (req.method !== 'POST') {
            return res.status(405).json({ error: 'Method Not Allowed' });
        }

        try {
            // Authenticate via Google OAuth token (same as analyzeText)
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const accessToken = authHeader.split('Bearer ')[1];
            let userInfo;
            try {
                const tokenResp = await fetch(`https://www.googleapis.com/oauth2/v2/userinfo`, {
                    headers: { Authorization: `Bearer ${accessToken}` }
                });
                if (!tokenResp.ok) throw new Error('Token invalid');
                userInfo = await tokenResp.json();
            } catch (authErr) {
                return res.status(403).json({ error: 'Invalid or expired token.' });
            }

            const email = userInfo.email;
            const uid = userInfo.id; // Google user ID

            const { tier, billing } = req.body;

            const polarToken = process.env.POLAR_ACCESS_TOKEN;
            if (!polarToken) {
                return res.status(500).json({ error: 'Polar token not configured' });
            }

            const polar = new Polar({ accessToken: polarToken });

            const lookupKey = `${tier}_${billing || 'monthly'}`;
            const productId = PRODUCT_MAP[lookupKey];

            if (!productId) {
                return res.status(400).json({ error: `Invalid tier/billing: ${lookupKey}` });
            }

            const checkout = await polar.checkouts.create({
                products: [productId],
                customerEmail: email,
                metadata: { uid: uid, email: email },
                successUrl: "https://viky-ai-backend.web.app/success",
            });

            return res.status(200).json({ success: true, url: checkout.url });
        } catch (e) {
            console.error("Polar Checkout Error:", e);
            return res.status(500).json({ error: 'Failed to generate checkout link.' });
        }
    });
});

// Get current user subscription status
exports.getUserSubscription = functions.https.onRequest((req, res) => {
    return cors(req, res, async () => {
        if (req.method !== 'GET' && req.method !== 'POST') {
            return res.status(405).json({ error: 'Method Not Allowed' });
        }

        try {
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const accessToken = authHeader.split('Bearer ')[1];
            let userInfo;
            try {
                const tokenResp = await fetch(`https://www.googleapis.com/oauth2/v2/userinfo`, {
                    headers: { Authorization: `Bearer ${accessToken}` }
                });
                if (!tokenResp.ok) throw new Error('Token invalid');
                userInfo = await tokenResp.json();
            } catch (authErr) {
                return res.status(403).json({ error: 'Invalid or expired token.' });
            }

            const uid = userInfo.id;
            const db = admin.firestore();
            const userDoc = await db.collection('users').doc(uid).get();

            if (!userDoc.exists) {
                return res.status(200).json({
                    success: true,
                    subscription: {
                        tier: 'free',
                        basic_credits: 50,
                        advanced_credits: 0,
                        elite_credits: 0
                    }
                });
            }

            const data = userDoc.data();
            return res.status(200).json({
                success: true,
                subscription: {
                    tier: data.subscription_tier || 'free',
                    basic_credits: data.basic_credits || 50,
                    advanced_credits: data.advanced_credits || 0,
                    elite_credits: data.elite_credits || 0,
                    polar_subscription_id: data.polar_subscription_id || null
                }
            });
        } catch (e) {
            console.error("Get Subscription Error:", e);
            return res.status(500).json({ error: 'Failed to fetch subscription.' });
        }
    });
});

exports.polarWebhook = functions.https.onRequest(async (req, res) => {
    const webhookSecret = process.env.POLAR_WEBHOOK_SECRET;
    if (!webhookSecret) {
        return res.status(500).send('Webhook secret not configured');
    }

    try {
        // Verify webhook signature cryptographically using Polar SDK
        let event;
        try {
            event = validateEvent(req.rawBody, req.headers, webhookSecret);
        } catch (err) {
            if (err instanceof WebhookVerificationError) {
                console.warn("Invalid webhook signature:", err.message);
                return res.status(401).send("Invalid signature");
            }
            throw err;
        }

        const type = event.type;
        const eventData = event.data;

        const uid = eventData.metadata?.uid;
        if (!uid) {
            console.warn("Webhook received without metadata.uid.", eventData.id);
            return res.status(200).send("No uid provided, ignored.");
        }

        const db = admin.firestore();

        if (type === 'subscription.created' || type === 'subscription.updated' || type === 'subscription.active') {
            const productId = eventData.product_id;
            const tier = getTierFromProductId(productId);

            if (!tier) {
                console.warn("Unknown product_id in webhook:", productId);
                return res.status(200).send("Unknown product, ignored.");
            }

            const credits = TIER_CREDITS[tier];
            await db.collection('users').doc(uid).set({
                subscription_tier: tier,
                polar_subscription_id: eventData.id,
                polar_product_id: productId,
                ...credits,
                subscription_updated_at: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

            console.log(`User ${uid} updated to ${tier} tier.`);

        } else if (type === 'subscription.canceled' || type === 'subscription.revoked') {
            const credits = TIER_CREDITS.free;
            await db.collection('users').doc(uid).set({
                subscription_tier: "free",
                polar_subscription_id: null,
                polar_product_id: null,
                ...credits,
                subscription_updated_at: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

            console.log(`User ${uid} downgraded to free tier.`);
        }

        res.status(200).send('Webhook processed');
    } catch (err) {
        console.error("Webhook processing error:", err);
        res.status(400).send(`Webhook Error: ${err.message}`);
    }
});

