# EazyPG Chat Widget

> Lightweight Vite-bundled vanilla JS chat frontend for the EazyPG AI Booking Bot. Renders AI responses as rich Generative UI components via a server-parts protocol.

![Vite](https://img.shields.io/badge/Vite_6-646CFF?style=flat&logo=vite&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000?style=flat&logo=vercel&logoColor=white)
![Leaflet](https://img.shields.io/badge/Leaflet-199900?style=flat&logo=leaflet&logoColor=white)

**Last updated**: 2026-03-15

---

## What It Does

A single-page chat interface that connects to the FastAPI backend via SSE streaming. The backend decides what UI to render (Generative UI pattern) — the frontend is a pure component registry that maps `parts[]` to renderers. No AI logic lives in the frontend.

## Key Features

- **SSE Streaming** — Real-time token-by-token response rendering with AbortController interrupt
- **Generative UI** — 10 component types rendered from backend-structured `parts[]`
- **Voice Input** — Deepgram Nova-3 speech-to-text (English, Hindi, Marathi)
- **Multilingual** — Full i18n for en/hi/mr with locale-aware chips and labels
- **Property Carousels** — Horizontal scrolling cards with images, match scores, amenity pills
- **Comparison Tables** — Side-by-side property comparison with winner badges
- **Property Maps** — Leaflet maps with property pins
- **Image Lightbox** — Fullscreen image gallery with swipe navigation
- **Smart Quick Replies** — Context-aware suggestion chips (backend + client-side generated)
- **Celebration Animations** — Confetti, heart pulse, checkmark draw on booking milestones
- **Skeleton Loaders** — Animated loading states during tool execution
- **Stop Button** — Interrupt streaming responses mid-generation
- **Chat History** — localStorage persistence for message replay on page reload
- **Brand Theming** — Dynamic brand config loading via public `/brand-config` endpoint

---

## Architecture

```
User types message
  → stream.js: sendMessage()
  → POST /api/stream (Vercel proxy)
  → Backend: /chat/stream (SSE)
  ← event: agent_start    → Show agent badge
  ← event: tool_start     → Show skeleton loader
  ← event: content_delta  → Append markdown to bubble
  ← event: done           → Finalize + render server parts
                                 │
                    parts: [{type, ...}, ...]
                                 │
                    server-parts.js: PART_RENDERERS
                    ┌─────────────────────────────────┐
                    │ text           → markdown render │
                    │ property_carousel → card slider  │
                    │ comparison_table → diff table    │
                    │ quick_replies   → chip strip     │
                    │ action_buttons  → CTA buttons    │
                    │ status_card     → confirmation   │
                    │ image_gallery   → grid + lightbox│
                    │ confirmation_card → confirm/cancel│
                    │ error_card      → retry UI       │
                    │ expandable_sections → accordion  │
                    └─────────────────────────────────┘
```

---

## Project Structure

```
eazypg-chat/
├── index.html                 # Chat interface shell (Stop button, voice, language picker)
├── package.json               # Dependencies (vite, marked, dompurify, leaflet)
├── vite.config.js             # Build config
├── vercel.json                # Vercel deployment + proxy rewrites
├── src/
│   ├── main.js                # Entry point, event listeners, window exports
│   ├── config.js              # Global state (userId, chatHistory, isWaiting)
│   ├── stream.js              # SSE streaming (AbortController, requestCounter, stopStream)
│   ├── message-builder.js     # DOM message construction + stagger animations
│   ├── chat-history.js        # localStorage persistence
│   ├── i18n.js                # Multilingual translations (en/hi/mr)
│   ├── voice-input.js         # Deepgram Nova-3 voice input
│   ├── quick-replies.js       # Context-aware suggestion chips
│   ├── streaming-ui.js        # Typing animation + skeleton loaders
│   ├── sanitize.js            # XSS-safe markdown (DOMPurify + marked)
│   ├── helpers.js             # DOM utils (escapeHtml, scrollToBottom)
│   ├── lightbox.js            # Fullscreen image viewer
│   ├── renderers/
│   │   ├── server-parts.js    # Component registry (10 part types)
│   │   ├── property-card.js   # Property card (score badge, amenity pills, images)
│   │   ├── compare-card.js    # Comparison tables
│   │   └── rich-message.js    # Fallback markdown renderer
│   └── components/
│       └── PropertyMap.js     # Leaflet map component
├── styles/
│   ├── base.css               # Design tokens, layout, bubbles, header
│   ├── carousel.css           # Property carousel + card styles
│   ├── components.css         # Chips, buttons, feedback, typing, welcome
│   ├── status-card.css        # Status card variants (success/info/warning)
│   ├── gallery.css            # Image gallery grid + lightbox
│   ├── input.css              # Input bar, stop button styles
│   └── animations.css         # Skeletons, celebrations, stagger transitions
└── api/                       # Vercel serverless proxies
    ├── stream.js              # SSE proxy → /chat/stream (120s timeout)
    ├── chat.js                # POST proxy → /chat
    ├── feedback.js            # POST proxy → /feedback
    ├── analytics.js           # GET proxy → /admin/analytics
    ├── language.js            # POST proxy → /language
    ├── deepgram-token.js      # Deepgram temp token generation
    └── brand-config.js        # GET-only Edge proxy → /brand-config
```

---

## Getting Started

```bash
# Install dependencies
npm install

# Run dev server (port 5173)
npm run dev

# Build for production
npm run build
```

### Environment Variables (Vercel)

| Variable | Required | Description |
|----------|----------|-------------|
| `BACKEND_URL` | Yes | FastAPI backend URL (e.g. `https://claude-booking-bot.onrender.com`) |
| `DEEPGRAM_API_KEY` | No | Deepgram API key for voice input |

---

## Deployment

Auto-deploys to Vercel on push. The `api/` directory contains serverless proxy functions that forward requests to the backend with appropriate timeouts.

- **Build command**: `npm run build`
- **Output directory**: `dist/`
- **Live URL**: `https://eazypg-chat.vercel.app`

---

## Related

- [Backend README](../claude-booking-bot/README.md) — FastAPI backend documentation
- [Admin Portal](../eazypg-admin/) — React admin dashboard
- [Architecture](../ARCHITECTURE.md) — Deep technical reference

---

## License

MIT
