// Viky AI - Main World Context Injection Script for Web WhatsApp
(function() {
    console.log("[Viky AI] WhatsApp injection script executing.");

    let settings = {};
    let webpackRequire = null;

    // Load configurations from the DOM Bridge
    function loadConfig() {
        const configEl = document.getElementById('viky-wa-config');
        if (configEl) {
            try {
                settings = JSON.parse(configEl.getAttribute('data-settings')) || {};
            } catch (e) {
                console.error("[Viky AI] Failed to parse bridge settings", e);
            }
        }
    }

    loadConfig();

    // Webpack parasite initialization (deferred to script bottom to ensure hoisted helpers are ready)

    // Apply visual override styles (Blur, Custom Backgrounds, etc.)
    const styleEl = document.createElement('style');
    styleEl.id = 'viky-wa-injected-styles';
    document.documentElement.appendChild(styleEl);

    function applyVisualStyles() {
        if (!settings.wa_private_mode_enabled && !settings.wa_customizations_enabled) {
            styleEl.innerHTML = '';
            document.documentElement.classList.remove('viky-blur-names', 'viky-blur-photos', 'viky-blur-recent', 'viky-blur-conversation', 'viky-custom-bg');
            return;
        }
        let cssRules = `
            /* Contact Names Blurring */
            .viky-blur-names [data-testid="cell-frame-title"] span,
            .viky-blur-names [data-testid="chat-title"] span,
            .viky-blur-names header span[dir="auto"],
            .viky-blur-names span[dir="auto"].copyable-text {
                filter: blur(6px) !important;
                transition: filter 0.15s ease-in-out !important;
            }
            .viky-blur-names [data-testid="cell-frame-title"] span:hover,
            .viky-blur-names [data-testid="chat-title"] span:hover,
            .viky-blur-names header span[dir="auto"]:hover,
            .viky-blur-names span[dir="auto"].copyable-text:hover {
                filter: none !important;
            }

            /* Profile Photos Blurring */
            .viky-blur-photos [data-testid="cell-frame-left"],
            .viky-blur-photos [data-testid="chat-profile"] [data-testid*="avatar"],
            .viky-blur-photos [data-testid="chat-profile"] [class*="avatar"],
            .viky-blur-photos [data-testid="chat-profile"] [class*="Avatar"],
            .viky-blur-photos [data-testid="chat-profile"] [role="img"],
            .viky-blur-photos [data-testid="chat-profile"] svg,
            .viky-blur-photos [data-testid="chat-profile"] img,
            .viky-blur-photos [data-testid*="avatar"],
            .viky-blur-photos [data-testid*="profile-photo"],
            .viky-blur-photos [data-testid*="chat-avatar"],
            .viky-blur-photos [class*="avatar"],
            .viky-blur-photos [class*="Avatar"],
            .viky-blur-photos #pane-side img,
            .viky-blur-photos header img,
            .viky-blur-photos img[src*="pps.whatsapp.net"],
            .viky-blur-photos img[src*="blob:"],
            .viky-blur-photos [role="button"] img[src*="pps.whatsapp.net"] {
                filter: blur(10px) !important;
                transition: filter 0.15s ease-in-out !important;
            }
            .viky-blur-photos [data-testid="cell-frame-left"]:hover,
            .viky-blur-photos [data-testid="chat-profile"]:hover [data-testid*="avatar"],
            .viky-blur-photos [data-testid="chat-profile"]:hover [class*="avatar"],
            .viky-blur-photos [data-testid="chat-profile"]:hover [class*="Avatar"],
            .viky-blur-photos [data-testid="chat-profile"]:hover [role="img"],
            .viky-blur-photos [data-testid="chat-profile"]:hover svg,
            .viky-blur-photos [data-testid="chat-profile"]:hover img,
            .viky-blur-photos [data-testid="chat-profile"] [data-testid*="avatar"]:hover,
            .viky-blur-photos [data-testid="chat-profile"] [class*="avatar"]:hover,
            .viky-blur-photos [data-testid="chat-profile"] [class*="Avatar"]:hover,
            .viky-blur-photos [data-testid="chat-profile"] [role="img"]:hover,
            .viky-blur-photos [data-testid="chat-profile"] svg:hover,
            .viky-blur-photos [data-testid="chat-profile"] img:hover,
            .viky-blur-photos [data-testid*="avatar"]:hover,
            .viky-blur-photos [data-testid*="profile-photo"]:hover,
            .viky-blur-photos [data-testid*="chat-avatar"]:hover,
            .viky-blur-photos [class*="avatar"]:hover,
            .viky-blur-photos [class*="Avatar"]:hover,
            .viky-blur-photos #pane-side img:hover,
            .viky-blur-photos header img:hover,
            .viky-blur-photos img[src*="pps.whatsapp.net"]:hover,
            .viky-blur-photos img[src*="blob:"]:hover,
            .viky-blur-photos [role="button"] img[src*="pps.whatsapp.net"]:hover {
                filter: none !important;
            }

            /* Recent Messages Blurring */
            .viky-blur-recent [data-testid="cell-frame-secondary"],
            .viky-blur-recent [class*="cell-frame-secondary"],
            .viky-blur-recent [data-testid="cell-frame-body"] [class*="secondary"],
            .viky-blur-recent [data-testid="cell-frame-body"] [data-testid*="last-msg"],
            .viky-blur-recent [data-testid="cell-frame-body"] [data-testid*="msg-pre"],
            .viky-blur-recent [data-testid="cell-frame-body"] [data-testid*="msg-status"],
            .viky-blur-recent [data-testid="cell-frame-body"] span[title=""],
            .viky-blur-recent [data-testid="cell-frame-body"] div[style*="height"] span,
            .viky-blur-recent [data-testid="cell-frame-body"] div.selectable-text {
                filter: blur(5px) !important;
                transition: filter 0.15s ease-in-out !important;
            }
            .viky-blur-recent div[role="row"]:hover [data-testid="cell-frame-secondary"],
            .viky-blur-recent div[role="row"]:hover [class*="cell-frame-secondary"],
            .viky-blur-recent div[role="row"]:hover [data-testid="cell-frame-body"] [class*="secondary"],
            .viky-blur-recent div[role="row"]:hover [data-testid="cell-frame-body"] [data-testid*="last-msg"],
            .viky-blur-recent div[role="row"]:hover [data-testid="cell-frame-body"] [data-testid*="msg-pre"],
            .viky-blur-recent div[role="row"]:hover [data-testid="cell-frame-body"] [data-testid*="msg-status"],
            .viky-blur-recent div[role="row"]:hover [data-testid="cell-frame-body"] span[title=""],
            .viky-blur-recent div[role="row"]:hover [data-testid="cell-frame-body"] div[style*="height"] span,
            .viky-blur-recent div[role="row"]:hover [data-testid="cell-frame-body"] div.selectable-text,
            .viky-blur-recent [data-testid="cell-frame-secondary"]:hover,
            .viky-blur-recent [class*="cell-frame-secondary"]:hover,
            .viky-blur-recent [data-testid="cell-frame-body"] [class*="secondary"]:hover,
            .viky-blur-recent [data-testid="cell-frame-body"] [data-testid*="last-msg"]:hover,
            .viky-blur-recent [data-testid="cell-frame-body"] [data-testid*="msg-pre"]:hover,
            .viky-blur-recent [data-testid="cell-frame-body"] [data-testid*="msg-status"]:hover,
            .viky-blur-recent [data-testid="cell-frame-body"] span[title=""]:hover,
            .viky-blur-recent [data-testid="cell-frame-body"] div[style*="height"] span:hover,
            .viky-blur-recent [data-testid="cell-frame-body"] div.selectable-text:hover {
                filter: none !important;
            }

            /* Chat Messages Blurring */
            .viky-blur-conversation .message-in, 
            .viky-blur-conversation .message-out,
            .viky-blur-conversation [class*="message-in"], 
            .viky-blur-conversation [class*="message-out"],
            .viky-blur-conversation [data-testid="msg-container"],
            .viky-blur-conversation .copyable-text,
            .viky-blur-conversation div.copyable-text span,
            .viky-blur-conversation span.selectable-text,
            .viky-blur-conversation .viky-restored-content {
                filter: blur(8px) !important;
                transition: filter 0.15s ease-in-out !important;
            }
            .viky-blur-conversation .message-in:hover, 
            .viky-blur-conversation .message-out:hover,
            .viky-blur-conversation [class*="message-in"]:hover, 
            .viky-blur-conversation [class*="message-out"]:hover,
            .viky-blur-conversation [data-testid="msg-container"]:hover,
            .viky-blur-conversation .copyable-text:hover,
            .viky-blur-conversation div.copyable-text span:hover,
            .viky-blur-conversation span.selectable-text:hover,
            .viky-blur-conversation .viky-restored-content:hover {
                filter: none !important;
            }

            /* Custom Chat Background Image */
            .viky-custom-bg div[role="application"] main[role="main"] div[style*="bg-chat"],
            .viky-custom-bg div[role="application"] main[role="main"] div[style*="chat-bg"],
            .viky-custom-bg div.copyable-area::after {
                background-image: var(--viky-bg-url) !important;
                background-size: cover !important;
                background-position: center !important;
                opacity: 0.9 !important;
                content: "" !important;
                position: absolute !important;
                top: 0 !important;
                left: 0 !important;
                width: 100% !important;
                height: 100% !important;
                z-index: 0 !important;
                pointer-events: none !important;
            }
            
            /* Make sure message content remains clickable and above background overlay */
            .viky-custom-bg div.copyable-area > div {
                position: relative !important;
                z-index: 1 !important;
            }

            /* Restored Deleted Messages */
            .restored-message {
                /* No orange border or background tint */
            }
            .restored-message * {
                font-style: normal !important;
            }
            .viky-restored-content {
                color: var(--message-primary, var(--main-text, currentColor)) !important;
                font-style: normal !important;
                font-family: inherit !important;
                text-decoration: none !important;
                display: inline-block !important;
                margin-inline-end: 55px !important;
            }
        `;

        styleEl.innerHTML = cssRules;

        // Apply page-level flags
        const root = document.documentElement;
        if (settings.wa_private_mode_enabled) {
            root.classList.toggle('viky-blur-names', !!settings.wa_blur_names);
            root.classList.toggle('viky-blur-photos', !!settings.wa_blur_photos);
            root.classList.toggle('viky-blur-recent', !!settings.wa_blur_recent);
            root.classList.toggle('viky-blur-conversation', !!settings.wa_blur_conversation);
        } else {
            root.classList.remove('viky-blur-names', 'viky-blur-photos', 'viky-blur-recent', 'viky-blur-conversation');
        }

        if (settings.wa_customizations_enabled && settings.wa_custom_background && settings.wa_custom_background_url) {
            root.classList.add('viky-custom-bg');
            root.style.setProperty('--viky-bg-url', `url("${settings.wa_custom_background_url}")`);
        } else {
            root.classList.remove('viky-custom-bg');
            root.style.removeProperty('--viky-bg-url');
        }
    }

    applyVisualStyles();

    // Hot-reload when configuration changes
    window.addEventListener('viky-wa-config-updated', () => {
        loadConfig();
        applyVisualStyles();
        console.log("[Viky AI] Live WhatsApp configuration updated.");
    });

    // ===== DOM-Based Deleted Message Restoration =====
    // Watches rendered DOM for message bubbles, backs up text IMMEDIATELY
    // on insertion, and restores when WhatsApp marks messages as deleted.
    const domMsgBackup = new Map();          // key-string -> text (secondary)
    const domMsgNodeBackup = new WeakMap();   // DOM element -> text (primary)
    let backupCount = 0;
    let domRestorationStarted = false;

    function escapeHtml(str) {
        const d = document.createElement('div');
        d.textContent = str;
        return d.innerHTML;
    }

    // Derive keys that are UNIQUE per message.
    // CRITICAL: Only use identifiers specific to a single message,
    // never container-level attributes (data-testid on panels, etc.)
    function getAllMsgKeys(el) {
        if (!el) return [];
        const keys = [];

        // 1. data-id (message-level — e.g., "true_xxxx@c.us_3EB0ABC")
        const did = el.closest?.('[data-id]') || el.querySelector?.('[data-id]');
        if (did) keys.push('did:' + did.getAttribute('data-id'));

        // 2. data-pre-plain-text (unique per message: "[3:33 pm, 5/20/2026] Viky: ")
        const ppt = el.querySelector?.('[data-pre-plain-text]');
        if (ppt) keys.push('ppt:' + ppt.getAttribute('data-pre-plain-text'));

        // 3. React fiber — ONLY use msg.id (unique per message)
        try {
            const fiberKey = Object.keys(el).find(k =>
                k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$'));
            if (fiberKey) {
                let fiber = el[fiberKey];
                let depth = 0;
                while (fiber && depth < 20) {
                    const p = fiber.memoizedProps || fiber.pendingProps || {};
                    if (p.msg?.id?._serialized)
                        keys.push('mid:' + p.msg.id._serialized);
                    if (p.msg?.id?.id)
                        keys.push('miid:' + p.msg.id.id);
                    fiber = fiber.return;
                    depth++;
                }
            }
        } catch (e) { /* ignore fiber errors */ }

        return [...new Set(keys)]; // deduplicate
    }

    // Extract visible timestamp from a message bubble (stays after deletion)
    function getTimestamp(el) {
        const ppt = el.querySelector?.('[data-pre-plain-text]');
        if (ppt) return ppt.getAttribute('data-pre-plain-text');
        // Visible timestamp span (WhatsApp keeps this even on deleted messages)
        const candidates = el.querySelectorAll?.('span') || [];
        for (const s of candidates) {
            const t = s.textContent.trim();
            // Match time patterns like "3:33 pm", "15:33", "3:33 AM"
            if (/^\d{1,2}:\d{2}(\s?(am|pm))?$/i.test(t)) return t;
        }
        return null;
    }

    // Find ALL message-like elements in the DOM (very broad)
    function findAllMsgBubbles() {
        const results = new Set();

        // 1. Classic: elements with data-id
        document.querySelectorAll('[data-id]').forEach(el => results.add(el));

        // 2. Classic class names
        document.querySelectorAll('.message-in, .message-out').forEach(el => results.add(el));

        const arr = [...results];
        return arr.filter(el => {
            const sidebar = document.querySelector('#pane-side');
            if (sidebar && sidebar.contains(el)) return false;

            // Exclude containers that have other message bubbles inside them
            // to prevent nested / duplicate restorations
            const isParent = arr.some(other => other !== el && el.contains(other));
            if (isParent) return false;

            return true;
        });
    }

    const DELETED_PLACEHOLDERS = [
        'this message was deleted',
        'you deleted this message',
        'message was deleted',
        'este mensaje fue eliminado',
        'eliminaste este mensaje',
        'esta mensagem foi apagada',
        'voce apagou esta mensagem',
        'diese nachricht wurde geloscht',
        'du hast diese nachricht geloscht',
        'ce message a ete supprime',
        'vous avez supprime ce message',
        'questo messaggio e stato eliminato',
        'hai eliminato questo messaggio',
        'bu mesaj silindi',
        'bu mesaji sildiniz',
        'сообщение удалено',
        'вы удалили это сообщение',
        'تم حذف هذه الرسالة',
        'تم حذف الرسالة',
        'لقد قمت بحذف هذه الرسالة',
        'यह संदेश हटा दिया गया था',
        'आपने यह संदेश हटा दिया',
        'dit bericht is verwijderd',
        'je hebt dit bericht verwijderd',
        'ta wiadomosc zostala usunieta',
        'usunales te wiadomosc'
    ];

    function cleanTextForCheck(str) {
        if (!str) return '';
        return str
            .toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'’]/g, '')
            .replace(/[\u200b\u2060\u200e\u200f\ufeff]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function isDeletedMessage(el) {
        if (!el) return false;
        if (el.querySelector?.('[data-icon="recalled"]')) return true;
        if (el.querySelector?.('[data-icon="msg-revoke"]')) return true;
        
        // Check if any element inside the bubble has text matching a placeholder
        const spans = el.querySelectorAll?.('span, i');
        if (spans) {
            for (const s of spans) {
                const cleaned = cleanTextForCheck(s.textContent);
                if (cleaned.length > 0 && cleaned.length < 100) {
                    if (DELETED_PLACEHOLDERS.some(p => cleaned === p || cleaned.includes(p))) {
                        return true;
                    }
                }
            }
        }
        
        // Fallback check on full text content
        const fullCleaned = cleanTextForCheck(el.textContent);
        if (DELETED_PLACEHOLDERS.some(p => fullCleaned.includes(p))) {
            return true;
        }
        
        return false;
    }

    function extractMsgFromFiber(el) {
        if (!el) return null;
        try {
            const fiberKey = Object.keys(el).find(k =>
                k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$'));
            if (fiberKey) {
                let fiber = el[fiberKey];
                let depth = 0;
                while (fiber && depth < 30) {
                    const p = fiber.memoizedProps || fiber.pendingProps || {};
                    const msg = p.msg || p.message;
                    if (msg) {
                        const body = msg.body || (typeof msg.get === 'function' ? msg.get('body') : null);
                        const caption = msg.caption || (typeof msg.get === 'function' ? msg.get('caption') : null);
                        const type = msg.type || (typeof msg.get === 'function' ? msg.get('type') : null);
                        if (type && type !== 'revoked' && type !== 'recalled') {
                            const val = body || caption;
                            if (val) {
                                const cleaned = cleanTextForCheck(val);
                                if (!DELETED_PLACEHOLDERS.some(pl => cleaned.includes(pl))) {
                                    return val;
                                }
                            }
                        }
                    }
                    fiber = fiber.return;
                    depth++;
                }
            }
        } catch (e) {
            console.error('[Viky AI] Error extracting from fiber:', e);
        }
        return null;
    }

    function extractMsgText(el) {
        // Try React Fiber first (most accurate and immediate)
        const fiberBody = extractMsgFromFiber(el);
        if (fiberBody) {
            return fiberBody;
        }

        const selectors = [
            'span.selectable-text span',
            'span.selectable-text',
            '.copyable-text span[dir]',
            '.copyable-text span',
            'span[dir="ltr"]',
            'span[dir="rtl"]'
        ];
        for (const sel of selectors) {
            const node = el.querySelector?.(sel);
            if (node) {
                const t = node.innerText.trim();
                if (t.length > 0 && t.length < 10000) {
                    const cleaned = cleanTextForCheck(t);
                    if (DELETED_PLACEHOLDERS.some(p => cleaned.includes(p))) {
                        return null;
                    }
                    return t;
                }
            }
        }

        // Nuclear fallback: grab any text content from the element
        // but exclude date headers (Today, Yesterday) and UI labels
        const allSpans = el.querySelectorAll?.('span') || [];
        for (const s of allSpans) {
            const t = s.innerText?.trim();
            if (t && t.length >= 1 && t.length < 10000 &&
                !/^\d{1,2}:\d{2}/.test(t) &&
                !/^(today|yesterday|monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/i.test(t) &&
                !/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(t) &&
                !t.includes('\u2060') /* zero-width no-break space */) {
                
                const cleaned = cleanTextForCheck(t);
                if (DELETED_PLACEHOLDERS.some(p => cleaned.includes(p))) {
                    continue;
                }
                return t;
            }
        }
        return null;
    }

    // Backup a message element.
    // Primary: WeakMap by DOM node reference (survives content changes).
    // Secondary: key-based Map for cross-reference.
    function backupBubble(el) {
        if (isDeletedMessage(el)) return;

        // Skip sidebar chat list entries
        const sidebar = document.querySelector('#pane-side');
        if (sidebar && sidebar.contains(el)) return;

        const text = extractMsgText(el);
        if (!text || text.length === 0) return;

        // PRIMARY: Store by DOM node reference (WeakMap).
        // Only store on the leaf-most element to prevent nested duplicate restorations
        if (!domMsgNodeBackup.has(el)) {
            domMsgNodeBackup.set(el, text);
            backupCount++;
            console.log('[Viky AI] 📦 Backed up node reference:', text.substring(0, 40));
        }

        // SECONDARY: Always update key-based backup map, because keys (like data-id or Fiber msg.id)
        // might only appear/attach a few milliseconds after DOM insertion!
        const keys = getAllMsgKeys(el);
        let keyAdded = false;
        keys.forEach(k => {
            if (!domMsgBackup.has(k)) {
                domMsgBackup.set(k, text);
                keyAdded = true;
                // Persistent Backup: save to localStorage
                try {
                    localStorage.setItem('viky_msg_backup:' + k, JSON.stringify({ t: Date.now(), v: text }));
                } catch (e) {}
            }
        });
        if (keyAdded) {
            console.log('[Viky AI] 🔑 Associated keys for message:', keys, '->', text.substring(0, 30));
        }
    }

    // Immediately backup any message-like content inside a newly added DOM node
    function backupNodeAndChildren(node) {
        backupBubble(node);
        const children = node.querySelectorAll?.(
            '[data-id], .message-in, .message-out, .focusable-list-item, ' +
            '[data-pre-plain-text], [data-testid*="msg"], span.selectable-text'
        );
        if (children) {
            children.forEach(child => {
                const bubble = child.closest?.('[data-id], .message-in, .message-out, .focusable-list-item') || child;
                backupBubble(bubble);
            });
        }
    }

    function immediateBackupNode(node) {
        if (!node) return;
        
        let elementNode = node;
        if (node.nodeType === Node.TEXT_NODE) {
            elementNode = node.parentElement;
        }

        if (!elementNode || elementNode.nodeType !== Node.ELEMENT_NODE) return;

        // Attempt 1: immediate
        backupNodeAndChildren(elementNode);

        // Attempt 1a, 1b, 1c, 1d: micro-timeouts to beat rapid deletions (50ms, 100ms, 150ms, 200ms)
        setTimeout(() => backupNodeAndChildren(elementNode), 50);
        setTimeout(() => backupNodeAndChildren(elementNode), 100);
        setTimeout(() => backupNodeAndChildren(elementNode), 150);
        setTimeout(() => backupNodeAndChildren(elementNode), 200);

        // Attempt 2: after 300ms (React may not have rendered text yet)
        setTimeout(() => backupNodeAndChildren(elementNode), 300);

        // Attempt 3: after 1s (safety net for slow renders / lazy-loaded content)
        setTimeout(() => backupNodeAndChildren(elementNode), 1000);
    }

    function tryRestoreBubble(el) {
        loadConfig();
        if (!settings.wa_private_mode_enabled || !settings.wa_restore_deleted) return;
        if (!isDeletedMessage(el)) return;
        if (el.dataset.vikyRestored === '1') return;

        // Skip sidebar entries
        const sidebar = document.querySelector('#pane-side');
        if (sidebar && sidebar.contains(el)) return;

        // Try 1: WeakMap lookup
        let backup = domMsgNodeBackup.get(el);
        let matchedKey = backup ? 'node-ref' : null;

        // Try 2: Key-based Map lookup (if element was replaced)
        if (!backup) {
            const keys = getAllMsgKeys(el);
            for (const k of keys) {
                backup = domMsgBackup.get(k);
                if (!backup) {
                    // Try to load from localStorage (lazy loading)
                    try {
                        const raw = localStorage.getItem('viky_msg_backup:' + k);
                        if (raw) {
                            try {
                                const data = JSON.parse(raw);
                                backup = data.v;
                            } catch (e) {
                                backup = raw; // fallback if stored in old format
                            }
                            domMsgBackup.set(k, backup);
                        }
                    } catch (e) {}
                }
                if (backup) { matchedKey = k; break; }
            }
        }

        if (!backup) {
            console.log('[Viky AI] ❌ No backup for deleted msg');
            return;
        }

        // Check if the backup itself is a deleted message placeholder (e.g. from previous corrupted runs)
        const cleanedBackup = cleanTextForCheck(backup);
        if (DELETED_PLACEHOLDERS.some(p => cleanedBackup.includes(p))) {
            console.log('[Viky AI] ❌ Backup corrupted with deleted placeholder:', backup);
            // Delete from caches and localStorage to prevent future attempts on this corrupted item
            domMsgNodeBackup.delete(el);
            const keys = getAllMsgKeys(el);
            keys.forEach(k => {
                domMsgBackup.delete(k);
                try {
                    localStorage.removeItem('viky_msg_backup:' + k);
                } catch (e) {}
            });
            return;
        }

        // CRITICAL FIX: If we matched via node-ref, associate keys right now,
        // because the element now has fully attached data-id attributes!
        // This ensures the backup persists across list re-renders (e.g. when typing indicator appears).
        if (matchedKey === 'node-ref') {
            const keys = getAllMsgKeys(el);
            keys.forEach(k => {
                if (k) {
                    domMsgBackup.set(k, backup);
                    // Update localStorage
                    try {
                        localStorage.setItem('viky_msg_backup:' + k, JSON.stringify({ t: Date.now(), v: backup }));
                    } catch (e) {}
                }
            });
        }

        console.log('[Viky AI] ✅ Restoring:', matchedKey, '->', backup.substring(0, 50));
        const safe = escapeHtml(backup).replace(/\n/g, '<br>');

        // Step 1: Ensure recalled/revoke icons are visible (bring back the deleted icon)
        el.querySelectorAll('[data-icon="recalled"], [data-icon="msg-revoke"]').forEach(icon => {
            icon.style.display = '';
        });

        // Step 2: Find the element containing the deleted message indicator, and replace its text with the backup
        const deletedStems = [
            'delet',     // English (deleted)
            'elimin',    // Spanish, Italian (eliminado, eliminato)
            'apagad',    // Portuguese (apagada)
            'silin',     // Turkish (silindi)
            'gelöscht',  // German
            'supprim',   // French (supprimé)
            'حذف',       // Arabic (تم حذف)
            'удал',      // Russian (удалено)
            'हटा',       // Hindi (हटा)
            'hapus',     // Indonesian/Malay (dihapus)
            'verwijder', // Dutch (verwijderd)
            'usuni'      // Polish (usunięta)
        ];
        let replaced = false;

        // Find all potential text elements inside the bubble (i, span, div)
        const candidates = Array.from(el.querySelectorAll('i, span, div'));
        
        // Helper to compute node depth
        function getDomDepth(node) {
            let depth = 0;
            let current = node;
            while (current && current !== el) {
                depth++;
                current = current.parentNode;
            }
            return depth;
        }

        // Sort candidates so we inspect the deepest elements first
        candidates.sort((a, b) => getDomDepth(b) - getDomDepth(a));

        for (const cand of candidates) {
            if (cand.classList.contains('viky-restored-content')) continue;

            const text = cand.textContent.trim().toLowerCase();
            if (deletedStems.some(stem => text.includes(stem))) {
                // Check if any descendant also contains a matching deleted stem (we want the deepest matched node)
                const hasMatchingChild = Array.from(cand.querySelectorAll('i, span, div')).some(child => {
                    if (child === cand || child.classList.contains('viky-restored-content')) return false;
                    const childText = child.textContent.trim().toLowerCase();
                    return deletedStems.some(stem => childText.includes(stem));
                });

                if (hasMatchingChild) continue; // Let the child element handle it

                // Replace the content (letting WhatsApp's native timestamp display naturally)
                cand.innerHTML = `<span class="viky-restored-content" style="font-style:normal;">Restored: ${safe}</span>`;
                cand.style.fontStyle = 'normal';
                cand.style.color = '';
                replaced = true;
                break; // Handled the leaf-most deleted placeholder
            }
        }

        // Step 3: Fallback (in case we didn't find the target element, append it inline on the right of the indicator if possible)
        if (!replaced && !el.querySelector('.viky-restored-content')) {
            const restoreEl = document.createElement('span');
            restoreEl.className = 'viky-restored-content';
            restoreEl.style.cssText = 'font-style:normal; user-select:text; display:inline-block; padding:4px 0; margin-left:8px;';
            restoreEl.innerHTML = ' -> Restored: ' + safe;

            // Try to append next to the recalled icon/deleted text container
            const recalledIcon = el.querySelector('[data-icon="recalled"], [data-icon="msg-revoke"]');
            const inlineContainer = recalledIcon ? (recalledIcon.closest('span') || recalledIcon.parentElement) : null;
            
            // Check if inlineContainer is just a tiny hidden wrapper
            const isTinyIconWrapper = inlineContainer && inlineContainer.offsetWidth < 50 && inlineContainer.offsetHeight < 50;

            if (inlineContainer && !isTinyIconWrapper) {
                inlineContainer.appendChild(restoreEl);
            } else {
                const target = el.querySelector('.copyable-text') || el.querySelector('span.selectable-text') || el.querySelector('div > div') || el;
                target.appendChild(restoreEl);
            }
        }

        el.dataset.vikyRestored = '1';
        el.classList.add('restored-message');
        console.log('[Viky AI] ✅ Restored successfully');
    }

    function scanAllMessages() {
        const bubbles = findAllMsgBubbles();
        let deletedCount = 0;
        bubbles.forEach(el => {
            backupBubble(el);
            if (isDeletedMessage(el)) deletedCount++;
            tryRestoreBubble(el);
        });
        // Print diagnostic info to console (backend/developer log only)
        console.log('[Viky AI] Diagnostic: ' + backupCount + ' messages backed up, ' + deletedCount + ' deleted messages detected');
    }

    let lastScanTime = 0;
    function scheduleScan() {
        const now = Date.now();
        // Prevent starvation: if we are bombarded with mutations (like typing indicators),
        // force a scan if it's been more than 500ms since the last one.
        if (now - lastScanTime > 500) {
            scanAllMessages();
            lastScanTime = now;
            return;
        }
        clearTimeout(scheduleScan._timer);
        scheduleScan._timer = setTimeout(() => {
            scanAllMessages();
            lastScanTime = Date.now();
        }, 300);
    }

    function cleanupOldBackups() {
        try {
            const prefix = 'viky_msg_backup:';
            const backups = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(prefix)) {
                    const raw = localStorage.getItem(key);
                    let t = 0;
                    let v = '';
                    try {
                        const data = JSON.parse(raw);
                        t = data.t || 0;
                        v = data.v || '';
                    } catch (e) {
                        v = raw;
                    }

                    // Check if the value is a deleted message placeholder
                    const cleanedVal = cleanTextForCheck(v);
                    if (DELETED_PLACEHOLDERS.some(p => cleanedVal.includes(p))) {
                        localStorage.removeItem(key);
                        console.log('[Viky AI] 🗑️ Removed corrupted backup from localStorage:', key, '->', v);
                        i--; // Adjust index since we removed an item
                        continue;
                    }

                    backups.push({ key, t });
                }
            }
            // Keep at most 2000 backups
            const maxBackups = 2000;
            if (backups.length > maxBackups) {
                // Sort by timestamp (oldest first)
                backups.sort((a, b) => a.t - b.t);
                const toDeleteCount = backups.length - maxBackups;
                for (let i = 0; i < toDeleteCount; i++) {
                    localStorage.removeItem(backups[i].key);
                }
                console.log(`[Viky AI] Cleaned up ${toDeleteCount} old message backups from localStorage.`);
            }
        } catch (e) {
            console.error('[Viky AI] Error during backup cleanup:', e);
        }
    }

    function startDomRestoration() {
        if (domRestorationStarted) return;
        domRestorationStarted = true;
        console.log('[Viky AI] 🚀 DOM message restoration started — backup pipeline active');

        // Cleanup old persistent backups to keep localStorage clean
        cleanupOldBackups();

        // MutationObserver with IMMEDIATE backup (zero debounce for captures)
        const observer = new MutationObserver((mutations) => {
            // IMMEDIATE: backup any new message content right now — no delay
            for (const mutation of mutations) {
                if (mutation.type === 'characterData') {
                    immediateBackupNode(mutation.target);
                } else if (mutation.type === 'attributes') {
                    immediateBackupNode(mutation.target);
                } else if (mutation.addedNodes) {
                    for (const node of mutation.addedNodes) {
                        immediateBackupNode(node);
                    }
                }
            }
            // DEBOUNCED/THROTTLED: scan for restoration (safe from starvation)
            scheduleScan();
        });
        observer.observe(document.body, { 
            childList: true, 
            subtree: true, 
            characterData: true,
            attributes: true,
            attributeFilter: ['data-id', 'data-pre-plain-text']
        });

        // Initial full scan
        scanAllMessages();

        // Aggressive initial scanning: every 500ms for the first 30 seconds
        // This catches messages whose text wasn't rendered when the observer first fired
        let fastScanCount = 0;
        const fastScanInterval = setInterval(() => {
            scanAllMessages();
            fastScanCount++;
            if (fastScanCount >= 60) { // 60 × 500ms = 30 seconds
                clearInterval(fastScanInterval);
                console.log('[Viky AI] Fast initial scanning complete, switching to 2s interval');
            }
        }, 500);

        // Long-term periodic sweep every 2 seconds (takes over after fast scan ends)
        setInterval(scanAllMessages, 2000);
    }

    function waitForBody() {
        if (document.body) {
            startDomRestoration();
        } else {
            const bo = new MutationObserver(() => {
                if (document.body) { bo.disconnect(); startDomRestoration(); }
            });
            bo.observe(document.documentElement, { childList: true });
            setTimeout(() => {
                if (document.body && !domRestorationStarted) startDomRestoration();
            }, 3000);
        }
    }

    waitForBody();

    // ===== Webpack API Hooking =====
    const hooksApplied = {
        Presence: false,
        Seen: false,
        Status: false,
        Msg: false,
        Chat: false
    };

    // Helper to expose modules to both window.Store and window.VikyStore
    function exposeStore(name, target) {
        window.VikyStore = window.VikyStore || {};
        window.VikyStore[name] = target;

        // Safe window.Store definition using a Proxy to prevent crashes in other extensions
        if (typeof window.Store === 'undefined') {
            const storeTarget = {};
            window.Store = new Proxy(storeTarget, {
                get: function(t, prop) {
                    if (prop in t) {
                        return t[prop];
                    }
                    // Return a dummy proxy to prevent "Cannot read properties of undefined"
                    return new Proxy(function() {}, {
                        get: function(subTarget, subProp) {
                            if (subProp === 'then') return undefined;
                            return function() {};
                        }
                    });
                }
            });
        }
        
        try {
            window.Store[name] = target;
        } catch (e) {
            console.error("[Viky AI] Failed to set window.Store." + name, e);
        }
    }

    // Helper functions for each individual store hook
    function hookPresence(exp) {
        const target = exp.sendChatStateComposing || exp.sendChatStateRecording || exp.sendChatState || exp.markComposing || (exp.default && (exp.default.sendChatStateComposing || exp.default.sendChatStateRecording || exp.default.sendChatState || exp.default.markComposing)) ? (exp.sendChatStateComposing || exp.sendChatState || exp.markComposing ? exp : exp.default) : null;
        if (!target) return false;

        exposeStore('Presence', target);

        let applied = false;
        
        const hooksToApply = [
            'sendChatStateComposing',
            'sendChatStateRecording',
            'sendChatStatePaused',
            'sendChatState',
            'markComposing',
            'markRecording',
            'markPaused'
        ];

        hooksToApply.forEach(funcName => {
            const origFunc = target[funcName];
            if (origFunc && !origFunc.__isVikyHooked) {
                const hooked = async function(...args) {
                    const isHideTyping = settings.wa_private_mode_enabled && settings.wa_hide_typing;
                    const isHideRecording = settings.wa_private_mode_enabled && settings.wa_hide_recording;
                    
                    if (funcName.includes('Composing') && isHideTyping) return;
                    if (funcName.includes('Recording') && isHideRecording) return;
                    if (funcName.includes('Paused') && isHideTyping) return;
                    if (funcName === 'sendChatState') {
                        // sendChatState(chat, state) -> If hide typing is enabled, prevent dispatch
                        if (isHideTyping || isHideRecording) return; 
                    }
                    
                    return origFunc.apply(this, args);
                };
                hooked.__isVikyHooked = true;
                try {
                    target[funcName] = hooked;
                } catch (e) {
                    Object.defineProperty(target, funcName, {
                        value: hooked,
                        writable: true,
                        configurable: true
                    });
                }
                applied = true;
                console.log("[Viky AI] Hooked " + funcName + " successfully.");
            }
        });

        // Some versions of WA use a ChatState module with updateChatState
        const origUpdate = target.updateChatState;
        if (origUpdate && !origUpdate.__isVikyHooked) {
             const hookedUpdate = async function(...args) {
                 if (settings.wa_private_mode_enabled && (settings.wa_hide_typing || settings.wa_hide_recording)) return;
                 return origUpdate.apply(this, args);
             };
             hookedUpdate.__isVikyHooked = true;
             try { target.updateChatState = hookedUpdate; } catch (e) { Object.defineProperty(target, 'updateChatState', { value: hookedUpdate, writable: true, configurable: true }); }
             applied = true;
             console.log("[Viky AI] Hooked updateChatState successfully.");
        }

        return applied;
    }

    function hookSeen(exp) {
        const target = exp.sendSeen || exp.sendReadReceipt || (exp.default && (exp.default.sendSeen || exp.default.sendReadReceipt)) ? ((exp.sendSeen || exp.sendReadReceipt) ? exp : exp.default) : null;
        if (!target) return false;

        exposeStore('Seen', target);

        const origSendSeen = target.sendSeen || target.sendReadReceipt;
        if (origSendSeen && !origSendSeen.__isVikyHooked) {
            const hookSeenFn = async function(chat, ...args) {
                if (settings.wa_private_mode_enabled && settings.wa_disable_read_receipts) {
                    return; // Prevent read receipt transmission
                }
                return origSendSeen.call(this, chat, ...args);
            };
            hookSeenFn.__isVikyHooked = true;
            try {
                if (target.sendSeen) target.sendSeen = hookSeenFn;
            } catch (e) {
                Object.defineProperty(target, 'sendSeen', { value: hookSeenFn, writable: true, configurable: true });
            }
            try {
                if (target.sendReadReceipt) target.sendReadReceipt = hookSeenFn;
            } catch (e) {
                Object.defineProperty(target, 'sendReadReceipt', { value: hookSeenFn, writable: true, configurable: true });
            }
            console.log("[Viky AI] Hooked Seen receipts successfully.");
            return true;
        }
        return false;
    }

    function hookStatus(exp) {
        const target = exp.sendReadStatus || (exp.default && exp.default.sendReadStatus) ? (exp.sendReadStatus ? exp : exp.default) : null;
        if (!target) return false;

        exposeStore('Status', target);

        const origStatusSeen = target.sendReadStatus;
        if (origStatusSeen && !origStatusSeen.__isVikyHooked) {
            const hookStatusFn = async function(chat, statusId, ...args) {
                if (settings.wa_private_mode_enabled && settings.wa_view_statuses_privately) {
                    return; // Prevent status read report
                }
                return origStatusSeen.call(this, chat, statusId, ...args);
            };
            hookStatusFn.__isVikyHooked = true;
            try {
                target.sendReadStatus = hookStatusFn;
            } catch (e) {
                Object.defineProperty(target, 'sendReadStatus', {
                    value: hookStatusFn,
                    writable: true,
                    configurable: true
                });
            }
            console.log("[Viky AI] Hooked Status read receipts successfully.");
            return true;
        }
        return false;
    }

    function hookChatStore(exp) {
        const target = exp.Chat && exp.ChatStore ? exp.ChatStore : (exp.default && exp.default.Chat && exp.default.ChatStore ? exp.default.ChatStore : null);
        if (!target) return false;

        exposeStore('Chat', target);
        return true;
    }

    function hookMsgStore(exp) {
        const target = exp.MsgStore || (exp.default && exp.default.MsgStore) ? (exp.MsgStore || exp.default.MsgStore) : null;
        if (!target) return false;

        exposeStore('Msg', target);

        if (target.__isVikyHooked) return true;

        const msgBackup = new Map();

        function getMsgSerializedId(msg) {
            if (!msg) return null;
            const idObj = msg.id || (typeof msg.get === 'function' ? msg.get('id') : null);
            if (!idObj) return null;
            if (typeof idObj === 'string') return idObj;
            return idObj._serialized || idObj.toString() || idObj.id || null;
        }

        function getMsgAllIds(msg) {
            if (!msg) return [];
            const idObj = msg.id || (typeof msg.get === 'function' ? msg.get('id') : null);
            if (!idObj) return [];
            const ids = [];
            if (idObj._serialized) ids.push(idObj._serialized);
            if (idObj.id) ids.push(idObj.id);
            if (typeof idObj === 'string') ids.push(idObj);
            return [...new Set(ids)];
        }

        function backupMessage(msg) {
            if (!msg) return;
            const id = getMsgSerializedId(msg);
            if (!id) return;
            
            // Only backup non-revoked messages
            const type = msg.type || msg.get?.('type');
            if (type && type !== 'revoked') {
                const body = msg.body || msg.get?.('body');
                const caption = msg.caption || msg.get?.('caption');
                const sender = msg.sender || msg.from || msg.get?.('sender') || msg.get?.('from');
                let finalBody = body;
                let finalCaption = caption;

                const existing = msgBackup.get(id);
                if (existing) {
                    if (!finalBody && existing.body) finalBody = existing.body;
                    if (!finalCaption && existing.caption) finalCaption = existing.caption;
                }

                if (finalBody) {
                    const cleanedBody = cleanTextForCheck(finalBody);
                    if (DELETED_PLACEHOLDERS.some(p => cleanedBody.includes(p))) {
                        return;
                    }
                }
                if (finalCaption) {
                    const cleanedCaption = cleanTextForCheck(finalCaption);
                    if (DELETED_PLACEHOLDERS.some(p => cleanedCaption.includes(p))) {
                        return;
                    }
                }

                // Only set if we actually have text to backup
                if (finalBody || finalCaption || type === 'image' || type === 'video' || type === 'audio' || type === 'ptt' || type === 'document') {
                    msgBackup.set(id, {
                        body: finalBody,
                        type: type,
                        caption: finalCaption,
                        sender: sender
                    });

                    // BRIDGE: Persist Store-level backup to localStorage
                    // so the DOM restoration path can find it after page refresh
                    if (finalBody) {
                        const allIds = getMsgAllIds(msg);
                        const idObj = msg.id || (typeof msg.get === 'function' ? msg.get('id') : null);
                        const serializedId = idObj ? (idObj._serialized || id) : id;
                        const mainId = idObj ? idObj.id : null;

                        allIds.forEach(mid => {
                            const lsKey = 'viky_msg_backup:mid:' + mid;
                            if (!localStorage.getItem(lsKey)) {
                                try {
                                    localStorage.setItem(lsKey, JSON.stringify({ t: Date.now(), v: finalBody }));
                                } catch (e) {}
                            }
                            // Also save under did: format that DOM lookup uses
                            const didKey = 'viky_msg_backup:did:' + serializedId;
                            if (!localStorage.getItem(didKey)) {
                                try {
                                    localStorage.setItem(didKey, JSON.stringify({ t: Date.now(), v: finalBody }));
                                } catch (e) {}
                            }
                        });
                        // Also bridge into the in-memory DOM backup map
                        const didKey = 'did:' + serializedId;
                        if (!domMsgBackup.has(didKey)) {
                            domMsgBackup.set(didKey, finalBody);
                        }
                        const midKey = 'mid:' + serializedId;
                        if (!domMsgBackup.has(midKey)) {
                            domMsgBackup.set(midKey, finalBody);
                        }
                        if (mainId) {
                            const miidKey = 'miid:' + mainId;
                            if (!domMsgBackup.has(miidKey)) {
                                domMsgBackup.set(miidKey, finalBody);
                            }
                        }
                        console.log('[Viky AI] 📦 Store backup bridged to DOM/localStorage:', id, '->', finalBody.substring(0, 40));
                    }
                }
            }
        }

        function restoreMessageIfRevoked(msg) {
            if (!msg || !settings.wa_private_mode_enabled || !settings.wa_restore_deleted) return;
            
            // Prevent infinite loop if already restored
            if (msg.isRestoredMsg || msg.get?.('isRestoredMsg')) return;

            const type = msg.type || msg.get?.('type');
            if (type === 'revoked') {
                const id = getMsgSerializedId(msg);
                if (!id) return;

                // Try in-memory Store backup first
                let backup = msgBackup.get(id);

                // Fallback: try localStorage (from previous sessions)
                if (!backup) {
                    const allIds = getMsgAllIds(msg);
                    for (const mid of allIds) {
                        try {
                            const raw = localStorage.getItem('viky_msg_backup:mid:' + mid);
                            if (raw) {
                                const data = JSON.parse(raw);
                                if (data.v) {
                                    backup = { body: data.v, type: 'chat' };
                                    break;
                                }
                            }
                        } catch (e) {}
                    }
                }

                if (backup) {
                    // Validate backup is not a corrupted placeholder
                    const cleanedBody = cleanTextForCheck(backup.body || '');
                    if (DELETED_PLACEHOLDERS.some(p => cleanedBody.includes(p))) {
                        console.log('[Viky AI] ❌ Store backup corrupted, skipping:', id);
                        return;
                    }

                    console.log("[Viky AI] Restoring revoked message:", id);
                    
                    const restoredBody = 'Restored: ' + (backup.body || "Media message");
                    const restoredCaption = backup.caption ? 'Restored: ' + backup.caption : undefined;

                    // Set attributes via Backbone .set() to trigger UI re-render
                    if (typeof msg.set === 'function') {
                        msg.set({
                            type: backup.type || 'chat',
                            body: restoredBody,
                            caption: restoredCaption,
                            isRestoredMsg: true
                        });
                    } else {
                        msg.type = backup.type || 'chat';
                        msg.body = restoredBody;
                        msg.caption = restoredCaption;
                        msg.isRestoredMsg = true;
                    }

                    // DOM Fallback tagger
                    setTimeout(() => {
                        const idObj = msg.id || (typeof msg.get === 'function' ? msg.get('id') : null);
                        const msgId = idObj ? (idObj.id || idObj._serialized || id) : id;
                        const node = document.querySelector(`[data-id*="${msgId}"]`);
                        if (node) {
                            node.classList.add('restored-message');
                            node.dataset.vikyRestored = '1';
                            const span = node.querySelector('.copyable-text span') || node.querySelector('span.selectable-text');
                            if (span) {
                                span.innerHTML = `<span class="viky-restored-content" style="font-style:normal;">Restored: ${escapeHtml(backup.body || 'Media message')}</span>`;
                            }
                        }
                    }, 300);
                }
            }
        }

        function backupLoadedMessages() {
            if (target.models) {
                target.models.forEach(backupMessage);
            }
        }

        // Bind Collection events
        target.on('add', (msg) => {
            backupMessage(msg);
            restoreMessageIfRevoked(msg);
        });

        target.on('change', (msg) => {
            backupMessage(msg);
            restoreMessageIfRevoked(msg);
        });

        // Backup currently loaded messages immediately to prevent missing the first messages
        backupLoadedMessages();

        // Periodically backup existing/loaded messages
        setInterval(backupLoadedMessages, 2000);

        target.__isVikyHooked = true;
        console.log("[Viky AI] Hooked MsgStore successfully.");
        return true;
    }

    function hookNodeSender(obj, key) {
        const origFunc = obj[key];
        if (origFunc && !origFunc.__isVikyHooked) {
            const hooked = function(...args) {
                try {
                    const node = args[0];
                    if (node) {
                        // Pattern 1: Node Object - node.tag === 'presence'
                        if (typeof node === 'object' && node.tag === 'presence') {
                            const attrs = node.attrs || {};
                            const type = attrs.type;
                            const isHideTyping = settings.wa_private_mode_enabled && settings.wa_hide_typing;
                            const isHideRecording = settings.wa_private_mode_enabled && settings.wa_hide_recording;

                            if (type === 'composing' && isHideTyping) {
                                console.log("[Viky AI] Suppressed composing node:", node);
                                return Promise.resolve({ tag: 'ack', attrs: {} });
                            }
                            if (type === 'recording' && isHideRecording) {
                                console.log("[Viky AI] Suppressed recording node:", node);
                                return Promise.resolve({ tag: 'ack', attrs: {} });
                            }
                            if (type === 'paused' && isHideTyping) {
                                console.log("[Viky AI] Suppressed paused node:", node);
                                return Promise.resolve({ tag: 'ack', attrs: {} });
                            }
                        }
                        // Pattern 2: Positional Arguments - args[0] === 'presence'
                        if (typeof node === 'string' && node === 'presence') {
                            const attrs = args[1] || {};
                            const type = attrs.type;
                            const isHideTyping = settings.wa_private_mode_enabled && settings.wa_hide_typing;
                            const isHideRecording = settings.wa_private_mode_enabled && settings.wa_hide_recording;

                            if (type === 'composing' && isHideTyping) {
                                console.log("[Viky AI] Suppressed composing args:", args);
                                return Promise.resolve({ tag: 'ack', attrs: {} });
                            }
                            if (type === 'recording' && isHideRecording) {
                                console.log("[Viky AI] Suppressed recording args:", args);
                                return Promise.resolve({ tag: 'ack', attrs: {} });
                            }
                            if (type === 'paused' && isHideTyping) {
                                console.log("[Viky AI] Suppressed paused args:", args);
                                return Promise.resolve({ tag: 'ack', attrs: {} });
                            }
                        }
                    }
                } catch (e) {
                    console.error("[Viky AI] Error in node sender hook:", e);
                }
                return origFunc.apply(this, args);
            };
            hooked.__isVikyHooked = true;
            try {
                obj[key] = hooked;
            } catch (e) {
                try {
                    Object.defineProperty(obj, key, {
                        value: hooked,
                        writable: true,
                        configurable: true
                    });
                } catch (err) {
                    console.error("[Viky AI] Failed to hook node sender " + key, err);
                }
            }
        }
    }

    function checkAndHookNodeSenders(obj) {
        if (!obj || typeof obj !== 'object') return;
        for (const key in obj) {
            try {
                const val = obj[key];
                if (typeof val === 'function') {
                    const lowerKey = key.toLowerCase();
                    if (
                        lowerKey === 'sendnode' ||
                        lowerKey === 'sendquery' ||
                        lowerKey === 'sendsmax' ||
                        lowerKey === 'writenode' ||
                        lowerKey === 'deprecatedsendnodepromise' ||
                        lowerKey === 'sendstanza'
                    ) {
                        hookNodeSender(obj, key);
                    }
                }
            } catch (e) {
                // Ignore descriptor errors
            }
        }
    }

    // Dynamic scanning engine
    function scanAndApplyHooks() {
        if (!webpackRequire) return;

        const cache = webpackRequire.c;
        for (const id in cache) {
            const mod = cache[id];
            if (!mod || !mod.exports) continue;
            const exp = mod.exports;

            // Presence
            if (!hooksApplied.Presence) {
                try {
                    if (hookPresence(exp)) {
                        hooksApplied.Presence = true;
                    }
                } catch (e) {
                    console.error("[Viky AI] Error scanning/applying Presence hooks:", e);
                }
            }

            // Seen
            if (!hooksApplied.Seen) {
                try {
                    if (hookSeen(exp)) {
                        hooksApplied.Seen = true;
                    }
                } catch (e) {
                    console.error("[Viky AI] Error scanning/applying Seen hooks:", e);
                }
            }

            // Status
            if (!hooksApplied.Status) {
                try {
                    if (hookStatus(exp)) {
                        hooksApplied.Status = true;
                    }
                } catch (e) {
                    console.error("[Viky AI] Error scanning/applying Status hooks:", e);
                }
            }

            // Chat
            if (!hooksApplied.Chat) {
                try {
                    if (hookChatStore(exp)) {
                        hooksApplied.Chat = true;
                    }
                } catch (e) {
                    console.error("[Viky AI] Error scanning/applying Chat hooks:", e);
                }
            }

            // Msg
            if (!hooksApplied.Msg) {
                try {
                    if (hookMsgStore(exp)) {
                        hooksApplied.Msg = true;
                    }
                } catch (e) {
                    console.error("[Viky AI] Error scanning/applying Msg hooks:", e);
                }
            }

            // Node Senders (Low-level interceptors)
            try {
                checkAndHookNodeSenders(exp);
                if (exp.default) {
                    checkAndHookNodeSenders(exp.default);
                }
            } catch (e) {
                // Ignore scanning errors
            }
        }
    }

    // Aggressive scanner schedule for startup (every 100ms for 60s)
    let scanCounter = 0;
    const scannerInterval = setInterval(() => {
        scanAndApplyHooks();
        scanCounter++;

        // If all stores are hooked, we can transition to a relaxed cycle
        const allApplied = hooksApplied.Presence && hooksApplied.Seen && hooksApplied.Status && hooksApplied.Chat && hooksApplied.Msg;
        if (allApplied) {
            clearInterval(scannerInterval);
            console.log("[Viky AI] All Webpack Store hooks applied successfully. Switched to standby background scanner.");
            setInterval(scanAndApplyHooks, 5000);
        } else if (scanCounter >= 600) {
            clearInterval(scannerInterval);
            console.log("[Viky AI] Initial fast scan timeout. Switched to relaxed background scanner.");
            setInterval(scanAndApplyHooks, 2000);
        }
    }, 100);


    // ===== Viky Sidebar Icon Injection =====
    // Injects the cute Viky AI icon into WhatsApp's left navigation sidebar.
    // Clicking it opens the extension's sidepanel and navigates to WhatsApp settings.
    function injectVikySidebarIcon() {
        if (document.getElementById('viky-sidebar-icon')) return;

        // 1. Find the main vertical sidebar container dynamically
        const findSidebarContainer = () => {
            const knownIcons = ['chat', 'status', 'newsletter', 'community', 'settings', 'menu'];
            for (const iconName of knownIcons) {
                const iconEl = document.querySelector(`span[data-icon="${iconName}"]`);
                if (iconEl) {
                    const btn = iconEl.closest('button, [role="button"], [role="tab"], a, div[tabindex]');
                    if (btn && btn.parentElement) {
                        let current = btn.parentElement;
                        for (let i = 0; i < 3; i++) {
                            if (!current || current === document.body) break;
                            const buttons = Array.from(current.querySelectorAll('button, [role="button"], [role="tab"], a, div[tabindex]'));
                            const visibleButtons = buttons.filter(b => {
                                const rect = b.getBoundingClientRect();
                                return rect.width > 0 && rect.height > 0 && rect.width <= 120;
                            });
                            
                            const tops = new Set(visibleButtons.map(b => Math.round(b.getBoundingClientRect().top)));
                            if (tops.size >= 3) {
                                return current;
                            }
                            current = current.parentElement;
                        }
                    }
                }
            }
            // Fallback to basic selectors
            return document.querySelector('div[role="navigation"]') 
                || document.querySelector('nav')
                || document.querySelector('header')?.closest('div')?.querySelector('[data-testid="default-user"]')?.closest('div[class]')?.parentElement;
        };

        const sidebarContainer = findSidebarContainer();
        if (!sidebarContainer) {
            console.log('[Viky AI] Sidebar container not found yet, will retry...');
            return;
        }

        // 2. Identify all sidebar buttons within the container and sort them top to bottom
        const buttons = Array.from(sidebarContainer.querySelectorAll('button, [role="button"], [role="tab"], a, div[tabindex]'));
        const sidebarButtons = buttons.filter(btn => {
            const rect = btn.getBoundingClientRect();
            // Allow larger max width in case of different languages/labels, but keep it constrained
            return rect.width > 0 && rect.height > 0 && rect.width <= 150; 
        });
        sidebarButtons.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);

        // 3. Find the target button to insert after
        let targetBtn = null;
        const advertiseIdentifiers = ['advertise', 'directory', 'business', 'shop', 'store', 'ad-outline', 'ad', 'megaphone', 'marketing', 'meta-ads'];
        const advertiseLabels = ['advertise', 'reklam', 'ads', 'business', 'işletme', 'announcement', 'duyuru', 'marketing', 'shop', 'store'];

        for (const btn of sidebarButtons) {
            const iconEl = btn.querySelector('span[data-icon]');
            const iconName = iconEl ? (iconEl.getAttribute('data-icon') || '').toLowerCase() : '';
            const label = (btn.getAttribute('aria-label') || btn.getAttribute('title') || '').toLowerCase();
            
            const isAdvertise = advertiseIdentifiers.some(id => iconName.includes(id)) 
                             || advertiseLabels.some(l => label.includes(l));
                             
            if (isAdvertise) {
                targetBtn = btn;
                console.log('[Viky AI] Found advertise button geometrically:', btn);
                break;
            }
        }

        // Fallback 1: If no advertise icon was found, look for any other known icons to place after
        if (!targetBtn) {
            const fallbackTargetIcons = ['newsletter', 'channel', 'channels', 'community', 'communities', 'status', 'chat'];
            for (const target of fallbackTargetIcons) {
                const btn = sidebarButtons.find(b => {
                    const iconEl = b.querySelector('span[data-icon]');
                    const iconName = iconEl ? (iconEl.getAttribute('data-icon') || '').toLowerCase() : '';
                    return iconName.includes(target);
                });
                if (btn) {
                    targetBtn = btn;
                    console.log(`[Viky AI] Advertise button not found, placing after fallback icon: ${target}`, btn);
                    break;
                }
            }
        }

        // Fallback 2: Try placing after the 4th button
        if (!targetBtn && sidebarButtons.length >= 4) {
            targetBtn = sidebarButtons[3];
            console.log('[Viky AI] Placing after 4th sidebar button as fallback.', targetBtn);
        }

        // 4. Trace the direct child wrapper under the vertical sidebarContainer
        const getDirectChildOf = (parent, child) => {
            let current = child;
            while (current && current.parentElement !== parent && current.parentElement !== document.body) {
                current = current.parentElement;
            }
            return current === document.body ? null : current;
        };

        const targetWrapper = targetBtn ? getDirectChildOf(sidebarContainer, targetBtn) : null;

        // 5. Build the Viky icon button
        const vikyBtn = document.createElement('div');
        vikyBtn.id = 'viky-sidebar-icon';
        vikyBtn.title = 'Viky AI Settings';
        vikyBtn.setAttribute('role', 'button');
        vikyBtn.setAttribute('tabindex', '0');

        // Get the extension icon URL via the config bridge
        const configEl = document.getElementById('viky-wa-config');
        let iconUrl = '';
        if (configEl) {
            iconUrl = configEl.getAttribute('data-icon-url') || '';
        }

        vikyBtn.innerHTML = `
            <div style="
                display: flex;
                align-items: center;
                justify-content: center;
                width: 28px;
                height: 28px;
                cursor: pointer;
                opacity: 0.7;
                transition: all 0.2s ease;
                filter: drop-shadow(0 0 4px rgba(0, 168, 132, 0.3));
            ">
                ${iconUrl 
                    ? `<img src="${iconUrl}" alt="Viky AI" style="width: 28px; height: 28px; border-radius: 50%;">`
                    : `<svg viewBox="0 0 24 24" width="28" height="28" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="#00a884" stroke-width="2" fill="none"/>
                        <circle cx="9" cy="10" r="1.5" fill="#00a884"/>
                        <circle cx="15" cy="10" r="1.5" fill="#00a884"/>
                        <path d="M8 14.5c0 0 2 2.5 4 2.5s4-2.5 4-2.5" stroke="#00a884" stroke-width="1.5" stroke-linecap="round"/>
                        <circle cx="12" cy="12" r="5" stroke="#00a884" stroke-width="1" fill="none" opacity="0.3"/>
                       </svg>`
                }
            </div>
        `;

        vikyBtn.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 10px 0;
            cursor: pointer;
            position: relative;
            width: 100%;
            height: 48px;
            box-sizing: border-box;
            transition: background-color 0.15s ease;
        `;

        // Hover effects matching light and dark theme backgrounds natively
        vikyBtn.addEventListener('mouseenter', () => {
            const isDark = document.body.classList.contains('dark') || document.documentElement.classList.contains('dark');
            const inner = vikyBtn.querySelector('div');
            if(inner) {
                inner.style.opacity = '1';
                inner.style.transform = 'scale(1.1)';
                inner.style.filter = 'drop-shadow(0 0 8px rgba(0, 168, 132, 0.6))';
            }
            vikyBtn.style.backgroundColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)';
        });
        vikyBtn.addEventListener('mouseleave', () => {
            const inner = vikyBtn.querySelector('div');
            if(inner) {
                inner.style.opacity = '0.7';
                inner.style.transform = 'scale(1)';
                inner.style.filter = 'drop-shadow(0 0 4px rgba(0, 168, 132, 0.3))';
            }
            vikyBtn.style.backgroundColor = 'transparent';
        });

        // Click handler: dispatch event to content script to open sidepanel WhatsApp settings
        vikyBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            // Dispatch a custom event that the content script (ISOLATED world) can listen for
            window.dispatchEvent(new CustomEvent('viky-open-wa-settings'));
            console.log('[Viky AI] Sidebar icon clicked — requesting sidepanel WhatsApp settings.');

            // Visual feedback
            const inner = vikyBtn.querySelector('div');
            if(inner) {
                inner.style.transform = 'scale(0.9)';
                setTimeout(() => {
                    inner.style.transform = 'scale(1)';
                }, 150);
            }
        });

        // 6. Wrap the button in a styled clone element to perfectly match vertical layout structure
        const vikyBtnWrapper = document.createElement('div');
        if (targetWrapper) {
            vikyBtnWrapper.className = targetWrapper.className;
            vikyBtnWrapper.style.cssText = targetWrapper.style.cssText;
        }
        vikyBtnWrapper.appendChild(vikyBtn);

        // 7. Inject the wrapper as a direct vertical sibling
        if (targetWrapper && targetWrapper.parentElement === sidebarContainer) {
            sidebarContainer.insertBefore(vikyBtnWrapper, targetWrapper.nextSibling);
            console.log('[Viky AI] ✅ Sidebar icon wrapper injected as vertical sibling.');
        } else if (sidebarContainer) {
            sidebarContainer.appendChild(vikyBtnWrapper);
            console.log('[Viky AI] ✅ Sidebar icon wrapper appended directly to container.');
        }
    }

    // Retry injecting the sidebar icon until WhatsApp's DOM is ready
    function startSidebarIconInjection() {
        // Try immediately
        injectVikySidebarIcon();

        // Retry periodically (WhatsApp loads its UI dynamically)
        let sidebarRetries = 0;
        const sidebarInterval = setInterval(() => {
            if (document.getElementById('viky-sidebar-icon')) {
                clearInterval(sidebarInterval);
                return;
            }
            injectVikySidebarIcon();
            sidebarRetries++;
            if (sidebarRetries > 60) { // Stop after ~30 seconds
                clearInterval(sidebarInterval);
                console.log('[Viky AI] Sidebar icon injection gave up after 30s.');
            }
        }, 500);

        // Also watch for navigation changes that might remove and re-render the sidebar
        const sidebarObserver = new MutationObserver(() => {
            if (!document.getElementById('viky-sidebar-icon')) {
                injectVikySidebarIcon();
            }
        });
        if (document.body) {
            sidebarObserver.observe(document.body, { childList: true, subtree: true });
        }
    }

    // Wait for body, then start sidebar icon injection
    if (document.body) {
        startSidebarIconInjection();
    } else {
        const waitForBodyForSidebar = new MutationObserver(() => {
            if (document.body) {
                waitForBodyForSidebar.disconnect();
                startSidebarIconInjection();
            }
        });
        waitForBodyForSidebar.observe(document.documentElement, { childList: true });
    }

    // ===== DOM Interventions (Context Menu, Extra Buttons, Status Downloader) =====
    let activeMsgElement = null;

    document.addEventListener('click', (e) => {
        const bubble = e.target.closest('.message-in, .message-out');
        if (bubble) {
            activeMsgElement = bubble;
        }
    }, true);

    document.addEventListener('contextmenu', (e) => {
        const bubble = e.target.closest('.message-in, .message-out');
        if (bubble) {
            activeMsgElement = bubble;
        }
    }, true);

    // ===== Inject Viky buttons into each message's hover action bar =====
    // WhatsApp shows a small floating bar (emoji reaction, forward, dropdown)
    // when you hover over a message. We inject Like + Translate buttons there.

    function createVikyActionBtn(id, emoji, title, onClick) {
        const btn = document.createElement('div');
        btn.className = 'viky-action-btn';
        btn.dataset.vikyId = id;
        btn.title = title;
        btn.style.cssText = `
            cursor: pointer;
            padding: 4px;
            margin: 0 4px;
            font-size: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            user-select: none;
            border-radius: 50%;
            transition: background 0.15s ease;
            width: 28px;
            height: 28px;
        `;
        btn.innerHTML = emoji;
        btn.addEventListener('mouseenter', () => btn.style.background = 'rgba(255,255,255,0.1)');
        btn.addEventListener('mouseleave', () => btn.style.background = 'transparent');
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            onClick(e);
        });
        return btn;
    }

    function injectMsgHoverButtons(actionBar) {
        if (!settings.wa_extra_buttons_enabled) return;
        if (actionBar.querySelector('.viky-action-btn')) return;

        // Skip if inside composer, search panel or reply preview
        const isInsideComposer = actionBar.closest('footer') || 
                                 actionBar.closest('[data-testid="composer-background"]') || 
                                 actionBar.closest('[data-testid="reply-preview"]');
        if (isInsideComposer) return;

        // Find the parent message bubble for context
        const msgBubble = actionBar.closest('.message-in, .message-out');
        if (!msgBubble) return;

        // Find the react icon/button
        const reactIcon = actionBar.querySelector('span[data-icon="react"]');
        let reactBtn = null;
        if (reactIcon) {
            let current = reactIcon;
            while (current && current.parentElement !== actionBar) {
                current = current.parentElement;
            }
            if (current) reactBtn = current;
        }

        let lastInserted = reactBtn;

        // Inject Like button
        if (settings.wa_like_button) {
            const likeBtn = createVikyActionBtn('like', '👍', 'Quick Like (Viky)', () => {
                const footer = document.querySelector('footer');
                if (!footer) return;
                const inputContainer = footer.querySelector('div[contenteditable="true"]');
                if (!inputContainer) return;
                inputContainer.focus();
                document.execCommand('insertText', false, '👍');
                setTimeout(() => {
                    const sendBtn = footer.querySelector('span[data-icon="send"]');
                    if (sendBtn) sendBtn.click();
                }, 100);
            });
            
            if (lastInserted) {
                lastInserted.insertAdjacentElement('afterend', likeBtn);
                lastInserted = likeBtn;
            } else {
                actionBar.appendChild(likeBtn);
                lastInserted = likeBtn;
            }
        }

        // Inject Translate button (for text messages only)
        if (settings.wa_translate_message) {
            const textSpan = msgBubble.querySelector('span.selectable-text');
            if (textSpan) {
                const translateBtn = createVikyActionBtn('translate', '🌐', 'Translate Message (Viky)', () => {
                    translateMessage(textSpan);
                });
                
                if (lastInserted) {
                    lastInserted.insertAdjacentElement('afterend', translateBtn);
                    lastInserted = translateBtn;
                } else {
                    actionBar.appendChild(translateBtn);
                    lastInserted = translateBtn;
                }
            }
        }
    }

    // Find WhatsApp's message hover action bars and inject buttons
    // The action bar contains the emoji reaction button, forward, and dropdown
    function scanForActionBars() {
        if (!settings.wa_extra_buttons_enabled) return;

        // WhatsApp's action bar uses span[data-icon="emoji"] for the reaction button.
        // The bar is a flex container that is a sibling or ancestor of these icons.
        const emojiIcons = document.querySelectorAll('span[data-icon="react"]');
        emojiIcons.forEach(icon => {
            // Walk up to find the action bar container (the flex row of buttons)
            const actionBar = icon.closest('div[role="toolbar"]') || icon.parentElement?.parentElement;
            if (actionBar && !actionBar.querySelector('.viky-action-btn')) {
                injectMsgHoverButtons(actionBar);
            }
        });
    }

    function isStatusViewerActive() {
        return getStatusViewerContainer() !== null;
    }

    // Find the status viewer container element
    function getStatusViewerContainer() {
        // Try direct selectors first
        const directSelectors = [
            '[data-testid="status-viewer"]',
            '[data-testid*="status"][data-testid*="viewer"]',
            '[data-testid="status-v3-viewer"]',
            '[data-testid*="status-v3"]'
        ];
        for (const sel of directSelectors) {
            const el = document.querySelector(sel);
            if (el && el.offsetWidth > 200) return el;
        }

        // Find by status icons - walk up to find the viewer container
        const statusIcon = document.querySelector('span[data-icon*="status-"]') || 
                           document.querySelector('span[data-icon="x-viewer"]') ||
                           document.querySelector('span[data-icon="status-pause"]') ||
                           document.querySelector('span[data-icon="status-play"]');
        if (statusIcon) {
            let parent = statusIcon.parentElement;
            for (let i = 0; i < 10 && parent; i++) {
                if (parent.offsetWidth > window.innerWidth * 0.6 && parent.offsetHeight > window.innerHeight * 0.6) {
                    return parent;
                }
                parent = parent.parentElement;
            }
        }

        // Structural fallback: find the large overlay with media
        const allDivs = document.querySelectorAll('div');
        for (const div of allDivs) {
            // High performance bounds check before querying computed styles
            if (div.offsetWidth < window.innerWidth * 0.7 || div.offsetHeight < window.innerHeight * 0.7) continue;
            
            const style = window.getComputedStyle(div);
            if (style.position !== 'fixed' && style.position !== 'absolute') continue;
            
            const hasMedia = div.querySelector('img[src*="blob:"], video[src*="blob:"], img[src*="media"], video');
            if (!hasMedia) continue;
            
            const hasStatusControls = div.querySelector('span[data-icon*="status"], span[data-icon="x-viewer"], span[data-icon="pause"], span[data-icon="play"], [data-testid*="status"]');
            const hasProgressSegments = div.querySelector('div[style*="width:"][style*="height:"]') || div.querySelector('[role="progressbar"]') || div.querySelectorAll('div > div > div[style*="flex"]').length > 5;
            
            if (hasStatusControls || hasProgressSegments) {
                return div;
            }
        }

        return null;
    }

    // Inject "Download" button on Status Update Viewer
    function injectStatusDownloadBtn() {
        if (!settings.wa_extra_buttons_enabled || !settings.wa_download_status) return;
        if (document.getElementById('viky-status-download-btn')) return;
        
        const viewer = getStatusViewerContainer();
        if (!viewer) {
            console.warn('[Viky AI] Status viewer container not found');
            return;
        }

        console.log('[Viky AI] ✅ Status viewer detected, injecting download button');

        const downloadBtn = document.createElement('div');
        downloadBtn.id = 'viky-status-download-btn';
        downloadBtn.setAttribute('role', 'button');
        downloadBtn.setAttribute('tabindex', '0');
        downloadBtn.title = 'Download Status Media (Viky)';

        // Premium Download Icon SVG
        downloadBtn.innerHTML = `
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
        `;

        downloadBtn.addEventListener('mouseenter', () => downloadBtn.style.background = 'rgba(255,255,255,0.15)');
        downloadBtn.addEventListener('mouseleave', () => downloadBtn.style.background = 'rgba(0,0,0,0.4)');

        downloadBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            
            // Find current active status video or image
            let media = null;
            const searchRoot = getStatusViewerContainer() || viewer;
            
            // Find the largest visible media element
            const elements = searchRoot.querySelectorAll('img, video');
            let maxArea = 0;
            elements.forEach(el => {
                const rect = el.getBoundingClientRect();
                const area = rect.width * rect.height;
                if (area > maxArea && rect.width > 100 && rect.height > 100) {
                    maxArea = area;
                    media = el;
                }
            });

            // Fallback: look for blob: media anywhere inside searchRoot
            if (!media) {
                const blobMedia = searchRoot.querySelectorAll('img[src*="blob:"], video[src*="blob:"]');
                let maxA = 0;
                blobMedia.forEach(el => {
                    const rect = el.getBoundingClientRect();
                    const area = rect.width * rect.height;
                    if (area > maxA && rect.width > 100) {
                        maxA = area;
                        media = el;
                    }
                });
            }
            
            if (media && media.src) {
                // Visual feedback
                downloadBtn.style.transform = 'scale(0.9)';
                setTimeout(() => downloadBtn.style.transform = 'scale(1)', 200);

                fetch(media.src)
                    .then(res => res.blob())
                    .then(blob => {
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'whatsapp-status-' + Date.now() + (media.tagName === 'VIDEO' ? '.mp4' : '.jpg');
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                        console.log('[Viky AI] ✅ Status media downloaded');
                    })
                    .catch(err => {
                        console.error("[Viky AI] Status download error", err);
                        alert("Download failed. The media may not be fully loaded yet.");
                    });
            } else {
                alert("Could not locate active status media. Try waiting for the status to fully load.");
            }
        });

        // Placement Strategy: Try to insert near the existing control buttons
        let placed = false;
        
        // Strategy 1: Find the control bar with status icons
        const controlIcons = viewer.querySelectorAll('span[data-icon*="status-"], span[data-icon="x-viewer"], span[data-icon*="mute"], span[data-icon*="pause"], span[data-icon*="play"]');
        if (controlIcons.length > 0) {
            // Walk up from the first icon to find a flex container with multiple buttons
            let controlBar = controlIcons[0].parentElement;
            for (let i = 0; i < 5 && controlBar; i++) {
                const btns = controlBar.querySelectorAll('button, [role="button"], span[data-icon]');
                if (btns.length >= 2) {
                    // Found the control bar — style button to match
                    downloadBtn.style.cssText = `
                        cursor: pointer;
                        padding: 8px;
                        margin-left: 8px;
                        margin-right: 8px;
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        border-radius: 50%;
                        transition: all 0.15s ease;
                        flex-shrink: 0;
                        z-index: 9999;
                        background: transparent;
                    `;
                    controlBar.appendChild(downloadBtn);
                    placed = true;
                    break;
                }
                controlBar = controlBar.parentElement;
            }
        }

        // Strategy 2: Find any button bar in the top header area
        if (!placed) {
            const allBtns = viewer.querySelectorAll('button, [role="button"]');
            let headerBar = null;
            for (const btn of allBtns) {
                const rect = btn.getBoundingClientRect();
                // Look for buttons in the top 120px of the viewer
                if (rect.top < 120 && rect.right > window.innerWidth * 0.5) {
                    let parent = btn.parentElement;
                    for (let i = 0; i < 3 && parent; i++) {
                        const childBtns = parent.querySelectorAll('button, [role="button"]');
                        if (childBtns.length >= 2) {
                            headerBar = parent;
                            break;
                        }
                        parent = parent.parentElement;
                    }
                    if (headerBar) break;
                }
            }
            if (headerBar) {
                downloadBtn.style.cssText = `
                    cursor: pointer;
                    padding: 8px;
                    margin-left: 8px;
                    margin-right: 8px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 50%;
                    transition: all 0.15s ease;
                    flex-shrink: 0;
                    z-index: 9999;
                    background: transparent;
                `;
                headerBar.appendChild(downloadBtn);
                placed = true;
            }
        }

        // Strategy 3: Fallback — Absolute-position floating button inside the status viewer overlay (failsafe)
        if (!placed) {
            downloadBtn.style.cssText = `
                position: absolute;
                bottom: 80px;
                right: 30px;
                z-index: 99999;
                cursor: pointer;
                padding: 14px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                background: rgba(0, 0, 0, 0.5);
                backdrop-filter: blur(8px);
                -webkit-backdrop-filter: blur(8px);
                border: 1px solid rgba(255, 255, 255, 0.15);
                box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
                transition: all 0.2s ease;
            `;
            viewer.appendChild(downloadBtn);
            placed = true;
        }

        // Cleanup: Remove the button when status viewer closes
        const cleanupObserver = new MutationObserver(() => {
            if (!isStatusViewerActive()) {
                const btn = document.getElementById('viky-status-download-btn');
                if (btn) btn.remove();
                cleanupObserver.disconnect();
            }
        });
        cleanupObserver.observe(document.body, { childList: true, subtree: true });
    }

    // Periodically check for status viewer and inject download button
    function scanForStatusViewer() {
        if (!settings.wa_extra_buttons_enabled || !settings.wa_download_status) return;
        if (document.getElementById('viky-status-download-btn')) return;
        injectStatusDownloadBtn();
    }

    // Handle Custom items in Message Context Dropdown Menu
    function handleContextMenu(menu) {
        if (!activeMsgElement) return;

        // Check if item is already added
        if (menu.querySelector('.viky-menu-item')) return;

        const isAudio = activeMsgElement.querySelector('audio') || activeMsgElement.querySelector('span[data-icon*="audio"]') || activeMsgElement.querySelector('span[data-icon*="ptt"]');
        const textSpan = activeMsgElement.querySelector('span.selectable-text');

        // Create Translation menu item
        if (textSpan && settings.wa_translate_message) {
            const item = document.createElement('div');
            item.className = 'viky-menu-item';
            item.style.padding = '10px 24px';
            item.style.cursor = 'pointer';
            item.style.fontSize = '14px';
            item.style.color = '#d1d2d3';
            item.innerHTML = '🌐 Translate Message (Viky)';

            item.addEventListener('mouseenter', () => item.style.backgroundColor = 'rgba(255,255,255,0.06)');
            item.addEventListener('mouseleave', () => item.style.backgroundColor = 'transparent');
            item.addEventListener('click', () => {
                // Dismiss menu
                document.body.click();
                translateMessage(textSpan);
            });

            menu.appendChild(item);
        }

        // Create Audio Transcription menu item
        if (isAudio && settings.wa_transcribe_audio) {
            const item = document.createElement('div');
            item.className = 'viky-menu-item';
            item.style.padding = '10px 24px';
            item.style.cursor = 'pointer';
            item.style.fontSize = '14px';
            item.style.color = '#d1d2d3';
            item.innerHTML = '🎙️ Transcribe Audio (Viky)';

            item.addEventListener('mouseenter', () => item.style.backgroundColor = 'rgba(255,255,255,0.06)');
            item.addEventListener('mouseleave', () => item.style.backgroundColor = 'transparent');
            item.addEventListener('click', () => {
                // Dismiss menu
                document.body.click();
                transcribeAudio(activeMsgElement.querySelector('audio'));
            });

            menu.appendChild(item);
        }
    }

    // Call translation helper
    function translateMessage(textSpan) {
        const originalText = textSpan.innerText;
        const msgBubble = textSpan.closest('.message-in, .message-out');
        if (!msgBubble) return;

        let translationDiv = msgBubble.querySelector('.viky-translation-div');
        if (!translationDiv) {
            translationDiv = document.createElement('div');
            translationDiv.className = 'viky-translation-div';
            translationDiv.style.borderTop = '1px solid rgba(255,255,255,0.08)';
            translationDiv.style.marginTop = '8px';
            translationDiv.style.paddingTop = '6px';
            translationDiv.style.fontSize = '12px';
            translationDiv.style.color = '#00a884';
            textSpan.parentElement.appendChild(translationDiv);
        }
        translationDiv.innerHTML = `🌐 <strong>Viky Translation:</strong> Translating...`;

        const requestId = 'translate-' + Math.random().toString(36).substr(2, 9);
        
        // Post message to ISOLATED content script
        window.postMessage({
            sender: 'viky-wa-inject',
            action: 'TRANSLATE_TEXT',
            requestId: requestId,
            payload: {
                action: 'TRANSLATE_TEXT',
                text: originalText
            }
        }, '*');

        // Wait for response
        const listener = (event) => {
            if (event.data && event.data.sender === 'viky-wa-content' && event.data.action === 'TRANSLATE_TEXT_RESPONSE' && event.data.requestId === requestId) {
                window.removeEventListener('message', listener);
                const res = event.data.response;
                if (res && res.success) {
                    translationDiv.innerHTML = `🌐 <strong>Viky Translation:</strong> ${res.text}`;
                } else {
                    translationDiv.innerHTML = `🌐 <strong>Viky Translation:</strong> Failed to translate (${res ? res.error : 'Unknown error'}).`;
                }
            }
        };
        window.addEventListener('message', listener);
    }

    // Call transcription helper
    function transcribeAudio(audioEl) {
        if (!audioEl || !audioEl.src) {
            alert("No audio tag found in this bubble.");
            return;
        }

        const msgBubble = audioEl.closest('.message-in, .message-out');
        if (!msgBubble) return;

        let transcribeDiv = msgBubble.querySelector('.viky-transcription-div');
        if (!transcribeDiv) {
            transcribeDiv = document.createElement('div');
            transcribeDiv.className = 'viky-transcription-div';
            transcribeDiv.style.borderTop = '1px solid rgba(255,255,255,0.08)';
            transcribeDiv.style.marginTop = '8px';
            transcribeDiv.style.paddingTop = '6px';
            transcribeDiv.style.fontSize = '12px';
            transcribeDiv.style.color = '#34b7f1';
            msgBubble.appendChild(transcribeDiv);
        }
        transcribeDiv.innerHTML = `🎙️ <strong>Viky Transcript:</strong> Fetching audio and transcribing...`;

        // Fetch audio blob and convert to Base64
        fetch(audioEl.src)
            .then(res => res.blob())
            .then(blob => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    const base64Data = reader.result.split(',')[1];
                    const requestId = 'transcribe-' + Math.random().toString(36).substr(2, 9);
                    
                    window.postMessage({
                        sender: 'viky-wa-inject',
                        action: 'TRANSCRIBE_AUDIO',
                        requestId: requestId,
                        payload: {
                            action: 'TRANSCRIBE_AUDIO',
                            audioBase64: base64Data
                        }
                    }, '*');

                    const listener = (event) => {
                        if (event.data && event.data.sender === 'viky-wa-content' && event.data.action === 'TRANSCRIBE_AUDIO_RESPONSE' && event.data.requestId === requestId) {
                            window.removeEventListener('message', listener);
                            const res = event.data.response;
                            if (res && res.success) {
                                transcribeDiv.innerHTML = `🎙️ <strong>Viky Transcript:</strong> "${res.text}"`;
                            } else {
                                transcribeDiv.innerHTML = `🎙️ <strong>Viky Transcript:</strong> Transcription failed (${res ? res.error : 'Unknown'}).`;
                            }
                        }
                    };
                    window.addEventListener('message', listener);
                };
                reader.readAsDataURL(blob);
            })
            .catch(err => {
                console.error("[Viky AI] Failed to fetch audio blob", err);
                transcribeDiv.innerHTML = `🎙️ <strong>Viky Transcript:</strong> Failed to fetch audio stream.`;
            });
    }

    // Observe changes to document tree
    const domObserver = new MutationObserver((mutations) => {
        if (!settings.wa_extra_buttons_enabled) return;

        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (node.nodeType !== Node.ELEMENT_NODE) continue;

                // 1. Context Menu injection
                const menu = node.querySelector('[role="menu"]') || (node.getAttribute('role') === 'menu' ? node : null);
                if (menu) {
                    handleContextMenu(menu);
                }

                // 2. Status Viewer detection — broad triggers for status viewer opening
                if (settings.wa_download_status) {
                    const hasStatusSignal = node.querySelector?.('span[data-icon*="status-"]') ||
                                            node.querySelector?.('span[data-icon="x-viewer"]') ||
                                            node.querySelector?.('[data-testid*="status"]') ||
                                            node.querySelector?.('img[src*="blob:"]') ||
                                            node.querySelector?.('video[src*="blob:"]');
                    if (hasStatusSignal) {
                        // Small delay to let the full status viewer DOM render
                        setTimeout(() => injectStatusDownloadBtn(), 300);
                        setTimeout(() => injectStatusDownloadBtn(), 800);
                        setTimeout(() => injectStatusDownloadBtn(), 1500);
                    }
                }

                // 3. Message hover action bar injection
                // When a new action bar appears (hovering over a message), inject Like/Translate buttons
                const actionBars = node.querySelectorAll?.('div[role="toolbar"]') || [];
                actionBars.forEach(bar => injectMsgHoverButtons(bar));

                // Also check if the node itself is or contains the react emoji icon
                const reactIcons = node.querySelectorAll?.('span[data-icon="react"]') || [];
                reactIcons.forEach(icon => {
                    const bar = icon.closest('div[role="toolbar"]') || icon.parentElement?.parentElement;
                    if (bar) injectMsgHoverButtons(bar);
                });

                // Fallback: check for any newly appeared button row with data-icon="down-context"
                const downIcons = node.querySelectorAll?.('span[data-icon="down-context"]') || [];
                downIcons.forEach(icon => {
                    const bar = icon.closest('div[role="toolbar"]') || icon.parentElement?.parentElement?.parentElement;
                    if (bar) injectMsgHoverButtons(bar);
                });
            }
        }

        // Also run broader scans for elements that may have been missed
        scanForActionBars();
        scanForStatusViewer();
    });

    domObserver.observe(document.body, { childList: true, subtree: true });

    // Set up periodic fallback scans for the status downloader (robust against race conditions)
    setInterval(scanForStatusViewer, 1000);

    // ===== Webpack Parasite Initialization & Execution Interception =====
    function applyHooksToExports(exp) {
        if (!exp) return;
        
        if (!hooksApplied.Presence) {
            if (hookPresence(exp)) hooksApplied.Presence = true;
        }
        if (!hooksApplied.Seen) {
            if (hookSeen(exp)) hooksApplied.Seen = true;
        }
        if (!hooksApplied.Status) {
            if (hookStatus(exp)) hooksApplied.Status = true;
        }
        if (!hooksApplied.Chat) {
            if (hookChatStore(exp)) hooksApplied.Chat = true;
        }
        if (!hooksApplied.Msg) {
            if (hookMsgStore(exp)) hooksApplied.Msg = true;
        }
        
        // Low-level node senders (Low-level presence packet interceptors)
        checkAndHookNodeSenders(exp);
        if (exp.default) {
            checkAndHookNodeSenders(exp.default);
        }
    }

    function hookPush(arr) {
        if (!arr || arr.__isVikyHooked) return;
        let activePush = arr.push;
        
        function wrapPush(origPush) {
            return function(chunk) {
                try {
                    const modules = chunk[1];
                    if (modules && typeof modules === 'object') {
                        for (const id in modules) {
                            const origModule = modules[id];
                            if (typeof origModule === 'function' && !origModule.__isVikyHooked) {
                                modules[id] = function(module, exports, __webpack_require__) {
                                    if (!webpackRequire && __webpack_require__) {
                                        webpackRequire = __webpack_require__;
                                    }
                                    const res = origModule.apply(this, arguments);
                                    try {
                                        if (module && module.exports) {
                                            applyHooksToExports(module.exports);
                                        }
                                    } catch (err) {}
                                    return res;
                                };
                                modules[id].__isVikyHooked = true;
                            }
                        }
                    }
                } catch (e) {
                    console.error("[Viky AI] Error in push wrapper:", e);
                }
                return origPush.apply(this, arguments);
            };
        }
        
        let hookedPush = wrapPush(activePush);
        
        Object.defineProperty(arr, 'push', {
            get: () => hookedPush,
            set: (newPush) => {
                activePush = newPush;
                hookedPush = wrapPush(newPush);
            },
            configurable: true
        });
        arr.__isVikyHooked = true;
        console.log("[Viky AI] Hooked chunkArray.push successfully.");
    }

    try {
        const chunkName = "webpackChunkwhatsapp_web_client";
        let chunkArray = window[chunkName];
        if (chunkArray) {
            hookPush(chunkArray);
        } else {
            let val = [];
            Object.defineProperty(window, chunkName, {
                get: () => val,
                set: (newVal) => {
                    val = newVal;
                    hookPush(val);
                },
                configurable: true
            });
        }
        
        // Also push a standard parasite chunk in case some chunks have already loaded and we can catch the require reference
        const parasiteId = "viky-parasite-" + Math.random().toString(36).substr(2, 9);
        window[chunkName] = window[chunkName] || [];
        window[chunkName].push([
            [parasiteId],
            {},
            function(o) {
                webpackRequire = o;
                scanAndApplyHooks();
            }
        ]);
        console.log("[Viky AI] Webpack parasite initialized.");
    } catch (e) {
        console.error("[Viky AI] Failed to initialize Webpack parasite loader", e);
    }

})();
