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
* **Multiple AI Providers:** Uses Gemini 3.7 Flash by default, or a multimodal OpenAI-compatible Responses endpoint.
* **Privacy First:** Operates entirely in the browser. There is no backend server; your files and API keys are never stored by SnapDeck developers.
* **Coverage-aware:** Choose concise, balanced, or thorough coverage; SnapDeck derives card targets from each section instead of asking for an arbitrary total.
* **Review before export:** Flip, edit, include, or exclude generated cards before downloading the deck.
* **Immediate Export:** Generates standard `.apkg` files compatible with the Anki desktop and mobile apps.

## 🔒 Privacy & Security

SnapDeck is designed with a "zero-knowledge" architecture regarding your data:

1.  **Client-Side Processing:** All logic runs in your web browser.
2.  **Direct API Communication:** Your content and optional API key are sent directly from your browser to your configured AI endpoint. They do not pass through any intermediate SnapDeck server.
3.  **Local Storage:** API keys can be optionally saved to your browser's local storage for convenience, or entered every session for maximum security.
4.  **Anonymous Analytics:** A production deployment may enable Cloudflare Web Analytics for aggregate page-view and performance metrics. It does not receive PDFs, cards, prompts, or API keys.

## Cloudflare Web Analytics

SnapDeck can report aggregate visits and page views to Cloudflare Web Analytics
without requiring Cloudflare hosting. Create a Web Analytics site in the
Cloudflare dashboard, copy its site token, and add this GitHub repository
variable:

```text
CLOUDFLARE_WEB_ANALYTICS_TOKEN=<your site token>
```

Release builds pass the value to Vite as
`VITE_CLOUDFLARE_WEB_ANALYTICS_TOKEN`. If the variable is absent, SnapDeck does
not load the analytics beacon. Development builds never load it, even when the
variable is present. Page-view and performance metrics are available under
**Analytics & Logs → Web Analytics** in Cloudflare.

## 🛠 Prerequisites

To use SnapDeck, you need either:

1.  **Google Gemini:** An API key from Google AI Studio. SnapDeck defaults to `gemini-3.7-flash`.
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

On an Apple silicon Mac, install
[`uv`](https://docs.astral.sh/uv/getting-started/installation/) and use it to
install the tested `mlx-vlm` release in an isolated environment:

```shell
curl -LsSf https://astral.sh/uv/install.sh | sh

uv tool install "mlx-vlm==0.6.7"
```

No repository checkout is required. Then start the 32k server from any folder:

```shell
mlx_vlm.server \
  --host 127.0.0.1 \
  --port 8100 \
  --model mlx-community/gemma-4-E4B-it-qat-4bit \
  --max-kv-size 32768 \
  --max-tokens 8192
```

The first start downloads the model. Keep this terminal open while using
SnapDeck.

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

## License

Copyright © 2025–2026 Alex Thillen.

SnapDeck is free software licensed under the
[GNU Affero General Public License version 3](LICENSE). You may use, modify,
host, and distribute it, including commercially, provided you comply with the
AGPLv3. In particular, modified versions made available over a network must
offer their users the corresponding source code.

The project-specific copyright and warranty notice is in [NOTICE](NOTICE).
Angle-bracket placeholders near the end of `LICENSE` belong to the GNU
license's standard “How to Apply These Terms” example; they are not unfilled
SnapDeck license terms.

If you need to use SnapDeck under different terms, contact the copyright
holder to discuss a separate license.

## ⚠️ Disclaimer

SnapDeck is an independent tool and is not affiliated with the Anki project. By using this tool, you confirm that you have the rights to use the uploaded content.

---
*Designed to remember.*
