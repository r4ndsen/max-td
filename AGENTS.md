# Repository Guidelines

## Project Structure & Module Organization
- `index.html`, `styles.css`: entry and UI styling.
- `main.js`: game loop, events, render orchestration.
- `entities/`: gameplay classes (`Enemy.js`, `Tower.js`, `Projectile.js`).
- `config.js`, `state.js`, `utils.js`: config, shared state, helpers.
- `ui.js`: HUD, panels, interactions (see note on `t` below).
- `effects.js`, `vfx.js`: combat and visual effects.
- `locales/`, `i18n.js`: translations and language wiring.
- `Makefile`: `serve`, `open`, `lint` targets.

## Build, Test, and Development Commands
- `make serve`: start PHP built‑in server at `http://localhost:8000/`.
- `make open`: open the running URL in your browser.
- `npm run lint` / `npm run lint:fix`: run ESLint / auto‑fix.
- Alt serve (no Make): `php -S localhost:8000 -t .` or `python3 -m http.server 8000`.

## Coding Style & Naming Conventions
- Language: ES Modules in browser; no bundler.
- Indentation: 2 spaces; use semicolons; `no-var`; prefer `const`.
- Equality: use `===`/`!==` (enforced by ESLint).
- Files: lowercase, words separated by dashes or simple names (e.g., `main.js`, `ui.js`).
- Identifiers: `lowerCamelCase` for vars/functions; `PascalCase` for classes.
- `ui.js`: avoid declaring a local variable named `t` (reserved for i18n); the linter enforces this.

## Testing Guidelines
- No automated tests yet; please add smoke tests where feasible.
- Minimum manual checks: start wave, build/upgrade tower, pause/resume, i18n switch (EN/DE), spawn debug, and canvas render.
- If adding tests, place under `tests/` with `*.spec.js`; keep tests deterministic and avoid timing flakiness.

## Commit & Pull Request Guidelines
- Commits: follow Conventional Commits (e.g., `feat(ui): add upgrade hotkey`, `fix(entities): projectile lifetime`).
- PRs: include summary, rationale, before/after screenshots (UI), manual test steps, and any i18n updates.
- Lint: PRs must pass `npm run lint`. Keep changes focused and minimal.

## Security & Configuration Tips
- Serve over HTTP(S); ESM imports often fail via `file://`.
- Do not commit secrets; this is a static client app.
- Keep frame loops efficient; prefer small, isolated changes in `main.js`.
