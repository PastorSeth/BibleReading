/* ============================================================
   BIBLE READING 2027 — account and sync script
   ------------------------------------------------------------
   This runs inside Google Sheets (Apps Script), NOT on the
   website. See README.md ("Turning on accounts") for setup.

   The website sends every request here as a POST. This script
   keeps two tabs in the spreadsheet:

   - Users: one row per account. PINs are never stored as typed —
     only a scrambled (salted SHA-256) version.
   - Progress: one row per account with that person's checkmarks.

   To reset someone's forgotten PIN: in the Users tab, clear the
   cell in the "pinHash" column on their row. The next time they
   sign in, the PIN they type becomes their new PIN.

   After pasting in a new version of this file, re-deploy with
   Deploy -> Manage deployments -> pencil icon -> Version:
   "New version" -> Deploy, so the web app URL stays the same.
   ============================================================ */

const USER_HEADERS = ['key', 'username', 'pinHash', 'salt', 'tokens', 'partners',
  'failedTries', 'lockedUntil', 'created', 'lastSeen'];
const PROGRESS_HEADERS = ['key', 'progress', 'updated'];
const MAX_TRIES = 5;
const LOCK_MS = 15 * 60 * 1000;
const MAX_TOKENS = 10;
const ITEM_ID = /^(\d{4})-(w\d\dd[1-5]-(nt|ot|ps|pr))$/;
const OLD_ITEM_ID = /^w\d\dd[1-5]-(nt|ot|ps|pr)$/; // before years existed: these are 2027

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (err) {
    return respond(fail('busy')); // too many people saving at once; the app retries
  }
  let result;
  try {
    let body = null;
    try { body = JSON.parse(e.postData.contents); } catch (err) { body = null; }
    result = handle(body);
  } catch (err) {
    console.error(err); // shows up under Executions in the Apps Script editor
    result = fail('server_error');
  } finally {
    try { lock.releaseLock(); } catch (err) { /* already released */ }
  }
  return respond(result);
}

function respond(result) {
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

const ACTIONS = {
  signup: signup,
  signin: signin,
  save: withAuth(save),
  load: withAuth(load),
  addPartner: withAuth(addPartner),
  removePartner: withAuth(removePartner),
  signout: withAuth(signout),
};

function handle(body) {
  if (!body || typeof body !== 'object' || !Object.prototype.hasOwnProperty.call(ACTIONS, body.action)) {
    return fail('bad_request');
  }
  return ACTIONS[body.action](body);
}

function fail(error, extra) {
  return Object.assign({ ok: false, error: error }, extra || {});
}

/* ---------- Usernames, PINs and tokens ---------- */

function cleanUsername(name) {
  const n = String(name === undefined || name === null ? '' : name).trim();
  return /^[A-Za-z0-9_]{3,20}$/.test(n) ? n : null;
}

function validPin(pin) {
  const p = String(pin === undefined || pin === null ? '' : pin);
  return /^\d{4,8}$/.test(p) ? p : null;
}

function hashPin(salt, pin) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt + ':' + pin);
  return bytes.map(function (b) { return ((b & 0xff) + 0x100).toString(16).slice(1); }).join('');
}

function splitList(value) {
  return String(value || '').split(',').map(function (s) { return s.trim(); }).filter(String);
}

function issueToken(user) {
  const token = Utilities.getUuid();
  user.tokens = splitList(user.tokens).concat(token).slice(-MAX_TOKENS).join(',');
  user.lastSeen = Date.now();
  return token;
}

/* ---------- Sheet access ---------- */

function tab(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  if (sheet.getLastRow() === 0) {
    // Plain-text cells, so usernames like "007" aren't turned into numbers.
    sheet.getRange('A:Z').setNumberFormat('@');
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function readRows(name, headers) {
  const values = tab(name, headers).getDataRange().getValues();
  return values.slice(1).map(function (line, i) {
    const row = { _row: i + 2 };
    headers.forEach(function (h, c) { row[h] = line[c] === undefined || line[c] === null ? '' : String(line[c]); });
    return row;
  });
}

function writeRow(name, headers, row) {
  const values = [headers.map(function (h) { return row[h] === undefined ? '' : String(row[h]); })];
  const sheet = tab(name, headers);
  if (row._row) sheet.getRange(row._row, 1, 1, headers.length).setValues(values);
  else sheet.appendRow(values[0]);
}

function findUser(key, users) {
  return (users || readRows('Users', USER_HEADERS)).filter(function (u) { return u.key === key; })[0] || null;
}

/* ---------- Progress: one row per person per year ("seth:2028"), stored
   compactly as "w01d1-nt=1.<time in base 36>,…". A row keyed just "seth"
   is from before years existed and counts as 2027. ---------- */

function encodeProgress(progress) {
  return Object.keys(progress).map(function (id) {
    return id + '=' + (progress[id].done ? 1 : 0) + '.' + progress[id].t.toString(36);
  }).join(',');
}

function decodeProgress(text, year) {
  const out = {};
  splitList(text).forEach(function (part) {
    const m = part.match(/^([^=]+)=([01])\.([0-9a-z]+)$/);
    if (m) out[year + '-' + m[1]] = { done: m[2] === '1', t: parseInt(m[3], 36) };
  });
  return out;
}

function rowYear(row, userKey) {
  if (row.key === userKey) return '2027';
  return row.key.indexOf(userKey + ':') === 0 ? row.key.slice(userKey.length + 1) : null;
}

function readProgress(userKey, rows) {
  let out = {};
  (rows || readRows('Progress', PROGRESS_HEADERS)).forEach(function (r) {
    const year = rowYear(r, userKey);
    if (year) out = mergeProgress(out, decodeProgress(r.progress, year));
  });
  return out;
}

function mergeProgress(a, b) {
  const out = Object.assign({}, a);
  Object.keys(b).forEach(function (id) {
    const mine = out[id], theirs = b[id];
    if (!mine || theirs.t > mine.t || (theirs.t === mine.t && theirs.done)) out[id] = theirs;
  });
  return out;
}

function cleanChanges(changes) {
  const out = {};
  if (!changes || typeof changes !== 'object') return out;
  Object.keys(changes).forEach(function (id) {
    const c = changes[id];
    const full = OLD_ITEM_ID.test(id) ? '2027-' + id : id;
    if (ITEM_ID.test(full) && c && typeof c.done === 'boolean' && typeof c.t === 'number' && isFinite(c.t) && c.t >= 0) {
      out[full] = { done: c.done, t: Math.floor(c.t) };
    }
  });
  return out;
}

/* ---------- Actions ---------- */

function signup(body) {
  const username = cleanUsername(body.username);
  if (!username) return fail('invalid_username');
  const pin = validPin(body.pin);
  if (!pin) return fail('invalid_pin');
  const key = username.toLowerCase();
  if (findUser(key)) return fail('username_taken');
  const salt = Utilities.getUuid();
  const user = { key: key, username: username, pinHash: hashPin(salt, pin), salt: salt, tokens: '',
    partners: '', failedTries: 0, lockedUntil: 0, created: Date.now() };
  const token = issueToken(user);
  writeRow('Users', USER_HEADERS, user);
  // A username can be re-used after Seth deletes an account; never inherit old checkmarks.
  readRows('Progress', PROGRESS_HEADERS).forEach(function (r) {
    if (rowYear(r, key)) writeRow('Progress', PROGRESS_HEADERS, { _row: r._row, key: r.key, progress: '', updated: Date.now() });
  });
  return { ok: true, username: username, token: token };
}

function signin(body) {
  const username = cleanUsername(body.username);
  if (!username) return fail('invalid_username');
  const user = findUser(username.toLowerCase());
  if (!user) return fail('no_such_user');
  const now = Date.now();
  if (Number(user.lockedUntil) > now) return fail('locked', { lockedUntil: Number(user.lockedUntil) });
  const pin = validPin(body.pin);
  if (!pin) return fail('invalid_pin');

  if (!user.pinHash) {
    // Seth cleared this PIN: the PIN typed now becomes the new one, and every
    // phone that was signed in before is signed out.
    user.salt = Utilities.getUuid();
    user.pinHash = hashPin(user.salt, pin);
    user.tokens = '';
  } else if (hashPin(user.salt, pin) !== user.pinHash) {
    const tries = (Number(user.failedTries) || 0) + 1;
    user.failedTries = tries >= MAX_TRIES ? 0 : tries;
    user.lockedUntil = tries >= MAX_TRIES ? now + LOCK_MS : 0;
    writeRow('Users', USER_HEADERS, user);
    return fail('bad_credentials');
  }
  user.failedTries = 0;
  user.lockedUntil = 0;
  const token = issueToken(user);
  writeRow('Users', USER_HEADERS, user);
  return { ok: true, username: user.username, token: token };
}

function withAuth(action) {
  return function (body) {
    const username = cleanUsername(body.username);
    const users = readRows('Users', USER_HEADERS);
    const user = username ? findUser(username.toLowerCase(), users) : null;
    if (!user || splitList(user.tokens).indexOf(String(body.token)) === -1) return fail('bad_token');
    return action(body, user, users);
  };
}

function save(body, user) {
  const changes = cleanChanges(body.changes);
  let rows = readRows('Progress', PROGRESS_HEADERS);
  const legacy = rows.filter(function (r) { return r.key === user.key && r.progress; })[0];
  const years = {};
  Object.keys(changes).forEach(function (id) { years[ITEM_ID.exec(id)[1]] = true; });
  if (legacy) years['2027'] = true; // move a pre-years row into the 2027 row
  Object.keys(years).forEach(function (year) {
    const rowKey = user.key + ':' + year;
    const existing = rows.filter(function (r) { return r.key === rowKey; })[0];
    let merged = existing ? decodeProgress(existing.progress, year) : {};
    if (year === '2027' && legacy) merged = mergeProgress(merged, decodeProgress(legacy.progress, '2027'));
    Object.keys(changes).forEach(function (id) {
      if (id.indexOf(year + '-') === 0) merged = mergeProgress(merged, { [id]: changes[id] });
    });
    const compact = {};
    Object.keys(merged).forEach(function (id) { compact[id.slice(year.length + 1)] = merged[id]; });
    writeRow('Progress', PROGRESS_HEADERS, {
      _row: existing ? existing._row : 0, key: rowKey, progress: encodeProgress(compact), updated: Date.now(),
    });
    rows = readRows('Progress', PROGRESS_HEADERS);
  });
  if (legacy) writeRow('Progress', PROGRESS_HEADERS, { _row: legacy._row, key: legacy.key, progress: '', updated: Date.now() });
  return { ok: true, progress: readProgress(user.key) };
}

function load(body, user, users) {
  const progressRows = readRows('Progress', PROGRESS_HEADERS);
  const mine = splitList(user.partners);
  const partners = [];
  mine.forEach(function (key) {
    const other = findUser(key, users);
    if (!other) return;
    if (splitList(other.partners).indexOf(user.key) !== -1) {
      partners.push({ username: other.username, status: 'mutual', progress: readProgress(other.key, progressRows) });
    } else {
      partners.push({ username: other.username, status: 'waiting' });
    }
  });
  const requests = users.filter(function (u) {
    return u.key !== user.key && splitList(u.partners).indexOf(user.key) !== -1 && mine.indexOf(u.key) === -1;
  }).map(function (u) { return u.username; });
  return { ok: true, progress: readProgress(user.key, progressRows), partners: partners, requests: requests };
}

function addPartner(body, user, users) {
  const name = cleanUsername(body.partner);
  if (!name) return fail('no_such_user');
  const key = name.toLowerCase();
  if (key === user.key) return fail('bad_request');
  if (!findUser(key, users)) return fail('no_such_user');
  const list = splitList(user.partners);
  if (list.indexOf(key) === -1) list.push(key);
  user.partners = list.join(',');
  writeRow('Users', USER_HEADERS, user);
  return { ok: true };
}

function removePartner(body, user) {
  const name = cleanUsername(body.partner);
  const key = name ? name.toLowerCase() : '';
  user.partners = splitList(user.partners).filter(function (k) { return k !== key; }).join(',');
  writeRow('Users', USER_HEADERS, user);
  return { ok: true };
}

function signout(body, user) {
  user.tokens = splitList(user.tokens).filter(function (t) { return t !== String(body.token); }).join(',');
  writeRow('Users', USER_HEADERS, user);
  return { ok: true };
}
