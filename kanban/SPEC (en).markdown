# Lightweight Kanban Module SPEC

**SPEC Draft**
- **id**: SPEC-20250811-lightboard-implementation
- **title**: Lightweight Kanban Module Implementation Specification
- **version**: v2.0
- **related**: PRD-20250811-lightboard-module

## Overview
This system is centered around a single-file Node.js CLI, a single-file Linter, and a GitHub Action, with zero external dependencies. It focuses on format enforcement and basic workflow constraints. For 2-3 specific AI collaboration scenarios, it adds simple yet effective conflict prevention and reference checking.

## System Architecture (Simplified)

### Components and File Structure
```
project/
├── scripts/
│   ├── board.mjs           # Main CLI (with simple file locking)
│   ├── lint-board.mjs      # Linter (retains original logic)
│   ├── validate-pr.mjs     # PR Description Checker (simple version)
│   └── simple-lock.mjs     # File lock utility (10 lines of code)
├── docs/
│   ├── BOARD.md            # Main board (module-local)
│   └── board-archive/      # Archive directory (module-local)
├── .github/
│   ├── workflows/
│   │   └── lint-board.yml  # Simplified CI
│   └── pull_request_template.md  # Simple PR template
├── AGENTS.md               # Usage Guidelines Section
└── package.json            # script definitions
```

## Data Model (Unchanged)

### BOARD Line Format Specification
```markdown
## TODO
- [ ] YYYYMMDD-<slug> — <title> (owner: ai:<n>|human:<n>) [due: YYYY-MM-DD]

## BLOCKED  
- [ ] YYYYMMDD-<slug> — <title> (owner: ai:<n>|human:<n>) [due: YYYY-MM-DD] [blocked: <reason>; review: YYYY-MM-DD]

## DONE
- [x] YYYYMMDD-<slug> — <title> (owner: ai:<n>|human:<n>) [completed: YYYY-MM-DD] (pr:#123 | commit:abc123 | spec:SPEC-... | prd:PRD-...)
```

## Core Component Implementation

### 1. Simple File Lock (simple-lock.mjs)
```javascript
// The simplest effective file lock - only ~20 lines of code
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MODULE_ROOT = path.resolve(__dirname, '..');
const DEFAULT_LOCK = path.join(MODULE_ROOT, 'docs', '.board.lock');

export async function withSimpleLock(operation, lockFile = DEFAULT_LOCK) {
  // Check if the lock exists
  try {
    await fs.access(lockFile);
    // Enhanced busy message with timestamp and age
    try {
      const content = await fs.readFile(lockFile, 'utf8');
      const [pid, ts] = content.split(':');
      const since = new Date(parseInt(ts, 10)).toISOString();
      const ageSec = Math.round((Date.now() - parseInt(ts, 10)) / 1000);
      throw new Error(`Board is busy, locked since ${since} (age: ${ageSec}s)`);
    } catch (readErr) {
      // Fallback if unreadable
      throw new Error('Board is busy, please try again in a moment');
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  
  // Create the lock
  await fs.writeFile(lockFile, `${process.pid}:${Date.now()}`);
  
  try {
    return await operation();
  } finally {
    // Always release the lock
    await fs.unlink(lockFile).catch(() => {});
  }
}

// Clean up stale locks (optional, for use after abnormal termination)
export async function cleanStaleLock(lockFile = DEFAULT_LOCK, maxAge = 60000) {
  try {
    const content = await fs.readFile(lockFile, 'utf8');
    const [pid, timestamp] = content.split(':');
    if (Date.now() - parseInt(timestamp) > maxAge) {
      await fs.unlink(lockFile);
      console.log('Cleaned stale lock file');
    }
  } catch (error) {
    // Lock file does not exist or is corrupted, ignore
  }
}
```

### 2. Main CLI Modifications (board.mjs)
```javascript
#!/usr/bin/env node
import { withSimpleLock } from './simple-lock.mjs';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MODULE_ROOT = path.resolve(__dirname, '..');

class BoardCLI {
  constructor() {
    this.boardPath = path.join(MODULE_ROOT, 'docs', 'BOARD.md');
  }

  async create(options) {
    return await withSimpleLock(async () => {
      // Original create logic, wrapped within the file lock
      console.log(`Creating task: ${options.title}`);
      // ... original implementation
    });
  }
  
  async complete(options) {
    return await withSimpleLock(async () => {
      // Original complete logic, wrapped within the file lock
      console.log(`Completing task: ${options.id}`);
      // ... original implementation
    });
  }
  
  async block(options) {
    return await withSimpleLock(async () => {
      // Validate required fields
      if (!options.reason || !options.review) {
        throw new Error('--reason and --review are required for blocking');
      }
      
      console.log(`Blocking task: ${options.id}`);
      // ... original implementation
    });
  }

  // Other methods remain unchanged...
}

// CLI entry point (with error handling)
const cli = new BoardCLI();
const command = process.argv[2];

try {
  switch (command) {
    case 'create':
      await cli.create(parseArgs());
      break;
    case 'complete':
      await cli.complete(parseArgs());
      break;
    case 'block':
      await cli.block(parseArgs());
      break;
    // ... other commands
    default:
      console.log('Usage: node board.mjs <create|complete|block|unblock|archive> [options]');
  }
} catch (error) {
  if (error.message.includes('Board is busy')) {
    // Preserve enhanced message so AIs can parse timestamp/age
    console.log(`⏳ ${error.message}`);
    process.exit(2); // Retryable busy condition
  } else {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}
```

### 3. PR Description Checker (validate-pr.mjs)
```javascript
#!/usr/bin/env node

function validatePRDescription(description) {
  const errors = [];
  const warnings = [];
  
  // Check for board: reference (most important)
  const boardPattern = /board:(\d{8}-[a-z0-9-]+(?:-\d+)?)/i;
  if (!boardPattern.test(description)) {
    errors.push('Missing board:<id> reference (e.g., board:20250811-fix-bug)');
  }
  
  // Check for spec: or prd: reference (secondary)
  const docPattern = /(spec|prd):([A-Z0-9-]+)/i;
  if (!docPattern.test(description)) {
    warnings.push('Consider adding a spec: or prd: reference for better traceability');
  }
  
  // Basic length check
  if (description.trim().length < 10) {
    warnings.push('PR description is very short');
  }
  
  return { errors, warnings };
}

// CLI usage
const description = process.argv[2] || await new Promise(resolve => {
  let input = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', chunk => input += chunk);
  process.stdin.on('end', () => resolve(input));
});

const { errors, warnings } = validatePRDescription(description);

if (warnings.length > 0) {
  console.log('\n⚠️  Warnings:');
  warnings.forEach(w => console.log(`   ${w}`));
}

if (errors.length > 0) {
  console.log('\n❌ Required:');
  errors.forEach(e => console.log(`   ${e}`));
  console.log('\nExample: "fix: resolve login issue\n\nboard:20250811-login-fix\nspec:SPEC-LOGIN-AUTH"');
  process.exit(1);
} else {
  console.log('✅ PR description looks good');
}
```

### 4. Simplified Linter (lint-board.mjs)
```javascript
#!/usr/bin/env node
// Retains original logic, but simplifies output and checks

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MODULE_ROOT = path.resolve(__dirname, '..');

class SimpleBoardLinter {
  constructor() {
    this.boardPath = path.join(MODULE_ROOT, 'docs', 'BOARD.md');
    this.errors = [];
    this.warnings = [];
  }
  
  async lint() {
    try {
      const content = await fs.readFile(this.boardPath, 'utf8');
      
      this.checkStructure(content);
      this.checkItemFormat(content);
      this.checkUniqueness(content);
      this.checkDates(content);
      
      this.report();
      
    } catch (error) {
      console.error(`❌ Cannot read ${this.boardPath}: ${error.message}`);
      process.exit(1);
    }
  }
  
  checkStructure(content) {
    const required = ['## TODO', '## BLOCKED', '## DONE'];
    for (const section of required) {
      if (!content.includes(section)) {
        this.errors.push(`Missing section: ${section}`);
      }
    }
  }
  
  checkItemFormat(content) {
    // Use the original regular expression logic
    const itemPattern = /^- \[([ x])\] (\d{8}-[a-z0-9-]+(?:-\d+)?) — (.+) \(owner: ((?:human|ai):[a-z0-9._-]+)\)/gm;
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      if (line.startsWith('- [')) {
        if (!itemPattern.test(line)) {
          this.errors.push(`Line ${index + 1}: Invalid item format`);
        }
      }
    });
  }
  
  checkUniqueness(content) {
    const ids = [...content.matchAll(/\d{8}-[a-z0-9-]+(?:-\d+)?/g)].map(m => m[0]);
    const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);
    if (duplicates.length > 0) {
      this.errors.push(`Duplicate IDs: ${[...new Set(duplicates)].join(', ')}`);
    }
  }
  
  checkDates(content) {
    const today = new Date().toISOString().slice(0, 10);
    const dateMatches = [...content.matchAll(/\[(due|review|completed): (\d{4}-\d{2}-\d{2})\]/g)];
    
    dateMatches.forEach(([match, type, date]) => {
      if (date < today && type !== 'completed') {
        this.warnings.push(`Past ${type} date: ${date}`);
      }
    });
  }
  
  report() {
    if (this.warnings.length > 0) {
      console.log('⚠️  Warnings:');
      this.warnings.forEach(w => console.log(`   ${w}`));
    }
    
    if (this.errors.length > 0) {
      console.log('❌ Errors:');
      this.errors.forEach(e => console.log(`   ${e}`));
      process.exit(1);
    } else {
      console.log('✅ Board format is valid');
    }
  }
}

const linter = new SimpleBoardLinter();
await linter.lint();
```

## CI/CD Integration

### GitHub Actions (.github/workflows/lint-board.yml)
```yaml
name: Lint Board & PR

on:
  pull_request:
    paths:
      - 'kanban/docs/BOARD.md'   # when embedded in a parent repo
      - 'kanban/scripts/**'

jobs:
  lint:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          
      - name: Clean stale locks
        run: node -e "
          import('./scripts/simple-lock.mjs').then(m => m.cleanStaleLock())
        "
        
      - name: Lint board format
        run: node kanban/scripts/lint-board.mjs
        
      - name: Validate PR description
        if: github.event_name == 'pull_request'
        run: |
          echo '${{ github.event.pull_request.body }}' | node kanban/scripts/validate-pr.mjs
```

### Package.json Scripts
```json
{
  "scripts": {
    "board:create": "node scripts/board.mjs create",
    "board:complete": "node scripts/board.mjs complete", 
    "board:block": "node scripts/board.mjs block",
    "board:unblock": "node scripts/board.mjs unblock",
    "board:archive": "node scripts/board.mjs archive",
    "board:list": "node scripts/board.mjs list",
    "lint:board": "node scripts/lint-board.mjs",
    "validate:pr": "node scripts/validate-pr.mjs",
    "board:clean-lock": "node -e \"import('./scripts/simple-lock.mjs').then(m => m.cleanStaleLock())\""
  }
}
```

### PR Template (Simplified Version)
```markdown
## Changes
<!-- What did you change? -->

## Related
board: <!-- e.g., board:20250811-fix-login -->
spec: <!-- e.g., spec:SPEC-AUTH-SYSTEM (optional) -->

## Type
- [ ] feat: new feature
- [ ] fix: bug fix  
- [ ] docs: documentation
- [ ] other: ___________

## Testing
- [ ] Tested locally
- [ ] No breaking changes
```

## Configuration
```json
// .boardrc.json (completely optional; module-local)
{
  "DONE_KEEP": 50,
  "lockTimeout": 60000
}
```

## Example Usage Flow

### Typical AI Workflow
```bash
# AI 1: Creates a task
npm run board:create -- --title "Fix login bug" --owner "ai:your-ai"

# AI 2: Attempts an operation simultaneously (receives enhanced message)
npm run board:complete -- --id "20250811-fix-login"
# Output: ⏳ Board is busy, locked since 2025-08-11T10:30:05.123Z (age: 12s)

# AI 2: Retries later and succeeds
npm run board:complete -- --id "20250811-fix-login" --links "pr:123"

# When submitting a PR, the CI checks if the description contains a board: reference
```

### Error Handling
```bash
# Forgetting to add a required parameter
npm run board:block -- --id "20250811-task"
# Output: ❌ Error: --reason and --review are required for blocking

# PR description does not meet the specification
echo "just a small fix" | npm run validate:pr
# Output: ❌ Required: Missing board:<id> reference (e.g., board:20250811-fix-bug)
```
