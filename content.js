// Viky AI - Content Script with Streaming Support
(function () {
    'use strict';

    // ===== CSS Styles (Embedded for reliability) =====
    const VIKY_CSS = `
/* Viky AI - Content Script Styles (Floating Button & Result Panel) */
:host {
    all: initial;
}

/* Default/Dark Theme (Sharp/Premium Professional Palette) */
:host, .theme-wrapper {
    --bg-dark: #0a0a0b;
    --bg-surface: #121214;
    --bg-elevated: #1c1c1f;
    --bg-hover: rgba(255, 255, 255, 0.05);

    --accent-primary: #00ff9d;
    --accent-primary-hover: #00cc7d;
    --accent-primary-light: rgba(0, 255, 157, 0.1);
    --accent-glow: rgba(0, 255, 157, 0.25);
    --accent-medium: rgba(0, 255, 157, 0.15);
    --accent-faint: rgba(0, 255, 157, 0.06);
    --accent-border: rgba(0, 255, 157, 0.4);

    --text-primary: #ffffff;
    --text-secondary: #a1a1aa;
    --text-muted: #71717a;

    --border-color: rgba(255, 255, 255, 0.08);
    --border-light: rgba(255, 255, 255, 0.12);
    --border-focus: var(--accent-border);

    --success: #00ff9d;
    --error: #ef4444;

    --spacing-xs: 4px;
    --spacing-sm: 8px;
    --spacing-md: 12px;
    --spacing-lg: 16px;

    --radius-sm: 4px;
    --radius-md: 6px;
    --radius-lg: 8px;
    --radius-xl: 10px;
    --radius-full: 9999px;

    --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
    --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.4);
    --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.5);
    --shadow-glow: 0 0 20px var(--accent-glow);

    --glass-bg: var(--bg-surface);
    --glass-bg-heavy: var(--bg-elevated);
    --glass-border: var(--border-color);
    --glass-inset: none;

    --transition-fast: 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    --transition-normal: 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    --transition-smooth: 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    --transition-spring: 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);

    --font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', sans-serif;
    font-family: var(--font-family);
}

:host(.theme-light), .theme-wrapper.theme-light {
    --bg-dark: #f1f3f5;
    --bg-surface: #ffffff;
    --bg-elevated: #f8f9fa;
    --bg-hover: rgba(0, 0, 0, 0.05);

    --accent-primary: #059669;
    --accent-primary-hover: #047857;
    --accent-primary-light: rgba(5, 150, 105, 0.1);
    --accent-glow: rgba(5, 150, 105, 0.2);
    --accent-medium: rgba(5, 150, 105, 0.15);
    --accent-faint: rgba(5, 150, 105, 0.06);
    --accent-border: rgba(5, 150, 105, 0.4);

    --text-primary: #111827;
    --text-secondary: #4b5563;
    --text-muted: #9ca3af;

    --border-color: rgba(0, 0, 0, 0.08);
    --border-light: rgba(0, 0, 0, 0.12);
    --border-focus: rgba(5, 150, 105, 0.4);

    --success: #10b981;
    --error: #ef4444;

    --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
    --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    --shadow-glow: 0 0 20px rgba(5, 150, 105, 0.3);
}

/* ===== Animations ===== */
/* NOTE: removed 'filter: blur(...)' from all keyframes below — animating filter
   has no compositor fast-path and repaints a large region every frame. The opacity
   + transform combo alone produces an equivalent visual effect at ~1/100th the cost. */
@keyframes fadeInScale {
    0% { opacity: 0; transform: scale(0.7) translateY(10px); }
    100% { opacity: 1; transform: scale(1) translateY(0); }
}

@keyframes slideUpFade {
    0% { opacity: 0; transform: translateY(15px) scale(0.97); }
    100% { opacity: 1; transform: translateY(0) scale(1); }
}

@keyframes spin {
    to { transform: rotate(360deg); }
}

@keyframes pulseGlow {
    0%, 100% { box-shadow: 0 0 8px var(--accent-glow); }
    50% { box-shadow: 0 0 18px 4px var(--accent-glow); }
}

@keyframes menuItemSlide {
    0% { opacity: 0; transform: translateX(-6px); }
    100% { opacity: 1; transform: translateX(0); }
}

/* ===== Utility Classes ===== */
.hidden { display: none !important; }
.visible { display: flex !important; animation: fadeInScale 0.35s var(--transition-smooth); }

/* ===== Floating Container (Bubble) ===== */
@keyframes bubbleFadeIn {
    0% { opacity: 0; transform: scale(0.6) translateY(8px); }
    60% { opacity: 1; transform: scale(1.05) translateY(-2px); }
    100% { opacity: 1; transform: scale(1) translateY(0); }
}

.viky-floating-container {
    position: absolute;
    z-index: 2147483647;
    display: flex;
    align-items: center;
    border-radius: var(--radius-xl);
    background: var(--bg-surface);
    border: 1px solid var(--border-color);
    box-shadow: var(--shadow-lg);
    cursor: pointer;
    pointer-events: auto;
    width: auto;
    max-width: 28px;
    height: 28px;
    opacity: 1;
    transform: scale(1) translateY(0);
    transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                transform 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                max-width 0.5s cubic-bezier(0.4, 0, 0.2, 1) 0.4s,
                padding 0.5s cubic-bezier(0.4, 0, 0.2, 1) 0.4s,
                background 0.3s ease,
                border-color 0.3s ease,
                box-shadow 0.3s ease;
}

.viky-floating-container.hidden {
    display: flex !important;
    opacity: 0 !important;
    transform: scale(0.7) translateY(8px) !important;
    pointer-events: none !important;
}

.viky-floating-container.visible {
    animation: bubbleFadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

.viky-floating-container:hover,
.viky-floating-container.expanded {
    max-width: 400px;
    padding-right: 4px;
    background: var(--bg-elevated);
    border-color: var(--border-focus);
    box-shadow: var(--shadow-lg), var(--shadow-glow);
    transition: max-width 0.45s cubic-bezier(0.16, 1, 0.3, 1) 0.2s,
                padding 0.45s cubic-bezier(0.16, 1, 0.3, 1) 0.2s,
                background 0.3s ease,
                border-color 0.3s ease,
                box-shadow 0.3s ease;
}

/* ===== Bubble Icon ===== */
.bubble-icon {
    width: 28px;
    min-width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--accent-primary);
    color: var(--bg-surface);
    font-size: 14px;
    transition: background-color, color, border-color, box-shadow, opacity, transform, filter var(--transition-fast);
    border-radius: var(--radius-xl);
    box-shadow: 0 0 10px var(--accent-glow);
}

.bubble-icon svg { width: 16px; height: 16px; }
.viky-floating-container:hover .bubble-icon,
.viky-floating-container.expanded .bubble-icon { 
    background: var(--accent-primary-hover);
    box-shadow: 0 0 15px var(--accent-glow); 
}

/* ===== Toolbar Content ===== */
.toolbar-content {
    display: flex;
    align-items: center;
    gap: 2px;
    padding-right: var(--spacing-sm);
    opacity: 0;
    max-width: 0;
    overflow: hidden;
    transition: max-width 0.5s cubic-bezier(0.4, 0, 0.2, 1) 0.3s,
                opacity 0.3s ease 0s,
                padding 0.5s cubic-bezier(0.4, 0, 0.2, 1) 0.3s;
}

.viky-floating-container:hover .toolbar-content,
.viky-floating-container.expanded .toolbar-content {
    opacity: 1;
    max-width: 300px;
    padding-left: var(--spacing-sm);
    transition: max-width 0.45s cubic-bezier(0.16, 1, 0.3, 1) 0.25s,
                opacity 0.3s ease 0.35s,
                padding 0.45s cubic-bezier(0.16, 1, 0.3, 1) 0.25s;
}

/* ===== Tool Buttons ===== */
.tool-btn {
    background: transparent;
    border: none;
    width: 24px;
    height: 24px;
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-secondary);
    cursor: pointer;
    transition: background-color, color, border-color, box-shadow, opacity, transform, filter var(--transition-fast);
    position: relative;
}

.tool-btn svg {
    width: 14px;
    height: 14px;
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
}

.tool-btn:hover {
    background: var(--bg-hover);
    color: var(--accent-primary);
    transform: scale(1.15);
}

.tool-btn:active { transform: scale(0.92); }

.tool-btn::after {
    content: attr(title);
    position: absolute;
    bottom: calc(100% + 8px);
    left: 50%;
    transform: translateX(-50%) scale(0.9);
    background: var(--bg-elevated);
    color: var(--text-primary);
    border: 1px solid var(--border-color);
    padding: 4px 8px;
    border-radius: var(--radius-sm);
    font-size: 11px;
    white-space: nowrap;
    opacity: 0;
    pointer-events: none;
    transition: background-color, color, border-color, box-shadow, opacity, transform, filter var(--transition-fast);
    box-shadow: var(--shadow-md);
    z-index: 2147483647;
}

.tool-btn:hover::after { opacity: 1; transform: translateX(-50%) scale(1); }

/* Flip tooltip below when container is near top of viewport */
.viky-floating-container.near-top .tool-btn::after {
    bottom: auto;
    top: calc(100% + 8px);
}

.separator { width: 1px; height: 20px; background: var(--border-color); margin: 0 4px; }

/* ===== Close / Disable Button ===== */
.close-toolbar-btn {
    background: transparent;
    border: none;
    width: 20px;
    height: 20px;
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-muted);
    cursor: pointer;
    transition: background-color, color, border-color, box-shadow, opacity, transform, filter var(--transition-fast);
    position: relative;
    margin-left: 2px;
    opacity: 0.6;
}
.close-toolbar-btn svg {
    width: 12px;
    height: 12px;
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
}
.close-toolbar-btn:hover {
    background: rgba(239, 68, 68, 0.12);
    color: #ef4444;
    opacity: 1;
    transform: scale(1.15);
}
.close-toolbar-btn:active { transform: scale(0.92); }

/* Disable Dropdown */
.disable-menu {
    position: absolute;
    top: calc(100% + 6px);
    right: 0;
    background: var(--bg-elevated);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    padding: var(--spacing-xs);
    display: flex;
    flex-direction: column;
    min-width: 180px;
    box-shadow: var(--shadow-lg);
    opacity: 0;
    transform: translateY(-6px) scale(0.95);
    transform-origin: top right;
    pointer-events: none;
    transition: background-color, color, border-color, box-shadow, opacity, transform, filter 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    z-index: 2147483647;
}
.disable-menu.open {
    opacity: 1;
    transform: translateY(0) scale(1);
    pointer-events: auto;
}
/* Flipped upward when near bottom of viewport */
.disable-menu.flip-up {
    top: auto;
    bottom: calc(100% + 6px);
    transform-origin: bottom right;
}
.disable-menu.flip-up.open {
    transform: translateY(0) scale(1);
}
/* Flip left when near right edge */
.disable-menu.flip-left {
    right: auto;
    left: 0;
    transform-origin: top left;
}
.disable-menu.flip-left.flip-up {
    transform-origin: bottom left;
}
.disable-menu .disable-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    background: transparent;
    border: none;
    color: var(--text-secondary);
    padding: 7px 10px;
    text-align: left;
    cursor: pointer;
    border-radius: var(--radius-sm);
    font-size: 11px;
    font-family: var(--font-family);
    transition: background-color, color, border-color, box-shadow, opacity, transform, filter var(--transition-fast);
    white-space: nowrap;
}
.disable-menu .disable-item:hover {
    background: rgba(239, 68, 68, 0.08);
    color: #ef4444;
    transform: translateX(2px);
}
.disable-menu .disable-item svg {
    flex-shrink: 0;
    width: 14px;
    height: 14px;
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
}

/* ===== More Menu ===== */
.more-menu {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    background: var(--bg-elevated);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    padding: var(--spacing-xs);
    display: flex;
    flex-direction: column;
    min-width: 180px;
    box-shadow: var(--shadow-lg);
    opacity: 0;
    transform: translateY(-8px) scale(0.95);
    transform-origin: top right;
    pointer-events: none;
    transition: background-color, color, border-color, box-shadow, opacity, transform, filter 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    z-index: 2147483647;
}
/* Flipped upward when near bottom of viewport */
.more-menu.flip-up {
    top: auto;
    bottom: calc(100% + 8px);
    transform-origin: bottom right;
}
.more-menu.flip-up.open {
    transform: translateY(0) scale(1);
}
/* Flip left when near right edge */
.more-menu.flip-left {
    right: auto;
    left: 0;
    transform-origin: top left;
}
.more-menu.flip-left.flip-up {
    transform-origin: bottom left;
}

.more-menu.open { opacity: 1; transform: translateY(0) scale(1); pointer-events: auto; }
.more-menu.open .more-item { animation: menuItemSlide 0.25s ease-out backwards; }
.more-menu.open .more-item:nth-child(1) { animation-delay: 0.02s; }
.more-menu.open .more-item:nth-child(2) { animation-delay: 0.04s; }
.more-menu.open .more-item:nth-child(3) { animation-delay: 0.06s; }
.more-menu.open .more-item:nth-child(4) { animation-delay: 0.08s; }
.more-menu.open .more-item:nth-child(5) { animation-delay: 0.10s; }
.more-menu.open .more-item:nth-child(6) { animation-delay: 0.12s; }
.more-menu.open .more-item:nth-child(7) { animation-delay: 0.14s; }
.more-menu.open .more-item:nth-child(8) { animation-delay: 0.16s; }

.more-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    background: transparent;
    border: none;
    color: var(--text-secondary);
    padding: 6px 10px;
    text-align: left;
    cursor: pointer;
    border-radius: var(--radius-sm);
    font-size: 11px;
    font-family: var(--font-family);
    transition: background-color, color, border-color, box-shadow, opacity, transform, filter var(--transition-fast);
    white-space: nowrap;
}

.more-item:hover { background: var(--bg-hover); color: var(--text-primary); transform: translateX(2px); }
.more-item svg { flex-shrink: 0; }
.more-separator { height: 1px; background: var(--border-color); margin: var(--spacing-xs) 0; }

/* ===== Pin Toggle in More Menu ===== */
.more-item-row {
    display: flex;
    align-items: center;
    width: 100%;
}
.more-item-content {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    flex: 1;
    min-width: 0;
}
.pin-toggle {
    background: transparent;
    border: none;
    width: 20px;
    height: 20px;
    min-width: 20px;
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-muted);
    cursor: pointer;
    transition: background-color, color, border-color, box-shadow, opacity, transform, filter var(--transition-fast);
    margin-left: auto;
    opacity: 0.4;
    padding: 0;
}
.pin-toggle:hover {
    color: #facc15;
    opacity: 1;
    transform: scale(1.2);
}
.pin-toggle.pinned {
    color: #facc15;
    opacity: 1;
}
.pin-toggle svg {
    width: 12px;
    height: 12px;
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
}
.pin-toggle.pinned svg {
    fill: currentColor;
}

/* ===== Mode Indicator ===== */
.mode-indicator {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--text-muted);
    padding: 3px 8px;
    border-bottom: 1px solid var(--border-color);
    opacity: 0.7;
}
.mode-indicator svg {
    width: 10px;
    height: 10px;
    opacity: 0.6;
}

/* ===== Highlight Feature ===== */
.viky-highlight-mark {
    background: rgba(250, 204, 21, 0.35);
    border-radius: 2px;
    padding: 0 1px;
    transition: background 0.3s ease;
}
.viky-highlight-mark:hover {
    background: rgba(250, 204, 21, 0.55);
}

/* ===== Result Panel ===== */
.viky-panel {
    position: absolute;
    width: 280px;
    background: var(--bg-elevated);
    border: 1px solid var(--border-color);
    border-top: 2px solid var(--accent-primary);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-lg);
    display: flex;
    flex-direction: column;
    z-index: 2147483647;
    overflow: hidden;
    pointer-events: auto;
    font-family: var(--font-family);
    transition: opacity 0.3s ease, transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.viky-panel.visible { animation: slideUpFade 0.4s cubic-bezier(0.16, 1, 0.3, 1); }

.panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    background: transparent;
    border-bottom: none;
    cursor: grab;
    user-select: none;
}
.panel-header:active { cursor: grabbing; }

.panel-title { display: flex; align-items: center; gap: 6px; color: var(--text-primary); font-size: 12px; font-weight: 600; letter-spacing: 0.01em; }
.panel-title svg { color: var(--accent-primary); width: 14px; height: 14px; }

.close-btn {
    background: transparent;
    border: none;
    color: var(--text-muted);
    width: 22px;
    height: 22px;
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background-color, color, border-color, box-shadow, opacity, transform, filter var(--transition-fast);
}
.close-btn:hover { background: var(--bg-hover); color: var(--text-primary); transform: scale(1.1); }
.close-btn svg { width: 14px; height: 14px; }

.panel-content {
    padding: 8px 12px;
    color: var(--text-primary);
    font-size: 12px;
    line-height: 1.5;
    min-height: 50px;
    max-height: 250px;
    overflow-y: auto;
}
.result-text { white-space: pre-wrap; word-break: break-word; }

.loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-sm);
    color: var(--text-secondary);
    padding: var(--spacing-md);
}
.loading-spinner {
    width: 20px;
    height: 20px;
    border: 2px solid var(--border-color);
    border-top-color: var(--accent-primary);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
}

.error-state {
    color: var(--error);
    padding: var(--spacing-sm);
    background: rgba(239, 68, 68, 0.08);
    border-radius: var(--radius-sm);
    border: 1px solid rgba(239, 68, 68, 0.15);
    font-size: 11px;
}

.panel-actions {
    display: flex;
    gap: 4px;
    padding: 6px 12px 8px;
    background: transparent;
    border-top: none;
}

.panel-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-xs);
    background: transparent;
    border: none;
    color: var(--text-muted);
    padding: 6px 10px;
    border-radius: var(--radius-full);
    cursor: pointer;
    font-size: 11px;
    font-weight: 500;
    font-family: var(--font-family);
    transition: background-color, color, border-color, box-shadow, opacity, transform, filter var(--transition-fast);
    letter-spacing: 0.02em;
}

.panel-btn:hover { background: rgba(0, 0, 0, 0.05); color: var(--text-primary); }
.panel-btn:active { transform: scale(0.96); }
.panel-btn svg { width: 13px; height: 13px; flex-shrink: 0; opacity: 0.7; }
.panel-btn:hover svg { opacity: 1; }

.panel-btn.primary {
    background: var(--accent-primary);
    border: 1px solid transparent;
    color: var(--bg-surface);
    font-weight: 600;
}
.panel-btn.primary:hover { background: var(--accent-primary-hover); box-shadow: 0 0 10px var(--accent-glow); color: var(--bg-surface); }
.panel-btn.primary:active { transform: scale(0.96); }

::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: var(--radius-full); }
::-webkit-scrollbar-thumb:hover { background: var(--text-muted); }

@media (max-width: 480px) {
    .viky-panel { width: calc(100vw - 40px); left: 20px; right: 20px; }
    .more-menu { min-width: 160px; }
}

/* ===== Spell Check Animations (popup only) ===== */
@keyframes suggestionSlideIn {
    /* Removed 'filter: blur(...)' — see note above about compositor cost. */
    0% { opacity: 0; transform: translateY(8px) scale(0.96); }
    40% { opacity: 0.6; }
    100% { opacity: 1; transform: translateY(0) scale(1); }
}

@keyframes correctedPulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.06); }
    100% { transform: scale(1); }
}

/* ===== Spell Check Underlines (static, no animation) ===== */
.viky-spell-underline {
    pointer-events: auto;
    cursor: pointer;
    transition: opacity 0.15s ease;
    border-radius: 2px;
}
.viky-spell-underline:hover {
    opacity: 0.7;
}

/* ===== Suggestion Popup (Frosted Glass) ===== */
.viky-suggestion-popup {
    position: absolute;
    z-index: 2147483647;
    background: var(--glass-bg, var(--bg-elevated));
    backdrop-filter: blur(16px) saturate(1.4);
    -webkit-backdrop-filter: blur(16px) saturate(1.4);
    border: 1px solid var(--glass-border, var(--border-color));
    border-radius: 14px;
    box-shadow:
        var(--shadow-lg),
        0 0 0 1px rgba(255, 255, 255, 0.04) inset,
        0 8px 32px rgba(0, 0, 0, 0.12);
    min-width: 220px;
    max-width: 300px;
    font-family: var(--font-family);
    animation: suggestionSlideIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
    overflow: hidden;
    opacity: 0;
}
.viky-suggestion-popup.hidden {
    display: none !important;
}

/* Header */
.suggestion-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px 6px;
}
.suggestion-type {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
}
.suggestion-type svg {
    flex-shrink: 0;
    fill: none;
    stroke: currentColor;
    width: 13px;
    height: 13px;
}

/* Close button */
.suggestion-close {
    background: transparent;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    width: 22px;
    height: 22px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-sm);
    transition: background-color, color, border-color, box-shadow, opacity, transform, filter 0.2s ease;
    opacity: 0.5;
}
.suggestion-close:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
    opacity: 1;
    transform: rotate(90deg) scale(1.1);
}
.suggestion-close svg {
    fill: none;
    stroke: currentColor;
    width: 13px;
    height: 13px;
}

/* Body */
.suggestion-body {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px 14px 10px;
    font-size: 14px;
}
.suggestion-original {
    color: var(--error, #ef4444);
    text-decoration: line-through;
    text-decoration-thickness: 2px;
    text-decoration-color: rgba(239, 68, 68, 0.5);
    opacity: 0.65;
    font-weight: 500;
    padding: 2px 6px;
    background: rgba(239, 68, 68, 0.08);
    border-radius: 4px;
}
.suggestion-original s {
    text-decoration: none;
}
.suggestion-arrow {
    color: var(--text-muted);
    font-size: 16px;
    opacity: 0.4;
    transition: transform 0.3s ease;
}
.viky-suggestion-popup:hover .suggestion-arrow {
    transform: translateX(2px);
    opacity: 0.7;
}
.suggestion-corrected {
    color: var(--accent-primary);
    font-weight: 700;
    padding: 2px 6px;
    background: rgba(0, 255, 157, 0.08);
    border-radius: 4px;
    animation: correctedPulse 0.5s ease 0.4s;
}

/* Actions */
.suggestion-actions {
    display: flex;
    gap: 6px;
    padding: 8px 14px 10px;
    border-top: 1px solid var(--border-color);
}
.suggestion-btn {
    flex: 1;
    padding: 7px 12px;
    border: none;
    border-radius: 10px;
    font-size: 12px;
    font-weight: 600;
    font-family: var(--font-family);
    cursor: pointer;
    transition: background-color, color, border-color, box-shadow, opacity, transform, filter 0.2s ease;
    letter-spacing: 0.01em;
}
.suggestion-btn.dismiss {
    background: var(--bg-hover, rgba(255,255,255,0.05));
    color: var(--text-muted);
    border: 1px solid transparent;
}
.suggestion-btn.dismiss:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
    border-color: var(--border-color);
    transform: translateY(-1px);
}
.suggestion-btn.dismiss:active {
    transform: scale(0.97);
}
.suggestion-btn.accept {
    background: var(--accent-primary);
    color: var(--bg-surface);
    border: 1px solid transparent;
    box-shadow: 0 2px 8px var(--accent-glow, rgba(0, 255, 157, 0.2));
}
.suggestion-btn.accept:hover {
    background: var(--accent-primary-hover);
    box-shadow: 0 4px 16px var(--accent-glow, rgba(0, 255, 157, 0.35));
    transform: translateY(-1px);
}
.suggestion-btn.accept:active {
    transform: scale(0.96);
    box-shadow: 0 1px 4px var(--accent-glow, var(--accent-medium));
}

/* Fix All section */
.suggestion-fix-all {
    padding: 6px 14px 10px;
    border-top: 1px solid var(--border-color);
}
.suggestion-btn.fix-all {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 8px 12px;
    border: none;
    border-radius: 10px;
    font-size: 12px;
    font-weight: 600;
    font-family: var(--font-family);
    cursor: pointer;
    background: linear-gradient(135deg, var(--accent-primary), #00d4aa);
    color: var(--bg-surface);
    box-shadow: 0 2px 10px var(--accent-glow, var(--accent-glow));
    transition: background-color, color, border-color, box-shadow, opacity, transform, filter 0.2s ease;
}
.suggestion-btn.fix-all svg {
    fill: none;
    stroke: currentColor;
    flex-shrink: 0;
}
.suggestion-btn.fix-all:hover {
    box-shadow: 0 4px 20px var(--accent-glow, var(--accent-border));
    transform: translateY(-1px);
}
.suggestion-btn.fix-all:active {
    transform: scale(0.97);
}

/* ===== Highlight Tooltip (now lives inside shadow root) ===== */
.viky-highlight-tooltip {
    position: fixed;
    background: #0f172a !important;
    border: 1px solid rgba(255, 255, 255, 0.08) !important;
    border-radius: 4px !important;
    padding: 6px 10px !important;
    display: none;
    align-items: center !important;
    gap: 8px !important;
    box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.4) !important;
    z-index: 2147483647 !important;
    pointer-events: auto !important;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
    font-size: 11px !important;
    font-weight: 500 !important;
    color: #f1f5f9 !important;
    opacity: 0;
    transform: translateY(4px);
    transition: opacity 0.2s ease, transform 0.2s ease;
}
.viky-highlight-tooltip.visible {
    opacity: 1;
    transform: translateY(0);
}
.viky-highlight-tooltip-btn {
    background: transparent !important;
    border: none !important;
    color: #f87171 !important;
    cursor: pointer !important;
    padding: 2px 4px !important;
    display: flex !important;
    align-items: center !important;
    gap: 4px !important;
    font-family: inherit !important;
    font-size: 11px !important;
    font-weight: 500 !important;
    transition: opacity 0.2s !important;
}
.viky-highlight-tooltip-btn:hover {
    opacity: 0.8 !important;
}
.viky-highlight-tooltip-divider {
    width: 1px !important;
    height: 12px !important;
    background: rgba(255, 255, 255, 0.15) !important;
}
.viky-highlight-tooltip-logo {
    display: flex !important;
    align-items: center !important;
    color: #00ff9d !important;
}

/* ===== Reduced motion: honor OS-level accessibility setting ===== */
/* Prevents vestibular discomfort for users who set "Reduce motion" in their OS.
   Also reduces battery drain on laptops since animations are paused. */
@media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
        animation-duration: 0.001ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.001ms !important;
        scroll-behavior: auto !important;
    }
}
    `;

    // ===== State Management =====
    let shadowRoot = null;
    let hostElement = null;
    let floatingContainer = null;
    let resultPanel = null;
    let moreMenu = null;
    let selectedText = '';
    let selectionRange = null;
    let isMenuOpen = false;
    let showFloatingButton = true;
    let bubbleAutoHideTimer = null;
    let currentContext = 'reading'; // 'reading' or 'writing'
    let pinnedActions = {
        reading: ['COPY_SELECTION', 'HIGHLIGHT', 'EXPLAIN_SIMPLE', 'TRANSLATE_MENU'],
        writing: ['COPY_SELECTION', 'IMPROVE', 'CONTINUE_WRITING', 'FIX_GRAMMAR']
    };
    const MAX_PINNED = 5;
    let currentHighlightColor = '#facc15';
    let highlightTooltip = null;
    let tooltipAutoHideTimer = null;

    // ===== placeOverlay: single coordinate helper =====
    // Consolidates the 7+ different position-calculation blocks scattered through this file.
    // Each one independently computed `rect.top + scrollY` (or didn't, with bugs — see P1 fix
    // notes). This helper is the single source of truth: pass in the rect, the desired mode,
    // and an optional offset, and it returns the correct {top, left} for the element's style.
    //
    // @param el       — the element to position (must already be in the DOM with its style.position set)
    // @param rect     — the getBoundingClientRect() of the anchor element (or null for viewport-centered)
    // @param mode     — one of:
    //                     'fixed-above'   : element is position:fixed, place above the anchor rect
    //                     'fixed-below'   : element is position:fixed, place below the anchor rect
    //                     'fixed-at'      : element is position:fixed, place at the anchor rect's top-left
    //                     'fixed-center'  : element is position:fixed, place centered horizontally at top of rect
    // @param options  — { offsetX: 0, offsetY: 0, center: false (center horizontally on anchor) }
    function placeOverlay(el, rect, mode, options) {
        if (!el) return;
        options = options || {};
        const offsetX = options.offsetX || 0;
        const offsetY = options.offsetY || 0;

        // For position: fixed elements, getBoundingClientRect() returns viewport-relative coords.
        // DO NOT add window.scrollY/scrollX — that double-counts scroll position and pushes
        // the element off-screen on any scrolled page. (This was the bug in the original code.)
        const elWidth = el.offsetWidth;
        const elHeight = el.offsetHeight;
        let top = 0, left = 0;

        switch (mode) {
            case 'fixed-above':
                top = rect.top - elHeight - 8;
                left = options.center
                    ? rect.left + (rect.width / 2) - (elWidth / 2)
                    : rect.left;
                break;
            case 'fixed-below':
                top = rect.bottom + 8;
                left = options.center
                    ? rect.left + (rect.width / 2) - (elWidth / 2)
                    : rect.left;
                break;
            case 'fixed-at':
                top = rect.top;
                left = rect.left;
                break;
            case 'fixed-center':
                // Center horizontally on viewport, at top of rect
                left = (window.innerWidth / 2) - (elWidth / 2);
                top = rect ? rect.top : (window.innerHeight / 2) - (elHeight / 2);
                break;
            default:
                console.warn('[Viky AI] placeOverlay: unknown mode', mode);
                return;
        }

        // Clamp to viewport so the element never goes off-screen
        const margin = 8;
        if (left < margin) left = margin;
        if (left + elWidth > window.innerWidth - margin) {
            left = window.innerWidth - margin - elWidth;
        }
        if (top < margin) top = margin;
        if (top + elHeight > window.innerHeight - margin) {
            // If it doesn't fit below, try flipping to above the rect
            if (mode === 'fixed-below' && rect) {
                top = rect.top - elHeight - 8;
                if (top < margin) top = margin;
            } else {
                top = window.innerHeight - margin - elHeight;
            }
        }

        el.style.top = `${top + offsetY}px`;
        el.style.left = `${left + offsetX}px`;
    }

    // ===== Action Configurations =====
    const ACTION_ICONS = {
        COPY_SELECTION: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
        HIGHLIGHT: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>',
        EXPLAIN_SIMPLE: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
        TRANSLATE_MENU: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/></svg>',
        SUMMARIZE: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h8"/></svg>',
        ANSWER_QUESTION: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
        EXPLAIN_CODE: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
        IMPROVE: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M8.5 13.5l1.5 1.5 3.5-3.5"/></svg>',
        CONTINUE_WRITING: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>',
        FIX_GRAMMAR: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
        SHORTEN: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></svg>',
        EXPAND: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>'
    };

    const READING_ACTIONS = [
        { id: 'COPY_SELECTION', label: 'Copy', defaultPinned: true },
        { id: 'HIGHLIGHT', label: 'Highlight', defaultPinned: true },
        { id: 'EXPLAIN_SIMPLE', label: 'Explain', defaultPinned: true },
        { id: 'TRANSLATE_MENU', label: 'Translate', defaultPinned: true },
        { id: 'SUMMARIZE', label: 'Summarize', defaultPinned: false },
        { id: 'ANSWER_QUESTION', label: 'Answer this question', defaultPinned: false },
        { id: 'EXPLAIN_CODE', label: 'Explain codes', defaultPinned: false }
    ];

    const WRITING_ACTIONS = [
        { id: 'COPY_SELECTION', label: 'Copy', defaultPinned: true },
        { id: 'IMPROVE', label: 'Improve writing', defaultPinned: true },
        { id: 'CONTINUE_WRITING', label: 'Continue writing', defaultPinned: true },
        { id: 'FIX_GRAMMAR', label: 'Fix spelling & grammar', defaultPinned: true },
        { id: 'TRANSLATE_MENU', label: 'Translate into', defaultPinned: false },
        { id: 'SHORTEN', label: 'Make shorter', defaultPinned: false },
        { id: 'EXPAND', label: 'Make longer', defaultPinned: false }
    ];

    const PIN_ICON_SVG = '<svg viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';

    // ===== Context Detection =====
    function getSelectionContext() {
        const activeEl = document.activeElement;
        if (!activeEl) return 'reading';
        const isEditable = (
            activeEl.tagName === 'TEXTAREA' ||
            (activeEl.tagName === 'INPUT' && /^(text|search|url|email|tel|password)$/i.test(activeEl.type || 'text')) ||
            activeEl.isContentEditable ||
            !!(activeEl.closest && activeEl.closest('[contenteditable="true"]'))
        );
        return isEditable ? 'writing' : 'reading';
    }

    function getActionsForContext(context) {
        return context === 'writing' ? WRITING_ACTIONS : READING_ACTIONS;
    }

    function isBlacklisted(hostname, blacklist) {
        if (!blacklist || !Array.isArray(blacklist)) return false;
        const host = hostname.toLowerCase();
        return blacklist.some(entry => {
            const bl = entry.trim().toLowerCase();
            if (!bl) return false;
            return host === bl || host.endsWith('.' + bl);
        });
    }

    // ===== Initialization =====
    function init() {
        console.log('Viky AI: Initializing with Light Theme...');

        hostElement = document.createElement('div');
        hostElement.id = 'viky-ai-root';
        document.body.appendChild(hostElement);

        // Inject main document styles for highlights & tooltip
        const mainStyle = document.createElement('style');
        mainStyle.id = 'viky-main-page-styles';
        mainStyle.textContent = `
            .viky-highlight-mark {
                border-radius: 2px;
                padding: 0 1px;
                transition: background 0.3s ease, box-shadow 0.3s ease;
                cursor: pointer;
            }
            .viky-highlight-mark:hover {
                box-shadow: 0 0 4px rgba(0, 0, 0, 0.2);
            }
            .viky-highlight-tooltip {
                position: fixed;
                background: #0f172a !important;
                border: 1px solid rgba(255, 255, 255, 0.08) !important;
                border-radius: 4px !important;
                padding: 6px 10px !important;
                display: none;
                align-items: center !important;
                gap: 8px !important;
                box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.4) !important;
                z-index: 2147483647 !important;
                pointer-events: auto !important;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
                font-size: 11px !important;
                font-weight: 500 !important;
                color: #f1f5f9 !important;
                opacity: 0;
                transform: translateY(4px);
                transition: opacity 0.2s ease, transform 0.2s ease;
            }
            .viky-highlight-tooltip.visible {
                opacity: 1;
                transform: translateY(0);
            }
            .viky-highlight-tooltip-btn {
                background: transparent !important;
                border: none !important;
                color: #f87171 !important;
                cursor: pointer !important;
                padding: 2px 4px !important;
                display: flex !important;
                align-items: center !important;
                gap: 4px !important;
                font-family: inherit !important;
                font-size: 11px !important;
                font-weight: 500 !important;
                transition: opacity 0.2s !important;
            }
            .viky-highlight-tooltip-btn:hover {
                opacity: 0.8 !important;
            }
            .viky-highlight-tooltip-divider {
                width: 1px !important;
                height: 12px !important;
                background: rgba(255, 255, 255, 0.15) !important;
            }
            .viky-highlight-tooltip-logo {
                display: flex !important;
                align-items: center !important;
                color: #00ff9d !important;
            }
        `;
        document.head.appendChild(mainStyle);

        shadowRoot = hostElement.attachShadow({ mode: 'open' });

        const style = document.createElement('style');
        style.textContent = VIKY_CSS;
        shadowRoot.appendChild(style);

        createFloatingButton();
        createResultPanel();

        document.addEventListener('mouseup', handleSelection);
        document.addEventListener('mousedown', handleOutsideClick);

        // Listen for the `select` event — fires when the user selects text inside an
        // <input> or <textarea>. `mouseup` alone doesn't catch keyboard-driven selections
        // (Shift+arrow keys, Ctrl+A) or programmatic selections.
        document.addEventListener('select', (e) => {
            const target = e.target;
            if (!target) return;
            const tag = target.tagName ? target.tagName.toLowerCase() : '';
            if (tag === 'input' || tag === 'textarea') {
                // Reuse handleSelection's logic — it already checks getInputSelection()
                handleSelection({ composedPath: () => [target] });
            }
        }, true); // capture phase — `select` events don't bubble

        // Delegated mouse hover listeners for highlights in main page DOM
        document.addEventListener('mouseover', (e) => {
            const highlightEl = e.target.closest('.viky-highlight-mark');
            if (highlightEl) {
                clearTimeout(tooltipAutoHideTimer);
                showHighlightTooltip(highlightEl);
            }
        });

        document.addEventListener('mouseout', (e) => {
            const highlightEl = e.target.closest('.viky-highlight-mark');
            if (highlightEl) {
                hideHighlightTooltip();
            }
        });

        chrome.storage.local.get(['spellCheckEnabled'], (result) => {
            const spellEnabled = result.spellCheckEnabled !== false;
            if (window.__vikySpellCheck) {
                window.__vikySpellCheck.init(shadowRoot);
                window.__vikySpellCheck.setEnabled(spellEnabled);
            }
        });

        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === 'CONTEXT_MENU_ANALYZE') {
                selectedText = request.text;
                const selection = window.getSelection();
                if (selection.rangeCount > 0) {
                    selectionRange = selection.getRangeAt(0).cloneRange();
                }
                handleToolAction(request.type, null);
                return;
            }

            if (request.action === 'PERFORM_ACTION') {
                // Triggered by the Tools tab cards in the sidepanel.
                // The page's current selection is the source text.
                const sel = window.getSelection();
                const text = sel ? sel.toString().trim() : '';

                if (!text) {
                    showSelectTextNotification();
                    if (sendResponse) sendResponse({ success: false, error: 'No text selected on the page.' });
                    return;
                }

                selectedText = text;
                if (sel.rangeCount > 0) {
                    selectionRange = sel.getRangeAt(0).cloneRange();
                }

                handleToolAction(request.toolAction, request.lang || null);
                if (sendResponse) sendResponse({ success: true });
                return;
            }
        });

        chrome.storage.local.get(['showFloatingButton', 'userEmail', 'theme', 'floatingButtonBlacklist', 'floatingPinnedActions', 'highlightColor'], (result) => {
            if (result.highlightColor) {
                currentHighlightColor = result.highlightColor;
            }
            const blacklist = result.floatingButtonBlacklist || [];
            const currentHost = window.location.hostname;
            const blacklisted = isBlacklisted(currentHost, blacklist);

            if (result.showFloatingButton === false || !result.userEmail || blacklisted) {
                showFloatingButton = false;
            } else if (result.showFloatingButton !== undefined) {
                showFloatingButton = result.showFloatingButton;
            } else {
                showFloatingButton = true;
            }

            // Load persisted pin states
            if (result.floatingPinnedActions) {
                if (result.floatingPinnedActions.reading) {
                    pinnedActions.reading = result.floatingPinnedActions.reading;
                }
                if (result.floatingPinnedActions.writing) {
                    pinnedActions.writing = result.floatingPinnedActions.writing;
                }
            }

            const wrapper = shadowRoot.querySelector('.theme-wrapper');
            if (result.theme === 'light') {
                hostElement.classList.add('theme-light');
                if (wrapper) wrapper.classList.add('theme-light');
            } else {
                hostElement.classList.remove('theme-light');
                if (wrapper) wrapper.classList.remove('theme-light');
            }
        });

        chrome.storage.onChanged.addListener((changes) => {
            if (changes.showFloatingButton || changes.floatingButtonBlacklist) {
                chrome.storage.local.get(['showFloatingButton', 'floatingButtonBlacklist'], (result) => {
                    const blacklist = result.floatingButtonBlacklist || [];
                    const currentHost = window.location.hostname;
                    const blacklisted = isBlacklisted(currentHost, blacklist);
                    showFloatingButton = (result.showFloatingButton !== false) && !blacklisted;
                });
            }
            if (changes.theme) {
                const wrapper = shadowRoot.querySelector('.theme-wrapper');
                if (changes.theme.newValue === 'light') {
                    hostElement.classList.add('theme-light');
                    if (wrapper) wrapper.classList.add('theme-light');
                } else {
                    hostElement.classList.remove('theme-light');
                    if (wrapper) wrapper.classList.remove('theme-light');
                }
            }
            if (changes.highlightColor) {
                currentHighlightColor = changes.highlightColor.newValue || '#facc15';
            }
            if (changes.spellCheckEnabled && window.__vikySpellCheck) {
                window.__vikySpellCheck.setEnabled(changes.spellCheckEnabled.newValue);
            }
        });
    }

    // ===== Create Floating Button =====
    function createFloatingButton() {
        if (!shadowRoot.querySelector('.theme-wrapper')) {
            const wrapper = document.createElement('div');
            wrapper.className = 'theme-wrapper';
            wrapper.style.cssText = 'all: initial; font-family: var(--font-family);';
            shadowRoot.appendChild(wrapper);
        }

        const wrapper = shadowRoot.querySelector('.theme-wrapper');

        floatingContainer = document.createElement('div');
        floatingContainer.className = 'viky-floating-container hidden';

        // Build the static shell (bubble icon + toolbar container + disable menu + more menu container)
        floatingContainer.innerHTML = `
            <div class="bubble-icon" title="Double-click to Copy">
                 <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 2L15 9L22 12L15 15L12 22L9 15L2 12L9 9L12 2Z" fill="currentColor" stroke="none"/>
                    <circle cx="12" cy="12" r="2" fill="white"/>
                </svg>
            </div>
            <div class="toolbar-content" id="toolbar-dynamic"></div>
            <div class="disable-menu" id="disable-menu">
                <button class="disable-item" id="disable-this-site">
                    <svg viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                    </svg>
                    Disable on this site
                </button>
                <button class="disable-item" id="disable-all-sites">
                    <svg viewBox="0 0 24 24">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                    Disable on all sites
                </button>
            </div>
            <div class="more-menu" id="more-menu"></div>
        `;

        wrapper.appendChild(floatingContainer);

        moreMenu = floatingContainer.querySelector('#more-menu');
        const disableMenu = floatingContainer.querySelector('#disable-menu');
        let isDisableMenuOpen = false;

        // "Disable on this site"
        floatingContainer.querySelector('#disable-this-site').addEventListener('click', (e) => {
            e.stopPropagation();
            const currentHost = window.location.hostname;
            chrome.storage.local.get(['floatingButtonBlacklist'], (result) => {
                const blacklist = result.floatingButtonBlacklist || [];
                if (!blacklist.includes(currentHost)) {
                    blacklist.push(currentHost);
                }
                chrome.storage.local.set({ floatingButtonBlacklist: blacklist }, () => {
                    showFloatingButton = false;
                    hideFloatingUI();
                });
            });
        });

        // "Disable on all sites"
        floatingContainer.querySelector('#disable-all-sites').addEventListener('click', (e) => {
            e.stopPropagation();
            chrome.storage.local.set({ showFloatingButton: false }, () => {
                showFloatingButton = false;
                hideFloatingUI();
            });
        });

        // ===== Dynamic Toolbar Rendering =====
        function renderToolbarForContext(context) {
            const actions = getActionsForContext(context);
            const pinned = pinnedActions[context] || [];
            const pinnedSet = new Set(pinned);
            const pinnedItems = actions.filter(a => pinnedSet.has(a.id));
            const toolbarEl = floatingContainer.querySelector('#toolbar-dynamic');

            // Build toolbar buttons (pinned items only)
            let toolbarHTML = '';
            pinnedItems.forEach(action => {
                toolbarHTML += `<button class="tool-btn" title="${action.label}" data-action="${action.id}">${ACTION_ICONS[action.id]}</button>`;
            });

            // Separator + More + Separator + Close
            toolbarHTML += `
                <div class="separator"></div>
                <button class="tool-btn" title="More Options" id="more-btn">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="12" cy="5" r="1.5"/>
                        <circle cx="12" cy="12" r="1.5"/>
                        <circle cx="12" cy="19" r="1.5"/>
                    </svg>
                </button>
                <div class="separator"></div>
                <button class="close-toolbar-btn" title="Disable" id="close-toolbar-btn">
                    <svg viewBox="0 0 24 24">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
            `;
            toolbarEl.innerHTML = toolbarHTML;

            // Build more menu
            let menuHTML = '';
            const modeIcon = context === 'writing'
                ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>'
                : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>';
            menuHTML += `<div class="mode-indicator">${modeIcon} ${context === 'writing' ? 'Writing' : 'Reading'} Mode</div>`;

            // Extract SVG inner content helper
            const extractSvgInner = (svgStr) => svgStr.replace(/<svg[^>]*>/, '').replace(/<\/svg>/, '');

            actions.forEach(action => {
                const isPinned = pinnedSet.has(action.id);
                menuHTML += `
                    <button class="more-item" data-action="${action.id}">
                        <div class="more-item-row">
                            <div class="more-item-content">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${extractSvgInner(ACTION_ICONS[action.id])}</svg>
                                ${action.label}
                            </div>
                            <span class="pin-toggle ${isPinned ? 'pinned' : ''}" data-pin-action="${action.id}" title="${isPinned ? 'Unpin from toolbar' : 'Pin to toolbar'}">
                                ${PIN_ICON_SVG}
                            </span>
                        </div>
                    </button>
                `;
            });

            moreMenu.innerHTML = menuHTML;

            // --- Wire up all event listeners ---

            // Toolbar tool buttons
            toolbarEl.querySelectorAll('.tool-btn:not(#more-btn)').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const action = btn.dataset.action;
                    if (action) handleToolAction(action, null);
                });
            });

            // More menu item clicks (skip if pin-toggle was clicked)
            moreMenu.querySelectorAll('.more-item').forEach(item => {
                item.addEventListener('click', (e) => {
                    if (e.target.closest('.pin-toggle')) return;
                    e.stopPropagation();
                    const action = item.dataset.action;
                    if (action) {
                        handleToolAction(action, null);
                        isMenuOpen = false;
                        moreMenu.classList.remove('open');
                    }
                });
            });

            // Pin toggles
            moreMenu.querySelectorAll('.pin-toggle').forEach(toggle => {
                toggle.addEventListener('click', (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    const actionId = toggle.dataset.pinAction;
                    const currentPinned = pinnedActions[context] || [];
                    const isPinned = currentPinned.includes(actionId);

                    if (isPinned) {
                        pinnedActions[context] = currentPinned.filter(id => id !== actionId);
                    } else {
                        if (currentPinned.length >= MAX_PINNED) {
                            // Automatically unpin the first (oldest) pinned item (FIFO)
                            const updatedPinned = currentPinned.slice(1);
                            pinnedActions[context] = [...updatedPinned, actionId];
                        } else {
                            pinnedActions[context] = [...currentPinned, actionId];
                        }
                    }

                    chrome.storage.local.set({ floatingPinnedActions: pinnedActions });
                    renderToolbarForContext(context);
                    wireUpMenuInteractions();
                    isMenuOpen = true;
                    moreMenu.classList.add('open');
                    floatingContainer.classList.add('expanded');
                });
            });

            // More button
            const moreBtn = toolbarEl.querySelector('#more-btn');
            if (moreBtn) {
                moreBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    isDisableMenuOpen = false;
                    disableMenu.classList.remove('open');
                    disableMenu.classList.remove('flip-up', 'flip-left');
                    isMenuOpen = !isMenuOpen;
                    moreMenu.classList.toggle('open', isMenuOpen);
                    if (isMenuOpen) {
                        floatingContainer.classList.add('expanded');
                        adjustDropdownPosition(moreMenu, floatingContainer);
                    } else if (!floatingContainer.matches(':hover')) {
                        floatingContainer.classList.remove('expanded');
                    }
                });
            }

            // Close/Disable button
            const closeToolbarBtn = toolbarEl.querySelector('#close-toolbar-btn');
            if (closeToolbarBtn) {
                closeToolbarBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    isMenuOpen = false;
                    moreMenu.classList.remove('open');
                    moreMenu.classList.remove('flip-up', 'flip-left');
                    isDisableMenuOpen = !isDisableMenuOpen;
                    disableMenu.classList.toggle('open', isDisableMenuOpen);
                    if (isDisableMenuOpen) {
                        floatingContainer.classList.add('expanded');
                        adjustDropdownPosition(disableMenu, floatingContainer);
                    }
                });
                closeToolbarBtn.addEventListener('mouseenter', cancelAllTimers);
                closeToolbarBtn.addEventListener('mouseleave', scheduleAutoClose);
            }

            disableMenu.removeEventListener('mouseenter', cancelAllTimers);
            disableMenu.removeEventListener('mouseleave', scheduleAutoClose);
            disableMenu.addEventListener('mouseenter', cancelAllTimers);
            disableMenu.addEventListener('mouseleave', scheduleAutoClose);
        }

        // ===== Timer management =====
        let menuTimeout;
        let retractTimeout;

        const cancelAllTimers = () => {
            clearTimeout(menuTimeout);
            clearTimeout(retractTimeout);
        };

        const scheduleAutoClose = () => {
            if (isMenuOpen) {
                menuTimeout = setTimeout(() => {
                    isMenuOpen = false;
                    moreMenu.classList.remove('open');
                    floatingContainer.classList.remove('expanded');
                }, 2000);
            }
        };

        function wireUpMenuInteractions() {
            const moreBtn = floatingContainer.querySelector('#more-btn');
            if (moreBtn) {
                moreBtn.addEventListener('mouseenter', cancelAllTimers);
                moreBtn.addEventListener('mouseleave', scheduleAutoClose);
            }
            moreMenu.addEventListener('mouseenter', cancelAllTimers);
            moreMenu.addEventListener('mouseleave', scheduleAutoClose);
        }

        floatingContainer.addEventListener('mouseenter', () => {
            cancelAllTimers();
            clearTimeout(bubbleAutoHideTimer);
            floatingContainer.classList.add('expanded');

            // Screen-aware: shift left if expanded toolbar would overflow right edge
            requestAnimationFrame(() => {
                const containerRect = floatingContainer.getBoundingClientRect();
                const vpW = window.innerWidth;
                const MARGIN = 12;
                const expandedWidth = 400; // max-width from CSS

                if (containerRect.left + expandedWidth > vpW - MARGIN) {
                    const shift = (containerRect.left + expandedWidth) - (vpW - MARGIN);
                    if (!floatingContainer._originalLeft) {
                        floatingContainer._originalLeft = parseFloat(floatingContainer.style.left) || containerRect.left;
                    }
                    floatingContainer.style.left = `${floatingContainer._originalLeft - shift}px`;
                }
            });
        });

        floatingContainer.addEventListener('mouseleave', () => {
            retractTimeout = setTimeout(() => {
                floatingContainer.classList.remove('expanded');
                if (isMenuOpen) {
                    isMenuOpen = false;
                    moreMenu.classList.remove('open');
                    moreMenu.classList.remove('flip-up', 'flip-left');
                }
                if (isDisableMenuOpen) {
                    isDisableMenuOpen = false;
                    disableMenu.classList.remove('open');
                    disableMenu.classList.remove('flip-up', 'flip-left');
                }
                // Restore original position when toolbar collapses
                if (floatingContainer._originalLeft != null) {
                    floatingContainer.style.left = `${floatingContainer._originalLeft}px`;
                    floatingContainer._originalLeft = null;
                }
            }, 800);

            clearTimeout(bubbleAutoHideTimer);
            bubbleAutoHideTimer = setTimeout(() => {
                if (!floatingContainer.matches(':hover') && !isMenuOpen && !isDisableMenuOpen) {
                    hideFloatingUI();
                }
            }, 5000);
        });

        floatingContainer.addEventListener('dblclick', (e) => {
            if (e.target.closest('.tool-btn') || e.target.closest('.more-menu')) return;
            e.stopPropagation();
            handleToolAction('COPY_SELECTION');
        });

        // Initial render
        renderToolbarForContext(currentContext);
        wireUpMenuInteractions();

        // Expose re-render for context switches
        floatingContainer._renderForContext = (ctx) => {
            renderToolbarForContext(ctx);
            wireUpMenuInteractions();
        };
    }

    // ===== Create Result Panel =====
    function createResultPanel() {
        const wrapper = shadowRoot.querySelector('.theme-wrapper');

        resultPanel = document.createElement('div');
        resultPanel.id = 'viky-result-panel';
        resultPanel.className = 'viky-panel hidden';

        resultPanel.innerHTML = `
            <div class="panel-header">
                <div class="panel-title">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 2L2 7L12 12L22 7L12 2Z"/>
                        <path d="M2 17L12 22L22 17"/>
                        <path d="M2 12L12 17L22 12"/>
                    </svg>
                    <span>Viky AI Result</span>
                </div>
                <button class="close-btn" title="Close">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
            </div>
            <div class="panel-content" id="viky-result-content">
                <div class="loading-state">
                    <div class="loading-spinner"></div>
                    <span>AI is thinking...</span>
                </div>
            </div>
            <div class="panel-actions">
                <button class="panel-btn" id="viky-copy-btn">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                    </svg>
                    Copy
                </button>
                <button class="panel-btn primary" id="viky-replace-btn">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 20h9"/>
                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                    </svg>
                    Replace
                </button>
            </div>
        `;

        wrapper.appendChild(resultPanel);

        resultPanel.querySelector('.close-btn').addEventListener('click', hideResultPanel);
        resultPanel.querySelector('#viky-copy-btn').addEventListener('click', copyResult);
        resultPanel.querySelector('#viky-replace-btn').addEventListener('click', replaceSelection);

        makeDraggable(resultPanel);
    }

    // ===== Event Handlers =====
    // ===== Selection-aware event layer =====
    // Computes a bounding rect for the selected text inside an <input> or <textarea>.
    // window.getSelection() does NOT return text inside form fields — we have to use
    // activeElement.selectionStart/End and a mirror-div technique to measure the pixel rect.
    // (The spellchecker at spellcheck.js:122-156 has the same technique — keep them in sync.)
    function getInputSelectionRect(el) {
        if (!el || typeof el.selectionStart !== 'number' || typeof el.selectionEnd !== 'number') return null;
        if (el.selectionStart === el.selectionEnd) return null;

        try {
            const computed = window.getComputedStyle(el);
            const mirror = document.createElement('div');
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

            const text = el.value;
            mirror.appendChild(document.createTextNode(text.substring(0, el.selectionStart)));
            const selSpan = document.createElement('span');
            selSpan.textContent = text.substring(el.selectionStart, el.selectionEnd);
            mirror.appendChild(selSpan);
            mirror.appendChild(document.createTextNode(text.substring(el.selectionEnd)));
            document.body.appendChild(mirror);

            const selRect = selSpan.getBoundingClientRect();
            const mirrorRect = mirror.getBoundingClientRect();
            const elRect = el.getBoundingClientRect();
            document.body.removeChild(mirror);

            return {
                left:   selRect.left - mirrorRect.left + elRect.left - el.scrollLeft,
                top:    selRect.top  - mirrorRect.top  + elRect.top  - el.scrollTop,
                right:  selRect.left - mirrorRect.left + elRect.left - el.scrollLeft + selRect.width,
                bottom: selRect.top  - mirrorRect.top  + elRect.top  - el.scrollTop + selRect.height,
                width:  selRect.width,
                height: selRect.height
            };
        } catch (e) {
            return null;
        }
    }

    // Returns the selected text + rect for an input/textarea, or null if not applicable.
    function getInputSelection() {
        const el = document.activeElement;
        if (!el) return null;
        const tag = el.tagName ? el.tagName.toLowerCase() : '';
        if (tag !== 'input' && tag !== 'textarea') return null;
        // Skip inputs that don't have selectable text
        if (el.type && ['button', 'checkbox', 'radio', 'submit', 'reset', 'hidden', 'image', 'file'].includes(el.type.toLowerCase())) return null;
        const start = el.selectionStart;
        const end = el.selectionEnd;
        if (typeof start !== 'number' || typeof end !== 'number' || start === end) return null;
        const text = el.value.substring(start, end);
        if (!text.trim()) return null;
        const rect = getInputSelectionRect(el);
        if (!rect) return null;
        return { text, rect };
    }

    function handleSelection(e) {
        if (e && e.composedPath && e.composedPath().includes(hostElement)) return;

        setTimeout(() => {
            // Path A: standard selection (window.getSelection) — works for normal page text + contenteditable
            const selection = window.getSelection();
            const text = selection ? selection.toString().trim() : '';

            // Path B: input/textarea selection (uses activeElement.selectionStart/End)
            // This is the missing piece — without it, "Improve / Fix grammar / Continue writing"
            // never appear when you select text inside a textarea (which is exactly where
            // they're most useful).
            const inputSel = getInputSelection();

            // Prefer Path A if it has text; otherwise fall back to Path B
            if (text.length > 0 && showFloatingButton) {
                selectedText = text;
                if (selection.rangeCount > 0) {
                    selectionRange = selection.getRangeAt(0).cloneRange();
                } else {
                    selectionRange = null;
                }
                currentContext = getSelectionContext();
                if (floatingContainer && floatingContainer._renderForContext) {
                    floatingContainer._renderForContext(currentContext);
                }
                showFloatingUI(selectionRange);
            } else if (inputSel && showFloatingButton) {
                // We have a selection inside an input/textarea — synthesize a fake "range"
                // that showFloatingUI can use. We can't make a real Range (input/textarea text
                // isn't in the DOM), but we can pass a { getBoundingClientRect() } stub.
                selectedText = inputSel.text;
                selectionRange = {
                    _isInputStub: true,
                    _inputEl: document.activeElement,
                    _rect: inputSel.rect,
                    getBoundingClientRect() { return this._rect; },
                    cloneRange() { return this; },
                    collapse() { /* no-op for our purposes */ }
                };
                currentContext = 'writing'; // input/textarea selections are always "writing"
                if (floatingContainer && floatingContainer._renderForContext) {
                    floatingContainer._renderForContext(currentContext);
                }
                showFloatingUI(selectionRange);
            }
        }, 10);
    }

    function handleOutsideClick(e) {
        if (!e.composedPath().includes(hostElement)) {
            setTimeout(() => {
                const selection = window.getSelection();
                if (selection.toString().trim().length === 0) {
                    hideFloatingUI();
                }
            }, 50);
        }
    }

    // ===== Floating UI Functions =====
    /**
     * Screen-aware positioning: Positions the floating bubble
     * near the selection end, clamping to all 4 viewport edges.
     * When there's no room to the right, tries below the selection;
     * if still clipped, tries above or left.
     */
    function showFloatingUI(range) {
        const endRange = range.cloneRange();
        endRange.collapse(false);
        const endRect = endRange.getBoundingClientRect();
        const fullRect = range.getBoundingClientRect();

        const rect = (endRect.width === 0 && endRect.height === 0)
            ? fullRect
            : endRect;

        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        const scrollLeft = window.scrollX || document.documentElement.scrollLeft;

        const vpW = window.innerWidth;
        const vpH = window.innerHeight;
        const MARGIN = 12;

        // Expanded toolbar is ~400px max, collapsed bubble is 28px.
        // Use 48px as "initial" estimate — actual clamping prevents overflow.
        const BUBBLE_W = 48;
        const BUBBLE_H = 32;

        let top, left;
        let placement = 'right'; // preferred: right of selection end

        // Strategy 1: Place to the right of the selection endpoint
        left = rect.right + scrollLeft + 8;
        top = rect.top + scrollTop + (rect.height / 2) - (BUBBLE_H / 2);

        if (rect.right + 8 + BUBBLE_W > vpW - MARGIN) {
            // Strategy 2: Below the full selection
            placement = 'below';
            top = fullRect.bottom + scrollTop + 8;
            left = fullRect.left + scrollLeft;
        }

        if (placement === 'below' && fullRect.bottom + 8 + BUBBLE_H > vpH - MARGIN) {
            // Strategy 3: Above the full selection
            placement = 'above';
            top = fullRect.top + scrollTop - BUBBLE_H - 8;
            left = fullRect.left + scrollLeft;
        }

        // Clamp horizontal: ensure bubble stays within [MARGIN, vpW - MARGIN]
        const maxLeft = vpW + scrollLeft - BUBBLE_W - MARGIN;
        if (left > maxLeft) left = maxLeft;
        if (left < scrollLeft + MARGIN) left = scrollLeft + MARGIN;

        // Clamp vertical: ensure within viewport
        const maxTop = vpH + scrollTop - BUBBLE_H - MARGIN;
        if (top > maxTop) top = maxTop;
        if (top < scrollTop + MARGIN) top = scrollTop + MARGIN;

        // Mark near-top for CSS tooltip flip
        floatingContainer.classList.toggle('near-top',
            (top - scrollTop) < 50
        );

        // Reset expansion shift state for this new placement
        floatingContainer._originalLeft = null;

        floatingContainer.style.top = `${top}px`;
        floatingContainer.style.left = `${left}px`;
        floatingContainer.classList.remove('hidden');
        floatingContainer.classList.add('visible');

        isMenuOpen = false;
        moreMenu.classList.remove('open');
        moreMenu.classList.remove('flip-up', 'flip-left');

        clearTimeout(bubbleAutoHideTimer);
        bubbleAutoHideTimer = setTimeout(() => {
            if (!floatingContainer.matches(':hover') && !isMenuOpen) {
                hideFloatingUI();
            }
        }, 5000);
    }

    /**
     * Adjusts dropdown (more-menu / disable-menu) position so it
     * doesn't overflow the viewport. Adds CSS classes for flip direction.
     */
    function adjustDropdownPosition(dropdown, container) {
        // Reset previous flip classes first
        dropdown.classList.remove('flip-up', 'flip-left');

        // Wait 1 frame for the dropdown to render with open class
        requestAnimationFrame(() => {
            const containerRect = container.getBoundingClientRect();
            const dropdownRect = dropdown.getBoundingClientRect();
            const vpH = window.innerHeight;
            const vpW = window.innerWidth;
            const MARGIN = 12;

            // Check bottom overflow → flip upward
            if (dropdownRect.bottom > vpH - MARGIN) {
                dropdown.classList.add('flip-up');
            }

            // Check right overflow → flip left-aligned
            if (dropdownRect.right > vpW - MARGIN) {
                dropdown.classList.add('flip-left');
            }

            // Check left overflow (if flipped left) → reset
            const updatedRect = dropdown.getBoundingClientRect();
            if (updatedRect.left < MARGIN) {
                dropdown.classList.remove('flip-left');
            }
        });
    }

    function hideFloatingUI() {
        floatingContainer.classList.remove('visible');
        floatingContainer.classList.add('hidden');
        isMenuOpen = false;
        if (moreMenu) moreMenu.classList.remove('open');
        clearTimeout(bubbleAutoHideTimer);
    }

    function showResultPanel() {
        // Always show Replace button - works on both editable and non-editable content
        const replaceBtn = resultPanel.querySelector('#viky-replace-btn');
        if (replaceBtn) {
            replaceBtn.style.display = 'inline-flex';
        }

        if (selectionRange) {
            const rect = selectionRange.getBoundingClientRect();
            const scrollTop = window.scrollY || document.documentElement.scrollTop;
            const scrollLeft = window.scrollX || document.documentElement.scrollLeft;
            const vpW = window.innerWidth;
            const vpH = window.innerHeight;
            const MARGIN = 16;

            // Use actual panel dimensions if available, otherwise estimate
            const panelWidth = resultPanel.offsetWidth || 280;
            const panelHeight = resultPanel.offsetHeight || 300;

            let top = rect.bottom + scrollTop + 12;
            let left = rect.left + scrollLeft;

            // Horizontal clamping
            if (left + panelWidth > vpW + scrollLeft - MARGIN) {
                left = vpW + scrollLeft - panelWidth - MARGIN;
            }
            if (left < scrollLeft + MARGIN) left = scrollLeft + MARGIN;

            // Vertical clamping: prefer below, flip above if overflowing
            if (rect.bottom + 12 + panelHeight > vpH - MARGIN) {
                // Try above the selection
                const aboveTop = rect.top + scrollTop - panelHeight - 12;
                if (aboveTop >= scrollTop + MARGIN) {
                    top = aboveTop;
                } else {
                    // If neither above nor below fits, clamp to viewport bottom
                    top = vpH + scrollTop - panelHeight - MARGIN;
                }
            }

            // Final safety clamp
            if (top < scrollTop + MARGIN) top = scrollTop + MARGIN;

            resultPanel.style.top = `${top}px`;
            resultPanel.style.left = `${left}px`;
            resultPanel.style.transform = 'none';
        } else {
            resultPanel.style.top = '100px';
            resultPanel.style.left = '50%';
            resultPanel.style.transform = 'translateX(-50%)';
        }

        resultPanel.classList.remove('hidden');
        resultPanel.classList.add('visible');
    }

    function hideResultPanel() {
        resultPanel.classList.remove('visible');
        resultPanel.classList.add('hidden');
    }

    // ===== Tool Actions =====
    async function handleToolAction(action, lang) {
        if (action === 'COPY_SELECTION') {
            try {
                await navigator.clipboard.writeText(selectedText);
                showCopiedFeedback();
            } catch (err) {
                console.error('Copy failed:', err);
            }
            hideFloatingUI();
            return;
        }

        if (action === 'HIGHLIGHT') {
            try {
                const range = selectionRange;
                if (range) {
                    const highlightColor = currentHighlightColor || '#facc15';
                    const translucentColor = hexToRgba(highlightColor, 0.35);

                    // Extract the selected contents into a fragment
                    const fragment = range.extractContents();
                    
                    // Recursive function to wrap text nodes in our classed highlight span
                    function highlightNodeList(node) {
                        if (node.nodeType === 3) { // Text node
                            if (node.nodeValue.trim() !== '') {
                                const span = document.createElement('span');
                                span.className = 'viky-highlight-mark';
                                span.style.backgroundColor = translucentColor;
                                node.parentNode.replaceChild(span, node);
                                span.appendChild(node);
                            }
                        } else if (node.nodeType === 1) { // Element node
                            if (!node.classList.contains('viky-highlight-mark')) {
                                Array.from(node.childNodes).forEach(highlightNodeList);
                            }
                        }
                    }

                    Array.from(fragment.childNodes).forEach(highlightNodeList);
                    range.insertNode(fragment);
                    showHighlightedFeedback();
                }
            } catch (err) {
                console.error('Highlight failed:', err);
                try {
                    // Fallback to background color command if manual DOM wrapping fails
                    const highlightColor = currentHighlightColor || '#facc15';
                    const translucentColor = hexToRgba(highlightColor, 0.35);
                    
                    document.execCommand('backColor', false, translucentColor);
                    showHighlightedFeedback();
                    
                    if (selectionRange) {
                        const container = selectionRange.commonAncestorContainer;
                        const spans = (container.nodeType === 1 ? container : container.parentNode).querySelectorAll('span');
                        spans.forEach(s => {
                            if (s.style.backgroundColor && (s.style.backgroundColor.includes('rgba') || s.style.backgroundColor.includes('rgb'))) {
                                s.className = 'viky-highlight-mark';
                            }
                        });
                    }
                } catch (e2) {
                    console.error('Highlight fallback failed:', e2);
                }
            }
            hideFloatingUI();
            const sel = window.getSelection();
            if (sel) sel.removeAllRanges();
            return;
        }

        hideFloatingUI();
        showResultPanel();

        const contentDiv = resultPanel.querySelector('#viky-result-content');

        if (action === 'TRANSLATE_MENU') {
            chrome.storage.local.get(['defaultLanguage'], (result) => {
                const defaultLang = result.defaultLanguage || '';
                
                contentDiv.innerHTML = `
                    <div class="translation-ui" style="display: flex; flex-direction: column; gap: 8px;">
                        <label style="font-size: 11px; color: var(--text-secondary); font-weight: 500;">Translate to:</label>
                        <select id="viky-lang-select" style="
                            width: 100%;
                            padding: 8px 10px;
                            border-radius: 8px;
                            border: 1px solid var(--border-color);
                            background-color: var(--bg-elevated);
                            color: var(--text-primary);
                            font-family: inherit;
                            font-size: 12px;
                            outline: none;
                            cursor: pointer;
                            transition: border-color 0.2s ease;
                            -webkit-appearance: none;
                            appearance: none;
                            background-image: url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%236b7280%22 stroke-width=%222%22><polyline points=%226 9 12 15 18 9%22/></svg>');
                            background-repeat: no-repeat;
                            background-position: right 10px center;
                        ">
                            <option value="" ${!defaultLang ? 'selected' : ''} disabled style="background: var(--bg-surface); color: var(--text-muted);">Choose a language...</option>
                            <option value="Hindi" ${defaultLang === 'Hindi' ? 'selected' : ''} style="background: var(--bg-surface); color: var(--text-primary);">Hindi</option>
                            <option value="English" ${defaultLang === 'English' ? 'selected' : ''} style="background: var(--bg-surface); color: var(--text-primary);">English</option>
                            <option value="Spanish" ${defaultLang === 'Spanish' ? 'selected' : ''} style="background: var(--bg-surface); color: var(--text-primary);">Spanish</option>
                            <option value="French" ${defaultLang === 'French' ? 'selected' : ''} style="background: var(--bg-surface); color: var(--text-primary);">French</option>
                            <option value="German" ${defaultLang === 'German' ? 'selected' : ''} style="background: var(--bg-surface); color: var(--text-primary);">German</option>
                            <option value="Italian" ${defaultLang === 'Italian' ? 'selected' : ''} style="background: var(--bg-surface); color: var(--text-primary);">Italian</option>
                            <option value="Portuguese" ${defaultLang === 'Portuguese' ? 'selected' : ''} style="background: var(--bg-surface); color: var(--text-primary);">Portuguese</option>
                            <option value="Chinese" ${defaultLang === 'Chinese' ? 'selected' : ''} style="background: var(--bg-surface); color: var(--text-primary);">Chinese</option>
                            <option value="Japanese" ${defaultLang === 'Japanese' ? 'selected' : ''} style="background: var(--bg-surface); color: var(--text-primary);">Japanese</option>
                            <option value="Korean" ${defaultLang === 'Korean' ? 'selected' : ''} style="background: var(--bg-surface); color: var(--text-primary);">Korean</option>
                            <option value="Russian" ${defaultLang === 'Russian' ? 'selected' : ''} style="background: var(--bg-surface); color: var(--text-primary);">Russian</option>
                            <option value="Arabic" ${defaultLang === 'Arabic' ? 'selected' : ''} style="background: var(--bg-surface); color: var(--text-primary);">Arabic</option>
                        </select>
                    </div>
                    <div id="viky-translation-result" style="margin-top: 6px;">
                        <div style="text-align: center; color: var(--text-muted); font-size: 11px; padding: 12px 0;">Select a language above to translate</div>
                    </div>
                `;

                const select = contentDiv.querySelector('#viky-lang-select');
                select.addEventListener('change', (e) => {
                    if (e.target.value) {
                        performTranslation(e.target.value);
                    }
                });

                if (defaultLang) {
                    performTranslation(defaultLang);
                }
            });
            return;
        }

        contentDiv.innerHTML = `
            <div class="loading-state">
                <div class="loading-spinner"></div>
                <span>Processing...</span>
            </div>
        `;

        performStreamingApiCall(action, lang, contentDiv);
    }

    async function performTranslation(targetLang) {
        const resultDiv = resultPanel.querySelector('#viky-translation-result');
        if (!resultDiv) return;

        resultDiv.innerHTML = `
            <div class="loading-state">
                <div class="loading-spinner"></div>
                <span>Translating to ${targetLang}...</span>
            </div>
        `;

        performStreamingApiCall('TRANSLATE', targetLang, resultDiv);
    }

    // ===== Streaming API Call for Content Script =====
    function performStreamingApiCall(action, lang, targetElement) {
        // Guard: check for invalidated extension context before connecting
        try {
            if (!(chrome.runtime && chrome.runtime.id)) {
                targetElement.innerHTML = `<div class="error-state">⚠ Extension was updated. Please refresh this page and try again.</div>`;
                return;
            }
        } catch (e) {
            targetElement.innerHTML = `<div class="error-state">⚠ Extension was updated. Please refresh this page and try again.</div>`;
            return;
        }

        let port;
        try {
            port = chrome.runtime.connect({ name: 'viky-stream' });
        } catch (e) {
            targetElement.innerHTML = `<div class="error-state">⚠ Extension was updated. Please refresh this page and try again.</div>`;
            return;
        }

        let fullText = '';
        let hasStarted = false;
        let hasCompleted = false;

        port.onMessage.addListener((response) => {
            if (!hasStarted && response.chunk) {
                targetElement.innerHTML = '';
                hasStarted = true;
            }

            if (response.chunk) {
                fullText += response.chunk;
                targetElement.innerHTML = `<div class="result-text">${escapeHtml(fullText)}</div>`;
            }

            if (response.done) {
                hasCompleted = true;
                resultPanel.dataset.lastResult = fullText;
                port.disconnect();
            }

            if (response.error) {
                hasCompleted = true;
                targetElement.innerHTML = `<div class="error-state">Error: ${response.error}</div>`;
                port.disconnect();
            }
        });

        port.onDisconnect.addListener(() => {
            if (!hasCompleted && !hasStarted) {
                const lastErr = chrome.runtime.lastError;
                if (lastErr && lastErr.message && lastErr.message.includes('Extension context invalidated')) {
                    targetElement.innerHTML = `<div class="error-state">⚠ Extension was updated. Please refresh this page and try again.</div>`;
                } else {
                    targetElement.innerHTML = `<div class="error-state">Connection closed unexpectedly</div>`;
                }
            }
        });

        chrome.storage.local.get(['selectedModel'], (result) => {
            const activeModel = result.selectedModel || 'meta-llama/llama-3.3-70b-instruct:free';
            port.postMessage({
                action: 'ANALYZE_TEXT',
                text: selectedText,
                type: action,
                targetLanguage: lang,
                stream: true,
                model: activeModel
            });
        });
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function showCopiedFeedback() {
        const feedback = document.createElement('div');
        feedback.className = 'copy-feedback';
        feedback.textContent = 'Copied!';
        // Append to shadow root so it picks up the fadeOut keyframes (defined in shadow root)
        // instead of document.body where host-page CSP/stylesheet would clobber the animation.
        const container = shadowRoot.querySelector('.theme-wrapper') || shadowRoot;
        container.appendChild(feedback);

        const rect = floatingContainer.getBoundingClientRect();
        // Use the single placeOverlay helper — element is position:fixed, placed above the bubble.
        // The helper handles viewport clamping and avoids the double-count-scroll bug.
        feedback.style.cssText = `
            position: fixed;
            transform: translateY(-100%);
            background: #10b981;
            color: white;
            padding: 6px 12px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 500;
            z-index: 2147483647;
            animation: fadeOut 1s ease forwards;
            animation-delay: 1s;
            pointer-events: none;
        `;
        // Place above the floating container, horizontally centered on it
        placeOverlay(feedback, rect, 'fixed-above', { center: true });

        setTimeout(() => feedback.remove(), 2000);
    }

    function showSelectTextNotification() {
        const feedback = document.createElement('div');
        feedback.className = 'viky-select-text-feedback';
        feedback.textContent = 'Select some text on the page first';
        const container = shadowRoot.querySelector('.theme-wrapper') || shadowRoot;
        container.appendChild(feedback);

        feedback.style.cssText = [
            'position: fixed',
            'background: var(--accent-primary, #00ff9d)',
            'color: var(--bg-surface, #121214)',
            'padding: 10px 16px',
            'border-radius: 8px',
            'font-size: 12px',
            'font-weight: 600',
            'font-family: var(--font-family)',
            'box-shadow: 0 4px 14px rgba(0,0,0,0.35), 0 0 18px var(--accent-glow, var(--accent-glow))',
            'z-index: 2147483647',
            'animation: fadeOut 1s ease forwards',
            'animation-delay: 1.6s',
            'pointer-events: none'
        ].join(';');
        // Centered at the bottom of the viewport
        placeOverlay(feedback, null, 'fixed-center');
        feedback.style.bottom = '24px';
        feedback.style.top = 'auto';
        feedback.style.transform = 'translateX(-50%)';
        feedback.style.left = '50%';

        setTimeout(() => feedback.remove(), 2800);
    }

    function showHighlightedFeedback() {
        const feedback = document.createElement('div');
        feedback.className = 'highlight-feedback';
        feedback.textContent = 'Highlighted!';
        const container = shadowRoot.querySelector('.theme-wrapper') || shadowRoot;
        container.appendChild(feedback);

        const rect = floatingContainer.getBoundingClientRect();
        feedback.style.cssText = `
            position: fixed;
            transform: translateY(-100%);
            background: var(--accent-primary, #e67e22);
            color: white;
            padding: 6px 12px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 500;
            z-index: 2147483647;
            animation: fadeOut 1s ease forwards;
            animation-delay: 1s;
            pointer-events: none;
        `;
        placeOverlay(feedback, rect, 'fixed-above', { center: true });

        setTimeout(() => feedback.remove(), 2000);
    }

    function hexToRgba(hex, alpha) {
        let cleanHex = hex.replace('#', '');
        if (cleanHex.length === 3) {
            cleanHex = cleanHex.split('').map(c => c + c).join('');
        }
        const r = parseInt(cleanHex.slice(0, 2), 16);
        const g = parseInt(cleanHex.slice(2, 4), 16);
        const b = parseInt(cleanHex.slice(4, 6), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    function getOrCreateHighlightTooltip() {
        if (highlightTooltip) return highlightTooltip;

        highlightTooltip = document.createElement('div');
        highlightTooltip.className = 'viky-highlight-tooltip';

        highlightTooltip.innerHTML = `
            <div class="viky-highlight-tooltip-logo">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right: 3px;">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                </svg>
                <span>Viky AI</span>
            </div>
            <div class="viky-highlight-tooltip-divider"></div>
            <button class="viky-highlight-tooltip-btn" id="viky-remove-highlight-btn">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 2px;">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    <line x1="10" y1="11" x2="10" y2="17"/>
                    <line x1="14" y1="11" x2="14" y2="17"/>
                </svg>
                Remove Highlight
            </button>
        `;

        // Append to shadow root so the tooltip's CSS (defined in mainStyle lives in document.head,
        // but the tooltip's class is also defined in VIKY_CSS in shadow root) and any animations
        // are isolated from host-page overrides. position: fixed elements inside a shadow root
        // still render correctly over host content.
        const container = shadowRoot.querySelector('.theme-wrapper') || shadowRoot;
        container.appendChild(highlightTooltip);

        highlightTooltip.addEventListener('mouseenter', () => {
            clearTimeout(tooltipAutoHideTimer);
        });

        highlightTooltip.addEventListener('mouseleave', () => {
            hideHighlightTooltip();
        });

        const removeBtn = highlightTooltip.querySelector('#viky-remove-highlight-btn');
        removeBtn.addEventListener('click', () => {
            if (highlightTooltip.activeHighlight) {
                removeHighlight(highlightTooltip.activeHighlight);
                hideHighlightTooltip();
            }
        });

        return highlightTooltip;
    }

    function showHighlightTooltip(highlightEl) {
        const tooltip = getOrCreateHighlightTooltip();
        tooltip.activeHighlight = highlightEl;

        const rect = highlightEl.getBoundingClientRect();

        // Need the tooltip to be visible briefly to measure its dimensions,
        // then place it via the helper, then animate in.
        tooltip.style.display = 'flex';
        tooltip.style.visibility = 'hidden';
        tooltip.style.opacity = '0';

        // Force layout so offsetWidth/Height are correct
        // (no need to read them explicitly — placeOverlay does that internally)

        tooltip.style.visibility = '';
        placeOverlay(tooltip, rect, 'fixed-above', { center: true });
        tooltip.classList.add('visible');
    }

    function hideHighlightTooltip() {
        if (!highlightTooltip) return;
        clearTimeout(tooltipAutoHideTimer);
        tooltipAutoHideTimer = setTimeout(() => {
            highlightTooltip.classList.remove('visible');
            setTimeout(() => {
                if (highlightTooltip && !highlightTooltip.classList.contains('visible')) {
                    highlightTooltip.style.display = 'none';
                }
            }, 200);
        }, 300);
    }

    function removeHighlight(highlightEl) {
        const parent = highlightEl.parentNode;
        if (!parent) return;
        
        if (highlightEl.classList.contains('viky-highlight-mark')) {
            while (highlightEl.firstChild) {
                parent.insertBefore(highlightEl.firstChild, highlightEl);
            }
            parent.removeChild(highlightEl);
            // Merge adjacent text nodes — without this, repeated highlight/remove cycles
            // fragment the DOM with thousands of split text nodes, slowing TreeWalker
            // traversals and breaking the browser's native text selection in subtle ways.
            parent.normalize();
        } else {
            highlightEl.style.backgroundColor = '';
            highlightEl.classList.remove('viky-highlight-mark');
        }
    }

    function handleHighlightMouseEnter(e) {
        clearTimeout(tooltipAutoHideTimer);
        showHighlightTooltip(e.currentTarget);
    }

    function handleHighlightMouseLeave() {
        hideHighlightTooltip();
    }


    function copyResult() {
        const text = resultPanel.querySelector('.result-text')?.textContent ||
            resultPanel.querySelector('#viky-result-content').textContent;

        navigator.clipboard.writeText(text).then(() => {
            const btn = resultPanel.querySelector('#viky-copy-btn');
            const originalHTML = btn.innerHTML;
            btn.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12"/>
                </svg>
                Copied!
            `;
            setTimeout(() => (btn.innerHTML = originalHTML), 2000);
        });
    }

    function textToHtml(text) {
        if (!text) return '';
        const paragraphs = text.split(/\r?\n\r?\n+/);
        const htmlParagraphs = paragraphs.map(p => {
            const lines = p.split(/\r?\n/).map(line => escapeHtml(line));
            return `<div>${lines.join('<br>')}</div>`;
        });
        return htmlParagraphs.join('<div><br></div>');
    }

    function replaceSelection() {
        const newText = resultPanel.dataset.lastResult;
        if (!newText) return;

        // Helper: show "Copied!" fallback on the Replace button
        function showCopiedFallback() {
            navigator.clipboard.writeText(newText);
            const btn = resultPanel.querySelector('#viky-replace-btn');
            btn.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12"/>
                </svg>
                Copied!
            `;
            setTimeout(() => {
                btn.innerHTML = `
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 20h9"/>
                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                    </svg>
                    Replace
                `;
            }, 2000);
        }

        // No range saved — just copy to clipboard
        if (!selectionRange) {
            showCopiedFallback();
            return;
        }

        // ===== Input/textarea path (synthesized stub range) =====
        // When the user selected text inside an <input> or <textarea>, selectionRange is
        // our synthetic stub object (see handleSelection). Real DOM range operations like
        // commonAncestorContainer / deleteContents don't apply — we use setSelectionRange
        // + document.execCommand('insertText') instead.
        if (selectionRange._isInputStub) {
            const el = selectionRange._inputEl;
            if (!el || el.disabled || el.readOnly) {
                showCopiedFallback();
                return;
            }
            try {
                const start = el.selectionStart;
                const end = el.selectionEnd;
                // Replace the selected region with the new text
                el.focus();
                el.setSelectionRange(start, end);
                const ok = document.execCommand('insertText', false, newText);
                if (!ok) {
                    // execCommand can return false on some browsers — manual fallback
                    el.value = el.value.substring(0, start) + newText + el.value.substring(end);
                    el.setSelectionRange(start + newText.length, start + newText.length);
                }
                // Dispatch input event so frameworks (React, Vue) pick up the change
                el.dispatchEvent(new Event('input', { bubbles: true }));
            } catch (err) {
                console.error('[Viky AI] input/textarea replace failed:', err);
                showCopiedFallback();
                return;
            }
            hideResultPanel();
            return;
        }

        try {
            const container = selectionRange.commonAncestorContainer;
            const editableEl = container.nodeType === 1 ? container : container.parentElement;
            const isEditable = editableEl && (
                editableEl.isContentEditable ||
                editableEl.tagName === 'TEXTAREA' ||
                editableEl.tagName === 'INPUT'
            );

            if (isEditable) {
                // Editable element: restore selection and use execCommand
                const selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(selectionRange);
                
                if (editableEl.tagName === 'TEXTAREA' || editableEl.tagName === 'INPUT') {
                    document.execCommand('insertText', false, newText);
                } else {
                    const htmlText = textToHtml(newText);
                    document.execCommand('insertHTML', false, htmlText);
                }
            } else {
                // Non-editable: try range-based replacement first
                let replaced = false;
                try {
                    // Verify the range is still valid by checking its bounding rect
                    const rect = selectionRange.getBoundingClientRect();
                    if (rect && (rect.width > 0 || rect.height > 0)) {
                        selectionRange.deleteContents();
                        const htmlText = textToHtml(newText);
                        const tempDiv = document.createElement('div');
                        tempDiv.innerHTML = htmlText;
                        const fragment = document.createDocumentFragment();
                        while (tempDiv.firstChild) {
                            fragment.appendChild(tempDiv.firstChild);
                        }
                        selectionRange.insertNode(fragment);
                        replaced = true;
                    }
                } catch (rangeErr) {
                    // Range went stale, fall through to text-based search
                }

                // Fallback: find the original text in the DOM via TreeWalker
                if (!replaced && selectedText) {
                    const body = document.body;
                    const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT, null, false);
                    let node;
                    let targetNode = null;
                    let targetOffset = -1;

                    while (node = walker.nextNode()) {
                        // Skip nodes inside our own UI
                        if (node.parentElement && node.parentElement.closest('#viky-ai-root')) continue;
                        const idx = node.textContent.indexOf(selectedText);
                        if (idx !== -1) {
                            targetNode = node;
                            targetOffset = idx;
                            break;
                        }
                    }

                    if (targetNode) {
                        const range = document.createRange();
                        range.setStart(targetNode, targetOffset);
                        range.setEnd(targetNode, targetOffset + selectedText.length);
                        range.deleteContents();
                        const htmlText = textToHtml(newText);
                        const tempDiv = document.createElement('div');
                        tempDiv.innerHTML = htmlText;
                        const fragment = document.createDocumentFragment();
                        while (tempDiv.firstChild) {
                            fragment.appendChild(tempDiv.firstChild);
                        }
                        range.insertNode(fragment);
                        replaced = true;
                    }
                }

                if (!replaced) {
                    showCopiedFallback();
                    return;
                }
            }
        } catch (err) {
            showCopiedFallback();
            return;
        }

        hideResultPanel();
    }

    // ===== Make Draggable =====
    function makeDraggable(el) {
        const header = el.querySelector('.panel-header');
        let isDragging = false;
        let startX, startY, initialLeft, initialTop;
        let moveHandler = null;
        let upHandler = null;

        header.addEventListener('mousedown', (e) => {
            if (e.target.closest('button')) return;

            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            // The panel is position: absolute (document-relative). Its current style.left/top
            // already include scroll offsets (set in showResultPanel). Reading getBoundingClientRect
            // gives viewport coords (no scroll), which would cause a jump on the first mousemove
            // when the page is scrolled. Read the actual style values instead.
            const cs = getComputedStyle(el);
            initialLeft = parseFloat(cs.left) || 0;
            initialTop = parseFloat(cs.top) || 0;
            header.style.cursor = 'grabbing';
            e.preventDefault();

            // Attach move/up ONLY during drag (not permanently on document) to avoid wasted CPU.
            moveHandler = (ev) => {
                if (!isDragging) return;
                el.style.left = `${initialLeft + (ev.clientX - startX)}px`;
                el.style.top = `${initialTop + (ev.clientY - startY)}px`;
            };
            upHandler = () => {
                isDragging = false;
                header.style.cursor = 'grab';
                document.removeEventListener('mousemove', moveHandler);
                document.removeEventListener('mouseup', upHandler);
                moveHandler = null;
                upHandler = null;
            };
            document.addEventListener('mousemove', moveHandler);
            document.addEventListener('mouseup', upHandler);
        });
    }

    // ===== Add Animations =====
    function addAnimations() {
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeOut {
                from { opacity: 1; transform: translateY(0); }
                to { opacity: 0; transform: translateY(-8px); }
            }
        `;
        shadowRoot.appendChild(style);
    }

    // ===== Start =====
    if (document.body) {
        init();
        addAnimations();
    } else {
        document.addEventListener('DOMContentLoaded', () => {
            init();
            addAnimations();
        });
    }
})();
