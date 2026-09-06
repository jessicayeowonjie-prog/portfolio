# Yeowon Jie — Personal Website

A personal research website with a built-in, password-gated edit mode: visit
`/?edit`, log in, and edit any text, image, or research note directly on the
live page. Changes save to the server automatically and go live for every
visitor immediately — no export/import step.

This is the implemented, production-ready build of the site designed in
[`design-export/`](design-export) (a Claude Design handoff bundle — see
`design-export/HANDOFF.md` and `chats/` for the full design history). The
design there runs by compiling JSX live in the browser via CDN scripts; this
app precompiles everything with Vite and persists content through a small
Express API instead of `localStorage`, per how @jessicayeowonjie asked it to
be productionized.

## Stack

- **Frontend:** React + Vite (precompiled — no runtime Babel/CDN dependency)
- **Backend:** a small Express API that stores site content in
  `server/data/content.json` and serves uploaded media from `server/uploads/`
- **Edit mode:** `/?edit` → password prompt → inline editing, same
  interactions as the original design (typable text, drag-to-reorder sticky
  notes, image upload, add/delete lists), but every edit now autosaves to the
  server instead of the visitor's own browser

## Getting started

```bash
npm install
cp .env.example .env   # then set a real EDIT_PASSWORD in .env
npm run dev             # Vite dev server (5173) + API (8787), proxied together
```

Open `http://localhost:5173`. Add `?edit` to the URL and enter the password
you set in `.env` to edit the site.

## Building for production

```bash
npm run build   # outputs the static frontend to dist/
npm start       # runs the Express server, which also serves dist/
```

In production there's only one server (`npm start`), listening on
`API_PORT` (default `8787`) — put it behind whatever reverse proxy / hosting
platform you use (a small VPS, Render, Fly.io, Railway, etc. — anything that
can run a long-lived Node process; static-only hosts like GitHub Pages or
Netlify's free tier won't work here since edit mode needs a real server to
save to).

**Before you host this anywhere public, set `EDIT_PASSWORD` in `.env` to
something real.** Anyone who knows it can edit the live site at `/?edit`.

## Project layout

```
index.html, vite.config.js      Vite entry + config
src/                            React frontend
  main.jsx, App.jsx             app shell, page routing (home/video/inner)
  context/EditContext.jsx       content-API client, edit-mode auth, T /
                                 EditableImg / EditBar primitives
  components/                   Home, VideoPage, InnerPage, Notes,
                                 SettingsPanel
  styles/global.css             fonts, color tokens, grain overlay
public/fonts/                   the Rascal display font
server/
  index.js                      Express API (content, auth, uploads)
  data/content.json             the site's content — the "database"
  uploads/                      photos, video, and anything uploaded in
                                 edit mode
design-export/                  the original Claude Design handoff bundle,
                                 kept as a historical reference (not served)
chats/                          design conversation transcripts
```

## Editing content

- **Through the site:** go to `/?edit`, log in, click any text to type,
  hover a sticky note or photo for its controls, drag notes to reorder,
  use the ↑/↓ next to a section heading to reorder sections, and the ⚙
  button (bottom-right) for site-wide settings (accent color, background,
  film border, name size).
- **By hand:** edit `server/data/content.json` directly and restart the
  server (or just save — the API reads it fresh each `GET /api/content`, no
  restart needed. It's the same JSON edit mode itself writes to, so you can't
  break the format it expects if you keep the same shape).
- **Media:** drop files into `server/uploads/` and reference them from
  content as `/uploads/<filename>`, or just use the "upload" button in edit
  mode, which does the same thing.

## Notes on scope

- The Claude-Design-only "Tweaks" panel (which talked to the design canvas's
  host frame) was replaced with a small in-edit-mode **Site settings** panel
  — same knobs (accent color, background, film border, name size), now saved
  as ordinary content so they persist for real, for everyone.
- `npm audit` currently flags a couple of moderate-severity advisories in
  Express's own transitive dependencies (`qs`/`body-parser`); as of this
  writing there's no non-breaking fix upstream. They affect query-string
  parsing edge cases this API doesn't use. Re-run `npm audit` before you
  deploy in case a patched release has shipped since.
