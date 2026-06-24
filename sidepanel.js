// Viky AI - Premium Side Panel JavaScript

document.addEventListener('DOMContentLoaded', () => {
    // ===== DOM Elements =====
    const navIcons = document.querySelectorAll('.nav-icon');
    const panes = document.querySelectorAll('.tab-pane');
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    const chatMessages = document.getElementById('chat-messages');
    const imagePrompt = document.getElementById('image-prompt');
    const generateBtn = document.getElementById('generate-btn');
    const imageResult = document.getElementById('image-result');
    const imageActions = document.getElementById('image-actions');
    const downloadBtn = document.getElementById('download-btn');
    const copyImageBtn = document.getElementById('copy-image-btn');
    const googleLoginBtn = document.getElementById('google-login-btn');
    const welcomeScreen = document.getElementById('welcome-screen');
    const appLayout = document.getElementById('app-layout');
    const loginError = document.getElementById('login-error');
    const userEmailDisplay = document.getElementById('user-email');
    const logoutBtn = document.getElementById('logout-btn');
    const styleButtons = document.querySelectorAll('.style-btn');
    const toolCards = document.querySelectorAll('.tool-card');
    const showFloatingToggle = document.getElementById('show-floating-toggle');
    const defaultLanguageSelect = document.getElementById('default-language');
    const themeToggle = document.getElementById('theme-toggle');

    const clearChatBtn = document.getElementById('clear-chat-btn');
    const imageHistory = document.getElementById('image-history');
    const modelSelector = document.getElementById('model-selector');
    const saveSettingsBtn = document.getElementById('save-settings-btn');

    // Retractable sidebar
    const sidebarEl = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebar-toggle');

    // WhatsApp Enhancements Selectors
    const waPrivateToggle = document.getElementById('wa-private-mode-toggle');
    const waBlurNames = document.getElementById('wa-blur-names');
    const waBlurPhotos = document.getElementById('wa-blur-photos');
    const waBlurRecent = document.getElementById('wa-blur-recent');
    const waBlurConversation = document.getElementById('wa-blur-conversation');
    const waHideTyping = document.getElementById('wa-hide-typing');
    const waHideRecording = document.getElementById('wa-hide-recording');
    const waViewStatuses = document.getElementById('wa-view-statuses-privately');
    const waPlayAudio = document.getElementById('wa-play-audio-privately');
    const waDisableRead = document.getElementById('wa-disable-read-receipts');
    const waHideOnline = document.getElementById('wa-hide-online');
    const waRestoreDeleted = document.getElementById('wa-restore-deleted');

    const waCustomToggle = document.getElementById('wa-customizations-toggle');
    const waCustomBg = document.getElementById('wa-custom-background');
    const waBgUrl = document.getElementById('wa-background-url');
    const waBgUrlContainer = document.getElementById('wa-background-url-container');

    const waExtraToggle = document.getElementById('wa-extra-buttons-toggle');
    const waLikeBtn = document.getElementById('wa-like-button');
    const waMarkRead = document.getElementById('wa-mark-read-unread');
    const waTranscribeAudio = document.getElementById('wa-transcribe-audio');
    const waTranslateMsg = document.getElementById('wa-translate-message');
    const waDownloadStatus = document.getElementById('wa-download-status');
    const saveWaSettingsBtn = document.getElementById('save-wa-settings-btn');

    // Chat Popover Model Selectors
    const chatModelPill = document.getElementById('chat-model-pill');
    const chatModelPopover = document.getElementById('chat-model-popover');
    const chatModelPillIcon = document.getElementById('chat-model-pill-icon');
    const chatModelPillName = document.getElementById('chat-model-pill-name');
    const popoverItems = document.querySelectorAll('.popover-item');

    // New Settings Selectors
    const defaultImageStyleSelect = document.getElementById('default-image-style');
    const saveAiSettingsBtn = document.getElementById('save-ai-settings-btn');
    const blacklistInput = document.getElementById('blacklist-domain-input');
    const addBlacklistBtn = document.getElementById('add-blacklist-btn');
    const blacklistList = document.getElementById('blacklist-domain-list');
    const templateTitleInput = document.getElementById('template-title-input');
    const templateIconInput = document.getElementById('template-icon-input');
    const templatePromptInput = document.getElementById('template-prompt-input');
    const saveTemplateBtn = document.getElementById('save-template-btn');
    const customTemplatesList = document.getElementById('custom-templates-list');
    const highlightColorCustom = document.getElementById('highlight-color-custom');
    const colorPresetBtns = document.querySelectorAll('.color-preset-btn');

    let chatHistory = [];
    let selectedImageStyle = 'natural';
    let currentGeneratedImage = null;
    let generatedImages = [];
    let customTemplates = [];
    let blacklistDomains = [];
    let editingTemplateIndex = -1;

    // ===== Persistence helpers =====
    // Chat history, generated images, and transcriptions are persisted to chrome.storage.local
    // so they survive side-panel close/reopen (which destroys the JS context).
    // We cap each list to avoid blowing the 10MB QUOTA_BYTES limit.
    const CHAT_HISTORY_MAX = 200;
    const IMAGE_HISTORY_MAX = 10;
    const TRANSCRIBE_HISTORY_MAX = 20;
    let pendingChatSave = null;

    // ===== Storage schema versioning + migrations =====
    // Bump SCHEMA_VERSION when the shape of any persisted key changes. Add a migration
    // function below that upgrades old data to the new shape. Migrations run once on
    // side panel load and on extension install/update (via background.js onInstalled).
    const SCHEMA_VERSION = 1;
    const migrations = [
        // Example for future use:
        // {
        //   version: 2,
        //   description: 'Convert chatHistory items from {role,content} to {role,content,timestamp}',
        //   run: async () => {
        //     const { chatHistory } = await chrome.storage.local.get(['chatHistory']);
        //     if (!Array.isArray(chatHistory)) return;
        //     const migrated = chatHistory.map(m => m.timestamp ? m : { ...m, timestamp: Date.now() });
        //     await chrome.storage.local.set({ chatHistory: migrated });
        //   }
        // }
    ];

    async function runMigrations() {
        try {
            const { schemaVersion } = await chrome.storage.local.get(['schemaVersion']);
            const current = schemaVersion || 0;
            if (current >= SCHEMA_VERSION) return;
            console.log(`[Viky AI] Running storage migrations: v${current} → v${SCHEMA_VERSION}`);
            for (const m of migrations) {
                if (m.version > current && m.version <= SCHEMA_VERSION) {
                    console.log(`[Viky AI] Migration v${m.version}: ${m.description}`);
                    try {
                        await m.run();
                    } catch (err) {
                        console.error(`[Viky AI] Migration v${m.version} failed:`, err);
                    }
                }
            }
            await chrome.storage.local.set({ schemaVersion: SCHEMA_VERSION });
            console.log(`[Viky AI] Storage migrations complete — now at v${SCHEMA_VERSION}`);
        } catch (e) {
            console.warn('[Viky AI] Migration runner error:', e);
        }
    }

    function persistChatHistory() {
        // Debounce: collapse rapid pushes (e.g. streaming completion + meta update) into one write.
        if (pendingChatSave) clearTimeout(pendingChatSave);
        pendingChatSave = setTimeout(() => {
            const trimmed = chatHistory.slice(-CHAT_HISTORY_MAX);
            try {
                chrome.storage.local.set({ chatHistory: trimmed }, () => {
                    if (chrome.runtime.lastError) {
                        console.warn('[Viky AI] chatHistory save failed:', chrome.runtime.lastError.message);
                    }
                });
            } catch (e) { console.warn('[Viky AI] chatHistory save error:', e); }
        }, 300);
    }

    function persistImageHistory() {
        const trimmed = generatedImages.slice(-IMAGE_HISTORY_MAX);
        try {
            chrome.storage.local.set({ generatedImages: trimmed }, () => {
                if (chrome.runtime.lastError) console.warn('[Viky AI] generatedImages save failed:', chrome.runtime.lastError.message);
            });
        } catch (e) { console.warn('[Viky AI] generatedImages save error:', e); }
    }

    function persistTranscribeHistory() {
        const trimmed = transcribeSessionHistory.slice(0, TRANSCRIBE_HISTORY_MAX);
        try {
            chrome.storage.local.set({ transcribeSessionHistory: trimmed }, () => {
                if (chrome.runtime.lastError) console.warn('[Viky AI] transcribeSessionHistory save failed:', chrome.runtime.lastError.message);
            });
        } catch (e) { console.warn('[Viky AI] transcribeSessionHistory save error:', e); }
    }

    function loadPersistedState() {
        return new Promise((resolve) => {
            chrome.storage.local.get(['chatHistory', 'generatedImages', 'transcribeSessionHistory'], (result) => {
                if (Array.isArray(result.chatHistory) && result.chatHistory.length > 0) {
                    chatHistory = result.chatHistory;
                    // Re-render each persisted message into the DOM (without re-pushing to chatHistory).
                    chatHistory.forEach(item => {
                        const welcome = chatMessages.querySelector('.welcome-block');
                        if (welcome) welcome.remove();
                        const msgDiv = document.createElement('div');
                        msgDiv.className = `message ${item.role}`;
                        const avatarSvg = item.role === 'user'
                            ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`
                            : `<img class="avatar-img" src="icons/logo_cute_neon.png" alt="AI">`;
                        const content = item.role === 'user' ? escapeHtml(item.content) : formatMessage(item.content);
                        msgDiv.innerHTML = `
                            <div class="message-avatar">${avatarSvg}</div>
                            <div class="message-content">${content}</div>
                        `;
                        if (item.role === 'ai') {
                            const meta = document.createElement('div');
                            meta.className = 'message-meta';
                            meta.innerHTML = `
                                <div class="msg-actions">
                                    <button class="msg-action-btn copy-msg" title="Copy response">Copy</button>
                                    <button class="msg-action-btn regen-msg" title="Regenerate">Regenerate</button>
                                </div>
                            `;
                            msgDiv.querySelector('.message-content').appendChild(meta);
                        }
                        chatMessages.appendChild(msgDiv);
                    });
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                }
                if (Array.isArray(result.generatedImages) && result.generatedImages.length > 0) {
                    generatedImages = result.generatedImages;
                    renderImageHistory();
                }
                if (Array.isArray(result.transcribeSessionHistory) && result.transcribeSessionHistory.length > 0) {
                    transcribeSessionHistory = result.transcribeSessionHistory;
                    renderTranscribeHistory();
                }
                resolve();
            });
        });
    }

    // ===== Tab Navigation =====
    navIcons.forEach(icon => {
        icon.addEventListener('click', () => {
            navIcons.forEach(i => i.classList.remove('active'));
            panes.forEach(p => p.classList.remove('active'));
            icon.classList.add('active');
            document.getElementById(icon.dataset.tab).classList.add('active');
        });
    });

    // ===== Retractable Sidebar (hamburger toggle) =====
    function applySidebarState(collapsed) {
        if (!sidebarEl) return;
        sidebarEl.dataset.collapsed = collapsed ? 'true' : 'false';
        if (sidebarToggle) {
            sidebarToggle.setAttribute('aria-label', collapsed ? 'Expand sidebar' : 'Collapse sidebar');
            sidebarToggle.title = collapsed ? 'Expand sidebar' : 'Collapse sidebar';
        }
    }

    if (sidebarToggle && sidebarEl) {
        sidebarToggle.addEventListener('click', () => {
            const isCollapsed = sidebarEl.dataset.collapsed === 'true';
            applySidebarState(!isCollapsed);
            chrome.storage.local.set({ sidebarCollapsed: !isCollapsed });
        });
    }

    // Restore sidebar collapsed state on load.
    // At narrow viewports (<500px, typical Chrome sidepanel), always collapse.
    // At wider viewports, respect the saved preference.
    chrome.storage.local.get(['sidebarCollapsed'], (res) => {
        const isNarrow = window.innerWidth < 500;
        if (isNarrow) {
            applySidebarState(true);
        } else if (res.sidebarCollapsed === true) {
            applySidebarState(true);
        } else {
            // Wide viewport and no explicit collapse pref: expand sidebar
            applySidebarState(false);
        }
    });

    // ===== Auto-resize Chat Input =====
    chatInput.addEventListener('input', function () {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 100) + 'px';
    });

    // ===== Message Utilities =====
    function appendMessage(text, type) {
        const welcome = chatMessages.querySelector('.welcome-block');
        if (welcome && type === 'user') welcome.remove();

        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${type}`;

        const avatarSvg = type === 'user'
            ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`
            : `<img class="avatar-img" src="icons/logo_cute_neon.png" alt="AI">`;

        const content = type === 'user' ? escapeHtml(text) : formatMessage(text);
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        msgDiv.innerHTML = `
            <div class="message-avatar">${avatarSvg}</div>
            <div class="message-content">${content}</div>
        `;

        if (type === 'ai') {
            const meta = document.createElement('div');
            meta.className = 'message-meta';
            meta.innerHTML = `
                <span class="timestamp">${time}</span>
                <div class="msg-actions">
                    <button class="msg-action-btn copy-msg" title="Copy response">Copy</button>
                    <button class="msg-action-btn regen-msg" title="Regenerate">Regenerate</button>
                </div>
            `;
            msgDiv.querySelector('.message-content').appendChild(meta);
        }

        chatMessages.appendChild(msgDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        if (type !== 'loading') {
            chatHistory.push({ role: type, content: text });
            persistChatHistory();
        }
        return msgDiv;
    }

    function appendStreamingMessage() {
        const welcome = chatMessages.querySelector('.welcome-block');
        if (welcome) welcome.remove();

        const msgDiv = document.createElement('div');
        msgDiv.className = 'message ai streaming';
        msgDiv.id = 'streaming-message';

        const avatarSvg = `<img class="avatar-img" src="icons/logo_cute_neon.png" alt="AI">`;

        msgDiv.innerHTML = `
            <div class="message-avatar">${avatarSvg}</div>
            <div class="message-content"></div>
        `;

        chatMessages.appendChild(msgDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        return msgDiv;
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function formatMessage(text) {
        const codeBlocks = [];
        const codeRegex = /```(\w*)\n?([\s\S]*?)```/g;
        let cleaned = text.replace(codeRegex, (match, lang, code) => {
            codeBlocks.push({ lang, code });
            return `__CODEBLOCK_${codeBlocks.length - 1}__`;
        });

        cleaned = escapeHtml(cleaned);
        cleaned = cleaned.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        cleaned = cleaned.replace(/\*(.*?)\*/g, '<em>$1</em>');
        cleaned = cleaned.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

        codeBlocks.forEach((block, i) => {
            const placeholder = `__CODEBLOCK_${i}__`;
            const encoded = encodeURIComponent(block.code);
            const blockHtml = `<div class="code-block"><div class="code-header"><span>${block.lang || 'code'}</span><button class="code-copy-btn" data-code="${encoded}">Copy</button></div><pre><code>${escapeHtml(block.code)}</code></pre></div>`;
            cleaned = cleaned.replace(placeholder, blockHtml);
        });

        cleaned = cleaned.replace(/\n/g, '<br>');
        return cleaned;
    }

    // Delegated actions for messages
    chatMessages.addEventListener('click', (e) => {
        const copyBtn = e.target.closest('.copy-msg');
        if (copyBtn) {
            const msgDiv = copyBtn.closest('.message');
            const clone = msgDiv.querySelector('.message-content').cloneNode(true);
            clone.querySelector('.message-meta')?.remove();
            const plain = clone.innerText;
            navigator.clipboard.writeText(plain).then(() => {
                copyBtn.textContent = 'Copied!';
                setTimeout(() => copyBtn.textContent = 'Copy', 1500);
            });
            return;
        }

        const regenBtn = e.target.closest('.regen-msg');
        if (regenBtn) {
            const aiMsg = regenBtn.closest('.message');
            let prev = aiMsg.previousElementSibling;
            while (prev) {
                if (prev.classList.contains('user')) break;
                prev = prev.previousElementSibling;
            }
            if (!prev) return;

            const rawUserText = chatHistory.findLast(m => m.role === 'user')?.content;
            if (!rawUserText) return;

            let removeNext = false;
            Array.from(chatMessages.children).forEach(child => {
                if (removeNext) child.remove();
                if (child === aiMsg) removeNext = true;
            });

            const aiIndex = chatHistory.findLastIndex(m => m.role === 'ai');
            if (aiIndex > -1) chatHistory = chatHistory.slice(0, aiIndex);

            sendChatWithText(rawUserText);
            return;
        }

        const codeCopy = e.target.closest('.code-copy-btn');
        if (codeCopy) {
            const code = decodeURIComponent(codeCopy.dataset.code);
            navigator.clipboard.writeText(code).then(() => {
                codeCopy.textContent = 'Copied!';
                setTimeout(() => codeCopy.textContent = 'Copy', 1500);
            });
        }
    });

    async function sendChat() {
        const text = chatInput.value.trim();
        if (!text) return;
        await sendChatWithText(text);
    }

    async function sendChatWithText(text) {
        appendMessage(text, 'user');
        chatInput.value = '';
        chatInput.style.height = 'auto';

        // Show loading state initially
        const loadingMsg = document.createElement('div');
        loadingMsg.className = 'message ai loading';
        loadingMsg.id = 'loading-message';
        loadingMsg.innerHTML = `
            <div class="message-avatar"><img class="avatar-img" src="icons/logo_cute_neon.png" alt="AI"></div>
            <div class="message-content"><span class="typing-indicator"><span></span><span></span><span></span></span></div>
        `;
        chatMessages.appendChild(loadingMsg);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        // Use streaming port
        const port = chrome.runtime.connect({ name: 'viky-stream' });
        let streamingDiv = null;
        let fullText = '';
        let hasStarted = false;
        let streamFinalized = false;

        // rAF-coalesced rendering: instead of calling formatMessage on every chunk (which
        // causes ~2000 innerHTML reflows for a 2000-token response), we accumulate text
        // and run formatMessage at most once per animation frame.
        let pendingRender = false;
        let pendingText = '';
        const scheduleRender = () => {
            if (pendingRender || !streamingDiv) return;
            pendingRender = true;
            requestAnimationFrame(() => {
                pendingRender = false;
                try {
                    const contentDiv = streamingDiv.querySelector('.message-content');
                    if (contentDiv) {
                        contentDiv.innerHTML = formatMessage(pendingText);
                        chatMessages.scrollTop = chatMessages.scrollHeight;
                    }
                } catch (e) { /* streaming div may have been removed */ }
            });
        };

        const finalizeStream = () => {
            if (streamFinalized) return;
            streamFinalized = true;
            if (streamingDiv) {
                // Final flush of pending text in case rAF hadn't fired yet
                if (pendingRender) {
                    // Cancel pending render and run final render synchronously
                    pendingRender = false;
                }
                try {
                    const contentDiv = streamingDiv.querySelector('.message-content');
                    if (contentDiv) contentDiv.innerHTML = formatMessage(fullText);
                } catch (e) {}

                streamingDiv.id = '';
                streamingDiv.classList.remove('streaming');
                const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const meta = document.createElement('div');
                meta.className = 'message-meta';
                meta.innerHTML = `
                    <span class="timestamp">${time}</span>
                    <div class="msg-actions">
                        <button class="msg-action-btn copy-msg" title="Copy response">Copy</button>
                        <button class="msg-action-btn regen-msg" title="Regenerate">Regenerate</button>
                    </div>
                `;
                streamingDiv.querySelector('.message-content').appendChild(meta);
                chatHistory.push({ role: 'ai', content: fullText });
                persistChatHistory();
            } else {
                // No chunks received (cached or error) - remove loading and show error
                const el = document.getElementById('loading-message');
                if (el) el.remove();
            }
        };

        port.onMessage.addListener((response) => {
            if (!hasStarted && response.chunk) {
                // First chunk: remove loading, start streaming div
                const el = document.getElementById('loading-message');
                if (el) el.remove();
                streamingDiv = appendStreamingMessage();
                hasStarted = true;
            }

            if (response.chunk && streamingDiv) {
                fullText += response.chunk;
                pendingText = fullText;
                scheduleRender();
            }

            if (response.done) {
                finalizeStream();
                try { port.disconnect(); } catch (e) {}
            }

            if (response.error && !hasStarted) {
                const el = document.getElementById('loading-message');
                if (el) el.remove();
                appendMessage(`Error: ${response.error}`, 'ai');
                try { port.disconnect(); } catch (e) {}
            }
        });

        // When the SW dies mid-stream (side panel was open but SW got killed by Chrome after 30s
        // idle, or the user closed+reopened the panel), the port disconnects. Without this handler
        // the user would see a half-finished AI message with no copy/regenerate buttons and no
        // indication that the stream died. We finalize the partial message so it shows up as a
        // real (incomplete) AI message with full meta.
        port.onDisconnect.addListener(() => {
            if (streamFinalized) return;
            if (hasStarted) {
                // SW died mid-stream — finalize what we have
                finalizeStream();
                // Append a small "stream interrupted" notice to the streaming div
                if (streamingDiv) {
                    const notice = document.createElement('div');
                    notice.className = 'stream-interrupted-notice';
                    notice.style.cssText = 'font-size:11px;color:#fca5a5;margin-top:4px;font-style:italic;';
                    notice.textContent = '⚠ Stream interrupted — message may be incomplete.';
                    streamingDiv.querySelector('.message-content')?.appendChild(notice);
                }
            } else {
                // SW died before any chunk arrived — show a recoverable error
                const el = document.getElementById('loading-message');
                if (el) el.remove();
                appendMessage('Connection lost. Please try again.', 'ai');
            }
        });

        chrome.storage.local.get(['selectedModel'], (result) => {
            const activeModel = result.selectedModel || 'meta-llama/llama-3.3-70b-instruct:free';
            port.postMessage({
                action: 'CHAT_MESSAGE',
                message: text,
                history: chatHistory.slice(0, -1),
                stream: true,
                model: activeModel
            });
        });
    }

    sendBtn.addEventListener('click', sendChat);
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendChat();
        }
    });

    const WELCOME_TEMPLATE = `
        <div class="welcome-block">
          <div class="welcome-greeting">
            <h1>Hi<span class="welcome-comma">,</span></h1>
            <p>How can I assist you today?</p>
          </div>
          <div class="quick-actions">
            <button class="quick-action" data-quick-tab="chat">
              <div class="quick-action-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              </div>
              <span class="quick-action-label">Chat</span>
              <span class="quick-action-desc">Open conversation</span>
            </button>
            <button class="quick-action" data-quick-tab="image">
              <div class="quick-action-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              </div>
              <span class="quick-action-label">Image Studio</span>
              <span class="quick-action-desc">Generate visuals</span>
            </button>
            <button class="quick-action" data-quick-tab="tools">
              <div class="quick-action-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              </div>
              <span class="quick-action-label">Writing Tools</span>
              <span class="quick-action-desc">Improve any text</span>
            </button>
            <button class="quick-action" data-quick-tab="templates">
              <div class="quick-action-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="3" y1="9" x2="21" y2="9"/></svg>
              </div>
              <span class="quick-action-label">Templates</span>
              <span class="quick-action-desc">One-click starters</span>
            </button>
          </div>
        </div>`;

    function applyWelcomeRipple(btn, e) {
        const rect = btn.getBoundingClientRect();
        btn.style.setProperty('--qa-rx', ((e.clientX - rect.left) / rect.width * 100) + '%');
        btn.style.setProperty('--qa-ry', ((e.clientY - rect.top) / rect.height * 100) + '%');
        btn.classList.remove('is-clicked');
        void btn.offsetWidth;
        btn.classList.add('is-clicked');
        setTimeout(() => btn.classList.remove('is-clicked'), 500);
    }

    function switchToTab(tabName) {
        const navIcon = document.querySelector(`.nav-icon[data-tab="${tabName}"]`);
        const pane = document.getElementById(tabName);
        if (!navIcon || !pane) return;
        navIcons.forEach(i => i.classList.remove('active'));
        panes.forEach(p => p.classList.remove('active'));
        navIcon.classList.add('active');
        pane.classList.add('active');
    }

    function bindQuickActions() {
        document.querySelectorAll('.quick-action').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = btn.dataset.quickTab;
                if (!tab) return;
                applyWelcomeRipple(btn, e);
                switchToTab(tab);
            });
        });
    }

    clearChatBtn.addEventListener('click', () => {
        chatHistory = [];
        // Clear persisted chat history too — otherwise the cleared chat reappears on next reopen.
        try {
            chrome.storage.local.remove(['chatHistory'], () => {
                if (chrome.runtime.lastError) console.warn('[Viky AI] chatHistory clear failed:', chrome.runtime.lastError.message);
            });
        } catch (e) { /* ignore */ }
        if (pendingChatSave) { clearTimeout(pendingChatSave); pendingChatSave = null; }
        chatMessages.innerHTML = WELCOME_TEMPLATE;
        bindQuickActions();
    });

    bindQuickActions();

    // Welcome pills removed in redesign; quick-actions now handled by bindQuickActions().

    // ===== Dynamic Templates =====
    const DEFAULT_TEMPLATES = [
        {
            title: "Professional Email",
            desc: "Formal business communication",
            icon: "✉️",
            prompt: "Write a professional, concise email about the following topic:"
        },
        {
            title: "Social Media Post",
            desc: "Catchy captions & hooks",
            icon: "💬",
            prompt: "Create an engaging social media post for the following idea:"
        },
        {
            title: "Blog Outline",
            desc: "Structured long-form content",
            icon: "📄",
            prompt: "Draft a blog article outline with headings and key points for the topic:"
        },
        {
            title: "Creative Story",
            desc: "Narrative & fiction",
            icon: "📜",
            prompt: "Write a short creative story based on the following prompt:"
        },
        {
            title: "Simple Explainer",
            desc: "Easy-to-understand breakdown",
            icon: "💡",
            prompt: "Explain the following concept in very simple terms as if to a beginner:"
        },
        {
            title: "Meeting Notes",
            desc: "Actions & decisions",
            icon: "📋",
            prompt: "Summarize meeting notes into clear action items and decisions:"
        },
        {
            title: "Resume Summary",
            desc: "Professional highlights",
            icon: "💼",
            prompt: "Write a compelling resume summary highlighting the following achievements:"
        },
        {
            title: "Academic Essay",
            desc: "Structured scholarly writing",
            icon: "🎓",
            prompt: "Help me structure an academic essay with introduction, body, and conclusion on the topic:"
        }
    ];

    function renderTemplates() {
        const templatesGrid = document.querySelector('.templates-grid');
        if (!templatesGrid) return;
        templatesGrid.innerHTML = '';
        
        const allTemplates = [...DEFAULT_TEMPLATES, ...customTemplates];
        
        allTemplates.forEach((template, index) => {
            const isCustom = index >= DEFAULT_TEMPLATES.length;
            
            const card = document.createElement('button');
            card.className = 'template-card';
            card.dataset.prompt = template.prompt;
            
            card.innerHTML = `
                <div class="template-icon">${escapeHtml(template.icon || '📝')}</div>
                <span class="template-title" style="display: flex; align-items: center; justify-content: space-between; width: 100%; gap: 4px;">
                    <span>${escapeHtml(template.title)}</span>
                    ${isCustom ? '<span class="template-badge">Custom</span>' : ''}
                </span>
                <span class="template-desc">${escapeHtml(template.desc || 'Custom template')}</span>
            `;
            templatesGrid.appendChild(card);
        });
    }

    const templatesGrid = document.querySelector('.templates-grid');
    if (templatesGrid) {
        templatesGrid.addEventListener('click', (e) => {
            const card = e.target.closest('.template-card');
            if (card) {
                const prompt = card.dataset.prompt;
                chatInput.value = prompt;
                chatInput.style.height = 'auto';
                chatInput.style.height = Math.min(chatInput.scrollHeight, 100) + 'px';
                navIcons.forEach(i => i.classList.remove('active'));
                panes.forEach(p => p.classList.remove('active'));
                document.querySelector('[data-tab="chat"]').classList.add('active');
                document.getElementById('chat').classList.add('active');
                chatInput.focus();
            }
        });
    }

    // ===== Image Generation =====
    styleButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            styleButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedImageStyle = btn.dataset.style;
        });
    });

    async function generateImage() {
        const prompt = imagePrompt.value.trim();
        if (!prompt) return;
        generateBtn.disabled = true;
        generateBtn.innerHTML = `<div class="loading-spinner" style="width:14px;height:14px;border-width:2px;"></div> Creating...`;
        imageResult.innerHTML = `<div class="placeholder-content"><div class="loading-spinner"></div><p>Creating your image...</p></div>`;

        try {
            const response = await chrome.runtime.sendMessage({
                action: 'GENERATE_IMAGE',
                prompt: prompt,
                style: selectedImageStyle
            });
            if (response && response.success) {
                currentGeneratedImage = response.data;
                generatedImages.push({ src: response.data, prompt: prompt });
                persistImageHistory();
                renderImageHistory();
                imageResult.innerHTML = `<img src="${response.data}" alt="${escapeHtml(prompt)}">`;
                imageResult.classList.add('has-image');
                imageActions.classList.remove('hidden');
            } else {
                imageResult.innerHTML = `<div class="placeholder-content" style="color:#fca5a5;"><p>${response.error || 'Failed'}</p></div>`;
            }
        } catch (err) {
            imageResult.innerHTML = `<div class="placeholder-content" style="color:#fca5a5;"><p>${err.message}</p></div>`;
        } finally {
            generateBtn.disabled = false;
            generateBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> Generate`;
        }
    }

    function renderImageHistory() {
        imageHistory.innerHTML = '';
        generatedImages.forEach((img) => {
            const thumb = document.createElement('img');
            thumb.className = 'history-thumb';
            thumb.src = img.src;
            thumb.title = img.prompt;
            thumb.addEventListener('click', () => {
                currentGeneratedImage = img.src;
                imageResult.innerHTML = `<img src="${img.src}" alt="${escapeHtml(img.prompt)}">`;
                imageResult.classList.add('has-image');
                imageActions.classList.remove('hidden');
            });
            imageHistory.appendChild(thumb);
        });
    }

    generateBtn.addEventListener('click', generateImage);

    // ===== Image Actions =====
    downloadBtn.addEventListener('click', () => {
        if (currentGeneratedImage) {
            const link = document.createElement('a');
            link.href = currentGeneratedImage;
            link.download = 'viky-ai-image.png';
            link.click();
        }
    });

    copyImageBtn.addEventListener('click', async () => {
        if (currentGeneratedImage) {
            try {
                const res = await fetch(currentGeneratedImage);
                const blob = await res.blob();
                await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
                copyImageBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Copied!`;
                setTimeout(() => {
                    copyImageBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy`;
                }, 2000);
            } catch (err) {
                console.error('Copy failed:', err);
            }
        }
    });

    // ===== Tool Cards =====
    toolCards.forEach(card => {
        card.addEventListener('click', (e) => {
            const action = card.dataset.action;
            const lang = card.dataset.lang;

            // Micro-interaction: ripple from the click point.
            const rect = card.getBoundingClientRect();
            card.style.setProperty('--ripple-x', ((e.clientX - rect.left) / rect.width * 100) + '%');
            card.style.setProperty('--ripple-y', ((e.clientY - rect.top) / rect.height * 100) + '%');
            card.classList.remove('is-clicked');
            // Force reflow so re-adding the class re-triggers the transition.
            void card.offsetWidth;
            card.classList.add('is-clicked');
            setTimeout(() => card.classList.remove('is-clicked'), 500);

            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0]) {
                    chrome.tabs.sendMessage(tabs[0].id, {
                        action: 'PERFORM_ACTION',
                        toolAction: action,
                        lang: lang
                    });
                }
            });
        });
    });

    // ===== Settings & Theme =====
    function applyTheme(isDark) {
        if (isDark) {
            document.documentElement.classList.remove('theme-light');
            themeToggle.checked = true;
        } else {
            document.documentElement.classList.add('theme-light');
            themeToggle.checked = false;
        }
    }

    function toggleOptionGroup(mainToggleId, optionsContainerId) {
        const mainToggle = document.getElementById(mainToggleId);
        const optionsContainer = document.getElementById(optionsContainerId);
        if (mainToggle && optionsContainer) {
            optionsContainer.classList.toggle('disabled', !mainToggle.checked);
        }
    }

    const waKeys = [
        'wa_private_mode_enabled', 'wa_blur_names', 'wa_blur_photos', 'wa_blur_recent', 'wa_blur_conversation',
        'wa_hide_typing', 'wa_hide_recording', 'wa_view_statuses_privately', 'wa_play_audio_privately', 
        'wa_disable_read_receipts', 'wa_hide_online', 'wa_restore_deleted',
        'wa_customizations_enabled', 'wa_custom_background', 'wa_custom_background_url',
        'wa_extra_buttons_enabled', 'wa_like_button', 'wa_mark_read_unread', 'wa_transcribe_audio',
        'wa_translate_message', 'wa_download_status'
    ];

    // Web Assistant settings keys
    const webAssistantKeys = [
        'wa_search_enabled', 'wa_search_trigger',
        'wa_youtube_enabled', 'wa_linkpreview_enabled', 'wa_email_enabled'
    ];

    // Web Assistant toggle elements
    const waSearchToggle = document.getElementById('wa-search-toggle');
    const waYoutubeToggle = document.getElementById('wa-youtube-toggle');
    const waLinkPreviewToggle = document.getElementById('wa-linkpreview-toggle');
    const waEmailToggle = document.getElementById('wa-email-toggle');
    const waSearchTriggerGroup = document.getElementById('wa-search-trigger-group');

    // ===== Settings Sub-Navigation =====
    const settingsSubtabs = document.querySelectorAll('.settings-subtab');
    const settingsSubpanes = document.querySelectorAll('.settings-subpane');

    settingsSubtabs.forEach(subtab => {
        subtab.addEventListener('click', () => {
            settingsSubtabs.forEach(tab => tab.classList.remove('active'));
            settingsSubpanes.forEach(pane => pane.classList.remove('active'));

            subtab.classList.add('active');
            const targetPaneId = `settings-${subtab.dataset.settingsSubtab}`;
            const targetPane = document.getElementById(targetPaneId);
            if (targetPane) {
                targetPane.classList.add('active');
            }
        });
    });

    // ===== Domain Blacklist Manager Logic =====
    function extractDomain(inputVal) {
        let cleanVal = inputVal.trim();
        if (!cleanVal) return null;
        
        if (cleanVal.startsWith('http://') || cleanVal.startsWith('https://') || cleanVal.startsWith('//')) {
            try {
                const urlToParse = cleanVal.startsWith('//') ? 'http:' + cleanVal : cleanVal;
                const url = new URL(urlToParse);
                cleanVal = url.hostname;
            } catch (e) {
                cleanVal = cleanVal.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
            }
        } else {
            cleanVal = cleanVal.split('/')[0];
            cleanVal = cleanVal.replace(/^www\./i, '');
        }
        
        cleanVal = cleanVal.toLowerCase();
        
        const domainRegex = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,20}$/;
        const isLocalhost = cleanVal === 'localhost';
        const ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
        
        if (domainRegex.test(cleanVal) || isLocalhost || ipRegex.test(cleanVal)) {
            return cleanVal;
        }
        
        return null;
    }

    function renderBlacklist(domains) {
        if (!blacklistList) return;
        blacklistList.innerHTML = '';
        if (domains.length === 0) {
            blacklistList.innerHTML = '<div class="empty-blacklist hint" style="padding: 10px 0;">No domains blacklisted.</div>';
            return;
        }
        domains.forEach((domain, index) => {
            const item = document.createElement('div');
            item.className = 'blacklist-item';
            item.innerHTML = `
                <span class="blacklist-item-domain">${escapeHtml(domain)}</span>
                <button class="delete-domain-btn" data-index="${index}" title="Remove from blacklist">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
            `;
            blacklistList.appendChild(item);
        });
    }

    if (addBlacklistBtn && blacklistInput) {
        addBlacklistBtn.addEventListener('click', () => {
            const rawInput = blacklistInput.value;
            const domain = extractDomain(rawInput);
            
            if (!domain) {
                alert('Please enter a valid domain name (e.g. wikipedia.org).');
                return;
            }
            
            if (blacklistDomains.includes(domain)) {
                alert('This domain is already blacklisted.');
                return;
            }
            
            blacklistDomains.push(domain);
            chrome.storage.local.set({ floatingButtonBlacklist: blacklistDomains }, () => {
                renderBlacklist(blacklistDomains);
                blacklistInput.value = '';
            });
        });
    }

    if (blacklistList) {
        blacklistList.addEventListener('click', (e) => {
            const deleteBtn = e.target.closest('.delete-domain-btn');
            if (deleteBtn) {
                const index = parseInt(deleteBtn.dataset.index, 10);
                if (!isNaN(index) && index >= 0 && index < blacklistDomains.length) {
                    blacklistDomains.splice(index, 1);
                    chrome.storage.local.set({ floatingButtonBlacklist: blacklistDomains }, () => {
                        renderBlacklist(blacklistDomains);
                    });
                }
            }
        });
    }

    // ===== Custom Templates CRUD Logic =====
    function renderCustomTemplatesSettings() {
        if (!customTemplatesList) return;
        customTemplatesList.innerHTML = '';
        
        if (customTemplates.length === 0) {
            customTemplatesList.innerHTML = '<div class="empty-blacklist hint" style="padding: 10px 0;">No custom templates created yet.</div>';
            return;
        }
        
        customTemplates.forEach((template, index) => {
            const item = document.createElement('div');
            item.className = 'custom-template-item';
            item.innerHTML = `
                <div class="custom-template-item-info">
                    <div class="custom-template-item-icon">${escapeHtml(template.icon || '📝')}</div>
                    <div class="custom-template-item-details">
                        <div class="custom-template-item-title">${escapeHtml(template.title)}</div>
                        <div class="custom-template-item-prompt">${escapeHtml(template.prompt)}</div>
                    </div>
                </div>
                <div class="custom-template-item-actions">
                    <button class="template-action-btn edit" data-index="${index}" title="Edit Template">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button class="template-action-btn delete" data-index="${index}" title="Delete Template">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                </div>
            `;
            customTemplatesList.appendChild(item);
        });
    }

    function resetTemplateForm() {
        if (templateTitleInput) templateTitleInput.value = '';
        if (templateIconInput) templateIconInput.value = '';
        if (templatePromptInput) templatePromptInput.value = '';
        editingTemplateIndex = -1;
        if (saveTemplateBtn) {
            saveTemplateBtn.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Add Template
            `;
        }
    }

    if (saveTemplateBtn) {
        saveTemplateBtn.addEventListener('click', () => {
            const title = templateTitleInput.value.trim();
            const icon = templateIconInput.value.trim() || '📝';
            const prompt = templatePromptInput.value.trim();
            
            if (!title) {
                alert('Please enter a template title.');
                return;
            }
            if (!prompt) {
                alert('Please enter a prompt starter.');
                return;
            }
            
            const templateObj = {
                title,
                icon,
                prompt,
                desc: 'Custom template'
            };
            
            if (editingTemplateIndex === -1) {
                customTemplates.push(templateObj);
            } else {
                customTemplates[editingTemplateIndex] = templateObj;
            }
            
            chrome.storage.local.set({ customTemplates: customTemplates }, () => {
                renderTemplates();
                renderCustomTemplatesSettings();
                resetTemplateForm();
            });
        });
    }

    if (customTemplatesList) {
        customTemplatesList.addEventListener('click', (e) => {
            const editBtn = e.target.closest('.template-action-btn.edit');
            const deleteBtn = e.target.closest('.template-action-btn.delete');
            
            if (editBtn) {
                const index = parseInt(editBtn.dataset.index, 10);
                if (!isNaN(index) && index >= 0 && index < customTemplates.length) {
                    const template = customTemplates[index];
                    templateTitleInput.value = template.title;
                    templateIconInput.value = template.icon;
                    templatePromptInput.value = template.prompt;
                    editingTemplateIndex = index;
                    
                    saveTemplateBtn.innerHTML = `
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                        Update Template
                    `;
                    templateTitleInput.focus();
                }
            }
            
            if (deleteBtn) {
                const index = parseInt(deleteBtn.dataset.index, 10);
                if (!isNaN(index) && index >= 0 && index < customTemplates.length) {
                    if (confirm('Are you sure you want to delete this custom template?')) {
                        customTemplates.splice(index, 1);
                        if (editingTemplateIndex === index) {
                            resetTemplateForm();
                        } else if (editingTemplateIndex > index) {
                            editingTemplateIndex--;
                        }
                        
                        chrome.storage.local.set({ customTemplates: customTemplates }, () => {
                            renderTemplates();
                            renderCustomTemplatesSettings();
                        });
                    }
                }
            }
        });
    }



    chrome.storage.local.get(['showFloatingButton', 'defaultLanguage', 'theme', 'spellCheckEnabled', 'selectedModel', 'defaultImageStyle', 'floatingButtonBlacklist', 'customTemplates', 'highlightColor', ...waKeys, ...webAssistantKeys], (result) => {
        if (result.showFloatingButton !== undefined) showFloatingToggle.checked = result.showFloatingButton;
        if (result.defaultLanguage) defaultLanguageSelect.value = result.defaultLanguage;

        const isDark = result.theme !== 'light';
        applyTheme(isDark);
        
        const savedHighlightColor = result.highlightColor || '#facc15';
        if (highlightColorCustom) highlightColorCustom.value = savedHighlightColor;
        updateColorPresetVisuals(savedHighlightColor);

        const savedModel = result.selectedModel || 'meta-llama/llama-3.3-70b-instruct:free';
        if (modelSelector) modelSelector.value = savedModel;
        updateChatModelVisuals(savedModel);

        // Load Default Image Style
        const savedStyle = result.defaultImageStyle || 'natural';
        if (defaultImageStyleSelect) defaultImageStyleSelect.value = savedStyle;
        selectedImageStyle = savedStyle;
        
        // Sync Image Studio buttons active state
        styleButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.style === selectedImageStyle);
        });

        // Load Blacklist
        blacklistDomains = result.floatingButtonBlacklist || [];
        renderBlacklist(blacklistDomains);

        // Load Custom Templates
        customTemplates = result.customTemplates || [];
        renderTemplates();
        renderCustomTemplatesSettings();

        // Load WhatsApp Settings
        if (waPrivateToggle) waPrivateToggle.checked = !!result.wa_private_mode_enabled;
        if (waBlurNames) waBlurNames.checked = !!result.wa_blur_names;
        if (waBlurPhotos) waBlurPhotos.checked = !!result.wa_blur_photos;
        if (waBlurRecent) waBlurRecent.checked = !!result.wa_blur_recent;
        if (waBlurConversation) waBlurConversation.checked = !!result.wa_blur_conversation;
        if (waHideTyping) waHideTyping.checked = !!result.wa_hide_typing;
        if (waHideRecording) waHideRecording.checked = !!result.wa_hide_recording;
        if (waViewStatuses) waViewStatuses.checked = !!result.wa_view_statuses_privately;
        if (waPlayAudio) waPlayAudio.checked = !!result.wa_play_audio_privately;
        if (waDisableRead) waDisableRead.checked = !!result.wa_disable_read_receipts;
        if (waHideOnline) waHideOnline.checked = !!result.wa_hide_online;
        if (waRestoreDeleted) waRestoreDeleted.checked = !!result.wa_restore_deleted;

        if (waCustomToggle) waCustomToggle.checked = !!result.wa_customizations_enabled;
        if (waCustomBg) waCustomBg.checked = !!result.wa_custom_background;
        if (waBgUrl) waBgUrl.value = result.wa_custom_background_url || '';
        
        if (waExtraToggle) waExtraToggle.checked = !!result.wa_extra_buttons_enabled;
        if (waLikeBtn) waLikeBtn.checked = !!result.wa_like_button;
        if (waMarkRead) waMarkRead.checked = !!result.wa_mark_read_unread;
        if (waTranscribeAudio) waTranscribeAudio.checked = !!result.wa_transcribe_audio;
        if (waTranslateMsg) waTranslateMsg.checked = !!result.wa_translate_message;
        if (waDownloadStatus) waDownloadStatus.checked = !!result.wa_download_status;

        // Toggle UI disabled panels based on main controls
        toggleOptionGroup('wa-private-mode-toggle', 'wa-private-options');
        toggleOptionGroup('wa-customizations-toggle', 'wa-custom-options');
        toggleOptionGroup('wa-extra-buttons-toggle', 'wa-extra-options');
        if (waCustomBg && waBgUrlContainer) {
            waBgUrlContainer.classList.toggle('hidden', !waCustomBg.checked);
        }

        // Load Web Assistant Settings
        if (waSearchToggle) waSearchToggle.checked = result.wa_search_enabled !== false;
        if (waYoutubeToggle) waYoutubeToggle.checked = result.wa_youtube_enabled !== false;
        if (waLinkPreviewToggle) waLinkPreviewToggle.checked = result.wa_linkpreview_enabled !== false;
        if (waEmailToggle) waEmailToggle.checked = result.wa_email_enabled !== false;
        // Load search trigger radio
        const searchTrigger = result.wa_search_trigger || 'always';
        const triggerRadio = document.querySelector(`input[name="wa-search-trigger"][value="${searchTrigger}"]`);
        if (triggerRadio) triggerRadio.checked = true;
        // Toggle radio group visibility based on search toggle
        if (waSearchTriggerGroup) {
            waSearchTriggerGroup.style.display = (waSearchToggle && waSearchToggle.checked) ? '' : 'none';
        }
    });

    themeToggle.addEventListener('change', (e) => {
        const isDark = e.target.checked;
        applyTheme(isDark);
        chrome.storage.local.set({ theme: isDark ? 'dark' : 'light' });
    });

    /* ===== Footer bar (Slider-style) ===== */
    const vikyThemeBtn = document.getElementById('viky-theme-btn');
    const vikyFavoritesBtn = document.getElementById('viky-favorites-btn');
    const vikyAvatar = document.getElementById('viky-avatar');
    const vikyUpgradeBtn = document.getElementById('viky-upgrade-btn');
    const thinkToggle = document.getElementById('think-toggle');
    const micBtn = document.getElementById('mic-btn');

    if (vikyThemeBtn) {
        vikyThemeBtn.addEventListener('click', () => {
            // Toggle theme via the same logic as the settings theme switch.
            chrome.storage.local.get(['theme'], (res) => {
                const next = res.theme === 'light' ? 'dark' : 'light';
                applyTheme(next === 'dark');
                if (themeToggle) themeToggle.checked = (next === 'dark');
                chrome.storage.local.set({ theme: next });
            });
        });
    }
    if (vikyFavoritesBtn) {
        vikyFavoritesBtn.addEventListener('click', () => {
            // Open the templates tab as a quick "favorites"-style entry point.
            switchToTab('templates');
        });
    }
    if (vikyAvatar) {
        vikyAvatar.addEventListener('click', () => {
            switchToTab('settings');
        });
    }
    if (vikyUpgradeBtn) {
        vikyUpgradeBtn.addEventListener('click', () => {
            // Jump straight to the subscription settings subpane.
            switchToTab('settings');
            const subTab = document.querySelector('[data-settings-subtab="subscription"]');
            if (subTab) subTab.click();
        });
    }
    if (thinkToggle) {
        // Decorative toggle — flips the visual state only.
        thinkToggle.addEventListener('click', () => {
            thinkToggle.classList.toggle('active');
        });
    }
    if (micBtn) {
        micBtn.addEventListener('click', () => {
            // Hook the mic button to the existing recording flow on the transcribe tab.
            switchToTab('transcribe');
            setTimeout(() => {
                const recordBtn = document.getElementById('transcribe-record-btn');
                if (recordBtn) recordBtn.click();
            }, 350);
        });
    }

    if (showFloatingToggle) {
        showFloatingToggle.addEventListener('change', (e) => {
            chrome.storage.local.set({ showFloatingButton: e.target.checked });
        });
    }

    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', () => {
            chrome.storage.local.set({
                showFloatingButton: showFloatingToggle.checked,
                defaultLanguage: defaultLanguageSelect.value,

                selectedModel: modelSelector.value,
                highlightColor: highlightColorCustom ? highlightColorCustom.value : '#facc15'
            }, () => {
                updateChatModelVisuals(modelSelector.value);
                saveSettingsBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Saved!`;
                setTimeout(() => {
                    saveSettingsBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Save Preferences`;
                }, 1500);
            });
        });
    }

    // Highlight Color Picker interactions
    function updateColorPresetVisuals(selectedColor) {
        if (!colorPresetBtns) return;
        colorPresetBtns.forEach(btn => {
            if (btn.dataset.color.toLowerCase() === selectedColor.toLowerCase()) {
                btn.style.borderColor = 'var(--text-primary, #ffffff)';
                btn.style.transform = 'scale(1.15)';
                btn.style.boxShadow = '0 0 0 2px var(--accent-primary, #e67e22)';
            } else {
                btn.style.borderColor = 'transparent';
                btn.style.transform = 'scale(1)';
                btn.style.boxShadow = 'none';
            }
        });
    }

    if (colorPresetBtns) {
        colorPresetBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const color = btn.dataset.color;
                if (highlightColorCustom) highlightColorCustom.value = color;
                updateColorPresetVisuals(color);
                chrome.storage.local.set({ highlightColor: color });
            });
        });
    }

    if (highlightColorCustom) {
        highlightColorCustom.addEventListener('input', (e) => {
            const color = e.target.value;
            updateColorPresetVisuals(color);
            chrome.storage.local.set({ highlightColor: color });
        });
    }

    if (saveAiSettingsBtn) {
        saveAiSettingsBtn.addEventListener('click', () => {
            const selectedModel = modelSelector.value;
            const defaultImageStyle = defaultImageStyleSelect.value;
            chrome.storage.local.set({
                selectedModel,
                defaultImageStyle
            }, () => {
                selectedImageStyle = defaultImageStyle;
                styleButtons.forEach(btn => {
                    btn.classList.toggle('active', btn.dataset.style === selectedImageStyle);
                });
                updateChatModelVisuals(selectedModel);
                
                saveAiSettingsBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Saved!`;
                setTimeout(() => {
                    saveAiSettingsBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Save AI & Studio Preferences`;
                }, 1500);
            });
        });
    }



    // ===== Web Assistant Toggle / Radio Listeners (instant save) =====
    if (waSearchToggle) {
        waSearchToggle.addEventListener('change', (e) => {
            chrome.storage.local.set({ wa_search_enabled: e.target.checked });
            if (waSearchTriggerGroup) {
                waSearchTriggerGroup.style.display = e.target.checked ? '' : 'none';
            }
        });
    }
    if (waYoutubeToggle) {
        waYoutubeToggle.addEventListener('change', (e) => {
            chrome.storage.local.set({ wa_youtube_enabled: e.target.checked });
        });
    }
    if (waLinkPreviewToggle) {
        waLinkPreviewToggle.addEventListener('change', (e) => {
            chrome.storage.local.set({ wa_linkpreview_enabled: e.target.checked });
        });
    }
    if (waEmailToggle) {
        waEmailToggle.addEventListener('change', (e) => {
            chrome.storage.local.set({ wa_email_enabled: e.target.checked });
        });
    }
    // Search trigger radio group
    if (waSearchTriggerGroup) {
        waSearchTriggerGroup.querySelectorAll('input[name="wa-search-trigger"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                chrome.storage.local.set({ wa_search_trigger: e.target.value });
            });
        });
    }

    // ===== WhatsApp Web Enhancements Toggle / Save Listeners =====
    if (waPrivateToggle) {
        waPrivateToggle.addEventListener('change', () => {
            toggleOptionGroup('wa-private-mode-toggle', 'wa-private-options');
        });
    }
    if (waCustomToggle) {
        waCustomToggle.addEventListener('change', () => {
            toggleOptionGroup('wa-customizations-toggle', 'wa-custom-options');
        });
    }
    if (waExtraToggle) {
        waExtraToggle.addEventListener('change', () => {
            toggleOptionGroup('wa-extra-buttons-toggle', 'wa-extra-options');
        });
    }
    if (waCustomBg) {
        waCustomBg.addEventListener('change', () => {
            if (waBgUrlContainer) {
                waBgUrlContainer.classList.toggle('hidden', !waCustomBg.checked);
            }
        });
    }

    function notifyWhatsAppTabs() {
        chrome.tabs.query({ url: "*://web.whatsapp.com/*" }, (tabs) => {
            tabs.forEach(tab => {
                chrome.tabs.sendMessage(tab.id, { action: "UPDATE_WA_SETTINGS" }, (response) => {
                    if (chrome.runtime.lastError) {
                        // Fallback to full reload if content script isn't loaded/ready
                        chrome.tabs.reload(tab.id);
                    }
                });
            });
        });
    }

    if (saveWaSettingsBtn) {
        saveWaSettingsBtn.addEventListener('click', () => {
            chrome.storage.local.set({
                wa_private_mode_enabled: waPrivateToggle.checked,
                wa_blur_names: waBlurNames.checked,
                wa_blur_photos: waBlurPhotos.checked,
                wa_blur_recent: waBlurRecent.checked,
                wa_blur_conversation: waBlurConversation.checked,
                wa_hide_typing: waHideTyping.checked,
                wa_hide_recording: waHideRecording.checked,
                wa_view_statuses_privately: waViewStatuses.checked,
                wa_play_audio_privately: waPlayAudio.checked,
                wa_disable_read_receipts: waDisableRead.checked,
                wa_hide_online: waHideOnline.checked,
                wa_restore_deleted: waRestoreDeleted.checked,

                wa_customizations_enabled: waCustomToggle.checked,
                wa_custom_background: waCustomBg.checked,
                wa_custom_background_url: waBgUrl.value.trim(),

                wa_extra_buttons_enabled: waExtraToggle.checked,
                wa_like_button: waLikeBtn.checked,
                wa_mark_read_unread: waMarkRead.checked,
                wa_transcribe_audio: waTranscribeAudio.checked,
                wa_translate_message: waTranslateMsg.checked,
                wa_download_status: waDownloadStatus.checked
            }, () => {
                notifyWhatsAppTabs();
                saveWaSettingsBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Saved!`;
                setTimeout(() => {
                    saveWaSettingsBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Save WhatsApp Preferences`;
                }, 1500);
            });
        });
    }

    // ===== Auth =====
    function checkAuthStatus() {
        chrome.identity.getAuthToken({ interactive: false }, (token) => {
            if (chrome.runtime.lastError || !token) {
                welcomeScreen.style.display = 'flex';
                appLayout.style.display = 'none';
            } else {
                welcomeScreen.style.display = 'none';
                appLayout.style.display = 'flex';
                fetchUserProfile(token);
            }
        });
    }

    function fetchUserProfile(token) {
        fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${token}` }
        })
        .then(response => response.json())
        .then(data => {
            if (data && data.email) {
                userEmailDisplay.textContent = data.email;
                userEmailDisplay.title = data.email;
                chrome.storage.local.set({ userEmail: data.email });
            }
        })
        .catch(err => console.error("Could not fetch user profile", err));
    }

    googleLoginBtn.addEventListener('click', () => {
        loginError.classList.add('hidden');
        googleLoginBtn.disabled = true;
        googleLoginBtn.innerHTML = `<div class="loading-spinner"></div> Signing in...`;
        chrome.identity.getAuthToken({ interactive: true }, (token) => {
            googleLoginBtn.disabled = false;
            googleLoginBtn.innerHTML = `
                <svg viewBox="0 0 24 24" width="20" height="20">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg> Sign in with Google`;
            if (chrome.runtime.lastError) {
                loginError.textContent = chrome.runtime.lastError.message;
                loginError.classList.remove('hidden');
            } else if (token) {
                checkAuthStatus();
            }
        });
    });

    logoutBtn.addEventListener('click', () => {
        chrome.identity.getAuthToken({ interactive: false }, (token) => {
            if (token) {
                chrome.identity.removeCachedAuthToken({ token }, () => {
                    fetch(`https://accounts.google.com/o/oauth2/revoke?token=${token}`).then(() => {
                        chrome.storage.local.remove(['userEmail'], () => {
                            checkAuthStatus();
                        });
                    });
                });
            } else {
                checkAuthStatus();
            }
        });
    });

    // ===== Chat Model Popover Event Handlers =====
    function updateChatModelVisuals(modelId) {
        const activeItem = document.querySelector(`.popover-item[data-model="${modelId}"]`);
        if (activeItem) {
            popoverItems.forEach(item => item.classList.remove('active'));
            activeItem.classList.add('active');
            
            const name = activeItem.dataset.name;
            const icon = activeItem.dataset.icon;
            const iconEl = activeItem.querySelector('.item-icon');
            
            if (chatModelPillIcon) {
                if (iconEl) {
                    chatModelPillIcon.innerHTML = iconEl.innerHTML;
                } else {
                    chatModelPillIcon.textContent = icon;
                }
            }
            if (chatModelPillName) chatModelPillName.textContent = name;
        }
    }

    if (chatModelPill) {
        chatModelPill.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = chatModelPill.classList.toggle('open');
            chatModelPopover.classList.toggle('hidden', !isOpen);
        });
    }

    document.addEventListener('click', (e) => {
        if (chatModelPopover && !chatModelPopover.classList.contains('hidden')) {
            if (!chatModelPill.contains(e.target) && !chatModelPopover.contains(e.target)) {
                chatModelPill.classList.remove('open');
                chatModelPopover.classList.add('hidden');
            }
        }
    });

    popoverItems.forEach(item => {
        item.addEventListener('click', () => {
            const modelId = item.dataset.model;
            chrome.storage.local.set({ selectedModel: modelId }, () => {
                if (modelSelector) modelSelector.value = modelId;
                updateChatModelVisuals(modelId);
                chatModelPill.classList.remove('open');
                chatModelPopover.classList.add('hidden');
            });
        });
    });

    // Run auth check on load
    checkAuthStatus();

    // ===== Listen for navigation requests from background (e.g., WhatsApp sidebar icon) =====
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'NAVIGATE_TO_WA_SETTINGS') {
            // Switch to Settings tab
            navIcons.forEach(i => i.classList.remove('active'));
            panes.forEach(p => p.classList.remove('active'));
            const settingsNavIcon = document.querySelector('[data-tab="settings"]');
            if (settingsNavIcon) settingsNavIcon.classList.add('active');
            const settingsPane = document.getElementById('settings');
            if (settingsPane) settingsPane.classList.add('active');

            // Switch to WhatsApp subtab
            const settingsSubtabs = document.querySelectorAll('.settings-subtab');
            const settingsSubpanes = document.querySelectorAll('.settings-subpane');
            settingsSubtabs.forEach(tab => tab.classList.remove('active'));
            settingsSubpanes.forEach(pane => pane.classList.remove('active'));

            const waSubtab = document.querySelector('[data-settings-subtab="whatsapp"]');
            if (waSubtab) waSubtab.classList.add('active');
            const waPane = document.getElementById('settings-whatsapp');
            if (waPane) waPane.classList.add('active');

            console.log('[Viky AI] Navigated to WhatsApp settings via sidebar icon.');
            sendResponse({ success: true });
        }
    });

    // ===== Subscription Management =====
    const FIREBASE_BASE = 'https://viky-ai-proxy.vikranty301.workers.dev';
    let currentBilling = 'monthly';

    // Billing toggle
    const billingToggle = document.getElementById('sub-billing-toggle');
    if (billingToggle) {
        billingToggle.addEventListener('click', (e) => {
            const btn = e.target.closest('.sub-billing-btn');
            if (!btn) return;
            currentBilling = btn.dataset.billing;
            billingToggle.querySelectorAll('.sub-billing-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Update prices
            document.querySelectorAll('.sub-price-amount').forEach(el => {
                el.textContent = el.dataset[currentBilling];
            });
            document.querySelectorAll('.sub-price-period').forEach(el => {
                el.textContent = el.dataset[currentBilling];
            });
        });
    }

    // Subscribe button handler
    const pricingGrid = document.getElementById('sub-pricing-grid');
    if (pricingGrid) {
        pricingGrid.addEventListener('click', async (e) => {
            const btn = e.target.closest('.sub-plan-btn');
            if (!btn || btn.disabled) return;

            const tier = btn.dataset.tier;
            const statusMsg = document.getElementById('sub-status-msg');

            btn.disabled = true;
            const origText = btn.textContent;
            btn.textContent = 'Opening checkout...';
            btn.classList.add('loading');

            try {
                const token = await new Promise((resolve, reject) => {
                    chrome.identity.getAuthToken({ interactive: false }, (token) => {
                        if (chrome.runtime.lastError || !token) {
                            reject(new Error('Please sign in first.'));
                        } else {
                            resolve(token);
                        }
                    });
                });

                const response = await fetch(`${FIREBASE_BASE}/createCheckoutSession`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ tier, billing: currentBilling })
                });

                const data = await response.json();

                if (data.success && data.url) {
                    chrome.tabs.create({ url: data.url });
                    if (statusMsg) {
                        statusMsg.textContent = 'Checkout opened in a new tab. Complete payment there.';
                        statusMsg.className = 'sub-status-msg success';
                    }
                } else {
                    throw new Error(data.error || 'Failed to create checkout session.');
                }
            } catch (err) {
                console.error('Checkout error:', err);
                if (statusMsg) {
                    statusMsg.textContent = err.message;
                    statusMsg.className = 'sub-status-msg error';
                }
            } finally {
                btn.disabled = false;
                btn.textContent = origText;
                btn.classList.remove('loading');
            }
        });
    }

    // Fetch and display subscription status
    async function fetchSubscriptionStatus() {
        try {
            const token = await new Promise((resolve, reject) => {
                chrome.identity.getAuthToken({ interactive: false }, (token) => {
                    if (chrome.runtime.lastError || !token) {
                        reject(new Error('Not signed in'));
                    } else {
                        resolve(token);
                    }
                });
            });

            const response = await fetch(`${FIREBASE_BASE}/getUserSubscription`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const data = await response.json();
            if (data.success && data.subscription) {
                const sub = data.subscription;
                const badge = document.getElementById('sub-current-badge');
                if (badge) {
                    badge.textContent = sub.tier.charAt(0).toUpperCase() + sub.tier.slice(1);
                }

                const basicEl = document.getElementById('sub-basic-credits');
                const advancedEl = document.getElementById('sub-advanced-credits');
                const eliteEl = document.getElementById('sub-elite-credits');

                if (basicEl) basicEl.textContent = sub.basic_credits >= 999999 ? '∞' : sub.basic_credits.toLocaleString();
                if (advancedEl) advancedEl.textContent = sub.advanced_credits.toLocaleString();
                if (eliteEl) eliteEl.textContent = sub.elite_credits.toLocaleString();

                // Mark current plan card
                document.querySelectorAll('.sub-plan-card').forEach(card => {
                    card.classList.remove('current-plan');
                    if (card.dataset.tier === sub.tier) {
                        card.classList.add('current-plan');
                    }
                });
            }
        } catch (err) {
            // Silently fail - user might not be signed in yet
            console.log('Could not fetch subscription status:', err.message);
        }
    }

    // Fetch subscription when navigating to subscription tab
    const subTabBtn = document.querySelector('[data-settings-subtab="subscription"]');
    if (subTabBtn) {
        subTabBtn.addEventListener('click', fetchSubscriptionStatus);
    }

    // Also fetch on initial load (after auth check)
    setTimeout(fetchSubscriptionStatus, 2000);

    // ===== AUDIO TRANSCRIPTION TAB =====
    const transcribeRecordBtn = document.getElementById('transcribe-record-btn');
    const transcribeRecordTimer = document.getElementById('transcribe-record-timer');
    const transcribeRecordStatus = document.getElementById('transcribe-record-status');
    const transcribeWaveformBars = document.getElementById('transcribe-waveform-bars');
    const transcribeUploadZone = document.getElementById('transcribe-upload-zone');
    const transcribeBrowseBtn = document.getElementById('transcribe-browse-btn');
    const transcribeFileInput = document.getElementById('transcribe-file-input');
    const transcribeAudioPreview = document.getElementById('transcribe-audio-preview');
    const transcribeWaveformCanvas = document.getElementById('transcribe-waveform-canvas');
    const transcribeAudioFilename = document.getElementById('transcribe-audio-filename');
    const transcribeAudioDuration = document.getElementById('transcribe-audio-duration');
    const transcribeAudioRemove = document.getElementById('transcribe-audio-remove');
    const transcribeBtn = document.getElementById('transcribe-btn');
    const transcribeResult = document.getElementById('transcribe-result');
    const transcribeOutput = document.getElementById('transcribe-output');
    const transcribeCopyBtn = document.getElementById('transcribe-copy-btn');
    const transcribeSendChatBtn = document.getElementById('transcribe-send-chat-btn');
    const transcribeDownloadBtn = document.getElementById('transcribe-download-btn');
    const transcribeHistoryList = document.getElementById('transcribe-history-list');

    let transcribeMediaRecorder = null;
    let transcribeAudioChunks = [];
    let transcribeRecordingInterval = null;
    let transcribeRecordSeconds = 0;
    let transcribeCurrentAudioBase64 = null;
    let transcribeCurrentAudioFormat = null;
    let transcribeCurrentAudioBlob = null;
    let transcribeSessionHistory = [];

    // --- Recording ---
    if (transcribeRecordBtn) {
        transcribeRecordBtn.addEventListener('click', async () => {
            if (transcribeMediaRecorder && transcribeMediaRecorder.state === 'recording') {
                stopRecording();
            } else {
                await startRecording();
            }
        });
    }

    async function startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                ? 'audio/webm;codecs=opus'
                : 'audio/webm';

            transcribeMediaRecorder = new MediaRecorder(stream, { mimeType });
            transcribeAudioChunks = [];

            transcribeMediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) transcribeAudioChunks.push(e.data);
            };

            transcribeMediaRecorder.onstop = () => {
                stream.getTracks().forEach(t => t.stop());
                const blob = new Blob(transcribeAudioChunks, { type: mimeType });
                loadAudioBlob(blob, 'recording.webm', 'webm');
            };

            transcribeMediaRecorder.start(250);
            transcribeRecordBtn.classList.add('recording');
            if (transcribeRecordStatus) transcribeRecordStatus.textContent = 'Recording...';
            if (transcribeWaveformBars) transcribeWaveformBars.classList.remove('hidden');

            transcribeRecordSeconds = 0;
            updateRecordTimer();
            transcribeRecordingInterval = setInterval(() => {
                transcribeRecordSeconds++;
                updateRecordTimer();
            }, 1000);

        } catch (err) {
            console.error('[Viky AI] Microphone access error:', err);
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError' || err.message.includes('denied') || err.message.includes('Permission')) {
                chrome.tabs.create({ url: chrome.runtime.getURL('permission.html') });
            }
            if (transcribeRecordStatus) {
                transcribeRecordStatus.textContent = 'Microphone access denied';
                transcribeRecordStatus.style.color = '#fca5a5';
                setTimeout(() => {
                    transcribeRecordStatus.textContent = 'Click to record';
                    transcribeRecordStatus.style.color = '';
                }, 3000);
            }
        }
    }

    function stopRecording() {
        if (transcribeMediaRecorder && transcribeMediaRecorder.state === 'recording') {
            transcribeMediaRecorder.stop();
        }
        transcribeRecordBtn.classList.remove('recording');
        if (transcribeRecordStatus) transcribeRecordStatus.textContent = 'Click to record';
        if (transcribeWaveformBars) transcribeWaveformBars.classList.add('hidden');
        clearInterval(transcribeRecordingInterval);
    }

    function updateRecordTimer() {
        if (!transcribeRecordTimer) return;
        const mins = String(Math.floor(transcribeRecordSeconds / 60)).padStart(2, '0');
        const secs = String(transcribeRecordSeconds % 60).padStart(2, '0');
        transcribeRecordTimer.textContent = `${mins}:${secs}`;
    }

    // --- File Upload ---
    if (transcribeBrowseBtn) {
        transcribeBrowseBtn.addEventListener('click', () => transcribeFileInput?.click());
    }

    if (transcribeFileInput) {
        transcribeFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) handleAudioFile(file);
            transcribeFileInput.value = '';
        });
    }

    if (transcribeUploadZone) {
        transcribeUploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            transcribeUploadZone.classList.add('drag-over');
        });
        transcribeUploadZone.addEventListener('dragleave', () => {
            transcribeUploadZone.classList.remove('drag-over');
        });
        transcribeUploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            transcribeUploadZone.classList.remove('drag-over');
            const file = e.dataTransfer.files[0];
            if (file) {
                const ext = file.name.split('.').pop().toLowerCase();
                const isSupported = ['mp3', 'wav', 'm4a', 'webm', 'ogg', 'flac'].includes(ext) || file.type.startsWith('audio/');
                if (isSupported) {
                    handleAudioFile(file);
                } else {
                    alert('Unsupported file format. Please upload MP3, WAV, M4A, WebM, OGG, or FLAC.');
                }
            }
        });
    }

    function handleAudioFile(file) {
        const MAX_SIZE = 25 * 1024 * 1024; // 25MB
        if (file.size > MAX_SIZE) {
            alert('File too large. Maximum size is 25MB.');
            return;
        }
        const ext = file.name.split('.').pop().toLowerCase();
        const formatMap = {
            mp3: 'mp3', wav: 'wav', m4a: 'm4a',
            webm: 'webm', ogg: 'ogg', flac: 'flac'
        };
        const format = formatMap[ext] || 'wav';
        loadAudioBlob(file, file.name, format);
    }

    function loadAudioBlob(blob, filename, format) {
        transcribeCurrentAudioBlob = blob;
        transcribeCurrentAudioFormat = format;

        // Convert to base64
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64Full = reader.result;
            // Strip data URL prefix: "data:audio/webm;base64,..."
            transcribeCurrentAudioBase64 = base64Full.split(',')[1];
            showAudioPreview(filename, blob);
            if (transcribeBtn) transcribeBtn.disabled = false;
        };
        reader.readAsDataURL(blob);
    }

    function showAudioPreview(filename, blob) {
        if (!transcribeAudioPreview) return;
        transcribeAudioPreview.classList.add('visible');
        if (transcribeAudioFilename) transcribeAudioFilename.textContent = filename;

        // Get duration
        const audioEl = new Audio();
        audioEl.src = URL.createObjectURL(blob);
        audioEl.addEventListener('loadedmetadata', () => {
            if (transcribeAudioDuration) {
                const dur = audioEl.duration;
                if (isFinite(dur)) {
                    const m = Math.floor(dur / 60);
                    const s = Math.floor(dur % 60);
                    transcribeAudioDuration.textContent = `${m}:${s.toString().padStart(2, '0')}`;
                } else {
                    transcribeAudioDuration.textContent = '—';
                }
            }
            URL.revokeObjectURL(audioEl.src);
        });

        // Draw simple waveform visualization on canvas
        drawStaticWaveform();
    }

    function drawStaticWaveform() {
        const canvas = transcribeWaveformCanvas;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);

        const barCount = 60;
        const barWidth = 3;
        const gap = (w - barCount * barWidth) / (barCount - 1);
        const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#00ff9d';

        for (let i = 0; i < barCount; i++) {
            const barH = Math.random() * (h * 0.7) + h * 0.15;
            const x = i * (barWidth + gap);
            const y = (h - barH) / 2;

            ctx.fillStyle = accentColor;
            ctx.globalAlpha = 0.3 + Math.random() * 0.5;
            ctx.beginPath();
            if (ctx.roundRect) {
                ctx.roundRect(x, y, barWidth, barH, 1.5);
            } else {
                ctx.rect(x, y, barWidth, barH);
            }
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    // Remove audio
    if (transcribeAudioRemove) {
        transcribeAudioRemove.addEventListener('click', clearTranscribeAudio);
    }

    function clearTranscribeAudio() {
        transcribeCurrentAudioBase64 = null;
        transcribeCurrentAudioFormat = null;
        transcribeCurrentAudioBlob = null;
        if (transcribeAudioPreview) transcribeAudioPreview.classList.remove('visible');
        if (transcribeBtn) transcribeBtn.disabled = true;
        if (transcribeRecordTimer) transcribeRecordTimer.textContent = '00:00';
        transcribeRecordSeconds = 0;
    }

    // --- Transcription ---
    if (transcribeBtn) {
        transcribeBtn.addEventListener('click', async () => {
            if (!transcribeCurrentAudioBase64) return;

            transcribeBtn.disabled = true;
            transcribeBtn.innerHTML = `<div class="loading-spinner" style="width:14px;height:14px;border-width:2px;"></div> Transcribing...`;

            try {
                const response = await chrome.runtime.sendMessage({
                    action: 'TRANSCRIBE_AUDIO',
                    audioBase64: transcribeCurrentAudioBase64,
                    audioFormat: transcribeCurrentAudioFormat || 'wav'
                });

                if (response && response.success && response.text) {
                    showTranscriptResult(response.text);
                    // Add to history
                    transcribeSessionHistory.unshift({
                        text: response.text,
                        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        format: transcribeCurrentAudioFormat
                    });
                    persistTranscribeHistory();
                    renderTranscribeHistory();
                } else {
                    showTranscriptResult(`Error: ${response?.error || 'Transcription failed'}`);
                }
            } catch (err) {
                console.error('[Viky AI] Transcription error:', err);
                showTranscriptResult(`Error: ${err.message}`);
            } finally {
                transcribeBtn.disabled = false;
                transcribeBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> Transcribe`;
            }
        });
    }

    function showTranscriptResult(text) {
        if (transcribeResult) transcribeResult.classList.add('visible');
        if (transcribeOutput) transcribeOutput.textContent = text;
    }

    // --- Result Actions ---
    if (transcribeCopyBtn) {
        transcribeCopyBtn.addEventListener('click', () => {
            const text = transcribeOutput?.textContent;
            if (!text) return;
            navigator.clipboard.writeText(text).then(() => {
                transcribeCopyBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Copied!`;
                setTimeout(() => {
                    transcribeCopyBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy`;
                }, 2000);
            });
        });
    }

    if (transcribeSendChatBtn) {
        transcribeSendChatBtn.addEventListener('click', () => {
            const text = transcribeOutput?.textContent;
            if (!text) return;
            // Switch to chat tab
            navIcons.forEach(i => i.classList.remove('active'));
            panes.forEach(p => p.classList.remove('active'));
            document.querySelector('[data-tab="chat"]')?.classList.add('active');
            document.getElementById('chat')?.classList.add('active');
            chatInput.value = text;
            chatInput.style.height = 'auto';
            chatInput.style.height = Math.min(chatInput.scrollHeight, 100) + 'px';
            chatInput.focus();
        });
    }

    if (transcribeDownloadBtn) {
        transcribeDownloadBtn.addEventListener('click', () => {
            const text = transcribeOutput?.textContent;
            if (!text) return;
            const blob = new Blob([text], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `viky-transcript-${Date.now()}.txt`;
            link.click();
            URL.revokeObjectURL(url);
        });
    }

    // --- History ---
    function renderTranscribeHistory() {
        if (!transcribeHistoryList) return;
        transcribeHistoryList.innerHTML = '';
        if (transcribeSessionHistory.length === 0) return;

        transcribeSessionHistory.forEach((item, index) => {
            const el = document.createElement('div');
            el.className = 'transcribe-history-item';
            const preview = item.text.length > 80 ? item.text.slice(0, 80) + '...' : item.text;
            el.innerHTML = `
                <span class="history-item-text">${escapeHtml(preview)}</span>
                <span class="history-item-time">${item.timestamp}</span>
            `;
            el.addEventListener('click', () => {
                showTranscriptResult(item.text);
            });
            transcribeHistoryList.appendChild(el);
        });
    }

    // ===== Load persisted state on side-panel open =====
    // Run any pending migrations first (in case the extension was just updated),
    // then restore chat history, generated images, and transcriptions from chrome.storage.local
    // so they survive side-panel close/reopen.
    runMigrations().then(() => loadPersistedState());
});

