#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MODULE_ROOT = path.resolve(__dirname, '..');
const DEFAULT_LOCK = path.join(MODULE_ROOT, 'docs', '.board.lock');

export async function withSimpleLock(operation, { lockFile = DEFAULT_LOCK, maxAge = 60000 } = {}) {
  // If a lock exists, check staleness and either clear or ask caller to retry
  try {
    await fs.access(lockFile);
    try {
      const content = await fs.readFile(lockFile, 'utf8');
      const [, ts] = content.split(':');
      const tsNum = parseInt(ts, 10);
      // If stale, clear and proceed; otherwise report enriched busy info
      if (!Number.isFinite(tsNum)) {
        throw new Error('Board is busy, please try again in a moment');
      }
      const ageMs = Date.now() - tsNum;
      if (ageMs > maxAge) {
        await fs.unlink(lockFile).catch(() => {});
      } else {
        const since = new Date(tsNum).toISOString();
        const ageSec = Math.round(ageMs / 1000);
        throw new Error(`Board is busy, locked since ${since} (age: ${ageSec}s)`);
      }
    } catch (err) {
      // If we explicitly threw a busy error, propagate; otherwise fallback
      if (typeof err?.message === 'string' && err.message.startsWith('Board is busy')) throw err;
      if (err.code !== 'ENOENT') {
        throw new Error('Board is busy, please try again in a moment');
      }
    }
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }

  await fs.mkdir(path.dirname(lockFile), { recursive: true }).catch(() => {});
  await fs.writeFile(lockFile, `${process.pid}:${Date.now()}`);

  try {
    return await operation();
  } finally {
    await fs.unlink(lockFile).catch(() => {});
  }
}

export async function cleanStaleLock(lockFile = DEFAULT_LOCK, maxAge = 60000) {
  try {
    const content = await fs.readFile(lockFile, 'utf8');
    const [, ts] = content.split(':');
    if (Date.now() - parseInt(ts, 10) > maxAge) {
      await fs.unlink(lockFile).catch(() => {});
      console.log('Cleaned stale lock file');
    }
  } catch {
    // No lock or unreadable; nothing to do
  }
}
