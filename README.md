# SnapDeck

**SnapDeck** is a privacy-focused, client-side web application that utilizes artificial intelligence to instantly convert PDF documents into high-quality Anki flashcards. By leveraging Google's Gemini AI, it streamlines the process of studying complex materials, lecture notes, and textbooks.

## Usage

![Example Usage](https://raw.githubusercontent.com/alexthillen/snapdeck/refs/heads/main/.github/assets/snapdeck-example.gif)

## 🚀 Overview

SnapDeck automates the tedious process of creating flashcards. Users simply upload a PDF, configure their preferences, and the application generates a downloadable `.apkg` file ready to be imported directly into Anki.

## ✨ Key Features

* **PDF to Anki:** Direct conversion of PDF content into study materials.
* **Multiple Card Types:** Supports both **Basic** (Question/Answer) and **Cloze Deletion** (Fill-in-the-blank) card formats.
* **Math Support:** Capable of parsing and rendering mathematical equations (LaTeX) within flashcards.
* **Privacy First:** Operates entirely in the browser. There is no backend server; your files and API keys are never stored by SnapDeck developers.
* **Customizable:** Adjust the number of cards generated and the difficulty level of the content.
* **Immediate Export:** Generates standard `.apkg` files compatible with the Anki desktop and mobile apps.

## 🔒 Privacy & Security

SnapDeck is designed with a "zero-knowledge" architecture regarding your data:

1.  **Client-Side Processing:** All logic runs in your web browser.
2.  **Direct API Communication:** Your content and API key are sent directly from your browser to Google's servers. They do not pass through any intermediate SnapDeck server.
3.  **Local Storage:** API keys can be optionally saved to your browser's local storage for convenience, or entered every session for maximum security.

## 🛠 Prerequisites

To use SnapDeck, you need:

1.  **Google Gemini API Key:** A free API key from Google AI Studio.
2.  **Anki:** The Anki desktop or mobile application to open the generated decks.

## 📖 How to Use

1.  **Configure API:** Enter your Google Gemini API key in the configuration panel.
2.  **Upload:** Drag and drop a PDF file (up to 10MB) into the upload zone.
3.  **Customize:**
    * Name your deck.
    * Select the card type (Basic or Cloze).
    * Choose the number of cards to generate.
4.  **Generate:** Click "Create Deck." The AI will analyze the text and generate cards.
5.  **Download & Study:** Download the resulting `.apkg` file and double-click it to import it into Anki.

## ⚠️ Disclaimer

SnapDeck is an independent tool and is not affiliated with the Anki project. By using this tool, you confirm that you have the rights to use the uploaded content.

---
*Designed to remember.*