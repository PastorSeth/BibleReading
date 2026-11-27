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

const DEFAULT_SETTINGS = { showLinks: true, hideBehind: false, ntOnly: false };

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

// Mark many readings at once (one write, not hundreds) and queue them to sync.
function setManyDone(ids, done, now = Date.now()) {
  const progress = getProgress(), pending = getPending();
  ids.forEach(id => { progress[id] = pending[id] = { done, t: now }; });
  replaceProgress(progress);
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
  const out = {};
  Object.keys(DEFAULT_SETTINGS).forEach(k => { out[k] = typeof stored[k] === 'boolean' ? stored[k] : DEFAULT_SETTINGS[k]; });
  return out;
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

// tracks: null for the whole plan, or a list like ['nt'] ("New Testament only").
function inTracks(id, tracks) {
  return !tracks || tracks.includes(id.slice(-2));
}

function catchUpIds(progress, today, tracks = null) {
  return allItemIdsBefore(today).filter(id => inTracks(id, tracks) && !isDone(progress, id));
}

// How many plan days before today still have an unread passage (a "reading" = one day's set).
function catchUpDays(progress, today, tracks = null) {
  return new Set(catchUpIds(progress, today, tracks).map(id => id.replace(/-(nt|ot|ps|pr)$/, ''))).size;
}

// Days in a week with every passage read (a "reading" = one day's set).
function weekDaysDone(progress, year, week, tracks = null) {
  let n = 0;
  for (let d = 1; d <= 5; d++) {
    if (readingsFor(year, week, d).filter(r => inTracks(r.id, tracks)).every(r => isDone(progress, r.id))) n++;
  }
  return n;
}
