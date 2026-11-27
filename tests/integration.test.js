// The phone code (sync.js) talking to the real Apps Script code through the in-memory fake Google.
const phoneKeys = () => Object.keys(localStorage).filter(k => k.startsWith('br27.'));
const snapshotPhone = () => Object.fromEntries(phoneKeys().map(k => [k, localStorage.getItem(k)]));
function usePhone(snap) {
  phoneKeys().forEach(k => localStorage.removeItem(k));
  Object.entries(snap).forEach(([k, v]) => localStorage.setItem(k, v));
}

async function withRealServer(fn) {
  const { call, g } = await freshServer();
  return withFakeServer(body => reply(call(body)), calls => fn({ call, g, calls }));
}

test('integration: signing out during a sync leaves an empty phone', () => withRealServer(async () => {
  await signUp('Seth', '1234');
  setDone('2027-w01d1-nt', true, 10);
  const inFlight = syncNow();
  await signOut();
  await inFlight;
  assertEqual(getAccount(), null);
  assertEqual(getProgress(), {});
  assertEqual(getSyncState().status, 'off');
}));

test('integration: a PIN reset signs other phones out but keeps their checkmarks', () => withRealServer(async ({ call, g }) => {
  await signUp('Seth', '1234');
  setDone('2027-w01d1-nt', true, 10);
  await syncNow();
  const rows = g.sheets.Users.rows;
  rows[1][rows[0].indexOf('pinHash')] = '';
  call({ action: 'signin', username: 'Seth', pin: '9999' });
  await syncNow();
  assertEqual(getSyncState().status, 'signed-out-expired');
  assertEqual(getAccount(), null);
  assertEqual(getProgress()['2027-w01d1-nt'].done, true);
}));

test('integration: two phones converge on the newest change', () => withRealServer(async () => {
  await signUp('Seth', '1234');
  setDone('2027-w01d1-nt', true, 100);
  await syncNow();
  const phoneA = snapshotPhone();

  usePhone({});
  await signIn('Seth', '1234');
  assertEqual(getProgress()['2027-w01d1-nt'].done, true, 'phone B gets phone A\'s tick');
  setDone('2027-w01d1-nt', false, 200); // B unticks while offline...
  const phoneB = snapshotPhone();

  usePhone(phoneA);
  setDone('2027-w01d1-ot', true, 300); // ...while A ticks something else
  await syncNow();
  const phoneA2 = snapshotPhone();

  usePhone(phoneB);
  await syncNow(); // B comes back online
  assertEqual(getProgress()['2027-w01d1-nt'].done, false);
  assertEqual(getProgress()['2027-w01d1-ot'].done, true);

  usePhone(phoneA2);
  await syncNow();
  assertEqual(getProgress()['2027-w01d1-nt'].done, false, 'A picks up B\'s newer untick');
}));
