/* ============================================================
   SYNC — the optional link between this phone and the Google
   Sheet. Checkmarks are always saved on the phone first (store.js);
   this sends them to the sheet when it can, and brings back the
   person's own progress from other phones plus their reading
   partners' checkmarks. If the sheet can't be reached, nothing
   is lost: changes wait and go out next time.
   ============================================================ */

let fetchImpl = null;
let API_TIMEOUT_MS = 20000; // give up on a request after 20 seconds
let syncState = { status: 'off', partners: [], requests: [] };
const syncListeners = [];
let syncInFlight = null;
let syncTimer = null;

function setFetch(fn) {
  fetchImpl = fn;
}

function syncEnabled() {
  return SYNC_ENDPOINT !== '';
}

function getSyncState() {
  return syncState;
}

function onSyncChange(fn) {
  syncListeners.push(fn);
}

function setSyncState(patch) {
  const next = Object.assign({}, syncState, patch);
  if (JSON.stringify(next) === JSON.stringify(syncState)) return; // nothing changed
  syncState = next;
  syncListeners.forEach(fn => fn(syncState));
}

function hasPending() {
  return Object.keys(getPending()).length > 0;
}

// Never rejects: anything other than a JSON reply counts as "couldn't reach the server".
async function api(action, fields) {
  try {
    const doFetch = fetchImpl || ((url, opts) => window.fetch(url, opts));
    const controller = new AbortController();
    let timer;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => { controller.abort(); reject(new Error('timeout')); }, API_TIMEOUT_MS);
    });
    const res = await Promise.race([doFetch(SYNC_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(Object.assign({ action }, fields)),
      signal: controller.signal,
    }), timeout]).finally(() => clearTimeout(timer));
    if (!res.ok) return { ok: false, error: 'network' };
    const data = JSON.parse(await res.text());
    return data && typeof data === 'object' ? data : { ok: false, error: 'network' };
  } catch (err) {
    return { ok: false, error: 'network' };
  }
}

function handleSyncError(res) {
  if (res.error === 'bad_token') {
    clearAccount();
    setSyncState({ status: 'signed-out-expired', partners: [], requests: [] });
  } else {
    setSyncState({ status: hasPending() ? 'offline' : 'synced' });
  }
  return syncState;
}

async function runSync(uploadAll) {
  const account = getAccount();
  if (!syncEnabled() || !account) {
    if (syncState.status !== 'signed-out-expired') setSyncState({ status: 'off', partners: [], requests: [] });
    return syncState;
  }
  const auth = { username: account.username, token: account.token };
  // If the person signed out (or in as someone else) while we waited, drop this result.
  const stillSameAccount = () => { const a = getAccount(); return !!a && a.token === auth.token; };

  const changes = uploadAll ? getProgress() : getPending();
  if (Object.keys(changes).length) {
    const saved = await api('save', Object.assign({ changes }, auth));
    if (!stillSameAccount()) return syncState;
    if (!saved.ok) return handleSyncError(saved);
    replaceProgress(mergeProgress(getProgress(), saved.progress || {}));
    clearPending(changes);
  }

  const loaded = await api('load', auth);
  if (!stillSameAccount()) return syncState;
  if (!loaded.ok) return handleSyncError(loaded);
  replaceProgress(mergeProgress(getProgress(), loaded.progress || {}));
  setSyncState({
    status: hasPending() ? 'pending' : 'synced',
    partners: loaded.partners || [],
    requests: loaded.requests || [],
  });
  return syncState;
}

// One sync at a time; a request made while one is running waits for it, then runs.
async function syncNow({ uploadAll = false } = {}) {
  while (syncInFlight) await syncInFlight;
  syncInFlight = runSync(uploadAll);
  try {
    return await syncInFlight;
  } finally {
    syncInFlight = null;
  }
}

function scheduleSync() {
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => { syncNow(); }, 1500);
}

// Called after a checkmark changes on this phone.
function noteLocalChange() {
  if (syncEnabled() && getAccount()) {
    setSyncState({ status: 'pending' });
    scheduleSync();
  }
}

async function signInOrUp(action, username, pin) {
  const res = await api(action, { username, pin });
  if (res.ok) {
    saveAccount({ username: res.username, token: res.token });
    await syncNow({ uploadAll: true });
  }
  return res;
}

function signUp(username, pin) {
  return signInOrUp('signup', username, pin);
}

function signIn(username, pin) {
  return signInOrUp('signin', username, pin);
}

async function signOut() {
  clearTimeout(syncTimer);
  while (syncInFlight) await syncInFlight; // let a running sync finish first
  const account = getAccount();
  if (account) await api('signout', { username: account.username, token: account.token });
  resetLocal();
  setSyncState({ status: 'off', partners: [], requests: [] });
}

async function partnerAction(action, name) {
  const account = getAccount();
  if (!account) return { ok: false, error: 'bad_token' };
  const res = await api(action, { username: account.username, token: account.token, partner: name });
  if (res.error === 'bad_token') handleSyncError(res);
  if (res.ok) await syncNow();
  return res;
}

function addPartner(name) {
  return partnerAction('addPartner', name);
}

function removePartner(name) {
  return partnerAction('removePartner', name);
}
