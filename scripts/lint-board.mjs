#!/usr/bin/env node
// Lints docs/BOARD.md for minimal, strict format
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const BOARD = path.join(ROOT, 'docs', 'BOARD.md');
const OWNER_RE = /^(human:[a-z0-9._-]+|ai:astrogon)$/i;
const ID_RE = /^\d{8}-[a-z0-9-]+$/;

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
  }
  // BLOCKED section
  for (const l of sections.BLOCKED) {
    const { rest } = checkCommon(l, false);
    const mm = rest.match(/\[blocked: ([^\]]+)\]/);
    if (!mm) { err(`BLOCKED missing [blocked: reason; review: YYYY-MM-DD]: ${l}`); errors++; }
    else {
      const val = mm[1];
      if (!/review:\s*\d{4}-\d{2}-\d{2}/i.test(val)) { err(`BLOCKED missing review date: ${l}`); errors++; }
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

