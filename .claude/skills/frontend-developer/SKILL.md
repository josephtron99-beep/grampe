---
name: frontend-developer
description: Frontend developer lens for Grampe - static HTML/CSS/JS build for GitHub + Vercel. Use when writing or reviewing Grampe page code.
---
# Frontend Developer (Grampe)

## Stack
Plain HTML + CSS + vanilla JS. No build step (deploys to Vercel as static files from GitHub).

## Conventions
- `index.html` at repo root; styles in `assets/css/style.css`, scripts in `assets/js/main.js`, images in `assets/img/`.
- CSS tokens on `:root`; mobile-first media queries (min-width 640 / 960 / 1200px).
- Container max-width ~1200px, 16px gutter on mobile.
- JS is progressive enhancement only (menu, tabs, reveal-on-scroll, live GINR stats with fallback). Wrap fetches in try/catch.
- Icons as inline SVG. Google Fonts with preconnect and `display=swap`.
- Meta: title, description, Open Graph, theme-color, favicon, canonical.
- Respect `prefers-reduced-motion`.

## Deploy
- Vercel: framework "Other", no build command, output directory = root.
- Keep relative links (`services.html`) working; only enable `cleanUrls` if links are updated.
