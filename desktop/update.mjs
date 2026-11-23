// Auto-updater, run by the desktop launcher (play-online.command / play-online.bat) before the game starts.
//
// 1. Asks GitHub for the newest commit on the main branch (a few hundred bytes; gives up after a few seconds).
// 2. If it is newer than the installed one: downloads that commit as a .tar.gz into memory, unpacks it in
//    memory, and only then writes the changed files over the old ones (each through a temp file + rename,
//    so a half-written file never replaces a good one). Files removed upstream are deleted.
// 3. Runs `npm install` only when package.json / package-lock.json changed (or node_modules is missing).
//
// Any failure (offline, GitHub down, rate limit) just prints a note and the installed version starts.
// A git checkout (a folder with .git) is never touched: use `git pull` there.
//
// Usage:  node desktop/update.mjs                 check and update
//         node desktop/update.mjs --mark-current  record the newest commit as installed (used by setup)
// State:  .tools/update-state.json  { sha, files, installPending }
import fs from 'node:fs';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const REPO = process.env.TTT_UPDATE_REPO ?? 'williampham7/ticket-to-taitoka-dist';
const BRANCH = process.env.TTT_UPDATE_BRANCH ?? 'main';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STATE_FILE = path.join(ROOT, '.tools', 'update-state.json');
const HEADERS = { 'User-Agent': 'ticket-to-taitoka-updater' };
// Files whose change means the packages must be reinstalled.
const PACKAGE_FILES = /^(package-lock\.json|package\.json|packages\/[^/]+\/package\.json)$/;
// Never written or deleted by the updater.
const PROTECTED = /^(node_modules|\.tools|\.git|dist)(\/|$)|\/(node_modules|dist)\//;

const tty = process.stdout.isTTY;
const c = (code) => (s) => (tty ? `\x1b[${code}m${s}\x1b[0m` : s);
const bold = c(1), green = c(32), yellow = c(33), cyan = c(36), dim = c(2);
const log = (s = '') => console.log(s);
const line = '='.repeat(60);

const readState = () => {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch { return {}; }
};
const writeState = (s) => {
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(s, null, 2));
};

async function latestSha() {
  const res = await fetch(`https://api.github.com/repos/${REPO}/commits/${BRANCH}`, {
    headers: { ...HEADERS, Accept: 'application/vnd.github.sha' },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`GitHub answered ${res.status}`);
  const sha = (await res.text()).trim();
  if (!/^[0-9a-f]{40}$/.test(sha)) throw new Error('unexpected answer from GitHub');
  return sha;
}

async function whatsNew(from, to) {
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/compare/${from}...${to}`, {
      headers: HEADERS, signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return [];
    const { commits = [] } = await res.json();
    return commits.reverse().map((k) => k.commit.message.split('\n')[0].replace(/^\w+(\([^)]*\))?!?:\s*/, ''));
  } catch { return []; }
}

const bar = (frac, width = 24) => {
  const n = Math.round(Math.max(0, Math.min(1, frac)) * width);
  return '[' + '#'.repeat(n) + '-'.repeat(width - n) + ']';
};
const mb = (n) => `${(n / 1048576).toFixed(1)} MB`;
const status = (s) => (tty ? process.stdout.write(`\r\x1b[K${s}`) : undefined);
const done = (s) => (tty ? process.stdout.write(`\r\x1b[K${s}\n`) : log(s));

async function download(sha) {
  const res = await fetch(`https://codeload.github.com/${REPO}/tar.gz/${sha}`, {
    headers: HEADERS, signal: AbortSignal.timeout(180000),
  });
  if (!res.ok || !res.body) throw new Error(`download failed (${res.status})`);
  const total = Number(res.headers.get('content-length')) || 0;
  const chunks = [];
  let got = 0;
  const spin = '|/-\\';
  let tick = 0;
  for await (const chunk of res.body) {
    chunks.push(chunk);
    got += chunk.length;
    status(total
      ? `  [1/3] Downloading       ${bar(got / total)} ${mb(got)} of ${mb(total)}`
      : `  [1/3] Downloading       ${spin[tick++ % 4]} ${mb(got)}`);
  }
  done(`  [1/3] Downloading       ${bar(1)} ${mb(got)}  ${green('done')}`);
  return Buffer.concat(chunks);
}

// Minimal tar reader (ustar + pax/GNU long names), enough for GitHub's tarballs.
function untar(gz) {
  const buf = gunzipSync(gz);
  const files = new Map();
  let off = 0, longName = null;
  const str = (a, b) => buf.toString('utf8', off + a, off + b).replace(/\0.*$/s, '');
  while (off + 512 <= buf.length) {
    if (buf[off] === 0) break;
    const size = parseInt(str(124, 136).trim() || '0', 8);
    const type = String.fromCharCode(buf[off + 156] || 48);
    const mode = parseInt(str(100, 108).trim() || '644', 8);
    const prefix = str(345, 500);
    let name = longName ?? (prefix ? `${prefix}/${str(0, 100)}` : str(0, 100));
    const body = buf.subarray(off + 512, off + 512 + size);
    off += 512 + Math.ceil(size / 512) * 512;
    if (type === 'x') {
      const m = body.toString('utf8').match(/^\d+ path=(.*)$/m);
      longName = m ? m[1] : null;
      continue;
    }
    if (type === 'L') { longName = body.toString('utf8').replace(/\0.*$/s, ''); continue; }
    longName = null;
    if (type !== '0' && type !== '7') continue; // dirs, links, pax global header
    const rel = name.split('/').slice(1).join('/'); // drop "<repo>-<sha>/"
    if (rel) files.set(rel, { data: Buffer.from(body), mode: mode & 0o777 });
  }
  return files;
}

function safePath(rel) {
  const abs = path.resolve(ROOT, rel);
  if (!abs.startsWith(ROOT + path.sep) || PROTECTED.test(rel)) return null;
  return abs;
}

function apply(files, oldList) {
  const entries = [...files.entries()];
  let changed = 0, removed = 0, packagesChanged = false;
  const failed = [];
  entries.forEach(([rel, { data, mode }], i) => {
    if (i % 20 === 0) status(`  [2/3] Updating files    ${bar(i / entries.length)} ${i}/${entries.length}`);
    const dest = safePath(rel);
    if (!dest) return;
    let old = null;
    try { old = fs.readFileSync(dest); } catch {}
    if (old && old.equals(data)) return;
    if (PACKAGE_FILES.test(rel)) packagesChanged = true;
    try {
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      const tmp = `${dest}.ttt-new`;
      fs.writeFileSync(tmp, data, { mode: mode || 0o644 });
      try { fs.renameSync(tmp, dest); } catch { fs.copyFileSync(tmp, dest); fs.rmSync(tmp, { force: true }); }
      if (process.platform !== 'win32') fs.chmodSync(dest, mode || 0o644);
      changed++;
    } catch { failed.push(rel); }
  });
  for (const rel of oldList ?? []) {
    if (files.has(rel)) continue;
    const dest = safePath(rel);
    if (dest && fs.existsSync(dest)) { try { fs.rmSync(dest); removed++; } catch {} }
  }
  const what = `${changed} changed${removed ? `, ${removed} removed` : ''}`;
  done(`  [2/3] Updating files    ${bar(1)} ${entries.length}/${entries.length}  ${green('done')} ${dim(`(${what})`)}`);
  return { packagesChanged, failed };
}

function npmInstall() {
  log(`  [3/3] Installing new packages ${yellow('(this can take a minute, please wait)')}...`);
  // One command string: Windows needs a shell to run npm.cmd, and Node 24 warns when args go with shell: true.
  const r = process.platform === 'win32'
    ? spawnSync('npm install --no-audit --no-fund', { cwd: ROOT, stdio: 'inherit', shell: true })
    : spawnSync('npm', ['install', '--no-audit', '--no-fund'], { cwd: ROOT, stdio: 'inherit' });
  return r.status === 0;
}

async function main() {
  if (process.argv.includes('--mark-current')) {
    try { writeState({ sha: await latestSha(), files: [] }); } catch {}
    return;
  }
  if (fs.existsSync(path.join(ROOT, '.git'))) {
    log(dim('  Developer copy (git folder): skipping auto-update. Use "git pull" to update.'));
    return;
  }

  const state = readState();
  status('  Checking for updates...');
  let sha;
  try { sha = await latestSha(); } catch (e) {
    done(yellow(`  Could not check for updates (${e.cause?.code ?? e.message}). Starting the version you have.`));
    return;
  }

  if (sha === state.sha) {
    done(green('  You have the latest version.'));
    if (state.installPending || !fs.existsSync(path.join(ROOT, 'node_modules'))) {
      if (npmInstall()) writeState({ ...state, installPending: false });
    }
    return;
  }

  done('');
  log(cyan(line));
  log(cyan(bold('   UPDATE FOUND - installing the new version of the game')));
  log(cyan('   Please wait, do not close this window.'));
  log(cyan(line));
  const news = state.sha ? await whatsNew(state.sha, sha) : [];
  if (news.length) {
    log(bold("  What's new:"));
    news.slice(0, 8).forEach((m) => log(`    - ${m}`));
    if (news.length > 8) log(dim(`    ...and ${news.length - 8} more`));
  }
  log();

  let files;
  try { files = untar(await download(sha)); } catch (e) {
    done('');
    log(yellow(`  The update could not be downloaded (${e.cause?.code ?? e.message}).`));
    log(yellow('  Nothing was changed. Starting the version you have.'));
    return;
  }
  if (!files.has('package.json')) {
    log(yellow('  The download looks incomplete. Nothing was changed. Starting the version you have.'));
    return;
  }

  const { packagesChanged, failed } = apply(files, state.files);
  const needInstall = packagesChanged || !!state.installPending || !fs.existsSync(path.join(ROOT, 'node_modules'));
  let installOk = true;
  if (needInstall) installOk = npmInstall();
  else log(`  [3/3] Installing new packages  ${green('not needed')}`);

  writeState({ sha: failed.length ? state.sha : sha, files: [...files.keys()], installPending: !installOk });
  log();
  if (failed.length || !installOk) {
    log(yellow(line));
    if (failed.length) log(yellow(`   ${failed.length} file(s) could not be replaced (in use?). It will try again next start.`));
    if (!installOk) log(yellow('   Installing packages failed. It will try again next start.'));
    log(yellow(line));
  } else {
    log(green(line));
    log(green(bold('   UPDATE DONE - starting the game')));
    log(green(line));
  }
}

main().catch((e) => {
  log(yellow(`  Update check failed (${e.message}). Starting the version you have.`));
});
