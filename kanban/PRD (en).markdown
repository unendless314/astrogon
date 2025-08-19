# Lightweight Kanban Module PRD (Light Version)

**PRD Draft**
- **id**: PRD-20250811-lightboard-module
- **title**: Lightboard Module (Board + CLI + Lint + CI)
- **status**: proposed
- **owner**: product:owner
- **version**: v2.0

## Background
When maintaining multiple repositories, a low-friction method for work item tracking and referencing is needed. The goal is to avoid heavyweight PM tools, allowing PRDs/SPECs to be the primary artifacts, with the BOARD serving merely as an index. For collaboration scenarios involving 2-3 AIs, basic conflict protection and reference integrity are required.

## Goals
- One-click initialization of a lightweight board (module-local: `kanban/docs/BOARD.md`) along with its CLI, Linter, and CI.
- Provide a stable format, unique IDs, a review mechanism for BLOCKED items, and DONE item archiving to ensure no information is lost.
- Adoption cost of ≤ 5 minutes, with zero external service dependencies.
 - **New: Basic concurrency safety (for 2-3 AIs) and reference integrity checks.**
 - **New: Busy message includes lock timestamp and age for adaptive backoff.**

## Non-Goals
- A team collaboration UI, Gantt charts, cross-project aggregate reports, or permission management.
- Replacing the native Git platform's issue/PR workflow.
- **High-concurrency scenarios (>10 AIs) or complex transaction processing.**
- **Heavyweight process controls or detailed operational auditing.**

## Users & Scenarios
- **Primary Users**: Maintainers (e.g., human:<name>, ai:<name>)
- **Core Scenarios**:
  - Quickly creating, completing, blocking, and unblocking work items.
  - Referencing `board:<id>`, `spec:SPEC-...`, or `prd:PRD-...` in Pull Requests.
  - **2-3 AIs occasionally operating simultaneously without overwriting each other's work.**
  - CI automatically validates the BOARD format and PR description standards.

## Core Requirements

### Basic Features
- **Single-File Board**: A module-local `kanban/docs/BOARD.md` file with three sections (TODO/BLOCKED/DONE).
- **Board CLI**: `create|complete|block|unblock|move|edit|list|archive`.
- **Format Linter**: A linter that strictly checks the format. BLOCKED items must have a `reason + review`. It also warns about UTC dates.
- **Uniqueness Guarantee**: ID collisions are automatically resolved by appending a sequential suffix (e.g., `-2`, `-3`) in a predictable manner.
- **Auto-Archiving**: The DONE section retains only the last N items (default 50), with older items periodically rolled into `kanban/docs/board-archive/YYYY-Www.md`.

### Lightweight Enhancements
- **Simple File Lock**: A basic file-existence check to prevent write conflicts when 2-3 AIs operate simultaneously; busy errors include lock timestamp and age.
- **Reference Integrity**: PR descriptions must include a `board:<id>` reference to ensure traceability.
- **Basic Format Enforcement**: Maintain existing regex checks to ensure accurate parsing by AIs.

### Documentation & CI
- **Usage Guidelines**: An `AGENTS.md` file outlining the principles: "Use the CLI, reference IDs in PRs/Commits, and adhere to lightweight principles."
- **CI Integration**: A GitHub Action to check the BOARD format and PR reference integrity.
- **PR Template**: An optional `.github/pull_request_template.md` to guide users in filling out the required references.

## Success Metrics

### Basic Metrics
- Initialization time ≤ 5 minutes.
- Board lint failure rate < 1% in the first month.
- >90% of PR descriptions contain a `board:<id>` or `spec|prd` reference.
- The length of `kanban/docs/BOARD.md` remains readable over the long term (DONE items ≤ N).

### Lightweight Enhancement Metrics (New)
- **File lock conflict notification rate** < 5% (occasional "try again" messages are acceptable).
- **PR reference omission interception rate** > 95%.
- **Format error auto-detection rate** > 90%.
 - Qualitative: Unnecessary retries decrease; stale-lock cleanup is more timely due to visible lock age.

## Risks & Mitigations

### Existing Risks
- **Multi-byte punctuation issues** (e.g., em dashes) → Enforce CLI usage; the linter will issue warnings but will not relax its regex rules.
- **Timezone confusion** → The CLI will operate in UTC; the linter will warn for past due/review dates.
- **Configuration drift across repos** → Provide a simple, optional config file.

### New Risk Mitigations
- **Mild concurrency conflicts** → Implement a simple file lock with a "Please try again later" message (no automatic retry mechanism is needed).
- **Missing references** → CI will check PR descriptions and fail the build if a `board:` reference is missing.
- **Format drift** → Maintain the existing strict regex checks.

## Implementation Priority

### Phase 1 (Core Functionality)
1.  **Basic CLI** - `create/complete/block/unblock` (existing functionality).
2.  **Simple File Lock** - A 10-line file-existence check.
3.  **Format Linter** - Maintain the existing `lint-board.mjs` logic.

### Phase 2 (Integrity)
4.  **PR Reference Check** - A simple string-matching check.
5.  **CI Integration** - Implement the checks as a GitHub Action.
6.  **Auto-Archiving** - The `archive` command.

### Phase 3 (Optional)
7.  **PR Template** - Guide correct usage.
8.  **AGENTS.md Documentation** - Provide usage instructions.

## Acceptance Criteria

### Functional Acceptance
- [ ] `npm run board:create` works in a new repo and is protected by a basic file lock.
- [ ] When two AIs execute a CLI command simultaneously, the second one receives a "Board is busy" message.
- [ ] `board:block` without the `--review` flag exits with a non-zero code.
- [ ] Creating an item with the same slug on the same day automatically appends a sequential suffix.
- [ ] The CI can block a PR that lacks a `board:` reference.
- [ ] When a lock is held, the error message includes `locked since <ISO-8601> (age: Ns)` and the CLI exits with code 2.

### Quality Acceptance
- [ ] `npm run lint:board` exits with code 0 for a correctly formatted board.
- [ ] The simple file lock does not result in a permanent lock if the process terminates abnormally (e.g., has a timeout cleanup).
- [ ] The PR description check correctly identifies the `board:YYYYMMDD-slug` format.

### Lightweightness Acceptance
- [ ] Total core files are < 500 lines of code.
- [ ] CLI command response time is < 1 second.
- [ ] No external dependencies (only Node.js built-in modules).

## Release Strategy

### Manual Hot-Swap (Recommended)
```bash
# Copy the 4 core files
cp scripts/board.mjs scripts/lint-board.mjs scripts/simple-lock.mjs .github/workflows/lint-board.yml

# Update package.json (add scripts manually)
# Create the initial module-local board (kanban/docs/BOARD.md)
# Update the relevant section in AGENTS.md
```

### Simplified Initialization (Future Option)
```bash
curl -s https://raw.githubusercontent.com/.../init.sh | bash
# Or
npx create-lightboard
```

## Design Principles

1.  **Just Enough** - Solve the basic collaboration problem for 2-3 AIs without over-engineering.
2.  **Disposability** - Can be easily removed without locking in the project.
3.  **Zero Dependencies** - Relies only on built-in Node.js features.
4.  **Format-First** - AIs depend on format accuracy, making it the top priority.
5.  **Progressive Enhancement** - Start with basic features and enhance them incrementally.
