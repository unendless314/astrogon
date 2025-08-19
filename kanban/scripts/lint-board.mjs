#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MODULE_ROOT = path.resolve(__dirname, '..');

class SimpleBoardLinter {
  constructor() {
    const env = process.env.BOARD_PATH;
    this.boardPath = env
      ? (path.isAbsolute(env) ? env : path.join(MODULE_ROOT, env))
      : path.join(MODULE_ROOT, 'docs', 'BOARD.md');
    this.errors = [];
    this.warnings = [];
  }

  async lint() {
    try {
      const content = await fs.readFile(this.boardPath, 'utf8');
      this.content = content;
      this.lines = content.split(/\r?\n/);

      this.checkStructure();
      this.checkItemFormat();
      this.checkUniqueness();
      this.checkDates();
      this.report();
    } catch (error) {
      console.error(`❌ Cannot read ${this.boardPath}: ${error.message}`);
      process.exit(1);
    }
  }

  checkStructure() {
    const required = ['## TODO', '## BLOCKED', '## DONE'];
    for (const section of required) {
      if (!this.content.includes(section)) this.errors.push(`Missing section: ${section}`);
    }
  }

  section(name) {
    const header = `## ${name}`;
    const startHeader = this.lines.findIndex(l => l.trim() === header);
    if (startHeader === -1) return { start: -1, end: -1 };
    let end = this.lines.length;
    for (let i = startHeader + 1; i < this.lines.length; i++) {
      if (this.lines[i].startsWith('## ') && this.lines[i].trim() !== header) { end = i; break; }
    }
    return { start: startHeader + 1, end };
  }

  checkItemFormat() {
    const itemPattern = /^- \[([ x])\] (\d{8}-[a-z0-9-]+(?:-\d+)?) — (.+) \(owner: ((?:human|ai):[a-z0-9._-]+)\)/;
    const { start: tStart, end: tEnd } = this.section('TODO');
    const { start: bStart, end: bEnd } = this.section('BLOCKED');
    const { start: dStart, end: dEnd } = this.section('DONE');

    const checkRange = (s, e, cb) => {
      for (let i = s; i > -1 && i < e; i++) {
        const line = this.lines[i];
        if (line && line.startsWith('- [')) cb(i, line);
      }
    };

    checkRange(tStart, tEnd, (idx, line) => {
      if (!itemPattern.test(line)) this.errors.push(`Line ${idx + 1}: Invalid TODO item format`);
      if (/\[blocked:/.test(line)) this.errors.push(`Line ${idx + 1}: TODO item must not include [blocked] info`);
    });

    checkRange(bStart, bEnd, (idx, line) => {
      if (!itemPattern.test(line)) this.errors.push(`Line ${idx + 1}: Invalid BLOCKED item format`);
      if (!/\[blocked:\s+[^;\]]+;\s+review:\s+\d{4}-\d{2}-\d{2}\]/.test(line)) {
        this.errors.push(`Line ${idx + 1}: BLOCKED item requires [blocked: <reason>; review: YYYY-MM-DD]`);
      }
    });

    checkRange(dStart, dEnd, (idx, line) => {
      if (!itemPattern.test(line)) this.errors.push(`Line ${idx + 1}: Invalid DONE item format`);
      if (!/\[completed:\s+\d{4}-\d{2}-\d{2}\]/.test(line)) this.errors.push(`Line ${idx + 1}: DONE item requires [completed: YYYY-MM-DD]`);
    });
  }

  checkUniqueness() {
    const ids = [...this.content.matchAll(/\b(\d{8}-[a-z0-9-]+(?:-\d+)?)\b/g)].map(m => m[1]);
    const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
    if (dup.length > 0) this.errors.push(`Duplicate IDs: ${[...new Set(dup)].join(', ')}`);
  }

  checkDates() {
    const today = new Date().toISOString().slice(0, 10);
    const raw = /\[(due|review|completed): ([^\]]+)\]/g;
    const strict = /^\d{4}-\d{2}-\d{2}$/;

    const isValidYMD = (ymd) => {
      if (!strict.test(ymd)) return false;
      const [y, m, d] = ymd.split('-').map(n => parseInt(n, 10));
      const dt = new Date(Date.UTC(y, m - 1, d));
      return dt.getUTCFullYear() === y && (dt.getUTCMonth() + 1) === m && dt.getUTCDate() === d;
    };

    let m;
    while ((m = raw.exec(this.content))) {
      const [, type, val] = m;
      if (!strict.test(val)) {
        this.errors.push(`Invalid ${type} date format: ${val} (expected YYYY-MM-DD)`);
        continue;
      }
      if (!isValidYMD(val)) {
        this.errors.push(`Invalid ${type} date value: ${val}`);
        continue;
      }
      if (val < today && type !== 'completed') this.warnings.push(`Past ${type} date: ${val}`);
    }
  }

  report() {
    if (this.warnings.length) {
      console.log('⚠️  Warnings:');
      this.warnings.forEach(w => console.log(`   ${w}`));
    }
    if (this.errors.length) {
      console.log('❌ Errors:');
      this.errors.forEach(e => console.log(`   ${e}`));
      process.exit(1);
    }
    console.log('✅ Board format is valid');
  }
}

const linter = new SimpleBoardLinter();
await linter.lint();
