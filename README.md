**Max TD — Tower Defense (Vanilla JS)**

- **Type:** Browser game (no build step)
- **Stack:** ES modules + Canvas 2D + plain CSS/HTML
- **I18n:** English and German via `locales/` and `i18n.js`

**Overview**
- **Goal:** Place towers, survive waves, and manage upgrades.
- **Controls:**
  - Enter: start next wave
  - B: build mode, Esc: cancel
  - U: quick upgrade (damage)
  - P: pause/resume
  - Click a placed tower to open its upgrade panel
  - Dev tools (optional): buttons in the sidebar

**Requirements**
- Any modern browser
- Local web server (recommended). The game uses ES module imports; serving via `file://` may be blocked by CORS.
- Optional for development:
  - PHP (for `make serve`) or any static server
  - Node.js 18+ (for linting)

**Quick Start**
- With PHP installed:
  - `make serve` to start at `http://localhost:8000/`
  - `make open` to open the browser
- Without Make/PH P, use any static server, for example:
  - `php -S localhost:8000 -t .`
  - or `python3 -m http.server 8000` (directory must be project root)
- Open `http://localhost:8000/` and play.

**Project Structure**
- `index.html`: page, controls, and canvas
- `styles.css`: UI styles
- `main.js`: game loop wiring, spawns, input, rendering calls
- `entities/`: core gameplay entities (towers, enemies, projectiles)
- `ui.js`: HUD and tower panel rendering and interactions
- `config.js`: gameplay constants and tuning
- `effects.js`, `vfx.js`: extra combat effects and visual effects
- `i18n.js`: translation helper, language switching
- `locales/en.js`, `locales/de.js`: translation dictionaries
- `Makefile`: `serve`, `open`, and `lint` targets

**Internationalization**
- Language selector is in the header; default derives from `localStorage.lang` or document `<html lang>`.
- To add a language:
  - Create `locales/<lang>.js` exporting a dictionary object
  - Import and register it in `i18n.js`
  - Add the `<option>` to the language selector in `initI18n()`

**Development**
- Install dev tools (ESLint):
  - `npm install`
  - `npm run lint` or `npm run lint:fix`
- Make targets:
  - `make serve` — start PHP built‑in server
  - `make open` — open the running URL
  - `make lint` — run ESLint via `npx`

**Troubleshooting**
- Blank page or import errors: ensure you are serving via HTTP, not opening the HTML file directly.
- Missing upgrade buttons: avoid naming local variables `t` in UI code; ESLint is configured to catch this in `ui.js`.
- Slow or stuttery rendering: try a smaller window or fewer towers; this is a simple canvas prototype.

