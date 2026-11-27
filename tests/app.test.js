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
  assertEqual(parseRoute('#/week/2028/3'), { name: 'week', year: 2028, week: 3 });
  assertEqual(parseRoute('#/plan'), { name: 'plan' });
  assertEqual(parseRoute('#/plan/2028'), { name: 'plan', year: 2028 });
  assertEqual(parseRoute('#/plan/1999'), { name: 'plan', year: 2026 });
  assertEqual(parseRoute('#/catchup'), { name: 'catchup' });
  assertEqual(parseRoute('#/account'), { name: 'account' });
  assertEqual(parseRoute('#/extras'), { name: 'extras' });
  assertEqual(parseRoute('#/about'), { name: 'about' });
  assertEqual(parseRoute('#/print'), { name: 'print' });
  assertEqual(parseRoute('#/print/2028'), { name: 'print', year: 2028 });
  assertEqual(parseRoute('#/nope'), { name: 'today' });
});

test('app: today on a reading day', () => {
  const el = renderToday(new Date(2027, 0, 4, 8), {}, SETTINGS, NO_SYNC);
  const text = el.textContent;
  ['Monday, January 4', 'Week 1, day 1', 'Luke 1', 'Genesis 1', 'Psalm 1'].forEach(s => assertIncludes(text, s));
  assertEqual(el.querySelector('.bar span').textContent, 'Bible Reading');
  assert(!/memory/i.test(text), 'no memory verse');
  const ticks = el.querySelectorAll('button.tick');
  assertEqual(ticks.length, 3);
  assertEqual(ticks[0].getAttribute('aria-label'), 'Mark Luke 1 read');
  assertEqual(ticks[0].getAttribute('aria-pressed'), 'false');
  el.querySelectorAll('.ref').forEach(r => assert(!r.closest('a'), 'reference text must not be a link'));
  assertEqual(el.querySelectorAll('a.read-online').length, 3);
  assertEqual(el.querySelector('a.read-online').getAttribute('href'), 'https://ref.ly/Lk1');
  const stale = renderToday(new Date(2027, 0, 4, 8), {}, { translation: 'kjv', showLinks: true }, NO_SYNC);
  assertEqual(stale.querySelector('a.read-online').getAttribute('href'), 'https://ref.ly/Lk1');
});

test('app: done readings show pressed', () => {
  const el = renderToday(new Date(2027, 0, 4, 8), done('2027-w01d1-ot'), SETTINGS, NO_SYNC);
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
  assertIncludes(renderToday(new Date(2027, 0, 2), {}, SETTINGS, NO_SYNC).textContent, 'January 4');
  assertIncludes(renderToday(new Date(2028, 0, 1), {}, SETTINGS, NO_SYNC).textContent, 'Starts Monday, January 3');
  const after = renderToday(new Date(2028, 11, 30),
    done('2028-w01d1-nt', '2028-w01d1-ot', '2028-w01d1-ps', '2028-w01d2-nt', '2027-w01d3-nt', '2027-w01d3-ot', '2027-w01d3-ps'), SETTINGS, NO_SYNC).textContent;
  assertIncludes(after, '1 of 260'); // only 2028's fully read days count
  assertIncludes(after, 'Monday, January 1');
});

test('app: catch-up wording', () => {
  const wed = new Date(2027, 0, 6, 9);
  assertIncludes(renderToday(wed, {}, SETTINGS, NO_SYNC).textContent, '2 readings to catch up'); // Monday and Tuesday
  const five = done('2027-w01d1-nt', '2027-w01d1-ot', '2027-w01d1-ps', '2027-w01d2-nt', '2027-w01d2-ot');
  assertIncludes(renderToday(wed, five, SETTINGS, NO_SYNC).textContent, '1 reading to catch up');
  const all = done('2027-w01d1-nt', '2027-w01d1-ot', '2027-w01d1-ps', '2027-w01d2-nt', '2027-w01d2-ot', '2027-w01d2-pr');
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
    withPartners(partner('Anna', done('2027-w01d1-nt')), partner('Wait', {}, 'waiting')));
  assertIncludes(rowFor(el, 'Luke 1').textContent, 'Anna');
  assert(!rowFor(el, 'Genesis 1').textContent.includes('Anna'), 'Anna has not read Genesis 1');
  assert(!el.textContent.includes('Wait'), 'waiting partners are not shown');
  assertEqual(el.querySelectorAll('.partner-switch').length, 0);
  assertEqual(el.querySelectorAll('.grid .her.on').length, 1);
  assertEqual(el.querySelectorAll('.counts').length, 0, 'no score line with a single partner');
});

test('app: many partners use initials and +N', () => {
  const ids = done('2027-w01d1-nt');
  const el = renderToday(new Date(2027, 0, 4, 8), {}, SETTINGS,
    withPartners(partner('Anna', ids), partner('Mark', ids), partner('Jo', ids), partner('Zed', ids)));
  const row = rowFor(el, 'Luke 1');
  assertEqual([...row.querySelectorAll('.who')].map(w => w.textContent), ['A', 'M', 'J', '+1']);
  assert(el.querySelector('.partner-switch'), 'switch shown with 2+ partners');
  assertIncludes(el.textContent, 'You 0 of 5, Anna 0 of 5');
});

test('app: partner names are text, not markup', () => {
  const el = renderToday(new Date(2027, 0, 4, 8), {}, SETTINGS,
    withPartners(partner('<img src=x onerror=alert(1)>', done('2027-w01d1-nt'))));
  assertEqual(el.querySelectorAll('img').length, 0);
});

test('app: week view', () => {
  const el = renderWeek(2027, 2, new Date(2027, 0, 4), {}, SETTINGS, NO_SYNC);
  assertIncludes(el.textContent, 'Week 2');
  assertIncludes(el.textContent, 'Luke 6');
  assertIncludes(el.textContent, 'Monday, January 11');
  assertEqual(el.querySelectorAll('button.tick').length, 15);
  assertEqual(el.querySelector('a.prev').getAttribute('href'), '#/week/2027/1');
  assertEqual(el.querySelector('a.next').getAttribute('href'), '#/week/2027/3');
  assertEqual(renderWeek(2027, 52, new Date(2027, 0, 4), {}, SETTINGS, NO_SYNC).querySelector('a.next').getAttribute('href'), '#/week/2028/1');
  assertEqual(renderWeek(2026, 1, new Date(2027, 0, 4), {}, SETTINGS, NO_SYNC).querySelectorAll('a.prev').length, 0);
  assertEqual(renderWeek(2027, 1, new Date(2027, 0, 4), {}, SETTINGS, NO_SYNC).querySelector('a.prev').getAttribute('href'), '#/week/2026/52');
  assertEqual(renderWeek(2028, 1, new Date(2028, 0, 4), {}, SETTINGS, NO_SYNC).querySelector('a.prev').getAttribute('href'), '#/week/2027/52');
  assertIncludes(renderWeek(2028, 1, new Date(2028, 0, 4), {}, SETTINGS, NO_SYNC).textContent, 'Monday, January 3');
});

test('app: plan view', () => {
  const el = renderPlan(2027, new Date(2027, 0, 13), done('2027-w01d1-nt', '2027-w01d1-ot', '2027-w01d1-ps', '2027-w01d2-nt'));
  const weeks = el.querySelectorAll('details');
  assertEqual(weeks.length, 52);
  assertEqual([...weeks].filter(d => d.open).length, 1);
  assert(weeks[1].open, 'the current week starts open');
  assertIncludes(weeks[0].textContent, '1 of 5');
});

test('app: plan year switch', () => {
  const el = renderPlan(2027, new Date(2028, 0, 5), done('2027-w01d1-nt'));
  assertIncludes(el.querySelector('h1').textContent, '2027');
  const years = [...el.querySelectorAll('.years a')].map(a => [a.textContent, a.getAttribute('href'), a.getAttribute('aria-current')]);
  assertEqual(years, [['2026', '#/plan/2026', null], ['2027', '#/plan/2027', 'page'], ['2028', '#/plan/2028', null]]);
  assertEqual(renderPlan(2026, new Date(2026, 5, 1), {}).querySelectorAll('.years').length, 0, 'no switch while there is only one year');
});

test('app: catch-up view', () => {
  const wed = new Date(2027, 0, 6, 9);
  assertEqual(renderCatchUp(wed, {}, SETTINGS, NO_SYNC).querySelectorAll('button.tick').length, 6);
  assertIncludes(renderCatchUp(wed, {}, SETTINGS, NO_SYNC).textContent, '2 readings from earlier days');
  const all = done('2027-w01d1-nt', '2027-w01d1-ot', '2027-w01d1-ps', '2027-w01d2-nt', '2027-w01d2-ot', '2027-w01d2-pr');
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

test('app: screens never show "null" or "undefined"', () => {
  const dates = [new Date(2026, 10, 26), new Date(2027, 0, 4, 8), new Date(2027, 0, 6, 8), new Date(2027, 0, 9),
    new Date(2027, 11, 31, 8), new Date(2028, 0, 3)];
  const states = [NO_SYNC, withPartners(partner('Anna', done('2027-w01d1-nt')))];
  dates.forEach(d => states.forEach(s => {
    [renderToday(d, {}, SETTINGS, s), renderWeek(2027, 1, d, {}, SETTINGS, s), renderCatchUp(d, {}, SETTINGS, s), renderPlan(2027, d, {})]
      .forEach(el => assert(!/\bnull\b|\bundefined\b/.test(el.textContent), `${d.toDateString()}: ${el.textContent.match(/.{0,30}(null|undefined).{0,10}/)}`));
  }));
});

test('app: the sync marker only shows when the sheet could not be reached', () => {
  const pending = renderToday(new Date(2027, 0, 4, 8), {}, SETTINGS, { status: 'pending', partners: [], requests: [] });
  assert(!pending.textContent.includes('Not synced'), 'no flash after every tick');
});

test('app: preview banner', () => {
  const el = previewBanner(new Date(2027, 0, 4));
  assertIncludes(el.textContent, 'Previewing Monday, January 4');
  assertEqual(el.querySelector('a').getAttribute('href'), './');
});

test('app: formHasValues', () => {
  const box = document.createElement('div');
  box.innerHTML = '<form><input name="username" value=""></form>';
  assertEqual(formHasValues(box), false);
  box.querySelector('input').value = 'Seth';
  assertEqual(formHasValues(box), true);
});

test('install: Android gets a one-tap button', () => {
  const el = installPrompt({ standalone: false, dismissed: false, canPrompt: true, ios: false });
  assert(el.querySelector('button.install'), 'install button');
  assert(el.querySelector('button.install-dismiss'), 'not-now button');
});

test('install: iPhone gets Share then Add to Home Screen', () => {
  const el = installPrompt({ standalone: false, dismissed: false, canPrompt: false, ios: true });
  assertIncludes(el.textContent, 'Add to Home Screen');
  assert(!el.querySelector('button.install'), 'no install button on iPhone');
});

test('install: hidden when installed, dismissed, or not possible', () => {
  assertEqual(installPrompt({ standalone: true, dismissed: false, canPrompt: true, ios: true }), null);
  assertEqual(installPrompt({ standalone: false, dismissed: true, canPrompt: true, ios: false }), null);
  assertEqual(installPrompt({ standalone: false, dismissed: false, canPrompt: false, ios: false }), null);
});

test('app: a partner\'s year-less checkmarks count as 2027', () => {
  const el = renderToday(new Date(2027, 0, 4, 8), {}, SETTINGS, withPartners(partner('Anna', { 'w01d1-nt': { done: true, t: 1 } })));
  assertIncludes(rowFor(el, 'Luke 1').textContent, 'Anna');
});

test('app: catch-up lists the newest week first, days in order within a week', () => {
  const el = renderCatchUp(new Date(2027, 0, 13, 9), {}, SETTINGS, NO_SYNC); // Wednesday of week 2
  const heads = [...el.querySelectorAll('main h2, main h3')].map(x => `${x.tagName} ${x.textContent}`);
  assertEqual(heads, ['H2 Week 2', 'H3 Monday, January 11', 'H3 Tuesday, January 12',
    'H2 Week 1', 'H3 Monday, January 4', 'H3 Tuesday, January 5', 'H3 Wednesday, January 6', 'H3 Thursday, January 7', 'H3 Friday, January 8']);
});

test('app: sign-up form shows the disclaimer above its button', () => withEndpoint('https://example.test/exec', '', () => {
  const form = renderAccount(SETTINGS, null, NO_SYNC).querySelector('form.signup');
  const note = form.querySelector('.disclaimer');
  assertEqual(note.textContent, "✧Disclaimer✧ This is a small, free app. Not a bank with top tier encryption. Choose a PIN you don't use everywhere else.");
  assert(note.compareDocumentPosition(form.querySelector('button[type="submit"]')) & Node.DOCUMENT_POSITION_FOLLOWING, 'disclaimer sits above the button');
}));

test('app: reading links use the Android form only on Android', () => {
  const href = s => renderToday(new Date(2027, 0, 4, 8), {}, s, NO_SYNC).querySelector('a.read-online').getAttribute('href');
  assertEqual(href({ showLinks: true, android: false }), 'https://ref.ly/Lk1');
  assert(href({ showLinks: true, android: true }).startsWith('intent://ref.ly/Lk1#Intent;'), 'Android link');
});

test('app: catch me up marks every reading before today as read', () => withCleanStore(() => {
  const wed = new Date(2027, 0, 6, 9);
  setDone('2027-w01d1-nt', true, 1);
  assertEqual(catchMeUp(wed), 5);
  assertEqual(catchUpIds(getProgress(), wed), []);
  assertEqual(isDone(getProgress(), '2027-w01d3-nt'), false, "today's readings are left alone");
  assertEqual(catchMeUp(wed), 0);
}));

test('app: catch me up setting shows the count and asks to confirm', () => withEndpoint('', '', () => {
  const el = renderAccount(SETTINGS, null, NO_SYNC, 6);
  assertEqual(el.querySelector('button.catch-me-up').textContent, 'Mark 6 readings as read');
  assertIncludes(renderAccount(SETTINGS, null, NO_SYNC, 1).querySelector('button.catch-me-up').textContent, 'Mark 1 reading as read');
  const confirm = renderAccount(SETTINGS, null, NO_SYNC, 6, true);
  assert(confirm.querySelector('button.catch-me-up-yes'), 'confirm button');
  assert(confirm.querySelector('button.catch-me-up-no'), 'cancel button');
  assertIncludes(confirm.textContent, 'untick');
  const none = renderAccount(SETTINGS, null, NO_SYNC, 0);
  assertEqual(none.querySelectorAll('button.catch-me-up').length, 0);
  assertIncludes(none.textContent, "You're all caught up");
}));

test('app: weekend catch-up list starts with the newest week', () => {
  const sat = renderToday(new Date(2027, 0, 16), {}, SETTINGS, NO_SYNC); // after week 2, nothing read
  const heads = [...sat.querySelectorAll('main .day-head')].map(x => x.textContent);
  assertEqual(heads[0], 'Monday, January 11');
  assertEqual(sat.querySelectorAll('main .readings button.tick').length, 6);
  assertIncludes(sat.textContent, 'See all 10');
});

test("app: the plan page counts a day's passages as one reading", () => {
  assertIncludes(renderPlan(2027, new Date(2027, 0, 13), {}).querySelector('.seq').textContent, '260 readings, Monday to Friday');
});

test('app: catch me up counts days', () => withEndpoint('', '', () => {
  const sync = NO_SYNC;
  // render() passes catchUpDays: Wednesday of week 1 with nothing read is 2 days behind
  assertEqual(catchUpDays({}, new Date(2027, 0, 6, 9)), 2);
  assertEqual(renderAccount(SETTINGS, null, sync, 2).querySelector('button.catch-me-up').textContent, 'Mark 2 readings as read');
}));

test('app: tab bar is Extras, Week, Today, Plan, Account', () => {
  const nav = tabBar({ name: 'today' }, new Date(2027, 0, 6));
  assertEqual([...nav.querySelectorAll('a')].map(a => a.textContent), ['Extras', 'Week', 'Today', 'Plan', 'Account']);
  assertEqual(nav.querySelector('a.on').textContent, 'Today');
  assertEqual(nav.querySelector('a').getAttribute('href'), '#/extras');
  assertEqual(tabBar({ name: 'print' }, new Date(2027, 0, 6)).querySelector('a.on').textContent, 'Extras');
  assertEqual(tabBar({ name: 'about' }, new Date(2027, 0, 6)).querySelector('a.on').textContent, 'Extras');
});

test('app: extras is a menu that opens the Gospel, About and the printable plan', () => {
  const el = renderExtras(new Date(2027, 0, 6));
  const rows = [...el.querySelectorAll('a.extras-row')];
  assertEqual(rows.map(a => a.querySelector('.row-title').textContent), ['The Gospel', 'About this reading plan', 'Printable plan']);
  assertEqual(rows.map(a => a.getAttribute('href')), ['#/gospel', '#/about', '#/print/2027']);
  assert(!el.textContent.includes('Replicate'), 'the about text lives on its own page now');
  assertEqual(el.querySelector('main h2').textContent, 'Share this app with a friend');
  assert(el.querySelector('button.share-app'), 'share button stays on Extras');
});

test('app: about page', () => {
  const el = renderAbout();
  assertEqual(el.querySelector('h1').textContent, 'About this reading plan');
  assertEqual([...el.querySelectorAll('main h2')].map(x => x.textContent),
    ['The M260 Reading Plan', 'Old Testament', 'New Testament', 'Psalms and Proverbs']);
  ['M’Cheyne', 'F260', 'Replicate Ministries', 'first Monday of January', 'Luke', 'Matthew', 'Psalm 119'].forEach(t => assertIncludes(el.textContent, t));
  assert(!/every book of the Old Testament/i.test(el.textContent), 'the OT readings skip some books');
  assertEqual(el.querySelector('a.back').getAttribute('href'), '#/extras');
});

test('app: printable plan lists every day of the year with tick boxes', () => {
  const el = renderPrint(2027, new Date(2027, 0, 6));
  assertEqual(el.querySelector('h1').textContent, 'M260 2027 Bible Reading Plan');
  assertEqual(el.querySelectorAll('.print-week').length, 52);
  assertEqual(el.querySelectorAll('.print-day').length, 260);
  assertEqual(el.querySelectorAll('.print-day .box').length, 780);
  assertIncludes(el.querySelector('.print-week').textContent, 'Luke 1');
  assertIncludes(el.querySelector('.print-week').textContent, 'January 4');
  assert(el.querySelector('button.print-now'), 'print button');
});

test('app: the shared link is the app address without previews or screens', () => {
  assertEqual(appShareUrl({ origin: 'https://pastorseth.github.io', pathname: '/BibleReading/' }), 'https://pastorseth.github.io/BibleReading/');
  assertEqual(appShareUrl({ origin: 'https://pastorseth.github.io', pathname: '/BibleReading/index.html' }), 'https://pastorseth.github.io/BibleReading/');
});

test('app: share falls back to copying the link and says so', async () => {
  const el = renderExtras(new Date(2027, 0, 6));
  document.body.appendChild(el);
  try {
    let copied = null;
    const nav = { clipboard: { writeText: async t => { copied = t; } } };
    await shareApp(el.querySelector('.share-app'), nav, { origin: 'https://example.test', pathname: '/BibleReading/' });
    assertEqual(copied, 'https://example.test/BibleReading/');
    assertIncludes(el.querySelector('.share-note').textContent, 'Link copied');
  } finally { el.remove(); }
});

test('app: share uses the phone share sheet when there is one', async () => {
  const el = renderExtras(new Date(2027, 0, 6));
  let shared = null;
  await shareApp(el.querySelector('.share-app'), { share: async d => { shared = d; } }, { origin: 'https://example.test', pathname: '/BibleReading/' });
  assertEqual(shared.url, 'https://example.test/BibleReading/');
});

test('app: printable plan has a this-year / next-year switch and a back link', () => {
  const el = renderPrint(2027, new Date(2027, 0, 6));
  const years = [...el.querySelectorAll('.years a')].map(a => [a.textContent, a.getAttribute('href'), a.getAttribute('aria-current')]);
  assertEqual(years, [['2027', '#/print/2027', 'page'], ['2028', '#/print/2028', null]]);
  assertEqual(el.querySelector('a.back').getAttribute('href'), '#/extras');
  assertEqual(renderPrint(2028, new Date(2027, 0, 6)).querySelector('.years a[aria-current="page"]').textContent, '2028');
});

test('app: a plan that ends next January says which year', () => {
  assertIncludes(renderPlan(2026, new Date(2026, 5, 1), {}).querySelector('.seq').textContent, 'January 5 to January 1, 2027');
  assertIncludes(renderPrint(2026, new Date(2026, 5, 1)).querySelector('.seq').textContent, 'January 5 to January 1, 2027');
  assertIncludes(renderPlan(2027, new Date(2027, 5, 1), {}).querySelector('.seq').textContent, 'January 4 to December 31.');
});

const NT_ONLY = { showLinks: true, ntOnly: true };
const HIDE = { showLinks: true, hideBehind: true };

test('settings: hide how far behind removes the catch-up line and weekend list', () => {
  const wed = renderToday(new Date(2027, 0, 6, 9), {}, HIDE, NO_SYNC).textContent;
  assert(!/catch up/i.test(wed), 'no catch-up line');
  const sat = renderToday(new Date(2027, 0, 16), {}, HIDE, NO_SYNC);
  assert(!sat.textContent.includes('To catch up'), 'no weekend catch-up list');
  assertEqual(sat.querySelectorAll('main .readings button.tick').length, 0);
});

test('settings: New Testament only on Today and Week', () => {
  const el = renderToday(new Date(2027, 0, 4, 8), {}, NT_ONLY, NO_SYNC);
  assertEqual([...el.querySelectorAll('.ref')].map(r => r.textContent), ['Luke 1']);
  assertEqual([...el.querySelectorAll('.grid .label')].map(l => l.textContent), ['New Test.']);
  assertEqual(renderWeek(2027, 1, new Date(2027, 0, 4), {}, NT_ONLY, NO_SYNC).querySelectorAll('button.tick').length, 5);
  const ntDone = done('2027-w01d1-nt', '2027-w01d2-nt');
  assert(!/catch up/.test(renderToday(new Date(2027, 0, 6, 9), ntDone, NT_ONLY, NO_SYNC).textContent), 'caught up on the NT');
});

test('settings: New Testament only on Plan, Catch up, print and Catch me up', () => {
  const plan = renderPlan(2027, new Date(2027, 0, 13), done('2027-w01d1-nt'), NT_ONLY);
  assert(!plan.textContent.includes('Genesis'), 'no Old Testament on the plan');
  assertIncludes(plan.querySelector('details').textContent, '1 of 5');
  assertEqual(renderCatchUp(new Date(2027, 0, 6, 9), {}, NT_ONLY, NO_SYNC).querySelectorAll('button.tick').length, 2);
  const print = renderPrint(2027, new Date(2027, 0, 6), NT_ONLY);
  assertEqual(print.querySelectorAll('.print-day .box').length, 260);
  assert(!print.textContent.includes('Genesis'), 'no Old Testament on paper');
  assertIncludes(print.querySelector('.seq').textContent, 'One New Testament chapter each day.');
  assertIncludes(renderPrint(2027, new Date(2027, 0, 6)).querySelector('.seq').textContent, 'New Testament, Old Testament, and a Psalm or Proverbs each day.');
  withCleanStore(() => {
    assertEqual(catchMeUp(new Date(2027, 0, 6, 9), ['nt']), 2);
    assertEqual(Object.keys(getProgress()).sort(), ['2027-w01d1-nt', '2027-w01d2-nt']);
  });
});

test('settings: the account page has both switches', () => withEndpoint('', '', () => {
  const el = renderAccount({ showLinks: true, hideBehind: true, ntOnly: false }, null, NO_SYNC);
  assertEqual(el.querySelector('input[name="hideBehind"]').checked, true);
  assertEqual(el.querySelector('input[name="ntOnly"]').checked, false);
  assertIncludes(el.textContent, 'Hide how far behind I am');
  assertIncludes(el.textContent, 'New Testament only');
}));

// Buttons that wait on the server say so while they wait.
test('waiting: every server button says what it is doing', () => withEndpoint('https://example.test/exec', '', () => {
  const out = renderAccount(SETTINGS, null, NO_SYNC);
  const wait = sel => { const b = out.querySelector(sel); return [b.dataset.wait, b.dataset.waitLabel]; };
  assertEqual(wait('form.signin button[type=submit]'), ['signin', 'Signing in']);
  assertEqual(wait('form.signup button[type=submit]'), ['signup', 'Creating account']);
  const state = { status: 'synced', partners: [partner('Anna')], requests: ['Jo'] };
  const inside = renderAccount(SETTINGS, { username: 'Seth', token: 't' }, state);
  const w = sel => { const b = inside.querySelector(sel); return [b.dataset.wait, b.dataset.waitLabel]; };
  assertEqual(w('form.add-partner button[type=submit]'), ['addPartner', 'Adding']);
  assertEqual(w('[data-remove="Anna"]'), ['remove:Anna', 'Removing']);
  assertEqual(w('[data-addback="Jo"]'), ['addback:Jo', 'Adding']);
  assertEqual(w('.signout'), ['signout', 'Signing out']);
}));

test('waiting: a button shows the wait and goes back after', () => {
  const b = h('button', { class: 'btn', dataset: { wait: 'addPartner', waitLabel: 'Adding' }, text: 'Add' });
  showWaiting(b, true);
  assertEqual(b.textContent, 'Adding');
  assertEqual(b.disabled, true);
  assertEqual(b.getAttribute('aria-busy'), 'true');
  assert(b.classList.contains('busy'), 'busy class');
  assertEqual(b.querySelectorAll('.wait i').length, 3);
  showWaiting(b, true);
  assertEqual(b.querySelectorAll('.wait').length, 1, 'a second call changes nothing');
  showWaiting(b, false);
  assertEqual(b.textContent, 'Add');
  assertEqual(b.disabled, false);
  assertEqual(b.getAttribute('aria-busy'), null);
  assert(!b.classList.contains('busy'), 'no busy class');
});

test('waiting: the wait lasts as long as the server call, even through a re-render', async () => {
  const doc = h('div');
  const make = () => h('button', { type: 'button', dataset: { wait: 'remove:Anna', waitLabel: 'Removing' }, text: 'Remove' });
  const first = make();
  doc.append(first);
  document.body.append(doc);
  let finish;
  const call = whileWaiting(first, () => new Promise(r => { finish = r; }));
  try {
    assertEqual(first.textContent, 'Removing');
    const rebuilt = waitButtonState(make());
    assertEqual(rebuilt.textContent, 'Removing', 'a button drawn mid-wait still shows it');
    first.replaceWith(rebuilt);
    finish({ ok: true });
    assertEqual(await call, { ok: true });
    assertEqual(rebuilt.textContent, 'Remove');
    assertEqual(rebuilt.disabled, false);
    const failing = whileWaiting(rebuilt, () => Promise.reject(new Error('nope')));
    let threw = false;
    try { await failing; } catch (e) { threw = true; }
    assert(threw, 'the error still reaches the caller');
    assertEqual(rebuilt.textContent, 'Remove', 'a failed call clears the wait too');
  } finally {
    doc.remove();
  }
});

test('partners: the account page shows when reading partners are loading', () => withEndpoint('https://example.test/exec', '', () => {
  const me = { username: 'Seth', token: 't' };
  const first = renderAccount(SETTINGS, me, { status: 'synced', loading: true, partners: [], requests: [] });
  const line = first.querySelector('.loading');
  assertIncludes(line.textContent, 'Loading reading partners');
  assertEqual(line.getAttribute('role'), 'status');
  assertEqual(line.querySelectorAll('.wait i').length, 3);
  const again = renderAccount(SETTINGS, me, { status: 'synced', loading: true, partners: [partner('Anna')], requests: [] });
  assertIncludes(again.querySelector('.loading').textContent, 'Checking for updates');
  assertIncludes(again.textContent, 'Anna', 'known partners stay on screen while it checks');
  const done = renderAccount(SETTINGS, me, { status: 'synced', loading: false, partners: [partner('Anna')], requests: [] });
  assertEqual(done.querySelector('.loading'), null);
}));

test('partners: opening the Account tab asks the server for fresh partners', async () => {
  const asked = [];
  await withFakeServer(body => { asked.push(body.action); return happyServer()(body); }, async () => {
    assertEqual(screenOpened('account'), null, 'no account, nothing to ask');
    saveAccount({ username: 'Seth', token: 'tok' });
    assertEqual(screenOpened('today'), null, 'other tabs do not ask');
    await screenOpened('account');
    assertEqual(asked, ['load']);
  });
});

// The Gospel page (Extras), from First Ten Days' Gospel bridge.
test('gospel: Extras links to it and the route opens it', () => {
  const extras = renderExtras(new Date(2027, 0, 6));
  const row = extras.querySelector('a.extras-row[href="#/gospel"]');
  assert(row, 'a Gospel row in Extras');
  assertIncludes(row.textContent, 'The Gospel');
  assertEqual(extras.querySelector('a.extras-row').getAttribute('href'), '#/gospel', 'it comes first');
  assertEqual(parseRoute('#/gospel'), { name: 'gospel' });
  assertEqual(tabBar({ name: 'gospel' }, new Date(2027, 0, 6)).querySelector('.on').textContent, 'Extras');
});

test('gospel: the page has the four parts, their verses, and the drawing', () => {
  const page = renderGospel();
  assertEqual(page.querySelector('h1').textContent, 'What is the Gospel?');
  assertIncludes(page.querySelector('main').textContent, 'The Gospel is the good news of Jesus Christ.');
  assertEqual([...page.querySelectorAll('.bridge-part h2')].map(t => t.querySelector('.part-name').textContent), ['God', 'Man', 'Jesus', 'Response']);
  assertEqual([...page.querySelectorAll('.bridge-part h2 .part-n')].map(n => n.textContent), ['1 of 4', '2 of 4', '3 of 4', '4 of 4']);
  assertEqual([...page.querySelectorAll('.bridge-part blockquote cite')].map(c => c.textContent),
    ['Isaiah 6:5', 'Isaiah 59:2', '2 Corinthians 5:21', 'Romans 4:24–25']);
  assertEqual([...page.querySelectorAll('.bridge-part li b')].map(b => b.textContent), ['God is Glorious.', 'God is Just.', 'God is Holy.']);
  assert(!page.textContent.includes('few days'), 'no First Ten Days cross-reference');
  const art = page.querySelector('svg.bridge-art');
  assertEqual(art.getAttribute('role'), 'img');
  assertIncludes(art.getAttribute('aria-label'), 'cross of Jesus bridging it');
  assertEqual(art.querySelectorAll('[data-at]').length, 31);
  assertEqual([...page.querySelectorAll('.bridge-steps li')].map(li => li.textContent), ['God', 'Man', 'Jesus', 'Response']);
});

test('gospel: each part draws as it is read, and the end of the page finishes it', () => {
  // The drawing at the top ends at 300px; a part starts once its top slides 10px under it.
  const parts = [{ top: 300, height: 500 }, { top: 800, height: 500 }, { top: 1300, height: 500 }, { top: 1800, height: 500 }];
  assertEqual(bridgeProgress(300, 5000, parts), 0, 'at the top of the page nothing is drawn yet');
  assertEqual(bridgeProgress(300, 5000, [{ top: 900, height: 500 }]), 0, 'a part below the drawing has not started');
  assertClose(bridgeProgress(300, 5000, [{ top: 140, height: 500 }]), 0.5, 1e-9, 'halfway to 60% of the part');
  assertEqual(bridgeProgress(300, 5000, [{ top: -100, height: 500 }]), 1);
  // The last part gets only what's left of the page: here 150px of travel in all, 50px of it done.
  assertClose(bridgeProgress(300, 100, [{ top: 240, height: 500 }]), 1 / 3, 1e-9);
  const bottom = [{ top: -1300, height: 500 }, { top: -800, height: 500 }, { top: -300, height: 500 }, { top: 300, height: 450 }];
  assertEqual(bridgeProgress(300, 0, bottom), 4, 'scrolled to the bottom, the drawing is complete');
  assertEqual(bridgeProgress(300, 0, [{ top: 900, height: 500 }]), 1, 'even if the last part never reaches the drawing');
});

test('gospel: the last part draws over all the scrolling left once the part before it is done', () => {
  // Line at 290. Jesus (third) is 400px past it, done at 300, so 100px past done; 100px of page left.
  const parts = [{ top: -2000, height: 500 }, { top: -1500, height: 500 }, { top: -110, height: 500 }, { top: 400, height: 600 }];
  assertClose(bridgeProgress(300, 100, parts), 3.5, 1e-9, 'halfway through what is left');
  assertClose(bridgeProgress(300, 300, parts), 3.25, 1e-9);
  assertEqual(bridgeProgress(300, 0, parts), 4);
  const justDone = [{ top: -2000, height: 500 }, { top: -1500, height: 500 }, { top: -10, height: 500 }, { top: 500, height: 600 }];
  assertEqual(bridgeProgress(300, 400, justDone), 3, 'it starts only once the part before is finished');
});

test('gospel: drawing shows lines up to the reading point, and the person walks over at the end', () => {
  const fx = renderGospel().querySelector('.bridge');
  bridgeApply(fx, 0);
  const first = fx.querySelector('path[data-at="0,0.45"]');
  assertEqual(first.style.opacity, '0');
  assertEqual(fx.querySelector('text[data-at="0.22,0.42"]').style.opacity, '0', 'labels wait their turn too');
  assertEqual(fx.querySelector('[data-who]').getAttribute('transform'), 'translate(0.0,0.0)');
  bridgeApply(fx, 1);
  assertEqual(first.style.opacity, '1');
  assertEqual(first.style.strokeDashoffset, '0');
  assertEqual(fx.querySelector('.bridge-steps li.now').textContent, 'Man');
  bridgeApply(fx, 4);
  assertEqual(fx.querySelector('[data-who]').getAttribute('transform'), 'translate(218.0,0.0)');
  assertEqual(fx.querySelectorAll('.bridge-steps li.done').length, 4);
  assertEqual(fx.querySelector('text[data-at="0.22,0.42"]').style.getPropertyValue('--p'), '1.000');
});

test('gospel: with Reduce Motion the drawing is simply complete', () => {
  const real = window.matchMedia;
  const box = h('div', null, renderGospel());
  try {
    window.matchMedia = q => ({ matches: q.includes('reduce'), media: q });
    updateBridge(box);
    const fx = box.querySelector('.bridge');
    assert(!fx.classList.contains('drawing'), 'no drawing-in effect');
    assertEqual([...fx.querySelectorAll('[data-at]')].every(el => el.style.opacity === '1'), true);
    assertEqual(fx.querySelector('[data-who]').getAttribute('transform'), 'translate(218.0,0.0)');
  } finally {
    window.matchMedia = real;
  }
});

test('gospel: the drawing names its colored marks: God’s light, the cross, and the faith arrow and words', () => {
  const art = renderGospel().querySelector('svg.bridge-art');
  assertEqual(art.querySelectorAll('g.god path').length, 5, 'the lines around God');
  assertEqual(art.querySelectorAll('path.cross').length, 1);
  assertEqual(art.querySelectorAll('path.faith').length, 3, 'the arrow and its head');
  assertEqual(art.querySelector('text.faith').textContent, 'in faith');
  assertEqual([...art.querySelectorAll('.red')].map(el => el.textContent), ['SIN'], 'only SIN stays in red');
});
