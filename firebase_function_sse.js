const functions = require('firebase-functions');
const admin = require('firebase-admin');
const fetch = require('node-fetch');

admin.initializeApp();

// OpenRouter API configuration (store securely in environment variables)
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const DEFAULT_TEXT_MODEL = 'deepseek/deepseek-v4-flash:free';
const DEFAULT_IMAGE_MODEL = 'x-ai/grok-imagine-image-quality';

/**
 * CORS middleware helper
 */
function setCorsHeaders(res) {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

/**
 * Verify Firebase ID Token from Authorization header
 */
async function verifyAuth(req) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) throw new Error('Authorization token required');
  
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    return decoded;
  } catch (err) {
    throw new Error('Invalid authorization token');
  }
}

/**
 * Main analyzeText HTTP Cloud Function
 * Supports both standard JSON response and SSE streaming
 */
exports.analyzeText = functions.https.onRequest(async (req, res) => {
  setCorsHeaders(res);

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    // Verify authentication
    const user = await verifyAuth(req);

    const { prompt, model, isImageGeneration, stream } = req.body;

    if (!prompt) {
      res.status(400).json({ error: 'Prompt is required' });
      return;
    }

    const isStreaming = stream === true;
    const selectedModel = model || (isImageGeneration ? DEFAULT_IMAGE_MODEL : DEFAULT_TEXT_MODEL);

    if (isImageGeneration) {
      // Image generation does not support streaming
      const result = await generateImage(prompt, selectedModel);
      res.json({ success: true, ...result });
      return;
    }

    if (isStreaming) {
      // ===== SSE STREAMING MODE =====
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no'); // Disable Nginx buffering
      res.status(200);
      res.flushHeaders();

      try {
        const response = await fetch(OPENROUTER_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'HTTP-Referer': 'https://viky-ai.com',
            'X-Title': 'Viky AI'
          },
          body: JSON.stringify({
            model: selectedModel,
            messages: [{ role: 'user', content: prompt }],
            stream: true,
            temperature: 0.7,
            max_tokens: 2048,
            top_p: 0.95
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          res.write(`data: ${JSON.stringify({ error: `OpenRouter API error: ${response.status} - ${errorText}` })}\n\n`);
          res.write(`data: [DONE]\n\n`);
          res.end();
          return;
        }

        const reader = response.body;
        reader.on('data', (chunk) => {
          const lines = chunk.toString().split('\n');
          for (const line of lines) {
            if (line.trim().startsWith('data:')) {
              const dataStr = line.trim().slice(5).trim();
              if (dataStr === '[DONE]') {
                res.write(`data: [DONE]\n\n`);
                res.end();
                return;
              }
              try {
                const data = JSON.parse(dataStr);
                if (data.choices && data.choices[0] && data.choices[0].delta) {
                  res.write(`data: ${JSON.stringify(data)}\n\n`);
                }
              } catch (e) {
                // Ignore parse errors for incomplete chunks
              }
            }
          }
        });

        reader.on('end', () => {
          res.write(`data: [DONE]\n\n`);
          res.end();
        });

        reader.on('error', (err) => {
          console.error('Stream error:', err);
          res.write(`data: ${JSON.stringify({ error: 'Stream error occurred' })}\n\n`);
          res.write(`data: [DONE]\n\n`);
          res.end();
        });

      } catch (err) {
        console.error('Streaming error:', err);
        res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
        res.write(`data: [DONE]\n\n`);
        res.end();
      }

    } else {
      // ===== STANDARD JSON MODE (fallback) =====
      const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://viky-ai.com',
          'X-Title': 'Viky AI'
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 2048,
          top_p: 0.95
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        res.status(response.status).json({
          success: false,
          error: errorData.error?.message || `HTTP Error: ${response.status}`
        });
        return;
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content || '';
      res.json({ success: true, text });
    }

  } catch (error) {
    console.error('Function error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Generate image using OpenRouter image models
 */
async function generateImage(prompt, model) {
  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'https://viky-ai.com',
      'X-Title': 'Viky AI'
    },
    body: JSON.stringify({
      model: model,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || `HTTP Error: ${response.status}`);
  }

  const data = await response.json();
  
  // Handle base64 image response or URL
  const message = data.choices?.[0]?.message;
  if (message?.content) {
    // Check if content is base64 data URL or plain URL
    if (message.content.startsWith('data:')) {
      const base64Data = message.content.split(',')[1];
      const mimeType = message.content.match(/data:(.*?);/)?.[1] || 'image/png';
      return { image: base64Data, mimeType };
    }
    return { imageUrl: message.content };
  }
  
  throw new Error('No image data in response');
}

/**
 * Transcribe audio using OpenRouter's STT endpoint (e.g. nvidia/parakeet-tdt-0.6b-v3)
 */
exports.transcribeAudio = functions.https.onRequest(async (req, res) => {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const user = await verifyAuth(req);

    const { audioBase64, audioFormat, model } = req.body;

    if (!audioBase64) {
      res.status(400).json({ error: 'Audio data is required' });
      return;
    }

    const selectedModel = model || 'nvidia/parakeet-tdt-0.6b-v3';
    const format = audioFormat || 'wav';

    const response = await fetch('https://openrouter.ai/api/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://viky-ai.com',
        'X-Title': 'Viky AI'
      },
      body: JSON.stringify({
        model: selectedModel,
        input_audio: {
          data: audioBase64,
          format: format
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      res.status(response.status).json({
        success: false,
        error: errorData.error?.message || `OpenRouter STT error: ${response.status}`
      });
      return;
    }

    const data = await response.json();
    const text = data.text || '';

    res.json({ success: true, text });

  } catch (error) {
    console.error('Transcribe function error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
