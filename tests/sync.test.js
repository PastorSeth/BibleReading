// Runs async fn against empty storage, a test endpoint and a fake server, then restores everything.
async function withFakeServer(handler, fn) {
  const saved = {};
  Object.keys(localStorage).filter(k => k.startsWith('br27.')).forEach(k => {
    saved[k] = localStorage.getItem(k);
    localStorage.removeItem(k);
  });
  const endpoint = SYNC_ENDPOINT;
  SYNC_ENDPOINT = 'https://example.test/exec';
  const calls = [];
  setFetch(async (url, opts) => {
    const body = JSON.parse(opts.body);
    calls.push({ url, body, headers: opts.headers });
    return handler(body);
  });
  try {
    return await fn(calls);
  } finally {
    setFetch(null);
    SYNC_ENDPOINT = endpoint;
    Object.keys(localStorage).filter(k => k.startsWith('br27.')).forEach(k => localStorage.removeItem(k));
    Object.keys(saved).forEach(k => localStorage.setItem(k, saved[k]));
  }
}

const reply = (obj, status = 200) => ({ ok: status < 400, status, text: async () => JSON.stringify(obj) });

// A tiny pretend server that echoes saves and knows one partner.
function happyServer(extraProgress = {}) {
  let stored = Object.assign({}, extraProgress);
  return body => {
    if (body.action === 'signup' || body.action === 'signin') return reply({ ok: true, username: 'Seth', token: 'tok' });
    if (body.action === 'save') { stored = mergeProgress(stored, body.changes); return reply({ ok: true, progress: stored }); }
    if (body.action === 'load') return reply({ ok: true, progress: stored, partners: [{ username: 'Anna', status: 'mutual', progress: {} }], requests: [] });
    return reply({ ok: true });
  };
}

test('sync: html error page', () => withFakeServer(
  async () => ({ ok: true, status: 200, text: async () => '<html>Error</html>' }),
  async () => {
    assertEqual(await api('load', {}), { ok: false, error: 'network' });
    saveAccount({ username: 'Seth', token: 'tok' });
    setDone('2027-w01d1-nt', true, 10);
    await syncNow();
    assertEqual(getPending(), { '2027-w01d1-nt': { done: true, t: 10 } });
    assertEqual(getSyncState().status, 'offline');
    assertEqual(getAccount(), { username: 'Seth', token: 'tok' });
  }));

test('sync: network down', () => withFakeServer(
  async () => { throw new TypeError('Failed to fetch'); },
  async () => {
    assertEqual(await api('load', {}), { ok: false, error: 'network' });
    saveAccount({ username: 'Seth', token: 'tok' });
    setDone('2027-w01d1-nt', true, 10);
    await syncNow();
    assertEqual(Object.keys(getPending()), ['2027-w01d1-nt']);
    assertEqual(getSyncState().status, 'offline');
  }));

test('sync: sends text/plain POSTs', () => withFakeServer(happyServer(), async calls => {
  await api('load', { username: 'Seth', token: 'tok' });
  assertEqual(calls[0].url, 'https://example.test/exec');
  assertEqual(calls[0].headers['Content-Type'], 'text/plain;charset=utf-8');
  assertEqual(calls[0].body, { action: 'load', username: 'Seth', token: 'tok' });
}));

test('sync: successful save clears pending and merges server progress', () => withFakeServer(
  happyServer({ '2027-w01d2-ot': { done: true, t: 5 } }),
  async () => {
    saveAccount({ username: 'Seth', token: 'tok' });
    setDone('2027-w01d1-nt', true, 10);
    await syncNow();
    assertEqual(getProgress(), { '2027-w01d1-nt': { done: true, t: 10 }, '2027-w01d2-ot': { done: true, t: 5 } });
    assertEqual(getPending(), {});
    const state = getSyncState();
    assertEqual(state.status, 'synced');
    assertEqual(state.partners.map(p => p.username), ['Anna']);
  }));

test('sync: bad token', () => withFakeServer(
  async () => reply({ ok: false, error: 'bad_token' }),
  async () => {
    saveAccount({ username: 'Seth', token: 'old' });
    setDone('2027-w01d1-nt', true, 10);
    await syncNow();
    assertEqual(getAccount(), null);
    assertEqual(getProgress(), { '2027-w01d1-nt': { done: true, t: 10 } });
    assertEqual(getSyncState().status, 'signed-out-expired');
  }));

test('sync: sign-up uploads existing checkmarks', () => withFakeServer(happyServer(), async calls => {
  setDone('2027-w01d1-nt', true, 10);
  setDone('2027-w01d1-ot', true, 11);
  clearPending(getPending()); // even checkmarks no longer queued are uploaded
  const res = await signUp('Seth', '1234');
  assert(res.ok);
  assertEqual(getAccount(), { username: 'Seth', token: 'tok' });
  const save = calls.find(c => c.body.action === 'save');
  assert(save, 'no save was sent');
  assertEqual(Object.keys(save.body.changes).sort(), ['2027-w01d1-nt', '2027-w01d1-ot']);
}));

test('sync: failed sign-in saves no account', () => withFakeServer(
  async () => reply({ ok: false, error: 'bad_credentials' }),
  async () => {
    const res = await signIn('Seth', '0000');
    assertEqual(res.error, 'bad_credentials');
    assertEqual(getAccount(), null);
  }));

test('sync: sign out resets the phone', () => withFakeServer(happyServer(), async calls => {
  saveAccount({ username: 'Seth', token: 'tok' });
  setDone('2027-w01d1-nt', true, 10);
  await signOut();
  assertEqual(calls[0].body.action, 'signout');
  assertEqual([getAccount(), getProgress()], [null, {}]);
  assertEqual(getSyncState().status, 'off');
}));

test('sync: off when no endpoint', async () => {
  const endpoint = SYNC_ENDPOINT;
  SYNC_ENDPOINT = '';
  try {
    assertEqual(syncEnabled(), false);
    assertEqual((await syncNow()).status, 'off');
  } finally {
    SYNC_ENDPOINT = endpoint;
  }
});

test('sync: a failed load after a good save shows synced, not stuck pending', () => withFakeServer(
  async body => (body.action === 'save' ? reply({ ok: true, progress: body.changes }) : { ok: true, status: 200, text: async () => '<html>' }),
  async () => {
    saveAccount({ username: 'Seth', token: 'tok' });
    setDone('2027-w01d1-nt', true, 10);
    setSyncState({ status: 'pending' });
    await syncNow();
    assertEqual(getPending(), {});
    assertEqual(getSyncState().status, 'synced');
  }));

test('sync: a request that never answers times out as "network"', async () => {
  const saved = API_TIMEOUT_MS;
  API_TIMEOUT_MS = 50;
  try {
    await withFakeServer(() => new Promise(() => {}), async () => {
      assertEqual(await api('load', {}), { ok: false, error: 'network' });
    });
  } finally { API_TIMEOUT_MS = saved; }
});

test('sync: listeners only hear real changes', () => {
  let n = 0;
  onSyncChange(() => { n++; });
  const before = getSyncState();
  setSyncState({ status: before.status, partners: before.partners, requests: before.requests });
  assertEqual(n, 0);
});

test('sync: loading is on while the server is asked, and off after, even when it fails', async () => {
  let answer;
  const server = happyServer();
  await withFakeServer(body => (body.action === 'load' ? new Promise(r => { answer = () => r(server(body)); }) : server(body)), async () => {
    saveAccount({ username: 'Seth', token: 'tok' });
    const run = syncNow();
    await new Promise(r => setTimeout(r, 0));
    assertEqual(getSyncState().loading, true);
    answer();
    await run;
    assertEqual(getSyncState().loading, false);
    assertEqual(getSyncState().partners.map(p => p.username), ['Anna']);
  });
  await withFakeServer(async () => { throw new Error('offline'); }, async () => {
    saveAccount({ username: 'Seth', token: 'tok' });
    await syncNow();
    assertEqual(getSyncState().loading, false);
  });
});
