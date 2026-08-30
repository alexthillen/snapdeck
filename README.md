# SnapDeck

**SnapDeck** is a privacy-focused, client-side web application that uses AI to instantly convert PDF documents into high-quality Anki flashcards. It supports Google Gemini as well as local or hosted OpenAI-compatible endpoints.

## Usage

![Example Usage](https://raw.githubusercontent.com/alexthillen/snapdeck/refs/heads/main/.github/assets/snapdeck-example.gif)

## 🚀 Overview

SnapDeck automates the tedious process of creating flashcards. Add one or many PDFs, review the locally detected chapter plan, generate context-safe sections, edit the resulting cards, and export one downloadable `.apkg` file ready for Anki.

## ✨ Key Features

* **PDF to Anki:** Direct conversion of PDF content into study materials.
* **Multiple Card Types:** Supports both **Basic** (Question/Answer) and **Cloze Deletion** (Fill-in-the-blank) card formats.
* **Math Support:** Capable of parsing and rendering mathematical equations (LaTeX) within flashcards.
* **Multiple AI Providers:** Uses Gemini 3.6 Flash by default, or a multimodal OpenAI-compatible Responses endpoint.
* **Privacy First:** Operates entirely in the browser. There is no backend server; your files and API keys are never stored by SnapDeck developers.
* **Coverage-aware:** Choose concise, balanced, or thorough coverage; SnapDeck derives card targets from each section instead of asking for an arbitrary total.
* **Review before export:** Flip, edit, include, or exclude generated cards before downloading the deck.
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
2.  **Add documents:** Drag, select, or paste one or more PDFs. Text and PDF bookmarks are analyzed locally; page images are not retained for the whole corpus.
3.  **Review the plan:** Include or exclude chapters, toggle nested subchapters, choose Basic or Cloze cards, and select concise, balanced, or thorough coverage.
4.  **Generate:** SnapDeck processes context-safe sections sequentially. Failed sections remain visible and can be retried without discarding successful work.
5.  **Review:** Flip cards, edit fields and tags, and exclude weak cards.
6.  **Download & study:** Export one `.apkg` root deck. Source and chapter provenance is retained as hierarchical Anki tags.

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
generated output. SnapDeck plans conservative section requests and does not
silently drop pages.

## How multimodal PDF processing works

SnapDeck has no application backend. For either provider, the browser:

1. Opens the PDF with PDF.js.
2. Extracts the text layer from every page.
3. Uses PDF bookmarks as chapter boundaries, or builds conservative contiguous
   page ranges when bookmarks are unavailable.
4. Renders only the pages for the current generation request at 1.5× resolution
   as JPEG data URLs using quality 0.85.
5. Sends the instructions, page text, and page images directly to the selected
   provider.

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

OpenAI-compatible providers receive the parts through `<base URL>/responses`.
Gemini receives equivalent text and inline JPEG parts through `generateContent`.
Image-token cost varies between models, so the displayed context estimate is a
conservative heuristic rather than a tokenizer guarantee.

## ⚠️ Disclaimer

SnapDeck is an independent tool and is not affiliated with the Anki project. By using this tool, you confirm that you have the rights to use the uploaded content.

---
*Designed to remember.*
