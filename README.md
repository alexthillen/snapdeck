# SnapDeck

**SnapDeck** is a privacy-focused, client-side web application that uses AI to instantly convert PDF documents into high-quality Anki flashcards. It supports Google Gemini as well as local or hosted OpenAI-compatible endpoints.

## Usage

![Example Usage](https://raw.githubusercontent.com/alexthillen/snapdeck/refs/heads/main/.github/assets/snapdeck-example.gif)

## 🚀 Overview

SnapDeck automates the tedious process of creating flashcards. Users simply upload a PDF, configure their preferences, and the application generates a downloadable `.apkg` file ready to be imported directly into Anki.

## ✨ Key Features

* **PDF to Anki:** Direct conversion of PDF content into study materials.
* **Multiple Card Types:** Supports both **Basic** (Question/Answer) and **Cloze Deletion** (Fill-in-the-blank) card formats.
* **Math Support:** Capable of parsing and rendering mathematical equations (LaTeX) within flashcards.
* **Multiple AI Providers:** Uses Gemini 3.6 Flash by default, or a multimodal OpenAI-compatible Responses endpoint.
* **Privacy First:** Operates entirely in the browser. There is no backend server; your files and API keys are never stored by SnapDeck developers.
* **Customizable:** Adjust the number of cards generated and the difficulty level of the content.
* **Immediate Export:** Generates standard `.apkg` files compatible with the Anki desktop and mobile apps.

## 🔒 Privacy & Security

SnapDeck is designed with a "zero-knowledge" architecture regarding your data:

1.  **Client-Side Processing:** All logic runs in your web browser.
2.  **Direct API Communication:** Your content and optional API key are sent directly from your browser to your configured AI endpoint. They do not pass through any intermediate SnapDeck server.
3.  **Local Storage:** API keys can be optionally saved to your browser's local storage for convenience, or entered every session for maximum security.

## 🛠 Prerequisites

To use SnapDeck, you need either:

1.  **Google Gemini:** An API key from Google AI Studio. SnapDeck defaults to `gemini-3.6-flash`.
2.  **OpenAI-compatible endpoint:** A multimodal `/v1/responses` API that accepts `input_text` and `input_image` content. The endpoint must allow browser requests using CORS.

You also need **Anki** desktop or mobile to open the generated decks.

## 📖 How to Use

1.  **Configure AI:** Choose Gemini or OpenAI-compatible and enter the required connection settings.
2.  **Upload:** Drag and drop a PDF file (up to 10MB) into the upload zone.
3.  **Customize:**
    * Name your deck.
    * Select the card type (Basic or Cloze).
    * Choose the number of cards to generate.
4.  **Generate:** Click "Create Deck." The AI will analyze the document and generate cards.
5.  **Download & Study:** Download the resulting `.apkg` file and double-click it to import it into Anki.

## Using the local MLX-VLM server

The companion `mlx-vlm` project provides the tested local endpoint for Apple
Silicon. From that checkout:

```shell
uv sync --frozen

export MODEL="mlx-community/gemma-4-E4B-it-qat-4bit"
export HF_HOME="$PWD/.cache/huggingface"

uv run python -m mlx_vlm.server \
  --host 127.0.0.1 \
  --port 8100 \
  --model "$MODEL" \
  --max-kv-size 32768 \
  --max-tokens 8192
```

Then select **OpenAI-compatible** in SnapDeck and use:

* Base URL: `http://127.0.0.1:8100/v1`
* Model: `mlx-community/gemma-4-E4B-it-qat-4bit`
* API key: leave empty for the local server

The server's 32k context contains the input text, image tokens, chat template, and
generated output. If a PDF exceeds that budget, split it into focused sections or
lower the server's output allowance. SnapDeck does not silently drop pages.

## How multimodal PDF processing works

SnapDeck has no application backend. For an OpenAI-compatible provider, the
browser:

1. Opens the PDF with PDF.js.
2. Extracts the text layer from every page.
3. Renders every page at 1.5× resolution as a JPEG data URL using quality 0.85.
4. Sends the instructions, page text, and page images directly to
   `<base URL>/responses`.

Each page is represented by an `input_text` item followed by an `input_image`
item. A simplified request looks like this:

```json
{
  "model": "mlx-community/gemma-4-E4B-it-qat-4bit",
  "input": [
    {
      "role": "user",
      "content": [
        {
          "type": "input_text",
          "text": "Create flashcards from the following PDF."
        },
        {
          "type": "input_text",
          "text": "PDF page 1 extracted text:\n..."
        },
        {
          "type": "input_image",
          "image_url": "data:image/jpeg;base64,...",
          "detail": "auto"
        }
      ]
    }
  ]
}
```

The text layer preserves exact wording and makes text-heavy pages efficient. The
rendered image lets a vision-capable model use diagrams, charts, page structure,
and scanned content. The local MLX server accepts the base64 data URLs produced
by a browser and enables CORS for direct requests.

Gemini follows a separate path: SnapDeck sends the original PDF inline to the
Gemini API instead of rendering it locally.

## ⚠️ Disclaimer

SnapDeck is an independent tool and is not affiliated with the Anki project. By using this tool, you confirm that you have the rights to use the uploaded content.

---
*Designed to remember.*
