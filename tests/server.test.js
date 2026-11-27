let serverCode = null;

// A fresh backend over empty in-memory sheets. Returns call(body) → parsed reply.
async function freshServer() {
  if (serverCode === null) serverCode = await (await fetch('../sheet-setup/apps-script-code.gs')).text();
  const g = makeFakeGoogle();
  const api = new Function('SpreadsheetApp', 'Utilities', 'LockService', 'ContentService',
    serverCode + '\nreturn { doPost };')(g.SpreadsheetApp, g.Utilities, g.LockService, g.ContentService);
  const call = body => JSON.parse(api.doPost({ postData: { contents: JSON.stringify(body) } }).getContent());
  return { call, g };
}

function withClock(ms, fn) {
  const real = Date.now;
  Date.now = () => ms;
  try { return fn(); } finally { Date.now = real; }
}

test('server: signup then signin', async () => {
  const { call } = await freshServer();
  const up = call({ action: 'signup', username: 'Seth', pin: '1234' });
  assertEqual([up.ok, up.username, typeof up.token], [true, 'Seth', 'string']);
  const inn = call({ action: 'signin', username: ' seth ', pin: '1234' });
  assertEqual([inn.ok, inn.username], [true, 'Seth']);
  assert(inn.token && inn.token !== up.token, 'a new token per sign-in');
});

test('server: validation', async () => {
  const { call } = await freshServer();
  assertEqual(call({ action: 'signup', username: 'ab', pin: '1234' }).error, 'invalid_username');
  assertEqual(call({ action: 'signup', username: 'has space', pin: '1234' }).error, 'invalid_username');
  assertEqual(call({ action: 'signup', username: 'Seth', pin: '12a4' }).error, 'invalid_pin');
  assertEqual(call({ action: 'signup', username: 'Seth', pin: '123' }).error, 'invalid_pin');
  assert(call({ action: 'signup', username: 'Seth', pin: '1234' }).ok);
  assertEqual(call({ action: 'signup', username: 'SETH', pin: '5555' }).error, 'username_taken');
  assertEqual(call({ action: 'signin', username: 'nobody', pin: '1234' }).error, 'no_such_user');
  assertEqual(call({ action: 'nonsense' }).error, 'bad_request');
  assertEqual(call(null).error, 'bad_request');
});

test('server: lockout', async () => {
  const { call } = await freshServer();
  const t0 = 1800000000000;
  withClock(t0, () => {
    call({ action: 'signup', username: 'Seth', pin: '1234' });
    for (let i = 1; i <= 5; i++) {
      assertEqual(call({ action: 'signin', username: 'Seth', pin: '0000' }).error, 'bad_credentials', `try ${i}`);
    }
    const locked = call({ action: 'signin', username: 'Seth', pin: '1234' });
    assertEqual(locked.error, 'locked');
    assertEqual(locked.lockedUntil, t0 + 15 * 60 * 1000);
  });
  withClock(t0 + 16 * 60 * 1000, () => {
    assert(call({ action: 'signin', username: 'Seth', pin: '1234' }).ok, 'unlocked after 15 minutes');
  });
});

test('server: PIN stored hashed', async () => {
  const { call, g } = await freshServer();
  call({ action: 'signup', username: 'Seth', pin: '1234' });
  g.sheets.Users.rows.forEach(r => r.forEach(cell => assert(String(cell) !== '1234', 'plain PIN in sheet')));
});

test('server: cleared PIN resets', async () => {
  const { call, g } = await freshServer();
  call({ action: 'signup', username: 'Seth', pin: '1234' });
  const rows = g.sheets.Users.rows;
  rows[1][rows[0].indexOf('pinHash')] = '';
  assert(call({ action: 'signin', username: 'Seth', pin: '9999' }).ok, 'new PIN accepted');
  assertEqual(call({ action: 'signin', username: 'Seth', pin: '1234' }).error, 'bad_credentials');
  assert(call({ action: 'signin', username: 'Seth', pin: '9999' }).ok, 'new PIN sticks');
});

test('server: save merges', async () => {
  const { call } = await freshServer();
  const { token } = call({ action: 'signup', username: 'Seth', pin: '1234' });
  const first = call({ action: 'save', username: 'Seth', token, changes: { '2027-w01d1-nt': { done: true, t: 2 } } });
  assertEqual(first.progress, { '2027-w01d1-nt': { done: true, t: 2 } });
  const second = call({ action: 'save', username: 'seth', token,
    changes: { '2027-w01d1-nt': { done: false, t: 1 }, '2027-w01d2-pr': { done: true, t: 3 }, 'w01-mv': { done: true, t: 3 }, 'bogus': { done: true, t: 1 } } });
  assertEqual(second.progress, { '2027-w01d1-nt': { done: true, t: 2 }, '2027-w01d2-pr': { done: true, t: 3 } });
  assertEqual(call({ action: 'load', username: 'Seth', token }).progress, second.progress);
});

test('server: partners are mutual', async () => {
  const { call } = await freshServer();
  const seth = call({ action: 'signup', username: 'Seth', pin: '1234' }).token;
  const anna = call({ action: 'signup', username: 'Anna', pin: '4321' }).token;
  call({ action: 'save', username: 'Anna', token: anna, changes: { '2027-w01d1-ot': { done: true, t: 5 } } });
  assert(call({ action: 'addPartner', username: 'Seth', token: seth, partner: 'anna' }).ok);
  assertEqual(call({ action: 'load', username: 'Seth', token: seth }).partners, [{ username: 'Anna', status: 'waiting' }]);
  const annaView = call({ action: 'load', username: 'Anna', token: anna });
  assertEqual([annaView.partners, annaView.requests], [[], ['Seth']]);
  assert(call({ action: 'addPartner', username: 'Anna', token: anna, partner: 'SETH ' }).ok);
  assertEqual(call({ action: 'load', username: 'Seth', token: seth }).partners,
    [{ username: 'Anna', status: 'mutual', progress: { '2027-w01d1-ot': { done: true, t: 5 } } }]);
  const annaNow = call({ action: 'load', username: 'Anna', token: anna });
  assertEqual([annaNow.partners[0].username, annaNow.partners[0].status, annaNow.requests], ['Seth', 'mutual', []]);
  assertEqual(call({ action: 'addPartner', username: 'Seth', token: seth, partner: 'nobody' }).error, 'no_such_user');
  assertEqual(call({ action: 'addPartner', username: 'Seth', token: seth, partner: 'seth' }).error, 'bad_request');
  assert(call({ action: 'removePartner', username: 'Seth', token: seth, partner: 'Anna' }).ok);
  assertEqual(call({ action: 'load', username: 'Seth', token: seth }).partners, []);
});

test('server: bad token', async () => {
  const { call } = await freshServer();
  call({ action: 'signup', username: 'Seth', pin: '1234' });
  assertEqual(call({ action: 'save', username: 'Seth', token: 'nope', changes: {} }).error, 'bad_token');
  assertEqual(call({ action: 'load', username: 'Ghost', token: 'nope' }).error, 'bad_token');
});

test('server: signout invalidates token', async () => {
  const { call } = await freshServer();
  const a = call({ action: 'signup', username: 'Seth', pin: '1234' }).token;
  const b = call({ action: 'signin', username: 'Seth', pin: '1234' }).token;
  assert(call({ action: 'signout', username: 'Seth', token: a }).ok);
  assertEqual(call({ action: 'load', username: 'Seth', token: a }).error, 'bad_token');
  assert(call({ action: 'load', username: 'Seth', token: b }).ok, 'other phone stays signed in');
});

test('server: older year-less checkmarks are kept as 2027', async () => {
  const { call } = await freshServer();
  const { token } = call({ action: 'signup', username: 'Seth', pin: '1234' });
  const res = call({ action: 'save', username: 'Seth', token, changes: { 'w01d1-nt': { done: true, t: 5 } } });
  assertEqual(res.progress, { '2027-w01d1-nt': { done: true, t: 5 } });
});

test('server: each year is stored in its own row', async () => {
  const { call, g } = await freshServer();
  const { token } = call({ action: 'signup', username: 'Seth', pin: '1234' });
  call({ action: 'save', username: 'Seth', token, changes: { '2027-w01d1-nt': { done: true, t: 5 }, '2028-w01d1-nt': { done: true, t: 6 } } });
  const keys = g.sheets.Progress.rows.slice(1).map(r => r[0]).sort();
  assertEqual(keys, ['seth:2027', 'seth:2028']);
  assertEqual(call({ action: 'load', username: 'Seth', token }).progress,
    { '2027-w01d1-nt': { done: true, t: 5 }, '2028-w01d1-nt': { done: true, t: 6 } });
});

test('server: a progress row from before years existed loads as 2027', async () => {
  const { call, g } = await freshServer();
  const { token } = call({ action: 'signup', username: 'Seth', pin: '1234' });
  call({ action: 'load', username: 'Seth', token }); // creates the Progress tab
  g.sheets.Progress.rows.push(['seth', 'w01d1-nt=1.' + (5).toString(36), '1']);
  assertEqual(call({ action: 'load', username: 'Seth', token }).progress, { '2027-w01d1-nt': { done: true, t: 5 } });
});

test('server: a tie resolves to done, in either order', async () => {
  const { call } = await freshServer();
  const { token } = call({ action: 'signup', username: 'Seth', pin: '1234' });
  call({ action: 'save', username: 'Seth', token, changes: { '2027-w01d1-nt': { done: true, t: 5 } } });
  assertEqual(call({ action: 'save', username: 'Seth', token, changes: { '2027-w01d1-nt': { done: false, t: 5 } } }).progress['2027-w01d1-nt'].done, true);
  call({ action: 'save', username: 'Seth', token, changes: { '2027-w01d1-ot': { done: false, t: 7 } } });
  assertEqual(call({ action: 'save', username: 'Seth', token, changes: { '2027-w01d1-ot': { done: true, t: 7 } } }).progress['2027-w01d1-ot'].done, true);
});

test('server: resetting a PIN signs every phone out', async () => {
  const { call, g } = await freshServer();
  const old = call({ action: 'signup', username: 'Seth', pin: '1234' }).token;
  const rows = g.sheets.Users.rows;
  rows[1][rows[0].indexOf('pinHash')] = '';
  const fresh = call({ action: 'signin', username: 'Seth', pin: '9999' }).token;
  assertEqual(call({ action: 'load', username: 'Seth', token: old }).error, 'bad_token');
  assert(call({ action: 'load', username: 'Seth', token: fresh }).ok, 'the new sign-in works');
});

test('server: a re-used username starts with no checkmarks', async () => {
  const { call, g } = await freshServer();
  const { token } = call({ action: 'signup', username: 'Test1', pin: '1234' });
  call({ action: 'save', username: 'Test1', token, changes: { '2027-w01d1-nt': { done: true, t: 5 } } });
  g.sheets.Users.rows.splice(1, 1); // Seth deletes the test user's row but forgets the Progress row
  const again = call({ action: 'signup', username: 'test1', pin: '5555' });
  assertEqual(call({ action: 'load', username: 'test1', token: again.token }).progress, {});
});

test('server: a lock timeout is "busy", any other failure is "server_error"', async () => {
  const { call, g } = await freshServer();
  call({ action: 'signup', username: 'Seth', pin: '1234' });
  const realLock = g.LockService.getScriptLock;
  g.LockService.getScriptLock = () => ({ waitLock() { throw new Error('Lock timeout'); }, releaseLock() {} });
  assertEqual(call({ action: 'signin', username: 'Seth', pin: '1234' }).error, 'busy');
  g.LockService.getScriptLock = realLock;
  const realConsole = console.error; console.error = () => {};
  g.sheets.Users.getDataRange = () => { throw new Error('boom'); };
  try {
    assertEqual(call({ action: 'signin', username: 'Seth', pin: '1234' }).error, 'server_error');
  } finally { console.error = realConsole; }
});
