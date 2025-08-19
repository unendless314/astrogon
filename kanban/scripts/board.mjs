#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { withSimpleLock } from './simple-lock.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MODULE_ROOT = path.resolve(__dirname, '..');
const CONFIG_PATH = path.join(MODULE_ROOT, '.boardrc.json');
const EM_DASH = ' — ';

// Validation helpers
const OWNER_RE = /^(?:ai|human):[a-z0-9._-]+$/;
const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidYMD(ymd) {
  if (!YMD_RE.test(ymd)) return false;
  const [y, m, d] = ymd.split('-').map(n => parseInt(n, 10));
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && (dt.getUTCMonth() + 1) === m && dt.getUTCDate() === d;
}

async function readConfig() {
  const defaults = { DONE_KEEP: 50, lockTimeout: 60000 };
  try {
    const raw = await fs.readFile(CONFIG_PATH, 'utf8');
    const cfg = JSON.parse(raw);
    return { ...defaults, ...cfg };
  } catch {
    return defaults;
  }
}

function resolvePaths(cfg = {}) {
  const defaultBoard = path.join(MODULE_ROOT, 'docs', 'BOARD.md');
  const defaultArchive = path.join(MODULE_ROOT, 'docs', 'board-archive');
  const defaultLock = path.join(MODULE_ROOT, 'docs', '.board.lock');

  const normalize = (p, def) => {
    const val = p ?? def;
    if (!val) return def;
    return path.isAbsolute(val) ? val : path.join(MODULE_ROOT, val);
  };

  return {
    boardPath: normalize(cfg.boardPath ?? process.env.BOARD_PATH, defaultBoard),
    archiveDir: normalize(cfg.archiveDir ?? process.env.BOARD_ARCHIVE_DIR, defaultArchive),
    lockFile: normalize(cfg.lockFile ?? process.env.BOARD_LOCK_FILE, defaultLock),
    DONE_KEEP: cfg.DONE_KEEP ?? 50,
    lockTimeout: cfg.lockTimeout ?? 60000,
  };
}

async function ensureBoardExists(boardPath) {
  await fs.mkdir(path.dirname(boardPath), { recursive: true });
  try {
    await fs.access(boardPath);
  } catch {
    const initial = [
      '# Board',
      '',
      '## TODO',
      '',
      '## BLOCKED',
      '',
      '## DONE',
      ''
    ].join('\n');
    await fs.writeFile(boardPath, initial, 'utf8');
  }
}

async function readBoard(boardPath) {
  await ensureBoardExists(boardPath);
  const content = await fs.readFile(boardPath, 'utf8');
  const lines = content.split(/\r?\n/);
  return lines;
}

async function writeBoard(boardPath, lines) {
  const text = lines.join('\n');
  await fs.writeFile(boardPath, text.endsWith('\n') ? text : text + '\n', 'utf8');
}

function findSection(lines, name) {
  const header = `## ${name}`;
  const startHeader = lines.findIndex(l => l.trim() === header);
  if (startHeader === -1) return { startHeader: -1, start: -1, end: -1 };
  let end = lines.length;
  for (let i = startHeader + 1; i < lines.length; i++) {
    if (lines[i].startsWith('## ') && lines[i].trim() !== header) {
      end = i;
      break;
    }
  }
  return { startHeader, start: startHeader + 1, end };
}

function sectionItems(lines, sectionName) {
  const { start, end } = findSection(lines, sectionName);
  const items = [];
  for (let i = start; i < end; i++) {
    const line = lines[i];
    if (line && line.startsWith('- [')) items.push({ index: i, line });
  }
  return items;
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getAllIdsFromLines(lines) {
  const text = lines.join('\n');
  return [...text.matchAll(/\b(\d{8}-[a-z0-9-]+(?:-\d+)?)\b/g)].map(m => m[1]);
}

function nextUniqueId(base, lines) {
  const ids = getAllIdsFromLines(lines);
  if (!ids.includes(base)) return base;
  let n = 2;
  while (ids.includes(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

function todayYMDUTC() {
  return new Date().toISOString().slice(0, 10);
}

function todayYMDCompactUTC() {
  return todayYMDUTC().replace(/-/g, '');
}

function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function insertAtSectionTop(lines, sectionName, newLine) {
  const { startHeader } = findSection(lines, sectionName);
  if (startHeader === -1) throw new Error(`Missing section: ${sectionName}`);
  const insertIndex = startHeader + 1;
  lines.splice(insertIndex, 0, newLine);
}

function removeLine(lines, index) {
  lines.splice(index, 1);
}

function findItemById(lines, id) {
  const rx = new RegExp(`^- \\[[ x]\\] ${escapeRegExp(id)}\\b`);
  for (let i = 0; i < lines.length; i++) {
    if (rx.test(lines[i])) return { index: i, line: lines[i] };
  }
  return null;
}

function stripBlocked(line) {
  return line.replace(/\s*\[blocked: [^\]]*\]/, '');
}

function setChecked(line, checked) {
  return line.replace(/^- \[[ x]\]/, `- [${checked ? 'x' : ' '}]`);
}

function setCompleted(line, date) {
  let base = line.replace(/\s*\[completed: [^\]]*\]/, '');
  return `${base} [completed: ${date}]`;
}

function setBlocked(line, reason, reviewDate) {
  let base = stripBlocked(line);
  return `${base} [blocked: ${reason}; review: ${reviewDate}]`;
}

function setDue(line, due) {
  if (!due) return line;
  if (/\[due: /.test(line)) return line.replace(/\[due: [^\]]*\]/, `[due: ${due}]`);
  return `${line} [due: ${due}]`;
}

// setTitle removed (unused)

function setOwner(line, newOwner) {
  return line.replace(/\(owner: [^)]+\)/, `(owner: ${newOwner})`);
}

function addLinksParenthetical(line, links) {
  if (!links) return line;
  // Remove existing parenthetical links, then append new one
  const withoutLinks = line.replace(/\s*\((?:pr:[^)|]+|commit:[^)|]+|spec:[^)|]+|prd:[^)|]+)(?: \| [^)]*)?\)/g, '');
  return `${withoutLinks} (${links})`;
}

function weekKey(date = new Date()) {
  // ISO week number
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  const yyyy = d.getUTCFullYear();
  return `${yyyy}-W${String(weekNo).padStart(2, '0')}`;
}

function parseArgs(argv = process.argv.slice(3)) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const val = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : 'true';
      out[key] = val;
    }
  }
  return out;
}

class BoardCLI {
  constructor(config) {
    this.config = config;
    this.paths = resolvePaths(config);
  }

  async create(opts) {
    const { lockTimeout, boardPath, lockFile } = this.paths;
    if (!opts.title) throw new Error('--title is required');
    if (!opts.owner) throw new Error('--owner is required');
    const title = opts.title.trim();
    const owner = opts.owner.trim();
    const due = opts.due ? opts.due.trim() : null;

    if (!OWNER_RE.test(owner)) throw new Error('--owner must be ai:<name> or human:<name>');
    if (due && !isValidYMD(due)) throw new Error('--due must be UTC date in YYYY-MM-DD');

    return await withSimpleLock(async () => {
      const lines = await readBoard(boardPath);
      const idBase = `${todayYMDCompactUTC()}-${slugify(title)}`;
      const id = nextUniqueId(idBase, lines);
      let line = `- [ ] ${id}${EM_DASH}${title} (owner: ${owner})`;
      if (due) line = setDue(line, due);
      insertAtSectionTop(lines, 'TODO', line);
      await writeBoard(boardPath, lines);
      console.log(`Created: ${id}`);
    }, { lockFile, maxAge: lockTimeout });
  }

  async complete(opts) {
    const { lockTimeout, boardPath, lockFile } = this.paths;
    if (!opts.id) throw new Error('--id is required');
    const id = opts.id.trim();
    const links = opts.links ? opts.links.trim() : '';

    return await withSimpleLock(async () => {
      const lines = await readBoard(boardPath);
      const found = findItemById(lines, id);
      if (!found) throw new Error(`ID not found: ${id}`);
      let line = found.line;
      line = stripBlocked(line);
      line = setChecked(line, true);
      line = setCompleted(line, todayYMDUTC());
      line = addLinksParenthetical(line, links);

      removeLine(lines, found.index);
      insertAtSectionTop(lines, 'DONE', line);
      await writeBoard(boardPath, lines);
      console.log(`Completed: ${id}`);
    }, { lockFile, maxAge: lockTimeout });
  }

  async block(opts) {
    const { lockTimeout, boardPath, lockFile } = this.paths;
    if (!opts.id) throw new Error('--id is required');
    if (!opts.reason || !opts.review) {
      throw new Error('--reason and --review are required for blocking');
    }
    const id = opts.id.trim();
    const reason = opts.reason.trim();
    const review = opts.review.trim();

    if (!isValidYMD(review)) throw new Error('--review must be UTC date in YYYY-MM-DD');

    return await withSimpleLock(async () => {
      const lines = await readBoard(boardPath);
      const found = findItemById(lines, id);
      if (!found) throw new Error(`ID not found: ${id}`);
      let line = found.line;
      line = setChecked(line, false);
      line = setBlocked(stripBlocked(line), reason, review);
      removeLine(lines, found.index);
      insertAtSectionTop(lines, 'BLOCKED', line);
      await writeBoard(boardPath, lines);
      console.log(`Blocked: ${id}`);
    }, { lockFile, maxAge: lockTimeout });
  }

  async unblock(opts) {
    const { lockTimeout, boardPath, lockFile } = this.paths;
    if (!opts.id) throw new Error('--id is required');
    const id = opts.id.trim();

    return await withSimpleLock(async () => {
      const lines = await readBoard(boardPath);
      const found = findItemById(lines, id);
      if (!found) throw new Error(`ID not found: ${id}`);
      let line = stripBlocked(found.line);
      line = setChecked(line, false);
      removeLine(lines, found.index);
      insertAtSectionTop(lines, 'TODO', line);
      await writeBoard(boardPath, lines);
      console.log(`Unblocked: ${id}`);
    }, { lockFile, maxAge: lockTimeout });
  }

  async move(opts) {
    const { lockTimeout, boardPath, lockFile } = this.paths;
    if (!opts.id || !opts.to) throw new Error('--id and --to are required');
    const id = opts.id.trim();
    const to = opts.to.trim().toUpperCase();
    if (!['TODO', 'BLOCKED', 'DONE'].includes(to)) throw new Error('--to must be TODO|BLOCKED|DONE');
    if (to === 'DONE') throw new Error('Use "complete" to mark items done');

    return await withSimpleLock(async () => {
      const lines = await readBoard(boardPath);
      const found = findItemById(lines, id);
      if (!found) throw new Error(`ID not found: ${id}`);
      let line = found.line;
      removeLine(lines, found.index);
      insertAtSectionTop(lines, to, line);
      await writeBoard(boardPath, lines);
      console.log(`Moved: ${id} -> ${to}`);
    }, { lockFile, maxAge: lockTimeout });
  }

  async edit(opts) {
    const { lockTimeout, boardPath, lockFile } = this.paths;
    if (!opts.id) throw new Error('--id is required');
    const id = opts.id.trim();
    const title = opts.title ? opts.title.trim() : null;
    const owner = opts.owner ? opts.owner.trim() : null;
    const due = opts.due ? opts.due.trim() : null;

    if (owner && !OWNER_RE.test(owner)) throw new Error('--owner must be ai:<name> or human:<name>');
    if (due && !isValidYMD(due)) throw new Error('--due must be UTC date in YYYY-MM-DD');

    return await withSimpleLock(async () => {
      const lines = await readBoard(boardPath);
      const found = findItemById(lines, id);
      if (!found) throw new Error(`ID not found: ${id}`);
      let line = found.line;
      if (title) line = line.replace(/^(\- \[[ x]\] \d{8}-[a-z0-9-]+(?:-\d+)?).+?( \(owner: )/, `$1${EM_DASH}${title}$2`);
      if (owner) line = setOwner(line, owner);
      if (due) line = setDue(line, due);
      lines[found.index] = line;
      await writeBoard(boardPath, lines);
      console.log(`Edited: ${id}`);
    }, { lockFile, maxAge: lockTimeout });
  }

  async list() {
    const { boardPath } = this.paths;
    const lines = await readBoard(boardPath);
    const print = (name) => {
      const items = sectionItems(lines, name).map(x => x.line);
      console.log(`\n## ${name}`);
      for (const l of items) console.log(l);
    };
    print('TODO');
    print('BLOCKED');
    print('DONE');
  }

  async archive() {
    const { lockTimeout, DONE_KEEP, boardPath, archiveDir, lockFile } = this.paths;
    return await withSimpleLock(async () => {
      const lines = await readBoard(boardPath);
      const { start, end } = findSection(lines, 'DONE');
      const doneItems = [];
      for (let i = start; i < end; i++) {
        if (lines[i] && lines[i].startsWith('- [')) doneItems.push(i);
      }
      if (doneItems.length <= DONE_KEEP) {
        console.log('Nothing to archive');
        return;
      }
      const toArchiveCount = doneItems.length - DONE_KEEP;
      const toArchiveIdx = doneItems.slice(-toArchiveCount); // older ones (bottom)
      const archivedLines = toArchiveIdx.map(i => lines[i]);

      // Remove from board (from bottom up to keep indices valid)
      for (let i = toArchiveIdx.length - 1; i >= 0; i--) removeLine(lines, toArchiveIdx[i]);

      await fs.mkdir(archiveDir, { recursive: true });
      const wk = weekKey();
      const archivePath = path.join(archiveDir, `${wk}.md`);
      let header = '';
      try {
        await fs.access(archivePath);
      } catch {
        header = `# Archive ${wk}\n\n`;
      }
      await fs.appendFile(archivePath, header + archivedLines.join('\n') + '\n');
      await writeBoard(boardPath, lines);
      console.log(`Archived ${archivedLines.length} item(s) -> ${archivePath}`);
    }, { lockFile, maxAge: lockTimeout });
  }
}

async function main() {
  const config = await readConfig();
  const cli = new BoardCLI(config);
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
      case 'unblock':
        await cli.unblock(parseArgs());
        break;
      case 'move':
        await cli.move(parseArgs());
        break;
      case 'edit':
        await cli.edit(parseArgs());
        break;
      case 'list':
        await cli.list();
        break;
      case 'archive':
        await cli.archive();
        break;
      default:
        console.log('Usage: node scripts/board.mjs <create|complete|block|unblock|move|edit|list|archive> [options]');
    }
  } catch (error) {
    if (String(error.message).includes('Board is busy')) {
      console.log(`⏳ ${error.message}`);
      process.exit(2);
    } else {
      console.error(`❌ Error: ${error.message}`);
      process.exit(1);
    }
  }
}

await main();
