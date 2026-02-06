# SillyTavern Multi-Speaker Colorizer v2.0

A robust, lightweight JavaScript extension for SillyTavern designed to colorize dialogue based on the character currently speaking. It features high-precision targeting for semantic `<q>` tags and standard quotation marks, ensuring your roleplay remains immersive and visually organized.

## 🚀 Features

- **💎 Zero Token Cost:** This extension is entirely client-side. It does not add anything to your prompt or context window, meaning you get beautiful colorization without sacrificing performance or memory.
- **🛡️ User Shield:** Define your persona name to prevent the script from accidentally coloring your own messages or actions.
- **⚡ Smart Context Scanning:** Automatically scans the last 3 messages for instant updates during chat, while the "Apply" button performs a deep scan of the last 20 messages to fix history.
- **🧠 Persistent Context Logic:** Intelligently tracks the active speaker across multiple paragraphs. If a character starts a long monologue, the color stays locked until a new speaker is explicitly named.
- **✨ Punctuation Agnostic:** Features a strict normalizer that handles names with attached punctuation (e.g., `"Kita,"`, `"Gandalf!"`), ensuring no speaker is missed.
- **📂 Advanced Profile Management:**
    - **Multiple Profiles:** Switch instantly between color schemes for different RPs.
    - **Import/Export:** Share your color configs as JSON files.
    - **Factory Reset:** Quickly restore default settings if things get messy.

## 🛠️ Installation

The easiest way to install this extension is directly through SillyTavern:

1. Open **SillyTavern**.
2. Click the **Extensions** (Puzzle Piece) icon in the top bar.
3. Select **Install Extension**.
4. Paste the repository URL: `https://github.com/ImJCyo/SillyTavern-MultiSpeaker-Colorizer`
5. Click **Install**.
6. Refresh your browser page to initialize the UI.

## ⚙️ Configuration

Open the **Extensions** menu and expand the **Multi-Speaker Colorizer** drawer.

### 1. General Settings
* **User Shield:** Enter your persona/user name here. The script will ignore any message header that matches this name.

### 2. Profile Management
* **Active Profile:** Select your current color scheme from the dropdown.
* **New / Rename:** Create a fresh profile or rename the current one.
* **Export/Import:** Backup your profiles to JSON or load a friend's config.

### 3. Character Mapping
* **Add Character:** Click `+ Add Character`.
* **Name Format:** Enter the names to watch for. You can use comma-separated aliases.
    * *Example:* `Gandalf,Mithrandir,Greybeard`
    * *Effect:* If any of these names appear in the narration text, the dialogue color will update to your chosen hex code.

### 4. Debugging
* **Debug Logs:** Check this box to print logic to the browser console (F12). Useful if a character isn't coloring and you want to see exactly which word the script is failing to match.

## 🧠 How it Works (Client-Side)
Unlike "World Info" or "Author's Notes" which are sent to the AI, this script runs locally in your browser after the message has already been rendered.

1.  **Sanitization:** It strips text of smart quotes and punctuation to create a "clean" token list.
2.  **Detection:** It scans the narration text (text *outside* quotes) for known character names.
3.  **Application:** It wraps dialogue in styled `<span>` tags without modifying the actual message content in your chat logs.

## ⚠️ Compatibility Note
This extension is designed to work safely alongside other DOM-manipulating extensions (like Wordsight). It uses a "safe renderer" that checks for existing styles before applying new ones to prevent conflicts.

---

### **Need to reset?**
If your profiles become corrupted or the UI isn't loading, use the red **Factory Reset** button in the extension panel to wipe settings back to the safe defaults.
