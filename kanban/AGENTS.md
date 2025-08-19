# Repository Guidelines

This document is a short, practical guide for contributing to this Lightboard (zero-deps Kanban) repository.

## Project Structure & Module Organization
- `scripts/*.mjs`: Node 18+ ESM CLI tools (board edits, linting, PR checks).
- `kanban/docs/BOARD.md` (module-local): Single source of board items (`TODO | BLOCKED | DONE`).
- `kanban/docs/board-archive/` (module-local): Weekly archives created by the CLI.
- `PRD (en).markdown`, `SPEC (en).markdown`: Product docs; treat as source of truth.
- `.github/`: PR template and CI that lint the board and validate PR descriptions.

## Build, Test, and Development Commands
- `npm run board:create|edit|move`: Create or modify items in `kanban/docs/BOARD.md`.
- `npm run board:block|unblock`: Set or clear `[blocked: …; review: YYYY-MM-DD]`.
- `npm run board:complete`: Mark done and append links, e.g., `(pr:#123 | spec:SPEC-AUTH)`.
- `npm run board:list`: Print items grouped by section.
- `npm run board:archive`: Move older DONE items to `kanban/docs/board-archive/`.
- `npm run lint:board`: Validate structure, IDs, dates, and owners.
- `npm run validate:pr`: Check PR body for required fields (e.g., `board:<id>`).
- `npm run board:clean-lock`: Clear stale file locks if a process crashed.

Note: The board file `kanban/docs/BOARD.md` (module-local) is auto-created on first CLI use (e.g., `board:create` or `board:list`). No separate init command is required. When embedded in a larger repo, run from repo root using `node kanban/scripts/board.mjs ...` or `npm --prefix kanban run board:<cmd>`.

## Coding Style & Naming Conventions
- Language: Node.js ESM (`.mjs`), built-ins only; 2-space indent.
- Files: kebab-case (e.g., `lint-board.mjs`); functions camelCase; constants UPPER_SNAKE.
- Board IDs: `YYYYMMDD-slug(-N)`; items: `- [ ] <id> — Title (owner: ai:<ai-name>|human:<your-name>)`.
- Dates: UTC `YYYY-MM-DD` for `due`, `review`, `completed`.

## Testing Guidelines
- No unit test framework; rely on small, pure functions and CLI checks.
- Run `npm run lint:board` locally before commits; CI enforces it on PRs.

## Commit & Pull Request Guidelines
- Commits: Prefer Conventional Commit prefixes (`feat:`, `fix:`, `docs:`). Always include `board:<id>`.
- PRs: Use the template; include `board:<id>` and optional `spec:KEY`. Add screenshots if UI/UX docs change.
- Example commit: `fix(board): require review on blocked items board:20250811-fix-login`.

## Agent Tips & Safety
- Use only the provided CLI (`npm run board:<cmd>`) to modify the board.
- Use `board:complete` to finish work; do not `move` items into DONE.
- If blocked, include both `reason` and `review` date. Keep tasks small and specific.

### Handling Busy Board (Adaptive Backoff)
- The CLI exits with code `2` when the board is busy and prints an enhanced message: `Board is busy, locked since <ISO-8601> (age: Ns)`.
- Suggested backoff: if `age < 10s` wait ~5s; if `age < 60s` wait ~15s; if `age ≥ 60s`, consider `npm run board:clean-lock` or ask a human to investigate.
- Prefer waiting over force-cleaning; use `board:clean-lock` only when the lock age clearly exceeds your `lockTimeout`.
