# RepurposerHub

RepurposerHub is a free, privacy-first browser tool that transforms one source draft into editable posts for:

- X / Twitter
- LinkedIn
- Instagram
- Facebook
- WhatsApp

**Live site:** https://repurposerhub.org/

## What it does

Users paste a blog post, transcript, announcement, rough note, or idea. They can then choose a goal, tone, audience, call to action, length, emoji level, and hashtag preference before generating a complete social content pack.

The current writing engine runs locally in the browser. Draft content is not uploaded to an application server.

## Features

- Platform-specific content structures
- Content goals and tone controls
- Optional audience and call-to-action guidance
- Short, medium, and long outputs
- Editable generated drafts
- Multiple variations
- One-click copying
- Complete content-pack download
- Local draft autosave
- Dark mode
- Responsive mobile interface
- Consent-based Google Analytics and AdSense loading
- No sign-up required

## Local development

This is a static website, so no build step is required.

1. Clone the repository.
2. Open the folder in your editor.
3. Serve it with any local static server.

For example:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Project structure

- `index.html` — main product page and workspace
- `style.css` — responsive interface styles
- `script.js` — local generation engine and interactions
- `config.js` — site, analytics, and advertising configuration
- `privacy.html`, `terms.html`, `disclaimer.html` — legal information
- `sitemap.xml`, `robots.txt` — search-engine discovery

## Privacy

RepurposerHub stores drafts and settings in the user's own browser through local storage. The local generation engine does not send draft text to an external AI service.

Analytics and advertising scripts load only after the user accepts optional cookies.

## Roadmap

- Dedicated SEO tools for specific content workflows
- Import from video transcripts and articles
- More writing templates
- Saved reusable presets
- Optional AI-powered rewriting mode
- Shareable content packs
- Improved export formats
