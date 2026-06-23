// Viky AI - Inline Spell Check Module (Local Engine)
// Uses typo.js + Hunspell dictionaries for instant client-side checking
(function () {
    'use strict';

    const DEBOUNCE_MS = 500; // faster debounce now that it's local
    const MIN_TEXT_LENGTH = 3;
    const MAX_TEXT_LENGTH = 2000;

    let enabled = true;
    let shadowRoot = null;
    let overlayContainer = null;
    let suggestionPopup = null;
    let activeElement = null;
    let currentErrors = [];
    let debounceTimer = null;
    let textCache = new Map();
    let activeOverlays = [];
    let popupVisible = false;
    let isApplyingCorrection = false;
    let typo = null; // Local Typo instance
    let typoLoaded = false;

    function hashText(text) {
        let hash = 0;
        for (let i = 0; i < text.length; i++) {
            hash = ((hash << 5) - hash) + text.charCodeAt(i);
            hash |= 0;
        }
        return hash.toString();
    }

    function isEditable(el) {
        if (!el || !el.tagName) return false;
        const tag = el.tagName.toUpperCase();
        if (tag === 'TEXTAREA') return true;
        if (tag === 'INPUT' && (el.type === 'text' || el.type === 'search' || el.type === 'url' || el.type === 'email' || !el.type)) return true;
        if (el.isContentEditable) return true;
        return false;
    }

    function getElementText(el) {
        if (!el) return '';
        const tag = el.tagName.toUpperCase();
        if (tag === 'TEXTAREA' || tag === 'INPUT') return el.value || '';
        if (el.isContentEditable) return el.innerText || el.textContent || '';
        return '';
    }

    function extractCurrentContext(el) {
        const fullText = getElementText(el);
        if (fullText.length <= MAX_TEXT_LENGTH) return fullText;
        let cursorPos = 0;
        const tag = el.tagName.toUpperCase();
        if (tag === 'TEXTAREA' || tag === 'INPUT') {
            cursorPos = el.selectionStart || 0;
        } else {
            const sel = window.getSelection();
            if (sel.rangeCount > 0) cursorPos = sel.getRangeAt(0).startOffset;
        }
        const start = Math.max(0, cursorPos - 250);
        const end = Math.min(fullText.length, cursorPos + 250);
        return fullText.substring(start, end);
    }

    // ===== Load Local Spellcheck Engine =====
    // NOTE: lib/typo.js is now loaded via manifest.json content_scripts (before this file),
    // so `Typo` is guaranteed to exist in the isolated world. The old <script>-tag injection
    // loaded typo.js into the MAIN world where this content script couldn't see it.
    function initTypo(callback) {
        if (typoLoaded) { if (callback) callback(); return; }
        if (typeof Typo === 'undefined') {
            console.error('Viky AI: Typo is undefined — check that lib/typo.js is listed in manifest.json content_scripts.js BEFORE spellcheck.js');
            return;
        }
        typo = new Typo(
            chrome.runtime.getURL('dict/en_US.dic'),
            chrome.runtime.getURL('dict/en_US.aff'),
            () => {
                typoLoaded = true;
                console.log('Viky AI: Local dictionary loaded');
                if (callback) callback();
            },
            { ignoreCase: true }
        );
    }

    // ===== Create overlay container in Shadow DOM =====
    function createOverlayContainer(sr) {
        const wrapper = sr.querySelector('.theme-wrapper');
        const parent = wrapper || sr;

        overlayContainer = document.createElement('div');
        overlayContainer.id = 'viky-spellcheck-overlays';
        overlayContainer.style.cssText = 'position: absolute; top: 0; left: 0; width: 0; height: 0; pointer-events: none; z-index: 2147483646;';
        parent.appendChild(overlayContainer);

        suggestionPopup = document.createElement('div');
        suggestionPopup.className = 'viky-suggestion-popup hidden';
        suggestionPopup.style.cssText = 'pointer-events: auto;';
        parent.appendChild(suggestionPopup);
    }

    function clearOverlays() {
        if (overlayContainer) overlayContainer.innerHTML = '';
        activeOverlays = [];
        hideSuggestionPopup();
    }

    // ===== Mirror div for textarea position calculation =====
    function getTextareaCharRects(textarea, wordStart, wordEnd) {
        const mirror = document.createElement('div');
        const computed = window.getComputedStyle(textarea);
        const props = [
            'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'letterSpacing',
            'wordSpacing', 'lineHeight', 'textTransform', 'paddingTop', 'paddingRight',
            'paddingBottom', 'paddingLeft', 'borderTopWidth', 'borderRightWidth',
            'borderBottomWidth', 'borderLeftWidth', 'boxSizing', 'width',
            'whiteSpace', 'wordWrap', 'overflowWrap', 'textIndent', 'direction', 'textAlign'
        ];
        mirror.style.cssText = 'position: absolute; visibility: hidden; overflow: hidden; white-space: pre-wrap; word-wrap: break-word;';
        props.forEach(p => { mirror.style[p] = computed[p]; });
        mirror.style.width = computed.width;

        const text = textarea.value;
        mirror.appendChild(document.createTextNode(text.substring(0, wordStart)));
        const wordSpan = document.createElement('span');
        wordSpan.textContent = text.substring(wordStart, wordEnd);
        mirror.appendChild(wordSpan);
        mirror.appendChild(document.createTextNode(text.substring(wordEnd)));
        document.body.appendChild(mirror);

        const wordRect = wordSpan.getBoundingClientRect();
        const mirrorRect = mirror.getBoundingClientRect();
        const textareaRect = textarea.getBoundingClientRect();
        const result = {
            top: wordRect.top - mirrorRect.top + textareaRect.top - textarea.scrollTop,
            left: wordRect.left - mirrorRect.left + textareaRect.left - textarea.scrollLeft,
            width: wordRect.width,
            height: wordRect.height
        };
        document.body.removeChild(mirror);
        return result;
    }

    // ===== Range-based rect for contenteditable =====
    function getContentEditableWordRects(el, wordStart, wordEnd) {
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false);
        let offset = 0, startNode, startOff, endNode, endOff;
        while (walker.nextNode()) {
            const node = walker.currentNode;
            const len = node.textContent.length;
            if (!startNode && offset + len > wordStart) { startNode = node; startOff = wordStart - offset; }
            if (!endNode && offset + len >= wordEnd) { endNode = node; endOff = wordEnd - offset; break; }
            offset += len;
        }
        if (!startNode || !endNode) return null;
        try {
            const range = document.createRange();
            range.setStart(startNode, startOff);
            range.setEnd(endNode, endOff);
            const rects = range.getClientRects();
            if (rects.length > 0) return { top: rects[0].top, left: rects[0].left, width: rects[0].width, height: rects[0].height };
        } catch (e) { }
        return null;
    }

    function recalcWordRect(el, wordStart, wordEnd) {
        const tag = el.tagName.toUpperCase();
        return (tag === 'TEXTAREA' || tag === 'INPUT')
            ? getTextareaCharRects(el, wordStart, wordEnd)
            : getContentEditableWordRects(el, wordStart, wordEnd);
    }

    // ===== Find the real position of a word in current text =====
    function findWordPosition(el, word, hintIndex) {
        const text = getElementText(el);
        if (!text || !word) return null;

        const isWordChar = (c) => c && !/[\s.,!?;:"'()\[\]{}<>\n\r]/.test(c);

        function expandToWordBoundaries(startIdx, endIdx) {
            let expandStart = startIdx;
            if (isWordChar(text[expandStart]) && expandStart > 0 && isWordChar(text[expandStart - 1])) {
                while (expandStart > 0 && isWordChar(text[expandStart - 1])) {
                    expandStart--;
                }
            }

            let expandEnd = endIdx;
            if (isWordChar(text[expandEnd - 1]) && expandEnd < text.length && isWordChar(text[expandEnd])) {
                while (expandEnd < text.length && isWordChar(text[expandEnd])) {
                    expandEnd++;
                }
            }
            return { start: expandStart, end: expandEnd };
        }

        if (text.substring(hintIndex, hintIndex + word.length) === word) {
            return expandToWordBoundaries(hintIndex, hintIndex + word.length);
        }

        const windowSize = 50;
        const windowStart = Math.max(0, hintIndex - windowSize);
        const windowText = text.substring(windowStart, hintIndex + word.length + windowSize);

        let localIdx = windowText.indexOf(word);
        if (localIdx !== -1) {
            const absIdx = windowStart + localIdx;
            return expandToWordBoundaries(absIdx, absIdx + word.length);
        }

        const globalIdx = text.indexOf(word);
        if (globalIdx !== -1) {
            return expandToWordBoundaries(globalIdx, globalIdx + word.length);
        }

        return null;
    }

    // ===== Tokenize text into words with positions =====
    function tokenize(text) {
        const tokens = [];
        const regex = /[a-zA-Z']+/g;
        let match;
        while ((match = regex.exec(text)) !== null) {
            tokens.push({
                word: match[0],
                start: match.index,
                end: match.index + match[0].length
            });
        }
        return tokens;
    }

    // ===== Render underlines =====
    function renderUnderlines(el, errors) {
        clearOverlays();
        if (!errors || errors.length === 0) return;

        const text = getElementText(el);
        const scrollX = window.scrollX || document.documentElement.scrollLeft;
        const scrollY = window.scrollY || document.documentElement.scrollTop;

        errors.forEach((error, idx) => {
            const pos = findWordPosition(el, error.word, error.index);
            if (!pos) return;
            error._resolvedStart = pos.start;
            error._resolvedEnd = pos.end;

            const rect = recalcWordRect(el, pos.start, pos.end);
            if (!rect) return;

            const clickPad = 4;
            const underline = document.createElement('div');
            underline.className = 'viky-spell-underline';
            underline.dataset.errorIndex = idx;
            underline.style.cssText = `
                position: absolute;
                top: ${rect.top - clickPad + scrollY}px;
                left: ${rect.left + scrollX}px;
                width: ${Math.max(rect.width, 20)}px;
                height: ${rect.height + clickPad * 2}px;
                pointer-events: auto;
                cursor: pointer;
                z-index: 2147483646;
                background: transparent;
            `;

            const color = '#ef4444';
            const wavyLine = document.createElement('div');
            wavyLine.style.cssText = `
                position: absolute;
                bottom: ${clickPad - 1}px;
                left: 0;
                width: 100%;
                height: 6px;
                pointer-events: none;
                background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='4' viewBox='0 0 8 4'%3E%3Cpath d='M0 3 Q2 0 4 3 Q6 6 8 3' fill='none' stroke='${encodeURIComponent(color)}' stroke-width='1.8'/%3E%3C/svg%3E");
                background-repeat: repeat-x;
                background-size: 8px 4px;
                background-position: bottom;
            `;
            underline.appendChild(wavyLine);

            underline.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                e.stopImmediatePropagation();
                e.preventDefault();
                const freshPos = findWordPosition(el, error.word, pos.start);
                if (!freshPos) return;
                const freshRect = recalcWordRect(el, freshPos.start, freshPos.end);
                if (freshRect) showSuggestionPopup(error, freshRect, el, freshPos.start, freshPos.end);
            });

            overlayContainer.appendChild(underline);
            activeOverlays.push(underline);
        });
    }

    // ===== Show suggestion popup =====
    function showSuggestionPopup(error, rect, el, wordStart, wordEnd) {
        const scrollX = window.scrollX || document.documentElement.scrollLeft;
        const scrollY = window.scrollY || document.documentElement.scrollTop;
        const typeLabel = 'Spelling';
        const typeColor = '#ef4444';
        const errorCount = currentErrors.length;

        // Get suggestions from local engine
        let suggestions = [];
        if (typo && typoLoaded) {
            suggestions = typo.suggest(error.word, 3);
        }

        const suggestionHtml = suggestions.length > 0
            ? suggestions.map(s => `<div class="suggestion-corrected" data-suggestion="${escapeHtml(s)}">${escapeHtml(s)}</div>`).join('')
            : `<div class="suggestion-corrected">${escapeHtml(error.suggestion || '(no suggestion)')}</div>`;

        suggestionPopup.innerHTML = `
            <div class="suggestion-header">
                <span class="suggestion-type" style="color: ${typeColor};">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="8" x2="12" y2="12"/>
                        <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    ${typeLabel}
                </span>
                <button class="suggestion-close" title="Close">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
            </div>
            <div class="suggestion-body">
                <div class="suggestion-original"><s>${escapeHtml(error.word)}</s></div>
                <div class="suggestion-arrow">→</div>
                ${suggestionHtml}
            </div>
            <div class="suggestion-actions">
                <button class="suggestion-btn dismiss">Dismiss</button>
                ${suggestions.length > 0 ? `<button class="suggestion-btn accept" data-suggestion="${escapeHtml(suggestions[0])}">Accept</button>` : ''}
            </div>
            ${errorCount > 1 ? `
            <div class="suggestion-fix-all">
                <button class="suggestion-btn fix-all">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="22 4 12 14.01 9 11.01"/>
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    </svg>
                    Fix All (${errorCount} errors)
                </button>
            </div>` : ''}
        `;

        let top = rect.top + rect.height + 8 + scrollY;
        let left = rect.left + scrollX;
        if (left + 240 > window.innerWidth + scrollX) left = window.innerWidth + scrollX - 250;
        if (left < 10) left = 10;
        if (top + 150 > window.innerHeight + scrollY) top = rect.top - 150 + scrollY;

        suggestionPopup.style.top = `${top}px`;
        suggestionPopup.style.left = `${left}px`;
        suggestionPopup.classList.remove('hidden');
        popupVisible = true;

        // Close
        suggestionPopup.querySelector('.suggestion-close').addEventListener('mousedown', (e) => {
            e.stopPropagation(); e.stopImmediatePropagation(); e.preventDefault();
            hideSuggestionPopup();
        });

        // Dismiss
        suggestionPopup.querySelector('.suggestion-btn.dismiss').addEventListener('mousedown', (e) => {
            e.stopPropagation(); e.stopImmediatePropagation(); e.preventDefault();
            const overlay = activeOverlays.find(u => u.dataset.errorIndex == currentErrors.indexOf(error).toString());
            if (overlay) overlay.remove();
            currentErrors = currentErrors.filter(err => err !== error);
            hideSuggestionPopup();
        });

        // Accept (using the first suggestion)
        const acceptBtn = suggestionPopup.querySelector('.suggestion-btn.accept');
        if (acceptBtn) {
            acceptBtn.addEventListener('mousedown', (e) => {
                e.stopPropagation(); e.stopImmediatePropagation(); e.preventDefault();
                const sug = acceptBtn.dataset.suggestion || suggestions[0] || error.suggestion;
                popupVisible = false;
                suggestionPopup.classList.add('hidden');
                applySingleCorrection(el, { ...error, suggestion: sug });
            });
        }

        // Fix All
        const fixAllBtn = suggestionPopup.querySelector('.suggestion-btn.fix-all');
        if (fixAllBtn) {
            fixAllBtn.addEventListener('mousedown', (e) => {
                e.stopPropagation(); e.stopImmediatePropagation(); e.preventDefault();
                popupVisible = false;
                suggestionPopup.classList.add('hidden');
                applyAllCorrections(el);
            });
        }
    }

    function hideSuggestionPopup() {
        if (suggestionPopup) {
            suggestionPopup.classList.add('hidden');
            popupVisible = false;
            setTimeout(() => { if (!popupVisible) suggestionPopup.innerHTML = ''; }, 150);
        }
    }

    // ===== Apply a SINGLE correction =====
    function applySingleCorrection(el, error) {
        isApplyingCorrection = true;
        const tag = el.tagName.toUpperCase();

        if (tag === 'TEXTAREA' || tag === 'INPUT') {
            el.focus();
            const text = el.value;
            const pos = findWordPosition(el, error.word, error._resolvedStart || error.index);
            if (!pos) {
                isApplyingCorrection = false;
                return;
            }

            try {
                el.setRangeText(error.suggestion, pos.start, pos.end, 'end');
            } catch (e) {
                el.value = text.substring(0, pos.start) + error.suggestion + text.substring(pos.end);
            }

            if (el.value.includes(error.word)) {
                el.value = el.value.replace(error.word, error.suggestion);
            }

            try {
                el.dispatchEvent(new InputEvent('input', {
                    bubbles: true, cancelable: false,
                    inputType: 'insertReplacementText', data: error.suggestion
                }));
            } catch (e) {
                el.dispatchEvent(new Event('input', { bubbles: true }));
            }
            el.dispatchEvent(new Event('change', { bubbles: true }));

        } else if (el.isContentEditable) {
            const text = getElementText(el);
            const pos = findWordPosition(el, error.word, error._resolvedStart || error.index);
            if (!pos) {
                isApplyingCorrection = false;
                return;
            }

            const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false);
            let offset = 0, startNode, startOff, endNode, endOff;
            while (walker.nextNode()) {
                const node = walker.currentNode;
                const len = node.textContent.length;
                if (!startNode && offset + len > pos.start) { startNode = node; startOff = pos.start - offset; }
                if (!endNode && offset + len >= pos.end) { endNode = node; endOff = pos.end - offset; break; }
                offset += len;
            }

            if (startNode && endNode) {
                const range = document.createRange();
                range.setStart(startNode, startOff);
                range.setEnd(endNode, endOff);
                const sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(range);
                el.focus();

                const success = document.execCommand('insertText', false, error.suggestion);
                const afterText = getElementText(el);

                if (!success || afterText.includes(error.word)) {
                    if (startNode === endNode) {
                        const tc = startNode.textContent;
                        startNode.textContent = tc.substring(0, startOff) + error.suggestion + tc.substring(endOff);
                    } else {
                        const freshRange = document.createRange();
                        freshRange.setStart(startNode, startOff);
                        freshRange.setEnd(endNode, endOff);
                        freshRange.deleteContents();
                        freshRange.insertNode(document.createTextNode(error.suggestion));
                    }
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                }

                const finalText = getElementText(el);
                if (finalText.includes(error.word)) {
                    el.innerHTML = el.innerHTML.replace(error.word, error.suggestion);
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                }
            }
        }

        currentErrors = currentErrors.filter(err => err !== error);
        textCache.clear();
        clearOverlays();
        isApplyingCorrection = false;

        setTimeout(() => {
            if (activeElement === el) triggerSpellCheck(el);
        }, 600);
    }

    // ===== Apply ALL corrections at once (reverse order to preserve indices) =====
    function applyAllCorrections(el) {
        isApplyingCorrection = true;
        const tag = el.tagName.toUpperCase();

        const resolvedErrors = [];
        const text = getElementText(el);

        for (const error of currentErrors) {
            const pos = findWordPosition(el, error.word, error._resolvedStart || error.index);
            if (pos) resolvedErrors.push({ ...error, start: pos.start, end: pos.end });
        }

        resolvedErrors.sort((a, b) => b.start - a.start);

        const seen = new Set();
        const unique = resolvedErrors.filter(e => {
            const key = `${e.start}:${e.end}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });

        if (tag === 'TEXTAREA' || tag === 'INPUT') {
            el.focus();
            for (const err of unique) {
                const currentText = el.value;
                if (currentText.substring(err.start, err.end) === err.word) {
                    try {
                        el.setRangeText(err.suggestion, err.start, err.end, 'end');
                    } catch (e) {
                        el.value = currentText.substring(0, err.start) + err.suggestion + currentText.substring(err.end);
                    }
                }
            }
            try {
                el.dispatchEvent(new InputEvent('input', {
                    bubbles: true, cancelable: false,
                    inputType: 'insertReplacementText', data: ''
                }));
            } catch (e) {
                el.dispatchEvent(new Event('input', { bubbles: true }));
            }
            el.dispatchEvent(new Event('change', { bubbles: true }));

        } else if (el.isContentEditable) {
            for (const err of unique) {
                const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false);
                let offset = 0, startNode, startOff, endNode, endOff;
                while (walker.nextNode()) {
                    const node = walker.currentNode;
                    const len = node.textContent.length;
                    if (!startNode && offset + len > err.start) { startNode = node; startOff = err.start - offset; }
                    if (!endNode && offset + len >= err.end) { endNode = node; endOff = err.end - offset; break; }
                    offset += len;
                }
                if (startNode && endNode) {
                    const range = document.createRange();
                    range.setStart(startNode, startOff);
                    range.setEnd(endNode, endOff);
                    const sel = window.getSelection();
                    sel.removeAllRanges();
                    sel.addRange(range);
                    el.focus();

                    const success = document.execCommand('insertText', false, err.suggestion);

                    if (!success || getElementText(el).includes(err.word)) {
                        if (startNode === endNode) {
                            const tc = startNode.textContent;
                            startNode.textContent = tc.substring(0, startOff) + err.suggestion + tc.substring(endOff);
                        }
                    }
                }
            }
        }

        currentErrors = [];
        textCache.clear();
        clearOverlays();
        isApplyingCorrection = false;

        setTimeout(() => {
            if (activeElement === el) triggerSpellCheck(el);
        }, 600);
    }

    // ===== Local Spell Check (No API) =====
    async function triggerSpellCheck(el) {
        if (!enabled || !el || isApplyingCorrection) return;
        if (!typoLoaded) {
            // Queue check after dictionary loads
            initTypo(() => triggerSpellCheck(el));
            return;
        }

        const text = extractCurrentContext(el);
        if (text.length < MIN_TEXT_LENGTH) { clearOverlays(); return; }

        const cacheKey = hashText(text);
        if (textCache.has(cacheKey)) {
            currentErrors = textCache.get(cacheKey);
            renderUnderlines(el, currentErrors);
            return;
        }

        try {
            const tokens = tokenize(text);
            const errors = [];

            for (const token of tokens) {
                // Skip single-letter words and common contractions
                if (token.word.length <= 1) continue;
                if (!typo.check(token.word)) {
                    const suggestions = typo.suggest(token.word, 1);
                    errors.push({
                        word: token.word,
                        index: token.start,
                        suggestion: suggestions[0] || token.word,
                        type: 'spelling'
                    });
                }
            }

            currentErrors = errors;
            textCache.set(cacheKey, currentErrors);
            if (textCache.size > 50) {
                const firstKey = textCache.keys().next().value;
                textCache.delete(firstKey);
            }
            if (activeElement === el) renderUnderlines(el, currentErrors);
        } catch (err) {
            console.warn('Viky AI local spell check:', err.message);
        }
    }

    function onInput(e) {
        if (!enabled || isApplyingCorrection) return;
        const el = e.target;
        if (!isEditable(el)) return;
        activeElement = el;
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => triggerSpellCheck(el), DEBOUNCE_MS);
    }

    function onFocusIn(e) {
        if (!enabled || isApplyingCorrection) return;
        const el = e.target;
        if (!isEditable(el)) return;
        activeElement = el;
        const text = getElementText(el);
        if (text.length >= MIN_TEXT_LENGTH) {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => triggerSpellCheck(el), DEBOUNCE_MS);
        }
    }

    function onFocusOut(e) {
        setTimeout(() => {
            if (popupVisible || isApplyingCorrection) return;
            if (!isEditable(document.activeElement)) {
                clearOverlays();
                activeElement = null;
            }
        }, 400);
    }

    function onScrollOrResize() {
        if (activeElement && currentErrors.length > 0) renderUnderlines(activeElement, currentErrors);
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function onDocumentMousedown(e) {
        if (!popupVisible) return;
        const path = e.composedPath ? e.composedPath() : [];
        const inside = path.some(el =>
            el === suggestionPopup || el === overlayContainer ||
            (el.classList && el.classList.contains('viky-spell-underline'))
        );
        if (!inside) hideSuggestionPopup();
    }

    // ===== Public API =====
    window.__vikySpellCheck = {
        init(sr) {
            shadowRoot = sr;
            createOverlayContainer(sr);
            document.addEventListener('input', onInput, true);
            document.addEventListener('focusin', onFocusIn, true);
            document.addEventListener('focusout', onFocusOut, true);
            document.addEventListener('mousedown', onDocumentMousedown, false);

            let scrollTimer;
            const debounced = () => { clearTimeout(scrollTimer); scrollTimer = setTimeout(onScrollOrResize, 150); };
            window.addEventListener('scroll', debounced, true);
            window.addEventListener('resize', debounced);

            // Preload dictionary in background
            initTypo();
            console.log('Viky AI: Local Spell Check initialized');
        },
        setEnabled(val) { enabled = !!val; if (!enabled) { clearOverlays(); activeElement = null; } },
        isEnabled() { return enabled; },
        destroy() {
            clearOverlays();
            document.removeEventListener('input', onInput, true);
            document.removeEventListener('focusin', onFocusIn, true);
            document.removeEventListener('focusout', onFocusOut, true);
            document.removeEventListener('mousedown', onDocumentMousedown, false);
            if (overlayContainer) overlayContainer.remove();
            if (suggestionPopup) suggestionPopup.remove();
            textCache.clear();
            activeElement = null;
        }
    };
})();
