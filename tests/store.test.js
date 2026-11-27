// Runs fn with every br27.* key removed, then puts the originals back.
function withCleanStore(fn) {
  const saved = {};
  Object.keys(localStorage).filter(k => k.startsWith('br27.')).forEach(k => {
    saved[k] = localStorage.getItem(k);
    localStorage.removeItem(k);
  });
  try {
    return fn();
  } finally {
    Object.keys(localStorage).filter(k => k.startsWith('br27.')).forEach(k => localStorage.removeItem(k));
    Object.keys(saved).forEach(k => localStorage.setItem(k, saved[k]));
  }
}

test('store: merge newest wins', () => {
  const older = { x: { done: true, t: 1 } }, newer = { x: { done: false, t: 2 } };
  assertEqual(mergeProgress(older, newer), { x: { done: false, t: 2 } });
  assertEqual(mergeProgress(newer, older), { x: { done: false, t: 2 } });
  assertEqual(mergeProgress({ a: { done: true, t: 1 } }, { b: { done: true, t: 1 } }),
    { a: { done: true, t: 1 }, b: { done: true, t: 1 } });
});

test('store: merge tie prefers done', () => {
  const no = { x: { done: false, t: 5 } }, yes = { x: { done: true, t: 5 } };
  assertEqual(mergeProgress(no, yes).x.done, true);
  assertEqual(mergeProgress(yes, no).x.done, true);
});

test('store: setDone queues pending', () => withCleanStore(() => {
  setDone('2027-w01d1-nt', true, 10);
  assertEqual(getProgress(), { '2027-w01d1-nt': { done: true, t: 10 } });
  assertEqual(getPending(), { '2027-w01d1-nt': { done: true, t: 10 } });
  clearPending({ '2027-w01d1-nt': { done: true, t: 10 } });
  assertEqual(getPending(), {});
  setDone('2027-w01d1-nt', true, 10);
  setDone('2027-w01d1-nt', false, 20);
  clearPending({ '2027-w01d1-nt': { done: true, t: 10 } });
  assertEqual(getPending(), { '2027-w01d1-nt': { done: false, t: 20 } });
  assertEqual(getProgress()['2027-w01d1-nt'], { done: false, t: 20 });
}));

test('store: corrupt storage', () => withCleanStore(() => {
  localStorage.setItem('br27.progress', '{oops');
  localStorage.setItem('br27.account', 'nope');
  assertEqual(getProgress(), {});
  assertEqual(getAccount(), null);
  assertEqual(readJSON('br27.missing', 7), 7);
}));

test('store: settings defaults', () => withCleanStore(() => {
  assertEqual(getSettings(), { showLinks: true });
  saveSettings({ showLinks: false });
  assertEqual(getSettings(), { showLinks: false });
}));

test('store: an old translation setting is ignored', () => withCleanStore(() => {
  localStorage.setItem('br27.settings', '{"translation":"kjv","showLinks":true}');
  assertEqual(getSettings(), { showLinks: true });
}));

test('store: account', () => withCleanStore(() => {
  assertEqual(getAccount(), null);
  saveAccount({ username: 'Seth', token: 't1' });
  assertEqual(getAccount(), { username: 'Seth', token: 't1' });
  clearAccount();
  assertEqual(getAccount(), null);
}));

test('store: older year-less checkmarks are kept as 2027', () => withCleanStore(() => {
  localStorage.setItem('br27.progress', '{"w01d1-nt":{"done":true,"t":5},"2027-w01d1-ot":{"done":true,"t":6}}');
  localStorage.setItem('br27.pending', '{"w01d2-pr":{"done":true,"t":7}}');
  assertEqual(getProgress(), { '2027-w01d1-nt': { done: true, t: 5 }, '2027-w01d1-ot': { done: true, t: 6 } });
  assertEqual(getPending(), { '2027-w01d2-pr': { done: true, t: 7 } });
}));

test('store: catch-up', () => {
  const ids = catchUpIds({ '2027-w01d1-nt': { done: true, t: 1 } }, new Date(2027, 0, 6));
  assertEqual(ids.length, 5);
  assertEqual(ids[0], '2027-w01d1-ot');
  assertEqual(catchUpIds({ '2027-w01d1-nt': { done: false, t: 2 } }, new Date(2027, 0, 6)).length, 6);
});

test('store: weekDoneCount', () => {
  const p = { '2027-w02d1-nt': { done: true, t: 1 }, '2027-w02d3-ps': { done: true, t: 1 },
    '2027-w02d4-pr': { done: false, t: 2 }, 'w02-mv': { done: true, t: 1 }, '2027-w01d1-nt': { done: true, t: 1 } };
  assertEqual(weekDoneCount(p, 2027, 2), 2);
});

test('store: resetLocal keeps settings', () => withCleanStore(() => {
  saveSettings({ showLinks: false });
  setDone('2027-w01d1-nt', true, 1);
  saveAccount({ username: 'Seth', token: 't' });
  resetLocal();
  assertEqual(getProgress(), {});
  assertEqual(getPending(), {});
  assertEqual(getAccount(), null);
  assertEqual(getSettings().showLinks, false);
}));
