# SillyTavern Multi-Speaker Colorizer

A robust, lightweight JavaScript extension for SillyTavern designed to colorize dialogue based on the character currently speaking. It features high-precision targeting for semantic `<q>` tags and standard quotation marks, ensuring your roleplay remains immersive and visually organized.

## 🚀 Features

- **Multi-Character Support:** Assign unique hex colors to different characters you specify by name.
- **Semantic Tag Awareness:** Specifically designed to work with SillyTavern’s `<q>` (Quotation) tags and nested `<em>` (italics) tags.
- **Global Lightness Slider:** Adjust the brightness of all active colors (50% to 300%) via a built-in UI slider to match your theme.
- **Contextual Memory:** Intelligently tracks the speaker across paragraphs, ensuring dialogue remains colored even if a name isn't mentioned in every block.

## 🛠️ Installation

## 🚀 Installation

The easiest way to install this extension is directly through SillyTavern:

1. Open **SillyTavern**.
2. Click the **Extensions** (Puzzle Piece) icon in the top bar.
3. Select **Install Extension**.
4. Paste the repository URL: `https://github.com/ImJCyo/SillyTavern-MultiSpeaker-Colorizer`
5. Click **Install**.
6. Refresh your browser page to initialize the UI.

## ⚙️ Configuration

- **Enable/Disable:** Toggle the entire extension on or off without losing your character list.
- **Global Lightness:** Use the slider to increase visibility on dark themes or reduce "neon" effects on lighter backgrounds.
- **Add Character:** Enter the character's name exactly as it appears in the chat and select a color.
- **Force Refresh:** Most changes apply in real-time, but updating a name will trigger a re-scan of the current chat.
