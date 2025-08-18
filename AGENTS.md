# Repository Guidelines

## Project Structure
- Source: `src/` → `assets/`, `components/`, `content/`, `lib/`, `pages/`, `styles/`, `types/`.
- Routing mirrors `src/pages/` (e.g., `src/pages/blog/[slug].astro` → `/blog/:slug`).
- Config: `astro.config.mjs`, `tailwind.config.js`, `postcss.config.js`, `tsconfig.json`, `wrangler.jsonc`.
- Docs: `docs/` houses PRD and SPEC. The kanban module maintains its own board at `kanban/docs/BOARD.md`.

## Build & Development
- `nvm use 22 && npm install`
- `npm run dev`: local server `http://localhost:4321`.
- `npm run build`: build to `dist/` (runs Pagefind indexing).
- `npx wrangler dev`: preview Cloudflare Worker.
- `npm run format`: Prettier (Astro + Tailwind plugins).

## Style & Naming
- 2-space indent, LF, UTF-8 (`.editorconfig`).
- Components PascalCase; pages kebab-case; TS in `src/lib` and `src/types`.
- Prefer Tailwind utilities; keep tokens aligned with `tailwind.config.js`.

## Tests
- No formal suite; include manual steps/screenshots in PRs.
- For new utilities, consider lightweight Vitest/Jest where helpful.

## Git & PRs
- Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`). Example: `feat: reset nav on md screens`.
- PRs include description, linked issues, screenshots, and a successful `npm ci && npm run build`.
 - Reference IDs in commits/PRs: use `board:<id>` for BOARD items, and include `spec:SPEC-...` or `prd:PRD-...` when relevant.

## Work Items & Docs
- PRD: `docs/prd/PRD-YYYYMMDD-<slug>.md`.
- SPEC: `docs/specs/SPEC-YYYYMMDD-<slug>.md`.
- Board: single file `kanban/docs/BOARD.md` with three sections: `## TODO`, `## BLOCKED`, `## DONE`.
- Item format (one line each; no per-item files):
  - TODO: `- [ ] YYYYMMDD-<slug> — <title> (owner: ai:astrogon|human:<name>) [due: YYYY-MM-DD]`
  - BLOCKED: `- [ ] YYYYMMDD-<slug> — <title> (owner: ...) [blocked: <reason>; review: YYYY-MM-DD]`
  - DONE: `- [x] YYYYMMDD-<slug> — <title> (owner: ...) [completed: YYYY-MM-DD] (optional: pr:#123 | commit:abc123 | spec:SPEC-... | prd:PRD-...)`
- Rules:
  - ID: `YYYYMMDD-<slug>`; date is the creation day (UTC). No created/completed timestamps are stored; Git history shows timing.
  - Owners: `human:<name>` or `ai:astrogon`.
  - BLOCKED requires both `reason` and `review` date.
  - Keep DONE concise; add a PR/commit link when applicable.
 - Lightweight principle: BOARD is a lightweight index; PRD/SPEC are the primary deliverables. Keep notes minimal and focus effort on shipping PRD/SPEC.
 - Editing rule: Prefer using the Board CLI (`npm run board:*`) to add/edit/move items. Manual edits are discouraged because subtle formatting (e.g., dash variants) can fail the linter.
  - Slug uniqueness: CLI ensures unique IDs; if a same-day slug collides, it auto-appends a numeric suffix (e.g., `-2`).
  - Dates in UTC: All dates are interpreted in UTC; the linter may warn if `due`/`review` are earlier than today (UTC).

### Board CLI
- Create: `npm run board:create -- --title "Title" --owner ai:astrogon [--due YYYY-MM-DD]`.
- Complete: `npm run board:complete -- --id <id> [--links "pr:#123|commit:abc123"]`.
- Block/Unblock: `npm run board:block -- --id <id> --reason "..." --review YYYY-MM-DD`; `npm run board:unblock -- --id <id>`.
- Move/Edit: `npm run board:move -- --id <id> --to todo|blocked|done`; `npm run board:edit -- --id <id> [--title ...] [--owner ...] [--due YYYY-MM-DD] [--links ...]`.
- List: `npm run board:list` 或 `npm run board -- list`。
 - Enforcement: When creating a BLOCKED item (via `--section blocked`) or blocking an existing item, a `review` date is required to avoid indefinite blocks. Use the CLI flags shown above; missing `--review` should be treated as an error.
 - Archive: `npm run board:archive` keeps the last N DONE items in BOARD and rolls older DONE entries to `kanban/docs/board-archive/YYYY-Www.md`. Optional to run weekly.

### Linting
- Run `npm run lint:board` to validate BOARD.md. CI should block merges that fail this linter.
