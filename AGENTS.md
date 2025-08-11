# Repository Guidelines

## Project Structure
- Source: `src/` → `assets/`, `components/`, `content/`, `lib/`, `pages/`, `styles/`, `types/`.
- Routing mirrors `src/pages/` (e.g., `src/pages/blog/[slug].astro` → `/blog/:slug`).
- Config: `astro.config.mjs`, `tailwind.config.js`, `postcss.config.js`, `tsconfig.json`, `wrangler.jsonc`.
- Docs: `docs/` houses PRD, SPEC, and the shared board.

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
- Reference cards in commits/PRs with `card:<id>`.

## Work Items & Docs
- Hierarchy: `docs/prd/` (PRD-YYYYMMDD-<slug>.md) → `docs/specs/` (SPEC-YYYYMMDD-<slug>.md) → optional `docs/board/epics/` → executable cards.
- Board: `docs/board/{todo,blocked,done,lessons}/`.
- Cards: one Markdown per task. Name `YYYYMMDD-<slug>.md`; frontmatter `id`, `title`, `status` (todo|blocked|done), `owner` (human:<name>|ai:<agent>), `created`, `links`. Body: Summary, Updates (timestamped), Next steps, Outcome/Lessons.
- Workflow: create in `todo/` (small enough to finish in one sitting) → move to `done/` when complete. If blocked, move to `blocked/` and add `blocked_reason`, `review_at`. All `done/` must originate from `todo/`.
- Tech debt: file as `blocked` cards; before bug work, search `lessons/` then `blocked/` for prior art.
- Micro-changes: if trivial (<10 minutes, low risk), ask user whether to create a card. If declined, proceed with `chore(no-card): <desc>`; otherwise create a `todo` and reference its `id`.
 - Epics: coordination only (no execution). Use when one initiative spans many cards or multiple SPECs; link PRD/SPEC and child `card:<id>`. Lifecycle: open → all children done → closed → archive (prefer archive over delete).
 - Templates: `docs/prd/PRD-TEMPLATE.md`, `docs/specs/SPEC-TEMPLATE.md`, `docs/board/epics/EPIC-TEMPLATE.md`, `docs/board/TEMPLATE.md`.
