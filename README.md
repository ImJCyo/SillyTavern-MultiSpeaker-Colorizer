# SillyTavern Multi-Speaker Colorizer

A robust, lightweight JavaScript extension for SillyTavern designed to colorize dialogue based on the character currently speaking. It features high-precision targeting for semantic `<q>` tags and standard quotation marks, ensuring your roleplay remains immersive and visually organized.

## 🚀 Features

- **💎 Zero Token Cost:** This extension is entirely client-side. It does not add anything to your prompt or context window, meaning you get beautiful colorization without sacrificing performance or memory.
- **⚡ High-Performance Lazy Loading:** Uses an `IntersectionObserver` to only colorize messages as they scroll into view. This keeps the UI snappy even in chats with thousands of messages.
- **Multi-Character Support:** Assign unique hex colors to different characters you specify by name.
- **Profile Management:** Create, rename, and switch between different color profiles for different world-states or RP cards.
- **Semantic Tag Awareness:** Specifically designed to work with SillyTavern’s `<q>` (Quotation) tags and nested `<em>` (italics) tags.
- **Contextual Memory:** Intelligently tracks the speaker across paragraphs, ensuring dialogue remains colored even if a name isn't mentioned in every block.

## 🛠️ Installation

The easiest way to install this extension is directly through SillyTavern:

1. Open **SillyTavern**.
2. Click the **Extensions** (Puzzle Piece) icon in the top bar.
3. Select **Install Extension**.
4. Paste the repository URL: `https://github.com/ImJCyo/SillyTavern-MultiSpeaker-Colorizer`
5. Click **Install**.
6. Refresh your browser page to initialize the UI.

## ⚙️ Configuration

- **Enable/Disable Logging:** Toggle Console (F12) logging on or off.
- **Add Character:** Enter the character's name exactly as it appears in the chat and select a color.
- **Apply & Save:** Use the "Apply & Save" button to immediately commit all profile changes to SillyTavern's storage, and scan back 3 messages to apply your new color choices.

## 📁 Profile Sharing (Import/Export)

This extension allows you to share specific character color setups as standalone JSON files:

- **Export Profile:** Exports only the *currently selected* profile. Perfect for sharing your specific "Character Pack" with others.
- **Import Profile:** Choose a `.json` file to add to your list. You will be prompted to name the new profile upon import.

## 🧠 How it Works (Client-Side)
Unlike "World Info" or "Author's Notes" which are sent to the AI, this script runs locally in your browser after the message has already been generated. It scans the rendered HTML of the chat and applies CSS styling on the fly. This ensures:
1. No extra cost per message.
2. No interference with the AI's logic or personality.
3. Instant visual updates.
