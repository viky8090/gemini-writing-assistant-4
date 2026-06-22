# 🟢 Viky AI - Smart Writing Assistant

> **Viky AI** is a premium, feature-rich Google Chrome extension designed to be your ultimate browser companion. It integrates state-of-the-art AI language models, an Image Studio, real-time audio transcription, smart inline highlighting, and page-wide text replacement to enhance your productivity across the web.

---

## 🌟 Key Features

### 1. 💬 AI Chat Companion
*   **Multi-Model Selection**: Chat with powerful LLMs like **Gemma 4 26B/31B**, **DeepSeek V4 Flash**, and **Llama 3.3 70B** directly from the sidebar.
*   **Auto-Route Option**: Automatically routes queries to the most suitable free model.
*   **Context-Aware Chat**: Converse, ask questions, or feed selected page content into the assistant.

### 2. 📝 Floating Selection UI (Smart Assistant)
Double-click or highlight text on **any webpage** to summon the Viky AI Quick Menu:
*   **Smart Refinement**: Instantly grammar-check, rewrite, or continue writing.
*   **Highlight & Color Code**: Highlight page text with customizable, translucent highlights.
*   **Dynamic Translation**: Translate text between English, Hindi, Spanish, French, German, Italian, Chinese, Japanese, and more.
*   **Interactive Result Panel**: View AI outputs in a beautiful draggable modal, copy with one click, or replace.

### 3. 🔄 Robust Page-Wide "Replace"
*   **Editable Inputs**: Instantly swap selected text inside textareas, input fields, and rich-text editors.
*   **DOM Injection**: Replace selected static text on read-only webpages in real-time.
*   **TreeWalker Fallback**: Features a smart, tree-walking text finder that locate selections and replaces them even if browser ranges go stale.

### 4. 🎨 Image Studio
*   Generate high-quality visuals on-the-fly using the integrated Pollinations AI engine.
*   Quickly download, preview, or insert generated graphics.

### 5. 🎤 Audio Transcriber
*   Use your microphone for direct audio capture.
*   Convert speech to text instantly with AI-powered transcription.

### 6. 📱 WhatsApp Web Integration
*   Specialized content scripts to restore deleted messages.
*   Inline assistant utilities specifically tuned for messaging.

---

## 🚀 Installation & Setup

1.  **Clone / Download** this repository.
2.  Open Google Chrome and navigate to `chrome://extensions/`.
3.  Enable **Developer mode** (toggle in the top-right corner).
4.  Click **Load unpacked** in the top-left corner.
5.  Select the project directory (which contains the `manifest.json` file).
6.  Pin **Viky AI** from the extension menu (puzzle piece icon) for quick access!

---

## 🛠️ Architecture & Tech Stack

Viky AI uses a modern, lightweight, non-intrusive extension architecture:
*   **Manifest V3**: Complies with the latest Chrome Extension security and performance standards.
*   **Core Logic**: Vanilla JavaScript, CSS variables (custom dark & light theme system), and Shadow DOM (ensures Viky's styling never breaks target websites).
*   **Background worker (`background.js`)**: Manages model routing, streams API responses via ports, and handles Google OAuth2.
*   **Content Scripts (`content.js`, `web_assistant.js`)**: Injects quick-action bubbles, handles highlights, manages the draggable result modal, and performs text replacement.

---

## ⚙️ Configuration

Viky AI comes out-of-the-box with pre-configured settings, but you can customize it from the **Settings** tab in the sidebar:
*   Default Translation Language
*   Custom Highlight Palette Colors
*   Select default AI model for chat vs writing enhancements
*   Toggle Dark / Light visual mode

---

Developed with ❤️ for Viky AI users. Happy writing!
