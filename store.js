/* ============================================================
   LOCAL PROGRESS — checkmarks, settings and the optional account,
   all kept in this phone's localStorage. Every checkmark is saved
   here first; syncing to the Google Sheet happens afterwards.

   Progress = { itemId: { done: true|false, t: time-in-ms } }
   When two copies disagree, the newer change wins; a tie counts
   as done.
   ============================================================ */

const KEYS = {
  progress: 'br27.progress',
  pending: 'br27.pending',
  account: 'br27.account',
  settings: 'br27.settings',
};

const DEFAULT_SETTINGS = { showLinks: true };

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch (err) {
    return fallback;
  }
}

function writeJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function mergeProgress(a, b) {
  const out = Object.assign({}, a);
  Object.keys(b || {}).forEach(id => {
    const mine = out[id], theirs = b[id];
    if (!mine || theirs.t > mine.t || (theirs.t === mine.t && theirs.done)) out[id] = theirs;
  });
  return out;
}

// Checkmarks saved before years existed ("w01d1-nt") belong to 2027.
function withYears(p) {
  const out = {};
  Object.keys(p).forEach(id => {
    const full = /^w\d\dd[1-5]-/.test(id) ? `2027-${id}` : id;
    out[full] = out[full] ? mergeProgress({ x: out[full] }, { x: p[id] }).x : p[id];
  });
  return out;
}

function readProgressKey(key) {
  const p = readJSON(key, {});
  if (!isPlainObject(p)) return {};
  const fixed = withYears(p);
  if (Object.keys(fixed).some(id => !(id in p))) writeJSON(key, fixed);
  return fixed;
}

function getProgress() {
  return readProgressKey(KEYS.progress);
}

function replaceProgress(p) {
  writeJSON(KEYS.progress, p);
}

function getPending() {
  return readProgressKey(KEYS.pending);
}

function setDone(id, done, now = Date.now()) {
  const entry = { done, t: now };
  const progress = getProgress();
  progress[id] = entry;
  replaceProgress(progress);
  const pending = getPending();
  pending[id] = entry;
  writeJSON(KEYS.pending, pending);
  return progress;
}

// Drop the pending changes the server has now seen (anything newer stays queued).
function clearPending(sent) {
  const pending = getPending();
  Object.keys(sent || {}).forEach(id => {
    if (pending[id] && pending[id].t <= sent[id].t) delete pending[id];
  });
  writeJSON(KEYS.pending, pending);
}

// Only known settings come back; anything older (like a translation choice) is ignored.
function getSettings() {
  const s = readJSON(KEYS.settings, {});
  const stored = isPlainObject(s) ? s : {};
  return { showLinks: typeof stored.showLinks === 'boolean' ? stored.showLinks : DEFAULT_SETTINGS.showLinks };
}

function saveSettings(partial) {
  writeJSON(KEYS.settings, Object.assign(getSettings(), partial));
}

function getAccount() {
  const a = readJSON(KEYS.account, null);
  return isPlainObject(a) && typeof a.username === 'string' && typeof a.token === 'string' ? a : null;
}

function saveAccount(a) {
  writeJSON(KEYS.account, { username: a.username, token: a.token });
}

function clearAccount() {
  localStorage.removeItem(KEYS.account);
}

// Back to a fresh, no-account phone. Settings (show online links) stay.
function resetLocal() {
  [KEYS.progress, KEYS.pending, KEYS.account].forEach(k => localStorage.removeItem(k));
}

function isDone(progress, id) {
  return !!(progress[id] && progress[id].done);
}

function catchUpIds(progress, today) {
  return allItemIdsBefore(today).filter(id => !isDone(progress, id));
}

function weekDoneCount(progress, year, week) {
  return weekItemIds(year, week).filter(id => isDone(progress, id)).length;
}
