#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MODULE_ROOT = path.resolve(__dirname, '..');

const extractIds = (text) => {
  return [...text.matchAll(/\b(\d{8}-[a-z0-9-]+(?:-\d+)?)\b/gi)].map(m => m[1]);
};

async function idExistsOnBoard(id) {
  const envBoard = process.env.BOARD_PATH;
  const envArchive = process.env.BOARD_ARCHIVE_DIR;
  const boardPath = envBoard
    ? (path.isAbsolute(envBoard) ? envBoard : path.join(MODULE_ROOT, envBoard))
    : path.join(MODULE_ROOT, 'docs', 'BOARD.md');
  const archiveDir = envArchive
    ? (path.isAbsolute(envArchive) ? envArchive : path.join(MODULE_ROOT, envArchive))
    : path.join(MODULE_ROOT, 'docs', 'board-archive');
  try {
    const board = await fs.readFile(boardPath, 'utf8');
    if (extractIds(board).includes(id)) return true;
  } catch {}
  try {
    const dir = archiveDir;
    const entries = await fs.readdir(dir).catch(() => []);
    for (const f of entries) {
      const p = path.join(dir, f);
      const stat = await fs.stat(p).catch(() => null);
      if (stat && stat.isFile()) {
        const txt = await fs.readFile(p, 'utf8');
        if (extractIds(txt).includes(id)) return true;
      }
    }
  } catch {}
  return false;
}

function validatePRDescription(description, boardIdFound) {
  const errors = [];
  const warnings = [];

  const boardPattern = /board:(\d{8}-[a-z0-9-]+(?:-\d+)?)/i;
  const m = description.match(boardPattern);
  if (!m) {
    errors.push('Missing board:<id> reference (e.g., board:20250811-fix-bug)');
  } else if (!boardIdFound) {
    errors.push(`Unknown board id: ${m[1]} (not found in board or archive)`);
  }

  const docPattern = /(spec|prd):([A-Z0-9-]+)/i;
  if (!docPattern.test(description)) {
    warnings.push('Consider adding a spec: or prd: reference for better traceability');
  }

  if ((description || '').trim().length < 10) {
    warnings.push('PR description is very short');
  }

  return { errors, warnings };
}

const readStdin = () => new Promise(resolve => {
  let input = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', chunk => input += chunk);
  process.stdin.on('end', () => resolve(input));
});

const arg = process.argv[2];
const description = arg ? arg : await readStdin();

const boardPattern = /board:(\d{8}-[a-z0-9-]+(?:-\d+)?)/i;
const idMatch = (description || '').match(boardPattern);
const exists = idMatch ? await idExistsOnBoard(idMatch[1]) : false;

const { errors, warnings } = validatePRDescription(description || '', exists);

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
