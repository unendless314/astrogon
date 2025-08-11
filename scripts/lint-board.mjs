#!/usr/bin/env node
// Lints docs/BOARD.md for minimal, strict format
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const BOARD = path.join(ROOT, 'docs', 'BOARD.md');
const OWNER_RE = /^(human:[a-z0-9._-]+|ai:astrogon)$/i;
const ID_RE = /^\d{8}-[a-z0-9-]+$/;

function warn(msg) { console.warn(`WARN: ${msg}`); }

function todayUTC() {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function cmpDate(a, b) {
  // compare YYYY-MM-DD strings lexicographically (safe for ISO)
  if (a < b) return -1; if (a > b) return 1; return 0;
}

function err(msg) { console.error(msg); }

async function main() {
  const raw = await fs.readFile(BOARD, 'utf8');
  const lines = raw.split(/\r?\n/);
  const sections = { TODO: [], BLOCKED: [], DONE: [] };
  let cur = null;
  for (const ln of lines) {
    if (/^##\s+TODO\s*$/.test(ln)) { cur = 'TODO'; continue; }
    if (/^##\s+BLOCKED\s*$/.test(ln)) { cur = 'BLOCKED'; continue; }
    if (/^##\s+DONE\s*$/.test(ln)) { cur = 'DONE'; continue; }
    if (cur && ln.trim().startsWith('- [')) sections[cur].push(ln);
  }

  let errors = 0;
  function checkCommon(line, checked) {
    const m = line.match(/^- \[( |x)\] (\d{8}-[a-z0-9-]+) — (.+?) \(owner: ([^)]+)\)(.*)$/);
    if (!m) { err(`Bad format: ${line}`); return { ok: false }; }
    const [, c, id, title, owner, rest] = m;
    if ((c === 'x') !== checked) { err(`Wrong checkbox for section: ${line}`); errors++; }
    if (!ID_RE.test(id)) { err(`Bad id: ${id}`); errors++; }
    if (!owner || !OWNER_RE.test(owner)) { err(`Bad owner: ${owner} (${line})`); errors++; }
    return { id, title, owner, rest };
  }

  // TODO section
  for (const l of sections.TODO) {
    const { rest } = checkCommon(l, false);
    if (rest && /\[blocked:/.test(rest)) { err(`TODO must not have blocked info: ${l}`); errors++; }
    if (rest) {
      const dm = rest.match(/\[due:\s*(\d{4}-\d{2}-\d{2})\]/i);
      if (dm) {
        const due = dm[1];
        const today = todayUTC();
        if (cmpDate(due, today) < 0) warn(`TODO has past due date (${due} < ${today}): ${l}`);
      }
    }
  }
  // BLOCKED section
  for (const l of sections.BLOCKED) {
    const { rest } = checkCommon(l, false);
    const mm = rest.match(/\[blocked: ([^\]]+)\]/);
    if (!mm) { err(`BLOCKED missing [blocked: reason; review: YYYY-MM-DD]: ${l}`); errors++; }
    else {
      const val = mm[1];
      const rm = val.match(/review:\s*(\d{4}-\d{2}-\d{2})/i);
      if (!rm) { err(`BLOCKED missing review date: ${l}`); errors++; }
      else {
        const review = rm[1];
        const today = todayUTC();
        if (cmpDate(review, today) < 0) warn(`BLOCKED has past review date (${review} < ${today}): ${l}`);
      }
      const dm = rest.match(/\[due:\s*(\d{4}-\d{2}-\d{2})\]/i);
      if (dm) {
        const due = dm[1];
        const today = todayUTC();
        if (cmpDate(due, today) < 0) warn(`BLOCKED has past due date (${due} < ${today}): ${l}`);
      }
    }
  }
  // DONE section
  for (const l of sections.DONE) {
    checkCommon(l, true);
  }

  if (!sections.TODO && !sections.BLOCKED && !sections.DONE) {
    err('Missing sections or empty board');
    errors++;
  }

  if (errors > 0) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
