const SETTINGS = { translation: 'esv', showLinks: true };
const NO_SYNC = { status: 'off', partners: [], requests: [] };
const done = (...ids) => Object.fromEntries(ids.map(id => [id, { done: true, t: 1 }]));
const partner = (username, progress = {}, status = 'mutual') => ({ username, status, progress });
const withPartners = (...ps) => ({ status: 'synced', partners: ps, requests: [] });
const rowFor = (el, ref) => [...el.querySelectorAll('li')].find(li => li.querySelector('.ref').textContent === ref);

function withEndpoint(url, email, fn) {
  const saved = [SYNC_ENDPOINT, HELP_EMAIL];
  SYNC_ENDPOINT = url; HELP_EMAIL = email;
  try { return fn(); } finally { [SYNC_ENDPOINT, HELP_EMAIL] = saved; }
}

test('app: parseRoute', () => {
  assertEqual(parseRoute(''), { name: 'today' });
  assertEqual(parseRoute('#/'), { name: 'today' });
  assertEqual(parseRoute('#/week/3'), { name: 'week', week: 3 });
  assertEqual(parseRoute('#/week/99'), { name: 'week', week: 52 });
  assertEqual(parseRoute('#/week/0'), { name: 'week', week: 1 });
  assertEqual(parseRoute('#/week/x'), { name: 'today' });
  assertEqual(parseRoute('#/plan'), { name: 'plan' });
  assertEqual(parseRoute('#/catchup'), { name: 'catchup' });
  assertEqual(parseRoute('#/account'), { name: 'account' });
  assertEqual(parseRoute('#/nope'), { name: 'today' });
});

test('app: today on a reading day', () => {
  const el = renderToday(new Date(2027, 0, 4, 8), {}, SETTINGS, NO_SYNC);
  const text = el.textContent;
  ['Monday, January 4', 'Week 1, day 1', 'Luke 1', 'Genesis 1', 'Psalm 1'].forEach(s => assertIncludes(text, s));
  assert(!/memory/i.test(text), 'no memory verse');
  const ticks = el.querySelectorAll('button.tick');
  assertEqual(ticks.length, 3);
  assertEqual(ticks[0].getAttribute('aria-label'), 'Mark Luke 1 read');
  assertEqual(ticks[0].getAttribute('aria-pressed'), 'false');
  el.querySelectorAll('.ref').forEach(r => assert(!r.closest('a'), 'reference text must not be a link'));
  assertEqual(el.querySelectorAll('a.read-online').length, 3);
  assertEqual(el.querySelector('a.read-online').getAttribute('href'), 'https://biblia.com/bible/esv/Luke1');
  const stale = renderToday(new Date(2027, 0, 4, 8), {}, { translation: 'kjv', showLinks: true }, NO_SYNC);
  assertEqual(stale.querySelector('a.read-online').getAttribute('href'), 'https://biblia.com/bible/esv/Luke1');
});

test('app: done readings show pressed', () => {
  const el = renderToday(new Date(2027, 0, 4, 8), done('w01d1-ot'), SETTINGS, NO_SYNC);
  assertEqual([...el.querySelectorAll('button.tick')].map(b => b.getAttribute('aria-pressed')), ['false', 'true', 'false']);
});

test('app: links hidden', () => {
  const el = renderToday(new Date(2027, 0, 4, 8), {}, { translation: 'esv', showLinks: false }, NO_SYNC);
  assertEqual(el.querySelectorAll('.read-online').length, 0);
});

test('app: weekend, before and after', () => {
  const sat = renderToday(new Date(2027, 0, 9), {}, SETTINGS, NO_SYNC).textContent;
  assertIncludes(sat, 'Weekend');
  assertIncludes(sat, 'Luke 6'); // a peek at Monday
  assertIncludes(renderToday(new Date(2027, 0, 1), {}, SETTINGS, NO_SYNC).textContent, 'January 4');
  assertIncludes(renderToday(new Date(2028, 0, 3), done('w01d1-nt'), SETTINGS, NO_SYNC).textContent, '1 of 780');
});

test('app: catch-up wording', () => {
  const wed = new Date(2027, 0, 6, 9);
  assertIncludes(renderToday(wed, {}, SETTINGS, NO_SYNC).textContent, '6 readings to catch up');
  const five = done('w01d1-nt', 'w01d1-ot', 'w01d1-ps', 'w01d2-nt', 'w01d2-ot');
  assertIncludes(renderToday(wed, five, SETTINGS, NO_SYNC).textContent, '1 reading to catch up');
  const all = done('w01d1-nt', 'w01d1-ot', 'w01d1-ps', 'w01d2-nt', 'w01d2-ot', 'w01d2-pr');
  assert(!/catch up/.test(renderToday(wed, all, SETTINGS, NO_SYNC).textContent), 'no catch-up line when caught up');
});

test('app: no partners hides partner bits', () => {
  const el = renderToday(new Date(2027, 0, 4, 8), {}, SETTINGS, NO_SYNC);
  assertEqual(el.querySelectorAll('.partners .who').length, 0);
  assertEqual(el.querySelectorAll('.grid .her').length, 0);
  assertEqual(el.querySelectorAll('.partner-switch').length, 0);
});

test('app: one partner shows names', () => {
  const el = renderToday(new Date(2027, 0, 4, 8), {}, SETTINGS,
    withPartners(partner('Anna', done('w01d1-nt')), partner('Wait', {}, 'waiting')));
  assertIncludes(rowFor(el, 'Luke 1').textContent, 'Anna');
  assert(!rowFor(el, 'Genesis 1').textContent.includes('Anna'), 'Anna has not read Genesis 1');
  assert(!el.textContent.includes('Wait'), 'waiting partners are not shown');
  assertEqual(el.querySelectorAll('.partner-switch').length, 0);
  assertEqual(el.querySelectorAll('.grid .her.on').length, 1);
});

test('app: many partners use initials and +N', () => {
  const ids = done('w01d1-nt');
  const el = renderToday(new Date(2027, 0, 4, 8), {}, SETTINGS,
    withPartners(partner('Anna', ids), partner('Mark', ids), partner('Jo', ids), partner('Zed', ids)));
  const row = rowFor(el, 'Luke 1');
  assertEqual([...row.querySelectorAll('.who')].map(w => w.textContent), ['A', 'M', 'J', '+1']);
  assert(el.querySelector('.partner-switch'), 'switch shown with 2+ partners');
  assertIncludes(el.textContent, 'Anna 1 of 15');
});

test('app: partner names are text, not markup', () => {
  const el = renderToday(new Date(2027, 0, 4, 8), {}, SETTINGS,
    withPartners(partner('<img src=x onerror=alert(1)>', done('w01d1-nt'))));
  assertEqual(el.querySelectorAll('img').length, 0);
});

test('app: week view', () => {
  const el = renderWeek(2, new Date(2027, 0, 4), {}, SETTINGS, NO_SYNC);
  assertIncludes(el.textContent, 'Week 2');
  assertIncludes(el.textContent, 'Luke 6');
  assertIncludes(el.textContent, 'Monday, January 11');
  assertEqual(el.querySelectorAll('button.tick').length, 15);
  assertEqual(el.querySelector('a.prev').getAttribute('href'), '#/week/1');
  assertEqual(el.querySelector('a.next').getAttribute('href'), '#/week/3');
  assertEqual(renderWeek(52, new Date(2027, 0, 4), {}, SETTINGS, NO_SYNC).querySelectorAll('a.next').length, 0);
});

test('app: plan view', () => {
  const el = renderPlan(new Date(2027, 0, 13), done('w01d1-nt'));
  const weeks = el.querySelectorAll('details');
  assertEqual(weeks.length, 52);
  assertEqual([...weeks].filter(d => d.open).length, 1);
  assert(weeks[1].open, 'the current week starts open');
  assertIncludes(weeks[0].textContent, '1 of 15');
});

test('app: catch-up view', () => {
  const wed = new Date(2027, 0, 6, 9);
  assertEqual(renderCatchUp(wed, {}, SETTINGS, NO_SYNC).querySelectorAll('button.tick').length, 6);
  const all = done('w01d1-nt', 'w01d1-ot', 'w01d1-ps', 'w01d2-nt', 'w01d2-ot', 'w01d2-pr');
  assertIncludes(renderCatchUp(wed, all, SETTINGS, NO_SYNC).textContent, 'all caught up');
});

test('app: account hidden when sync off', () => withEndpoint('', '', () => {
  const el = renderAccount(SETTINGS, null, NO_SYNC);
  assertEqual(el.querySelectorAll('input[name="username"]').length, 0);
  assert(!el.querySelector('select[name="translation"]'), 'no translation choice: links are always ESV');
  assert(el.querySelector('input[name="showLinks"]'), 'link switch is always there');
}));

test('app: account forms when sync on', () => withEndpoint('https://example.test/exec', '', () => {
  const el = renderAccount(SETTINGS, null, NO_SYNC);
  assert(el.querySelector('input[name="username"]'), 'username field');
  assertEqual(el.querySelector('input[name="pin"]').getAttribute('inputmode'), 'numeric');
  assertEqual(el.querySelectorAll('a.forgot').length, 0);
  const withHelp = withEndpoint('https://example.test/exec', 'help@example.test',
    () => renderAccount(SETTINGS, null, NO_SYNC));
  assertIncludes(withHelp.querySelector('a.forgot').getAttribute('href'), 'mailto:help@example.test?subject=PIN%20reset');
}));

test('app: signed-in account lists partners and requests', () => withEndpoint('https://example.test/exec', '', () => {
  const state = { status: 'synced', partners: [partner('Anna'), partner('Mark', undefined, 'waiting')], requests: ['Jo'] };
  const text = renderAccount(SETTINGS, { username: 'Seth', token: 't' }, state).textContent;
  ['Seth', 'Anna', 'Mark', 'Jo', 'Add back', 'Sign out'].forEach(s => assertIncludes(text, s));
}));

test('app: sync marker', () => {
  const pending = renderToday(new Date(2027, 0, 4, 8), {}, SETTINGS, { status: 'offline', partners: [], requests: [] });
  assertIncludes(pending.textContent, 'Not synced yet');
  assert(!renderToday(new Date(2027, 0, 4, 8), {}, SETTINGS, NO_SYNC).textContent.includes('Not synced'));
  const expired = renderToday(new Date(2027, 0, 4, 8), {}, SETTINGS, { status: 'signed-out-expired', partners: [], requests: [] });
  assertIncludes(expired.textContent, 'Please sign in again');
});

test('app: ?date= previews another day', () => {
  const d = appNow('?date=2027-01-06', new Date(2026, 10, 26, 15, 30));
  assertEqual([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()], [2027, 0, 6, 15]);
  const real = new Date(2026, 10, 26, 15, 30);
  assertEqual(appNow('', real), real);
  assertEqual(appNow('?date=nonsense', real), real);
});
