// Viky AI — Web Assistant Content Script
// Injects AI features on Google Search, YouTube, Gmail, and link previews.
// Respects per-feature toggles stored in chrome.storage.local.
(function () {
  'use strict';

  // ===== Guard: don't run inside extension pages =====
  if (window.location.protocol === 'chrome-extension:') return;

  // ===== Shared Constants & Helpers =====
  const LOGO_URL = chrome.runtime.getURL('icons/icon128.png');
  const ICON_16 = chrome.runtime.getURL('icons/icon16.png');

  // Theme-aware CSS vars (injected into each shadow root)
  const SHARED_CSS = `
    :host {
      --accent-faint: rgba(0, 255, 157, 0.06);
      --accent-medium: rgba(0, 255, 157, 0.15);
      --accent-border: rgba(0, 255, 157, 0.4);

      --viky-bg: #1a1a2e;
      --viky-bg2: #16213e;
      --viky-border: rgba(255,255,255,0.08);
      --viky-text: #e2e8f0;
      --viky-text2: #94a3b8;
      --viky-accent: #00ff9d;
      --viky-accent-soft: rgba(0,255,157,0.1);
      --viky-radius: 12px;
      --viky-font: 'Inter', 'Segoe UI', system-ui, sans-serif;
      font-family: var(--viky-font);
      color: var(--viky-text);
      box-sizing: border-box;
    }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    .viky-scrollbar::-webkit-scrollbar { width: 4px; }
    .viky-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 2px; }

    @keyframes viky-fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes viky-pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }
    @keyframes viky-shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }

    .viky-loading-dots span {
      display: inline-block;
      width: 6px; height: 6px; border-radius: 50%;
      background: var(--viky-accent);
      margin: 0 2px;
      animation: viky-pulse 1.2s infinite;
    }
    .viky-loading-dots span:nth-child(2) { animation-delay: 0.2s; }
    .viky-loading-dots span:nth-child(3) { animation-delay: 0.4s; }

    .viky-skeleton {
      background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%);
      background-size: 200% 100%;
      animation: viky-shimmer 1.5s infinite;
      border-radius: 4px;
    }
  `;

  // ===== Utility: create shadow host =====
  function createShadowHost(id) {
    const existing = document.getElementById(id);
    if (existing) existing.remove();
    const host = document.createElement('div');
    host.id = id;
    const shadow = host.attachShadow({ mode: 'closed' });
    return { host, shadow };
  }

  // ===== Utility: check if extension context is still valid =====
  function isExtensionContextValid() {
    try {
      // Accessing chrome.runtime.id throws if the context is invalidated
      return !!(chrome.runtime && chrome.runtime.id);
    } catch (e) {
      return false;
    }
  }

  // ===== Utility: stream AI response =====
  function streamAI(prompt, onChunk, onDone, onError) {
    // Guard: check for invalidated extension context before connecting
    if (!isExtensionContextValid()) {
      onError('CONTEXT_INVALIDATED');
      return;
    }

    try {
      const port = chrome.runtime.connect({ name: 'viky-stream' });
      let fullText = '';
      let hasCompleted = false;

      // Timeout safety: if no response after 30s, report error
      const timeout = setTimeout(() => {
        if (!hasCompleted && !fullText) {
          hasCompleted = true;
          try { port.disconnect(); } catch (e) {}
          onError('Request timed out. Please try again.');
        }
      }, 30000);

      const markComplete = () => {
        hasCompleted = true;
        clearTimeout(timeout);
      };

      port.onDisconnect.addListener(() => {
        if (!hasCompleted) {
          markComplete();
          const lastErr = chrome.runtime.lastError;
          if (lastErr && lastErr.message && lastErr.message.includes('Extension context invalidated')) {
            onError('CONTEXT_INVALIDATED');
          } else if (!fullText) {
            onError(lastErr?.message || 'Connection lost. Please try again.');
          }
        }
      });

      port.onMessage.addListener((msg) => {
        if (msg.error) {
          markComplete();
          onError(msg.error);
          return;
        }
        if (msg.chunk) {
          clearTimeout(timeout); // Got data, cancel timeout
          fullText += msg.chunk;
          onChunk(fullText, msg.chunk);
        }
        if (msg.done) {
          markComplete();
          onDone(fullText);
        }
      });

      // Get the selected model from storage before sending
      chrome.storage.local.get(['selectedModel'], (result) => {
        if (hasCompleted) return; // Already timed out or disconnected
        const model = result.selectedModel || 'meta-llama/llama-3.3-70b-instruct:free';
        port.postMessage({
          action: 'CHAT_MESSAGE',
          message: prompt,
          history: [],
          stream: true,
          model: model
        });
      });

      return port;
    } catch (e) {
      if (e.message && e.message.includes('Extension context invalidated')) {
        onError('CONTEXT_INVALIDATED');
      } else {
        onError(e.message);
      }
    }
  }

  // ===== Utility: simple markdown to HTML =====
  function mdToHtml(md) {
    if (!md) return '';
    return md
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code style="background:rgba(255,255,255,0.06);padding:1px 4px;border-radius:3px;font-size:0.9em;">$1</code>')
      .replace(/^### (.+)$/gm, '<h4 style="font-size:13px;font-weight:600;margin:10px 0 4px;color:var(--viky-accent);">$1</h4>')
      .replace(/^## (.+)$/gm, '<h3 style="font-size:14px;font-weight:600;margin:12px 0 4px;color:var(--viky-accent);">$1</h3>')
      .replace(/^# (.+)$/gm, '<h2 style="font-size:15px;font-weight:700;margin:14px 0 6px;color:var(--viky-accent);">$1</h2>')
      .replace(/^[-*] (.+)$/gm, '<li style="margin-left:16px;list-style:disc;margin-bottom:3px;">$1</li>')
      .replace(/^(\d+)\. (.+)$/gm, '<li style="margin-left:16px;list-style:decimal;margin-bottom:3px;">$2</li>')
      .replace(/\n{2,}/g, '<br><br>')
      .replace(/\n/g, '<br>');
  }

  // ===== Settings Check Helper =====
  function getSettings(keys) {
    return new Promise((resolve) => {
      chrome.storage.local.get(keys, resolve);
    });
  }


  // ============================================================
  // FEATURE 1: GOOGLE SEARCH AI SIDEBAR
  // ============================================================
  async function initSearchAssistant() {
    const settings = await getSettings(['wa_search_enabled', 'wa_search_trigger']);
    if (settings.wa_search_enabled === false) return;

    const trigger = settings.wa_search_trigger || 'always';
    const searchParams = new URLSearchParams(window.location.search);
    const query = searchParams.get('q');
    if (!query) return;

    // Check trigger mode
    if (trigger === 'question_mark' && !query.trim().endsWith('?')) return;

    // Find the right-side area (rhs) or create alongside results
    const rhs = document.getElementById('rhs');
    const center = document.getElementById('center_col') || document.getElementById('rcnt');
    if (!rhs && !center) return;

    const { host, shadow } = createShadowHost('viky-search-sidebar');
    const style = document.createElement('style');
    style.textContent = SHARED_CSS + `
      .panel {
        width: 100%;
        max-width: 360px;
        background: var(--viky-bg);
        border: 1px solid var(--viky-border);
        border-radius: var(--viky-radius);
        overflow: hidden;
        animation: viky-fadeIn 0.35s ease;
        box-shadow: 0 4px 24px rgba(0,0,0,0.3);
        font-size: 13px;
        line-height: 1.6;
      }
      .header {
        display: flex; align-items: center; gap: 8px;
        padding: 12px 14px;
        border-bottom: 1px solid var(--viky-border);
        background: var(--viky-bg2);
      }
      .header img { width: 20px; height: 20px; border-radius: 5px; }
      .header span { font-weight: 600; font-size: 13px; }
      .header .actions { margin-left: auto; display: flex; gap: 6px; }
      .header .actions button {
        background: none; border: none; color: var(--viky-text2);
        cursor: pointer; padding: 4px; border-radius: 4px; font-size: 14px;
        transition: color 0.2s, background 0.2s;
      }
      .header .actions button:hover { color: var(--viky-text); background: rgba(255,255,255,0.06); }
      .body {
        padding: 14px;
        max-height: 500px;
        overflow-y: auto;
      }
      .body p, .body li { color: var(--viky-text); }
      .footer {
        padding: 8px 14px;
        border-top: 1px solid var(--viky-border);
        display: flex; align-items: center; gap: 6px;
        font-size: 10px; color: var(--viky-text2);
      }
      .footer img { width: 12px; height: 12px; border-radius: 3px; opacity: 0.6; }
      .collapsed .body { display: none; }
      .collapsed .footer { display: none; }

      /* Manual click trigger button */
      .trigger-btn {
        display: flex; align-items: center; gap: 8px;
        padding: 10px 14px;
        background: var(--viky-bg);
        border: 1px solid var(--viky-border);
        border-radius: var(--viky-radius);
        cursor: pointer;
        color: var(--viky-text);
        font-size: 13px;
        font-family: var(--viky-font);
        transition: all 0.2s;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      }
      .trigger-btn:hover {
        border-color: var(--viky-accent);
        box-shadow: 0 2px 12px var(--accent-soft);
      }
      .trigger-btn img { width: 18px; height: 18px; border-radius: 4px; }
    `;
    shadow.appendChild(style);

    const container = document.createElement('div');
    shadow.appendChild(container);

    if (rhs) {
      rhs.prepend(host);
    } else if (center) {
      // Create a wrapper to position beside center
      host.style.cssText = 'position:fixed;top:100px;right:20px;z-index:9999;width:360px;';
      document.body.appendChild(host);
    }

    // If trigger is manual_click, show button first
    if (trigger === 'manual_click') {
      container.innerHTML = `
        <button class="trigger-btn" id="viky-trigger">
          <img src="${LOGO_URL}" alt="Viky AI">
          <span>Ask Viky AI about "${query.slice(0, 50)}${query.length > 50 ? '...' : ''}"</span>
        </button>
      `;
      shadow.getElementById('viky-trigger').addEventListener('click', () => {
        renderSearchPanel(container, query);
      });
    } else {
      renderSearchPanel(container, query);
    }
  }

  function renderSearchPanel(container, query) {
    container.innerHTML = `
      <div class="panel" id="viky-panel">
        <div class="header">
          <img src="${LOGO_URL}" alt="Viky AI">
          <span>Viky AI</span>
          <div class="actions">
            <button id="copy-btn" title="Copy">📋</button>
            <button id="collapse-btn" title="Collapse">▾</button>
            <button id="close-btn" title="Close">✕</button>
          </div>
        </div>
        <div class="body viky-scrollbar" id="viky-body">
          <div class="viky-loading-dots"><span></span><span></span><span></span></div>
        </div>
        <div class="footer">
          <img src="${ICON_16}" alt="">
          <span>Powered by Viky AI</span>
        </div>
      </div>
    `;

    const panel = container.querySelector('#viky-panel');
    const body = container.querySelector('#viky-body');
    const copyBtn = container.querySelector('#copy-btn');
    const collapseBtn = container.querySelector('#collapse-btn');
    const closeBtn = container.querySelector('#close-btn');

    let fullResponse = '';

    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(fullResponse).then(() => {
        copyBtn.textContent = '✓';
        setTimeout(() => { copyBtn.textContent = '📋'; }, 1500);
      });
    });

    collapseBtn.addEventListener('click', () => {
      panel.classList.toggle('collapsed');
      collapseBtn.textContent = panel.classList.contains('collapsed') ? '▸' : '▾';
    });

    closeBtn.addEventListener('click', () => {
      container.innerHTML = '';
    });

    // ===== Scrape actual Google Search results from the DOM =====
    const searchContext = scrapeSearchResults();

    const prompt = `You are a precise search assistant. Answer the user's search query using ONLY the search results provided below as your source of truth. Do NOT make up information or use your training data — rely strictly on the provided search results.

Write a comprehensive, factual answer in a flowing paragraph style. Include specific details like names, locations, dates, numbers, certifications, and product details found in the results. Be specific and accurate.

Search query: "${query}"

${searchContext}

IMPORTANT: Base your entire answer ONLY on the information found in the search results above. If the results don't contain enough information, say so. Do NOT hallucinate or guess. Be specific — include exact names, numbers, locations, and details from the results.`;

    streamAI(prompt, (full) => {
      fullResponse = full;
      body.innerHTML = mdToHtml(full);
    }, () => {
      // done
    }, (err) => {
      if (err === 'CONTEXT_INVALIDATED') {
        body.innerHTML = `<p style="color:#ff6b6b;">⚠ Extension was updated. Please <a href="javascript:void(0)" onclick="window.location.reload()" style="color:#00ff9d;text-decoration:underline;cursor:pointer;">refresh this page</a> and try again.</p>`;
      } else {
        body.innerHTML = `<p style="color:#ff6b6b;">Error: ${err}</p>`;
      }
    });
  }

  // ===== Scrape Google Search Result Snippets from DOM =====
  function scrapeSearchResults() {
    const results = [];

    // Google's main search result containers
    const searchCards = document.querySelectorAll('div.g, div[data-hveid] div.g, div.MjjYud div.g');

    searchCards.forEach((card, i) => {
      if (i >= 10) return; // Limit to top 10

      const titleEl = card.querySelector('h3');
      const linkEl = card.querySelector('a[href]');
      const snippetEl = card.querySelector('.VwiC3b, .IsZvec, .s3v9rd, span.st, div[data-sncf], div[style*="-webkit-line-clamp"]');

      const title = titleEl ? titleEl.textContent.trim() : '';
      const url = linkEl ? linkEl.href : '';
      const snippet = snippetEl ? snippetEl.textContent.trim() : '';

      if (title || snippet) {
        results.push({ title, url, snippet });
      }
    });

    // Also grab the featured snippet / knowledge panel if present
    const featuredSnippet = document.querySelector('.hgKElc, .IZ6rdc, .LGOjhe, div[data-attrid] span');
    const knowledgePanel = document.querySelector('.kp-wholepage, .osrp-blk, .kno-rdesc span');

    let extraContext = '';

    if (featuredSnippet) {
      extraContext += `\nFeatured Snippet: "${featuredSnippet.textContent.trim().slice(0, 1000)}"`;
    }

    if (knowledgePanel) {
      extraContext += `\nKnowledge Panel: "${knowledgePanel.textContent.trim().slice(0, 1000)}"`;
    }

    // Also grab "People also ask" answers if expanded
    const paaAnswers = document.querySelectorAll('.wDYxhc[data-md]');
    paaAnswers.forEach((answer, i) => {
      if (i >= 3) return;
      const text = answer.textContent.trim();
      if (text) {
        extraContext += `\nRelated info: "${text.slice(0, 500)}"`;
      }
    });

    // Also grab the About panel info (right side knowledge box)
    const aboutPanel = document.querySelectorAll('.kno-rdesc span, .wwUB2c, .rVusze');
    aboutPanel.forEach((el) => {
      const text = el.textContent.trim();
      if (text && text.length > 30) {
        extraContext += `\nAbout: "${text.slice(0, 800)}"`;
      }
    });

    // Build context string
    let context = 'Search Results:\n';
    results.forEach((r, i) => {
      context += `\n[${i + 1}] ${r.title}\n`;
      if (r.url) context += `URL: ${r.url}\n`;
      if (r.snippet) context += `Snippet: ${r.snippet}\n`;
    });

    if (extraContext) {
      context += `\nAdditional Context:${extraContext}`;
    }

    if (results.length === 0 && !extraContext) {
      context = 'No search results could be extracted from the page.';
    }

    return context;
  }


  // ============================================================
  // FEATURE 2: YOUTUBE VIDEO SUMMARIZER
  // ============================================================

  // ----- YouTube Player Response Extraction -----
  let injectScriptPromise = null;
  function injectMainWorldScript() {
    if (injectScriptPromise) return injectScriptPromise;
    injectScriptPromise = new Promise((resolve) => {
      const s = document.createElement('script');
      s.src = chrome.runtime.getURL('youtube_inject.js');
      s.onload = () => {
        // Small delay to ensure the event listener inside is registered
        setTimeout(resolve, 100);
      };
      s.onerror = () => resolve(); // Don't block on script load failure
      (document.head || document.documentElement).appendChild(s);
    });
    return injectScriptPromise;
  }

  async function getPlayerResponse(videoId) {
    // Strategy 1: Inject main world script and get data via postMessage
    try {
      await injectMainWorldScript();
      const mainWorldData = await new Promise((resolve) => {
        const handler = (e) => {
          if (e.data && e.data.type === 'VIKY_PLAYER_RESPONSE') {
            window.removeEventListener('message', handler);
            resolve(e.data.payload);
          }
        };
        window.addEventListener('message', handler);
        document.dispatchEvent(new CustomEvent('VikyRequestPlayerResponse'));
        setTimeout(() => {
          window.removeEventListener('message', handler);
          resolve(null);
        }, 1500);
      });
      if (mainWorldData && mainWorldData.captions) {
        console.log('[Viky AI] Got player response via inject script');
        return mainWorldData;
      }
    } catch (e) {
      console.warn('[Viky AI] Inject script method failed:', e.message);
    }

    // Strategy 2: Parse ytInitialPlayerResponse from page HTML (works on initial load)
    try {
      const scripts = document.querySelectorAll('script');
      for (const script of scripts) {
        const text = script.textContent;
        if (text && text.includes('ytInitialPlayerResponse')) {
          // Use indexOf + balanced brace counting for reliable JSON extraction
          const marker = 'ytInitialPlayerResponse = ';
          const idx = text.indexOf(marker);
          if (idx !== -1) {
            const start = idx + marker.length;
            let depth = 0;
            let end = start;
            for (let i = start; i < text.length; i++) {
              if (text[i] === '{') depth++;
              else if (text[i] === '}') depth--;
              if (depth === 0 && i > start) {
                end = i + 1;
                break;
              }
            }
            if (end > start) {
              const parsed = JSON.parse(text.substring(start, end));
              if (parsed && parsed.captions) {
                console.log('[Viky AI] Got player response from DOM script tag');
                return parsed;
              }
            }
          }
        }
      }
    } catch (e) {
      console.warn('[Viky AI] DOM script parsing failed:', e.message);
    }

    // Strategy 3: Fetch the watch page HTML directly and extract from it
    try {
      const res = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
        credentials: 'include'  // Include cookies to get the same page as the user
      });
      if (res.ok) {
        const html = await res.text();
        const marker = 'ytInitialPlayerResponse = ';
        const idx = html.indexOf(marker);
        if (idx !== -1) {
          const start = idx + marker.length;
          let depth = 0;
          let end = start;
          for (let i = start; i < html.length && i < start + 500000; i++) {
            if (html[i] === '{') depth++;
            else if (html[i] === '}') depth--;
            if (depth === 0 && i > start) {
              end = i + 1;
              break;
            }
          }
          if (end > start) {
            const parsed = JSON.parse(html.substring(start, end));
            if (parsed) {
              console.log('[Viky AI] Got player response from HTML fetch');
              return parsed;
            }
          }
        }
      }
    } catch (e) {
      console.warn('[Viky AI] HTML fetch fallback failed:', e.message);
    }
    
    console.error('[Viky AI] All player response extraction methods failed for video:', videoId);
    return null;
  }

  function parseJson3Events(data) {
    const segments = [];
    if (data && data.events) {
      for (const event of data.events) {
        if (!event.segs) continue;
        const text = event.segs.map(s => s.utf8).join('').trim();
        if (text) {
          segments.push({
            startMs: event.tStartMs,
            durationMs: event.dDurationMs || 0,
            text: text
          });
        }
      }
    }
    return segments;
  }

  function parseXmlCaptions(xmlText) {
    const segments = [];
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlText, 'text/xml');
      const textNodes = doc.querySelectorAll('text');
      textNodes.forEach(node => {
        const start = parseFloat(node.getAttribute('start') || '0') * 1000;
        const dur = parseFloat(node.getAttribute('dur') || '0') * 1000;
        const text = node.textContent.trim();
        if (text) {
          segments.push({ startMs: start, durationMs: dur, text });
        }
      });
    } catch (e) {
      console.warn('[Viky AI] XML caption parse failed:', e.message);
    }
    return segments;
  }

  async function fetchVideoTranscript(videoId, playerResponse = null) {
    // Method 1: Use caption tracks from player response
    try {
      if (!playerResponse) {
        playerResponse = await getPlayerResponse(videoId);
      }
      const captions = playerResponse?.captions?.playerCaptionsTracklistRenderer;
      const captionTracks = captions?.captionTracks;

      if (captionTracks && captionTracks.length > 0) {
        // Try English first, then any language
        let track = captionTracks.find(t => t.languageCode === 'en') 
                 || captionTracks.find(t => t.languageCode?.startsWith('en'))
                 || captionTracks[0];

        // Try json3 format first
        try {
          const url = track.baseUrl + '&fmt=json3';
          const res = await fetch(url);
          if (res.ok) {
            const data = await res.json();
            const segments = parseJson3Events(data);
            if (segments.length > 0) {
              console.log(`[Viky AI] Got transcript via captionTracks (json3, lang=${track.languageCode}, ${segments.length} segments)`);
              return segments;
            }
          }
        } catch (e) {
          console.warn('[Viky AI] json3 fetch failed, trying XML:', e.message);
        }

        // Fallback to XML format
        try {
          const res = await fetch(track.baseUrl);
          if (res.ok) {
            const xmlText = await res.text();
            const segments = parseXmlCaptions(xmlText);
            if (segments.length > 0) {
              console.log(`[Viky AI] Got transcript via captionTracks (XML, ${segments.length} segments)`);
              return segments;
            }
          }
        } catch (e) {
          console.warn('[Viky AI] XML caption fetch failed:', e.message);
        }
      }
    } catch (e) {
      console.warn('[Viky AI] captionTracks method failed:', e.message);
    }

    // Method 2: Direct timedtext API (works when player response extraction fails entirely)
    const languages = ['en', 'hi', 'a.en', 'a.hi', '']; // en, Hindi, auto-generated en/hi, default
    for (const lang of languages) {
      try {
        const langParam = lang ? `&lang=${lang}` : '';
        const url = `https://www.youtube.com/api/timedtext?v=${videoId}${langParam}&fmt=json3`;
        const res = await fetch(url, { credentials: 'include' });
        if (res.ok) {
          const text = await res.text();
          if (text && text.trim().length > 10) {
            const data = JSON.parse(text);
            const segments = parseJson3Events(data);
            if (segments.length > 0) {
              console.log(`[Viky AI] Got transcript via direct timedtext API (lang=${lang || 'default'}, ${segments.length} segments)`);
              return segments;
            }
          }
        }
      } catch (e) {
        // Try next language
      }
    }

    // Method 3: Try fetching the caption list and using the first available
    try {
      const listUrl = `https://www.youtube.com/api/timedtext?v=${videoId}&type=list`;
      const listRes = await fetch(listUrl, { credentials: 'include' });
      if (listRes.ok) {
        const listXml = await listRes.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(listXml, 'text/xml');
        const tracks = doc.querySelectorAll('track');
        if (tracks.length > 0) {
          const langCode = tracks[0].getAttribute('lang_code') || 'en';
          const captionUrl = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${langCode}&fmt=json3`;
          const res = await fetch(captionUrl, { credentials: 'include' });
          if (res.ok) {
            const data = await res.json();
            const segments = parseJson3Events(data);
            if (segments.length > 0) {
              console.log(`[Viky AI] Got transcript via timedtext list API (lang=${langCode}, ${segments.length} segments)`);
              return segments;
            }
          }
        }
      }
    } catch (e) {
      console.warn('[Viky AI] timedtext list fallback failed:', e.message);
    }

    console.error('[Viky AI] All transcript extraction methods failed for video:', videoId);
    return null;
  }

  function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const pad = (n) => String(n).padStart(2, '0');
    if (hours > 0) {
      return `${hours}:${pad(minutes)}:${pad(seconds)}`;
    } else {
      return `${pad(minutes)}:${pad(seconds)}`;
    }
  }

  function formatTranscriptForAI(segments) {
    let text = "";
    segments.forEach(seg => {
      const timeStr = formatTime(seg.startMs);
      text += `[${timeStr}] ${seg.text}\n`;
    });
    return text.slice(0, 40000); // Safety cap around 40k characters
  }

  function parseAndLinkTimestamps(html) {
    // Match optional brackets around the timestamp
    const regex = /\[?((?:\d{1,2}:)?\d{1,2}:\d{2})\]?/g;
    return html.replace(regex, (match, timeStr) => {
      const parts = timeStr.split(':').map(Number);
      let totalSeconds = 0;
      if (parts.length === 3) {
        totalSeconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
      } else if (parts.length === 2) {
        totalSeconds = parts[0] * 60 + parts[1];
      }
      return `<button class="viky-timestamp-btn" data-seconds="${totalSeconds}">▶ ${timeStr}</button>`;
    });
  }

  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  let currentVideoId = '';

  async function initYouTubeAssistant() {
    const settings = await getSettings(['wa_youtube_enabled']);
    if (settings.wa_youtube_enabled === false) return;

    const urlParams = new URLSearchParams(window.location.search);
    const videoId = urlParams.get('v');
    if (!videoId) return;

    // Prevent duplicate initialization on same video
    if (currentVideoId === videoId && document.getElementById('viky-youtube-sidebar')) return;
    currentVideoId = videoId;

    // Wait for the secondary column to be available
    let retries = 0;
    const waitForSecondary = setInterval(() => {
      retries++;
      const secondary = document.getElementById('secondary') || document.getElementById('related');
      if (secondary || retries > 30) {
        clearInterval(waitForSecondary);
        if (secondary) injectYouTubePanel(secondary);
      }
    }, 500);
  }

  function injectYouTubePanel(secondary) {
    const { host, shadow } = createShadowHost('viky-youtube-sidebar');
    const style = document.createElement('style');
    style.textContent = SHARED_CSS + `
      .panel {
        background: var(--viky-bg);
        border: 1px solid var(--viky-border);
        border-radius: var(--viky-radius);
        overflow: hidden;
        animation: viky-fadeIn 0.35s ease;
        box-shadow: 0 4px 24px rgba(0,0,0,0.3);
        margin-bottom: 16px;
        font-size: 13px;
        line-height: 1.6;
        display: flex;
        flex-direction: column;
      }
      .header {
        display: flex; align-items: center; gap: 8px;
        padding: 12px 14px;
        border-bottom: 1px solid var(--viky-border);
        background: var(--viky-bg2);
      }
      .header img { width: 20px; height: 20px; border-radius: 5px; }
      .header span { font-weight: 600; font-size: 13px; }
      .header .close { margin-left: auto; background: none; border: none; color: var(--viky-text2); cursor: pointer; font-size: 16px; padding: 2px 6px; border-radius: 4px; }
      .header .close:hover { color: var(--viky-text); background: rgba(255,255,255,0.06); }
      
      .body {
        padding: 14px;
        max-height: 450px;
        overflow-y: auto;
        flex-grow: 1;
      }
      .body p, .body li { color: var(--viky-text); }
      .body h2, .body h3, .body h4 {
        margin-top: 14px;
        margin-bottom: 6px;
      }
      .empty {
        text-align: center;
        padding: 30px 20px;
        color: var(--viky-text2);
        font-size: 12px;
      }
      
      /* Clickable timestamps styling */
      .viky-timestamp-btn {
        background: var(--viky-accent-soft);
        color: var(--viky-accent);
        border: 1px solid rgba(0, 255, 157, 0.2);
        border-radius: 6px;
        padding: 2px 8px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        font-family: var(--viky-font);
        transition: all 0.2s ease;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        margin-right: 6px;
        vertical-align: text-bottom;
      }
      .viky-timestamp-btn:hover {
        background: var(--viky-accent);
        color: #1a1a2e;
        border-color: var(--viky-accent);
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(0, 255, 157, 0.3);
      }
    `;
    shadow.appendChild(style);

    const panel = document.createElement('div');
    panel.innerHTML = `
      <div class="panel">
        <div class="header">
          <img src="${LOGO_URL}" alt="Viky AI">
          <span>Viky AI — Video Assistant</span>
          <button class="close" id="yt-close" title="Close Panel">✕</button>
        </div>
        
        <div class="body viky-scrollbar" id="yt-body">
          <div class="empty">Loading...</div>
        </div>
      </div>
    `;
    shadow.appendChild(panel);
    secondary.prepend(host);

    const body = shadow.getElementById('yt-body');
    const closeBtn = shadow.getElementById('yt-close');

    closeBtn.addEventListener('click', () => host.remove());

    // Clickable timestamp handler (event delegation)
    shadow.addEventListener('click', (e) => {
      const btn = e.target.closest('.viky-timestamp-btn');
      if (btn) {
        const secs = parseInt(btn.getAttribute('data-seconds'), 10);
        const video = document.querySelector('video');
        if (video) {
          video.currentTime = secs;
          video.play().catch(() => {});
        }
      }
    });

    let transcript = null;
    let hasTranscript = false;

    function getVideoTitle() {
      const el = document.querySelector('h1.ytd-watch-metadata yt-formatted-string, h1.title') ||
                 document.querySelector('#title h1');
      return el ? el.textContent.trim() : document.title.replace(' - YouTube', '').trim();
    }

    function getVideoDescription() {
      const el = document.querySelector('#description-inner ytd-text-inline-expander .content, #description .content');
      return el ? el.textContent.trim().slice(0, 1500) : '';
    }

    function generateAnalysis(title, desc) {
      body.innerHTML = `
        <div class="viky-skeleton-loader">
          <div class="viky-skeleton" style="height: 14px; width: 95%; margin-bottom: 8px;"></div>
          <div class="viky-skeleton" style="height: 14px; width: 85%; margin-bottom: 8px;"></div>
          <div class="viky-skeleton" style="height: 14px; width: 90%; margin-bottom: 8px;"></div>
          <div class="viky-skeleton" style="height: 14px; width: 70%; margin-bottom: 8px;"></div>
        </div>
      `;

      let prompt = '';
      if (hasTranscript) {
        const formattedTranscript = formatTranscriptForAI(transcript);
        prompt = `You are a professional video analysis assistant. Analyze this YouTube video based ONLY on the provided transcript.
Produce a response containing exactly two sections:

## Summary
Write a concise, 2-3 sentence overview of the video's core subject and main takeaways.

## Highlights
Provide a chronological list of key moments and takeaways from the transcript.
CRITICAL MANDATE: Every single list item MUST start with a timestamp (e.g. 01:23 or 01:23:45) indicating when it occurs in the video.
Example format:
- 01:23 Introduction to the main topic.
- 05:10 Analyzing the first experiment.
- 12:05 Key findings and results.

Video Title: "${title}"
Transcript:
${formattedTranscript}`;
      } else {
        prompt = `You are a professional video analysis assistant. Analyze this YouTube video based on its title and description.
Produce a response containing two parts:

## Summary
Write a concise, 2-3 sentence overview of the video's core subject and main takeaways.

## Key Takeaways
Provide a list of key points and takeaways from the description.

Video Title: "${title}"
Description: "${desc}"
(Note: No transcript is available for this video, so base your analysis on the description.)`;
      }

      streamAI(prompt, (full) => {
        let html = mdToHtml(full);
        body.innerHTML = parseAndLinkTimestamps(html);
      }, () => {
        // Done
      }, (err) => {
        if (err === 'CONTEXT_INVALIDATED') {
          body.innerHTML = `<p style="color:#ff6b6b;">⚠ Extension was updated. Please <a href="javascript:void(0)" onclick="window.location.reload()" style="color:#00ff9d;text-decoration:underline;cursor:pointer;">refresh this page</a> and try again.</p>`;
        } else {
          body.innerHTML = `<p style="color:#ff6b6b;">Error generating analysis: ${err}</p>`;
        }
      });
    }

    // Initial load and run
    async function loadVideoAndStart() {
      body.innerHTML = `
        <div class="empty">
          <div class="viky-loading-dots"><span></span><span></span><span></span></div>
          <p style="margin-top: 10px;">Fetching video details and transcript...</p>
        </div>
      `;
      
      const urlParams = new URLSearchParams(window.location.search);
      const videoId = urlParams.get('v');
      if (!videoId) {
        body.innerHTML = `<p style="color:#ff6b6b; padding: 14px;">Error: No video ID found in URL.</p>`;
        return;
      }

      const playerResponse = await getPlayerResponse(videoId);
      const title = playerResponse?.videoDetails?.title || getVideoTitle();
      const desc = playerResponse?.videoDetails?.shortDescription || getVideoDescription();

      const segments = await fetchVideoTranscript(videoId, playerResponse);
      if (segments && segments.length > 0) {
        transcript = segments;
        hasTranscript = true;
      } else {
        transcript = null;
        hasTranscript = false;
      }

      generateAnalysis(title, desc);
    }

    loadVideoAndStart();
  }


  // ============================================================
  // FEATURE 3: LINK DRAG-TO-PREVIEW
  // ============================================================
  async function initLinkPreview() {
    const settings = await getSettings(['wa_linkpreview_enabled']);
    if (settings.wa_linkpreview_enabled === false) return;

    let previewHost = null;
    let previewTimeout = null;
    let isDraggingLink = false;

    document.addEventListener('dragstart', (e) => {
      const link = e.target.closest('a[href]');
      if (!link || !link.href || link.href.startsWith('javascript:')) return;

      isDraggingLink = true;
      const href = link.href;
      const text = link.textContent.trim();

      // Show preview after short delay
      previewTimeout = setTimeout(() => {
        showLinkPreview(href, text, e.clientX, e.clientY);
      }, 400);
    });

    document.addEventListener('dragend', () => {
      isDraggingLink = false;
      clearTimeout(previewTimeout);
      // Keep the preview visible for a while after dragend
      setTimeout(() => {
        if (!isDraggingLink && previewHost) {
          previewHost.style.opacity = '0';
          previewHost.style.transform = 'translateY(4px)';
          setTimeout(() => {
            if (previewHost) {
              previewHost.remove();
              previewHost = null;
            }
          }, 200);
        }
      }, 3000);
    });

    function showLinkPreview(href, text, x, y) {
      if (previewHost) {
        previewHost.remove();
        previewHost = null;
      }

      const { host, shadow } = createShadowHost('viky-link-preview');
      previewHost = host;

      const style = document.createElement('style');
      style.textContent = SHARED_CSS + `
        .preview {
          position: fixed;
          z-index: 2147483647;
          width: 320px;
          background: var(--viky-bg);
          border: 1px solid var(--viky-border);
          border-radius: var(--viky-radius);
          box-shadow: 0 8px 32px rgba(0,0,0,0.4);
          animation: viky-fadeIn 0.25s ease;
          transition: opacity 0.2s, transform 0.2s;
          font-size: 12px;
          line-height: 1.6;
          overflow: hidden;
        }
        .preview-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 10px 12px;
          border-bottom: 1px solid var(--viky-border);
          background: var(--viky-bg2);
        }
        .preview-header .left { display: flex; align-items: center; gap: 6px; }
        .preview-header img { width: 14px; height: 14px; border-radius: 3px; }
        .preview-header .title { font-weight: 600; font-size: 11px; color: var(--viky-accent); }
        .preview-header .close {
          background: none; border: none; color: var(--viky-text2);
          cursor: pointer; font-size: 14px; padding: 2px 6px; border-radius: 4px;
        }
        .preview-header .close:hover { color: var(--viky-text); background: rgba(255,255,255,0.06); }
        .preview-url {
          padding: 6px 12px;
          font-size: 10px;
          color: var(--viky-text2);
          border-bottom: 1px solid var(--viky-border);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .preview-body {
          padding: 10px 12px;
          max-height: 200px;
          overflow-y: auto;
        }
      `;
      shadow.appendChild(style);

      // Position near cursor but within viewport
      const viewW = window.innerWidth;
      const viewH = window.innerHeight;
      let left = Math.min(x + 20, viewW - 340);
      let top = Math.min(y + 20, viewH - 300);
      if (left < 10) left = 10;
      if (top < 10) top = 10;

      const panel = document.createElement('div');
      panel.innerHTML = `
        <div class="preview" style="left:${left}px;top:${top}px;">
          <div class="preview-header">
            <div class="left">
              <img src="${LOGO_URL}" alt="">
              <span class="title">✦ Summary</span>
            </div>
            <button class="close" id="lp-close">✕</button>
          </div>
          <div class="preview-url">${href}</div>
          <div class="preview-body viky-scrollbar" id="lp-body">
            <div class="viky-loading-dots"><span></span><span></span><span></span></div>
          </div>
        </div>
      `;
      shadow.appendChild(panel);
      document.body.appendChild(host);

      shadow.getElementById('lp-close').addEventListener('click', () => {
        host.remove();
        previewHost = null;
      });

      const body = shadow.getElementById('lp-body');
      const displayText = text || new URL(href).hostname;

      const prompt = `Give a very brief summary (2-3 sentences) of what this webpage is likely about based on its URL and link text. Be concise.\n\nURL: ${href}\nLink text: "${displayText}"`;

      streamAI(prompt, (full) => {
        body.innerHTML = mdToHtml(full);
      }, () => {}, (err) => {
        if (err === 'CONTEXT_INVALIDATED') {
          body.innerHTML = `<p style="color:#ff6b6b;">⚠ Extension was updated. Please <a href="javascript:void(0)" onclick="window.location.reload()" style="color:#00ff9d;text-decoration:underline;cursor:pointer;">refresh this page</a> and try again.</p>`;
        } else {
          body.innerHTML = `<p style="color:#ff6b6b;">Could not preview this link.</p>`;
        }
      });
    }
  }


  // ============================================================
  // FEATURE 4: GMAIL AI REPLY BUTTON
  // ============================================================
  async function initGmailAssistant() {
    const settings = await getSettings(['wa_email_enabled']);
    if (settings.wa_email_enabled === false) return;

    // Gmail loads dynamically, observe for email threads
    const observer = new MutationObserver(() => {
      injectAIReplyButtons();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // Initial injection
    setTimeout(injectAIReplyButtons, 2000);
  }

  function injectAIReplyButtons() {
    // Find Gmail reply/forward action bars
    const actionBars = document.querySelectorAll('td.acX, div[role="list"] div[role="listitem"]');

    // Also look for the reply area at the bottom of email threads
    const replyBtns = document.querySelectorAll('[data-tooltip="Reply"], [aria-label="Reply"]');

    replyBtns.forEach((btn) => {
      const parent = btn.closest('td, div[class]');
      if (!parent || parent.querySelector('.viky-ai-reply-btn')) return;

      const aiBtn = document.createElement('button');
      aiBtn.className = 'viky-ai-reply-btn';
      aiBtn.innerHTML = `<img src="${ICON_16}" style="width:14px;height:14px;border-radius:3px;vertical-align:middle;margin-right:4px;">AI Reply`;
      aiBtn.style.cssText = `
        display: inline-flex; align-items: center;
        padding: 4px 12px;
        margin-left: 6px;
        background: rgba(0,255,157,0.1);
        border: 1px solid var(--accent-glow);
        border-radius: 16px;
        color: #00ff9d;
        font-size: 12px;
        font-weight: 600;
        font-family: 'Google Sans', 'Segoe UI', sans-serif;
        cursor: pointer;
        transition: all 0.2s;
        vertical-align: middle;
      `;

      aiBtn.addEventListener('mouseenter', () => {
        aiBtn.style.background = 'rgba(0,255,157,0.18)';
        aiBtn.style.borderColor = 'var(--accent-border)';
      });
      aiBtn.addEventListener('mouseleave', () => {
        aiBtn.style.background = 'rgba(0,255,157,0.1)';
        aiBtn.style.borderColor = 'var(--accent-glow)';
      });

      aiBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        handleAIReply(btn, aiBtn);
      });

      parent.appendChild(aiBtn);
    });
  }

  function handleAIReply(replyBtn, aiBtn) {
    // Click the original reply button first
    replyBtn.click();

    // Wait for reply composer to appear
    setTimeout(() => {
      // ===== Extract ONLY the LAST email in the thread (not the whole thread) =====
      // Gmail renders each message in its own .a3s container
      const allEmailBodies = document.querySelectorAll('.a3s.aiL, div[data-message-id] .a3s');
      let emailText = '';

      if (allEmailBodies.length > 0) {
        // Get the LAST (most recent) email body — the one just before the reply composer
        // In Gmail, the newest message in the thread is the last .a3s element
        const lastEmail = allEmailBodies[allEmailBodies.length - 1];
        emailText = lastEmail ? lastEmail.textContent.trim().slice(0, 2000) : '';
      }

      // Fallback: try the message closest to the AI Reply button
      if (!emailText) {
        const closestMsg = aiBtn.closest('[data-message-id], .gs') || aiBtn.closest('.h7');
        if (closestMsg) {
          const msgBody = closestMsg.querySelector('.a3s.aiL, .a3s');
          emailText = msgBody ? msgBody.textContent.trim().slice(0, 2000) : '';
        }
      }

      if (!emailText) {
        showGmailToast('Could not read email content');
        return;
      }

      // ===== Extract the sender's (user's) name for the sign-off =====
      let senderName = '';

      // Method 1: Get from Gmail's account switcher / profile name
      const profileName = document.querySelector('[data-name]');
      if (profileName) {
        senderName = profileName.getAttribute('data-name') || '';
      }

      // Method 2: Get from the "From" field in compose area
      if (!senderName) {
        const fromField = document.querySelector('.az9 .gL, [data-hovercard-id]');
        if (fromField) {
          senderName = fromField.textContent.trim().replace(/<.*>/, '').trim();
        }
      }

      // Method 3: Extract from the reply-to header area
      if (!senderName) {
        const replyTo = document.querySelector('.gb_A .gb_B, .gb_d');
        if (replyTo) senderName = replyTo.textContent.trim();
      }

      // Fallback
      if (!senderName) senderName = '[Your Name]';

      // ===== Extract the sender's (original email author's) name =====
      let originalSenderName = '';
      const senderEls = document.querySelectorAll('.gD, span[email]');
      if (senderEls.length > 0) {
        const lastSender = senderEls[senderEls.length - 1];
        originalSenderName = lastSender.getAttribute('name') || lastSender.textContent.trim();
      }

      // Find the compose area
      const composeArea = document.querySelector('div[aria-label="Message Body"][contenteditable="true"], div.Am.Al.editable[contenteditable="true"]');
      if (!composeArea) {
        showGmailToast('Reply composer not found');
        return;
      }

      composeArea.innerHTML = '<span style="color:#888;font-style:italic;">✦ Viky AI is drafting a reply...</span>';

      const prompt = `You are writing a professional email reply. Generate ONLY the reply body based on the LAST email received below.

STRICT FORMAT RULES:
1. Start with "Dear Sir/Ma'am," (or use "${originalSenderName}" if available, e.g. "Dear ${originalSenderName || 'Sir/Ma\'am'},")
2. Write a concise, professional, and relevant reply body that directly addresses the content of the email
3. End with:
   Thanks & Regards,
   ${senderName}

IMPORTANT:
- Reply ONLY to the content of this single email, NOT to any previous thread messages
- Do NOT include "Subject:", "Re:", "From:", or any email headers
- Do NOT add any explanations or meta-commentary
- Keep the tone professional but friendly
- Be concise and to the point

Last email received:
"${emailText}"`;

      streamAI(prompt, (full) => {
        composeArea.innerHTML = full.replace(/\n/g, '<br>');
      }, () => {
        // Done - user can edit before sending
      }, (err) => {
        if (err === 'CONTEXT_INVALIDATED') {
          composeArea.innerHTML = `<span style="color:#ff6b6b;">⚠ Extension was updated. Please <a href="javascript:void(0)" onclick="window.location.reload()" style="color:#00ff9d;text-decoration:underline;cursor:pointer;">refresh this page</a> and try again.</span>`;
        } else {
          composeArea.innerHTML = `<span style="color:#ff6b6b;">Error generating reply: ${err}</span>`;
        }
      });
    }, 1000);
  }

  function showGmailToast(msg) {
    const toast = document.createElement('div');
    toast.textContent = msg;
    toast.style.cssText = `
      position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
      background: #1a1a2e; color: #e2e8f0; padding: 10px 20px;
      border-radius: 8px; font-size: 13px; z-index: 999999;
      box-shadow: 0 4px 16px rgba(0,0,0,0.3);
      border: 1px solid rgba(0,255,157,0.2);
      animation: fadeIn 0.3s;
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }


  // ============================================================
  // ROUTE TO CORRECT FEATURE BASED ON HOST
  // ============================================================
  function detectAndInit() {
    const host = window.location.hostname;
    const path = window.location.pathname;

    // Google Search
    if ((host === 'www.google.com' || host.endsWith('.google.com')) && path === '/search') {
      initSearchAssistant();
    }

    // YouTube
    if (host === 'www.youtube.com' && path === '/watch') {
      initYouTubeAssistant();
    }

    // Gmail
    if (host === 'mail.google.com') {
      initGmailAssistant();
    }

    // Link Preview — runs on ALL sites
    initLinkPreview();
  }

  // Run after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', detectAndInit);
  } else {
    detectAndInit();
  }

  // YouTube SPA navigation handler
  if (window.location.hostname === 'www.youtube.com') {
    let lastUrl = location.href;
    const ytObserver = new MutationObserver(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        if (location.pathname === '/watch') {
          setTimeout(initYouTubeAssistant, 1000);
        }
      }
    });
    ytObserver.observe(document.body, { childList: true, subtree: true });
  }
})();
