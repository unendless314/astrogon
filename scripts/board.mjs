#!/usr/bin/env node
// Single-file board CLI for docs/BOARD.md
// Commands: create, complete, block, unblock, move, edit, list, help
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const BOARD = path.join(ROOT, 'docs', 'BOARD.md');
const OWNER_RE = /^(human:[a-z0-9._-]+|ai:astrogon)$/i;

function usage(code = 0) {
  const msg = `
Board CLI\n\nUsage:\n  node scripts/board.mjs create --title "Title" [--slug slug] [--owner ai:astrogon] [--date YYYYMMDD] [--due YYYY-MM-DD] [--section todo|blocked] [--reason "..."] [--review YYYY-MM-DD]\n  node scripts/board.mjs complete <id> [--links "pr:#123|commit:abc123"]\n  node scripts/board.mjs block <id> --reason "..." [--review YYYY-MM-DD]\n  node scripts/board.mjs unblock <id>\n  node scripts/board.mjs move <id> --to todo|blocked|done\n  node scripts/board.mjs edit <id> [--title "New"] [--owner human:alice] [--due YYYY-MM-DD|null] [--links "..."] [--reason "..."] [--review YYYY-MM-DD|null]\n  node scripts/board.mjs list\n`;
  console.log(msg.trim() + '\n');
  process.exit(code);
}

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const [k, vRaw] = a.split('=');
      const key = k.replace(/^--/, '');
      if (vRaw !== undefined) out[key] = vRaw; else {
        const next = argv[i + 1];
        if (!next || next.startsWith('-')) out[key] = true; else { out[key] = next; i++; }
      }
    } else if (a.startsWith('-')) {
      const key = a.replace(/^-+/, '');
      const next = argv[i + 1];
      if (!next || next.startsWith('-')) out[key] = true; else { out[key] = next; i++; }
    } else out._.push(a);
  }
  return out;
}

function slugify(s) {
  return s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9\s-]/g, '').trim().replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');
}

function todayUTC() {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

function toId(date8, slug) { return `${date8}-${slug}`; }

async function readBoard() {
  const raw = await fs.readFile(BOARD, 'utf8');
  const lines = raw.split(/\r?\n/);
  const sections = { TODO: [], BLOCKED: [], DONE: [] };
  let current = null;
  for (const ln of lines) {
    if (/^##\s+TODO\s*$/.test(ln)) { current = 'TODO'; continue; }
    if (/^##\s+BLOCKED\s*$/.test(ln)) { current = 'BLOCKED'; continue; }
    if (/^##\s+DONE\s*$/.test(ln)) { current = 'DONE'; continue; }
    if (current && ln.trim().startsWith('- [')) sections[current].push(ln);
  }
  return { raw, lines, sections };
}

function findLine(sections, id) {
  for (const key of Object.keys(sections)) {
    const idx = sections[key].findIndex((l) => new RegExp(`\n?- \[[ x]\] ${id} — `).test('\n' + l));
    if (idx !== -1) return { section: key, index: idx, line: sections[key][idx] };
  }
  return null;
}

function buildLine({ checked, id, title, owner, due, reason, review, links }) {
  const ck = checked ? 'x' : ' ';
  const parts = [`- [${ck}] ${id} — ${title} (owner: ${owner})`];
  if (due) parts.push(`[due: ${due}]`);
  if (reason || review) parts.push(`[blocked: ${reason || ''}${reason && review ? '; ' : ''}${review ? `review: ${review}` : ''}]`);
  if (links) parts.push(`(${links})`);
  return parts.join(' ');
}

function parseLine(line) {
  // Extract id, title, owner, flags
  const m = line.match(/^- \[( |x)\] (\d{8}-[a-z0-9-]+) — (.+?) \(owner: ([^)]+)\)(?:\s+\[due: ([^\]]+)\])?(?:\s+\[blocked: ([^\]]+)\])?(?:\s+\(([^)]+)\))?$/i);
  if (!m) return null;
  const [, chk, id, title, owner, due, blocked, links] = m;
  let reason = null, review = null;
  if (blocked) {
    const p1 = blocked.split(';').map((s) => s.trim());
    reason = p1[0] || null;
    const rev = p1.find((p) => p.toLowerCase().startsWith('review:'));
    if (rev) review = rev.split(':').slice(1).join(':').trim();
  }
  return { checked: chk === 'x', id, title, owner, due: due || null, reason, review, links: links || null };
}

async function writeBoard(state) {
  const { lines, sections } = state;
  const out = [];
  let cur = null;
  for (const ln of lines) {
    if (/^##\s+TODO\s*$/.test(ln)) { cur = 'TODO'; out.push(ln); continue; }
    if (/^##\s+BLOCKED\s*$/.test(ln)) { cur = 'BLOCKED'; out.push(ln); continue; }
    if (/^##\s+DONE\s*$/.test(ln)) { cur = 'DONE'; out.push(ln); continue; }
    if (cur && ln.trim().startsWith('- [')) {
      // skip original list lines; we will write from sections
      continue;
    }
    out.push(ln);
    // After the header, write the section list once
    if (/^##\s+TODO\s*$/.test(ln)) { for (const l of sections.TODO) out.push(l); }
    if (/^##\s+BLOCKED\s*$/.test(ln)) { for (const l of sections.BLOCKED) out.push(l); }
    if (/^##\s+DONE\s*$/.test(ln)) { for (const l of sections.DONE) out.push(l); }
  }
  const text = out.join('\n').replace(/\n{3,}/g, '\n\n');
  await fs.writeFile(BOARD, text.trimEnd() + '\n', 'utf8');
}

function assertOwner(owner) {
  if (!OWNER_RE.test(owner)) throw new Error(`Invalid owner: ${owner}`);
}

function date8(input) {
  if (!input) return todayUTC();
  if (/^\d{8}$/.test(input)) return input;
  const m = input.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return `${m[1]}${m[2]}${m[3]}`;
  throw new Error('Bad date, expected YYYYMMDD or YYYY-MM-DD');
}

async function cmdCreate(opt) {
  const title = opt.title; if (!title) throw new Error('Missing --title');
  const slug = opt.slug ? slugify(opt.slug) : slugify(title);
  const id = toId(date8(opt.date), slug);
  const owner = opt.owner || 'ai:astrogon'; assertOwner(owner);
  const due = opt.due || null;
  const section = (opt.section || 'todo').toUpperCase();
  const reason = section === 'BLOCKED' ? (opt.reason || 'TBD') : null;
  const review = section === 'BLOCKED' ? (opt.review || null) : null;

  const state = await readBoard();
  if (findLine(state.sections, id)) throw new Error(`ID exists: ${id}`);
  const line = buildLine({ checked: false, id, title, owner, due, reason, review, links: null });
  state.sections[section].push(line);
  await writeBoard(state);
  console.log(id);
}

async function cmdComplete(id, opt) {
  const state = await readBoard();
  const hit = findLine(state.sections, id); if (!hit) throw new Error(`Not found: ${id}`);
  const obj = parseLine(hit.line); obj.checked = true; obj.reason = null; obj.review = null;
  if (opt.links) obj.links = opt.links;
  // remove from current
  state.sections[hit.section].splice(hit.index, 1);
  // add to DONE
  state.sections.DONE.push(buildLine(obj));
  await writeBoard(state);
  console.log(id);
}

async function cmdBlock(id, opt) {
  if (!opt.reason) throw new Error('Missing --reason');
  const state = await readBoard();
  const hit = findLine(state.sections, id); if (!hit) throw new Error(`Not found: ${id}`);
  const obj = parseLine(hit.line); obj.checked = false; obj.reason = opt.reason; obj.review = opt.review || obj.review || null;
  state.sections[hit.section].splice(hit.index, 1);
  state.sections.BLOCKED.push(buildLine(obj));
  await writeBoard(state);
  console.log(id);
}

async function cmdUnblock(id) {
  const state = await readBoard();
  const hit = findLine(state.sections, id); if (!hit) throw new Error(`Not found: ${id}`);
  const obj = parseLine(hit.line); obj.reason = null; obj.review = null; obj.checked = false;
  state.sections[hit.section].splice(hit.index, 1);
  state.sections.TODO.push(buildLine(obj));
  await writeBoard(state);
  console.log(id);
}

async function cmdMove(id, to) {
  const up = to.toUpperCase(); if (!['TODO','BLOCKED','DONE'].includes(up)) throw new Error('Bad --to');
  const state = await readBoard();
  const hit = findLine(state.sections, id); if (!hit) throw new Error(`Not found: ${id}`);
  const obj = parseLine(hit.line);
  obj.checked = (up === 'DONE');
  if (up !== 'BLOCKED') { obj.reason = null; obj.review = null; }
  state.sections[hit.section].splice(hit.index, 1);
  state.sections[up].push(buildLine(obj));
  await writeBoard(state);
  console.log(id);
}

async function cmdEdit(id, opt) {
  const state = await readBoard();
  const hit = findLine(state.sections, id); if (!hit) throw new Error(`Not found: ${id}`);
  const obj = parseLine(hit.line);
  if (opt.title) obj.title = opt.title;
  if (opt.owner) { assertOwner(opt.owner); obj.owner = opt.owner; }
  if (opt.due === 'null') obj.due = null; else if (opt.due) obj.due = opt.due;
  if (opt.links) obj.links = opt.links;
  if (typeof opt.reason !== 'undefined') obj.reason = opt.reason || null;
  if (typeof opt.review !== 'undefined') obj.review = opt.review === 'null' ? null : opt.review;
  state.sections[hit.section][hit.index] = buildLine(obj);
  await writeBoard(state);
  console.log(id);
}

async function cmdList() {
  const { raw } = await readBoard();
  console.log(raw);
}

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  const opt = parseArgs(rest);
  try {
    switch (cmd) {
      case 'create': await cmdCreate(opt); break;
      case 'complete': await cmdComplete(opt._[0], opt); break;
      case 'block': await cmdBlock(opt._[0], opt); break;
      case 'unblock': await cmdUnblock(opt._[0]); break;
      case 'move': await cmdMove(opt._[0], opt.to); break;
      case 'edit': await cmdEdit(opt._[0], opt); break;
      case 'list': await cmdList(); break;
      case 'help':
      case undefined: usage(0); break;
      default: console.error(`Unknown command: ${cmd}`); usage(1);
    }
  } catch (e) {
    console.error(String(e.message || e));
    process.exit(1);
  }
}

main();

