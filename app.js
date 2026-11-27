/* ============================================================
   THE APP — draws the screens (Today, Week, Plan, Catch up,
   Account) and handles taps. Everything here is built with
   plain DOM calls; names people type (usernames) are always set
   as text, never as HTML.
   ============================================================ */

const PATTERNS = ['pat-dots', 'pat-diag', 'pat-lines'];
const TOTAL_READINGS = 780;
const SVG_NS = 'http://www.w3.org/2000/svg';

const ICONS = {
  check: ['0 0 24 24', '<path d="M5 12.5l4.5 4.5L19 7.5"/>'],
  link: ['0 0 16 16', '<path d="M9 3h4v4M13 3 7.5 8.5M11 9.5V13H3V5h3.5"/>'],
  clock: ['0 0 16 16', '<circle cx="8" cy="8" r="5.5"/><path d="M8 5v3.5"/>'],
  today: ['0 0 24 24', '<rect x="4" y="5" width="16" height="15"/><path d="M4 10h16M9 3v4M15 3v4"/>'],
  week: ['0 0 24 24', '<path d="M4 6h16M4 12h16M4 18h16"/>'],
  plan: ['0 0 24 24', '<rect x="4" y="4" width="6" height="6"/><rect x="14" y="4" width="6" height="6"/><rect x="4" y="14" width="6" height="6"/><rect x="14" y="14" width="6" height="6"/>'],
  account: ['0 0 24 24', '<circle cx="12" cy="9" r="4"/><path d="M5 20c1.5-3.5 4-5 7-5s5.5 1.5 7 5"/>'],
  prev: ['0 0 24 24', '<path d="M15 5l-7 7 7 7"/>'],
  next: ['0 0 24 24', '<path d="M9 5l7 7-7 7"/>'],
};

const ERROR_MESSAGES = {
  bad_credentials: "That PIN doesn't match. Try again.",
  locked: 'Too many tries. Try again in 15 minutes.',
  username_taken: 'That username is taken.',
  invalid_username: 'Use 3–20 letters, numbers or _.',
  invalid_pin: 'Use 4–8 digits.',
  no_such_user: 'No account with that username.',
  bad_request: "You can't add yourself.",
  bad_token: 'Please sign in again.',
  busy: 'The server is busy. Try again in a moment.',
  network: "Couldn't reach the server. Your checkmarks are saved on this phone.",
};

let selectedPartner = 0;

/* ---------- Small DOM helpers ---------- */

function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  Object.entries(props || {}).forEach(([k, v]) => {
    if (v === null || v === undefined || v === false) return;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else el.setAttribute(k, v === true ? '' : v);
  });
  kids.flat(Infinity).forEach(kid => {
    if (kid === null || kid === undefined || kid === false) return;
    el.append(kid instanceof Node ? kid : String(kid));
  });
  return el;
}

function icon(name, cls) {
  const [viewBox, paths] = ICONS[name];
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', viewBox);
  svg.setAttribute('aria-hidden', 'true');
  if (cls) svg.setAttribute('class', cls);
  svg.innerHTML = paths; // fixed markup from ICONS above, never user text
  return svg;
}

const longDate = d => d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
const shortDate = d => d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
const dayName = d => d.toLocaleDateString('en-US', { weekday: 'short' });
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const trackClass = track => (track === 'ps' || track === 'pr' ? 'wis' : track);

/* ---------- Routes ---------- */

function parseRoute(hash) {
  const path = String(hash || '').replace(/^#/, '');
  const week = path.match(/^\/week\/(\d+)$/);
  if (week) return { name: 'week', week: Math.min(WEEKS, Math.max(1, Number(week[1]))) };
  if (['/plan', '/catchup', '/account'].includes(path)) return { name: path.slice(1) };
  return { name: 'today' };
}

function currentWeek(now) {
  const day = planDayForDate(now);
  if (day.status === 'before') return 1;
  if (day.status === 'after') return WEEKS;
  return day.week;
}

/* ---------- Partners ---------- */

function mutualPartners(syncState) {
  return ((syncState && syncState.partners) || [])
    .filter(p => p.status === 'mutual')
    .map((p, i) => ({ name: p.username, progress: p.progress || {}, pattern: PATTERNS[i % PATTERNS.length] }));
}

// Who else read this: names with one or two partners, initials with more, "+N" past three.
function partnerTags(partners, id) {
  const readers = partners.filter(p => isDone(p.progress, id));
  if (!readers.length) return null;
  const short = partners.length >= 3;
  const shown = readers.slice(0, 3).map(p =>
    h('span', { class: 'who', title: `${p.name} read this` }, h('i', { class: `swatch ${p.pattern}` }), short ? p.name[0].toUpperCase() : p.name));
  if (readers.length > 3) shown.push(h('span', { class: 'who more', title: readers.slice(3).map(p => p.name).join(', ') }, `+${readers.length - 3}`));
  return h('span', { class: 'partners' }, shown);
}

/* ---------- Shared pieces ---------- */

function topBar(syncState) {
  const status = syncState && syncState.status;
  let marker = null;
  if (status === 'pending' || status === 'offline') {
    marker = h('span', { class: 'sync' }, icon('clock'), 'Not synced yet');
  } else if (status === 'signed-out-expired') {
    marker = h('a', { class: 'sync', href: '#/account' }, 'Please sign in again');
  }
  return h('div', { class: 'bar' }, h('span', { text: 'Bible Reading 2027' }), marker);
}

function readingRow(item, done, partners, settings) {
  const links = settings.showLinks
    ? bibliaLinks(item.ref, settings.translation).map(l =>
      h('a', { class: 'read-online', href: l.url, target: '_blank', rel: 'noopener', 'aria-label': `Read ${l.label} online` }, icon('link')))
    : [];
  return h('li', { class: trackClass(item.track) },
    h('button', { class: 'tick', type: 'button', 'aria-pressed': String(done), 'aria-label': `Mark ${displayRef(item.ref)} read`, dataset: { id: item.id } },
      icon('check')),
    h('div', { class: 'what' },
      h('div', { class: 'ref', text: displayRef(item.ref) }),
      h('div', { class: 'track' }, h('span', { text: item.label }), links)),
    partnerTags(partners, item.id));
}

function readingList(items, progress, partners, settings) {
  return h('ul', { class: 'readings' }, items.map(item => readingRow(item, isDone(progress, item.id), partners, settings)));
}

function catchUpLine(progress, now) {
  const n = catchUpIds(progress, now).length;
  return n ? h('p', { class: 'catch' }, h('a', { href: '#/catchup', text: `${plural(n, 'reading')} to catch up` })) : null;
}

function weekGrid(week, now, progress, partners) {
  const day = planDayForDate(now);
  const today = day.status === 'reading' && day.week === week ? day.weekday : 0;
  if (selectedPartner >= partners.length) selectedPartner = 0;
  const shown = partners[selectedPartner];

  const head = [h('span')].concat([1, 2, 3, 4, 5].map(d =>
    h('span', { class: d === today ? 'day now' : 'day', text: dayName(dateFor(week, d)) })));
  const rows = [['nt', 'New Test.'], ['ot', 'Old Test.'], ['wis', 'Psalm/Prov.']].map(([cls, label], r) => [
    h('span', { class: `label ${cls}`, text: label }),
    [1, 2, 3, 4, 5].map(d => {
      const id = readingsFor(week, d)[r].id;
      return h('span', { class: `cell ${cls}${d === today ? ' now' : ''}` },
        h('i', { class: isDone(progress, id) ? 'me on' : 'me' }),
        shown ? h('i', { class: `her ${shown.pattern}${isDone(shown.progress, id) ? ' on' : ''}` }) : null);
    }),
  ]);

  const counts = shown
    ? h('p', { class: 'counts', text: [`You ${weekDoneCount(progress, week)} of 15`]
      .concat(partners.map(p => `${p.name} ${weekDoneCount(p.progress, week)} of 15`)).join(', ') })
    : null;
  const picker = partners.length >= 2
    ? h('label', { class: 'switch-label' }, 'Showing ',
      h('select', { class: 'partner-switch', 'aria-label': 'Whose week to show' },
        partners.map((p, i) => h('option', { value: String(i), selected: i === selectedPartner, text: p.name }))))
    : null;
  const key = shown
    ? h('div', { class: 'key' }, h('span', null, h('i', { class: 'solid' }), 'You'), h('span', null, h('i', { class: `swatch ${shown.pattern}` }), shown.name))
    : null;

  return h('section', { class: 'week-grid' },
    h('div', { class: 'grid-head' }, h('h2', { text: 'This week' }), picker),
    h('div', { class: 'grid' }, head, rows),
    key, counts);
}

function previewList(week, weekday) {
  return h('ul', { class: 'preview' }, readingsFor(week, weekday).map(item =>
    h('li', { class: trackClass(item.track) }, h('i', { class: 'solid' }), h('span', { text: displayRef(item.ref) }), h('span', { class: 'muted', text: item.label }))));
}

function itemsForIds(ids) {
  const groups = [];
  ids.forEach(id => {
    const [, w, d] = id.match(/^w(\d\d)d(\d)/);
    const key = `${w}-${d}`;
    let g = groups.find(x => x.key === key);
    if (!g) groups.push(g = { key, week: Number(w), weekday: Number(d), items: [] });
    g.items.push(readingsFor(g.week, g.weekday).find(r => r.id === id));
  });
  return groups;
}

/* ---------- Screens ---------- */

function renderToday(now, progress, settings, syncState) {
  const day = planDayForDate(now);
  const partners = mutualPartners(syncState);
  const root = h('div', { class: 'screen' }, h('header', null, topBar(syncState)));
  const main = h('main');
  root.append(main);

  if (day.status === 'before') {
    root.querySelector('header').append(h('h1', { text: 'Starts Monday, January 4' }),
      h('p', { class: 'seq', text: `${plural(day.daysUntilStart, 'day')} to go` }));
    main.append(h('h2', { text: 'The first day' }), previewList(1, 1),
      h('p', { class: 'catch' }, h('a', { href: '#/week/1', text: 'Preview week 1' })));
    return root;
  }
  if (day.status === 'after') {
    const read = Object.keys(progress).filter(id => isDone(progress, id)).length;
    root.querySelector('header').append(h('h1', { text: 'The year is done' }),
      h('p', { class: 'seq', text: `You read ${read} of ${TOTAL_READINGS} readings.` }));
    main.append(h('p', { class: 'catch' }, h('a', { href: '#/plan', text: 'Look back over the year' })));
    return root;
  }

  root.querySelector('header').append(h('h1', { text: longDate(now) }));
  if (day.status === 'weekend') {
    root.querySelector('header').append(h('p', { class: 'seq', text: 'Weekend. Catch up or rest.' }));
    const behind = catchUpIds(progress, now);
    if (behind.length) {
      main.append(h('h2', { text: 'To catch up' }),
        readingList(itemsForIds(behind.slice(0, 6)).flatMap(g => g.items), progress, partners, settings));
      if (behind.length > 6) main.append(h('p', { class: 'catch' }, h('a', { href: '#/catchup', text: `See all ${behind.length}` })));
    }
    main.append(h('h2', { text: `Monday, ${shortDate(dateFor(day.nextWeek, 1))}` }), previewList(day.nextWeek, 1));
    main.append(weekGrid(day.week, now, progress, partners));
    return root;
  }

  root.querySelector('header').append(h('p', { class: 'seq', text: `Week ${day.week}, day ${day.weekday}` }));
  main.append(readingList(readingsFor(day.week, day.weekday), progress, partners, settings),
    weekGrid(day.week, now, progress, partners),
    catchUpLine(progress, now));
  return root;
}

function renderWeek(week, now, progress, settings, syncState) {
  const partners = mutualPartners(syncState);
  const today = planDayForDate(now);
  const root = h('div', { class: 'screen' },
    h('header', null, topBar(syncState),
      h('div', { class: 'week-nav' },
        week > 1 ? h('a', { class: 'prev', href: `#/week/${week - 1}`, 'aria-label': `Week ${week - 1}` }, icon('prev')) : h('span'),
        h('h1', { text: `Week ${week}` }),
        week < WEEKS ? h('a', { class: 'next', href: `#/week/${week + 1}`, 'aria-label': `Week ${week + 1}` }, icon('next')) : h('span')),
      h('p', { class: 'seq centered', text: `${shortDate(dateFor(week, 1))} to ${shortDate(dateFor(week, 5))}` })));
  const main = h('main');
  for (let d = 1; d <= 5; d++) {
    const isToday = today.status === 'reading' && today.week === week && today.weekday === d;
    main.append(h('h2', { text: longDate(dateFor(week, d)) + (isToday ? ', today' : '') }),
      readingList(readingsFor(week, d), progress, partners, settings));
  }
  root.append(main);
  return root;
}

function renderPlan(now, progress) {
  const day = planDayForDate(now);
  const openWeek = day.status === 'before' ? 1 : day.week || 0;
  const main = h('main');
  for (let w = 1; w <= WEEKS; w++) {
    const days = [1, 2, 3, 4, 5].map(d => h('li', null,
      h('span', { class: 'muted', text: dayName(dateFor(w, d)) }),
      readingsFor(w, d).map(r => h('span', { class: `${trackClass(r.track)}${isDone(progress, r.id) ? ' done' : ''}`, text: displayRef(r.ref) }))));
    main.append(h('details', { open: w === openWeek },
      h('summary', null, h('b', { text: `Week ${w}` }), h('span', { class: 'muted', text: `${shortDate(dateFor(w, 1))} to ${shortDate(dateFor(w, 5))}` }),
        h('span', { class: 'count', text: `${weekDoneCount(progress, w)} of 15` })),
      h('ul', { class: 'plan-days' }, days),
      h('a', { class: 'open-week', href: `#/week/${w}`, text: `Open week ${w}` })));
  }
  return h('div', { class: 'screen' },
    h('header', null, h('div', { class: 'bar' }, h('span', { text: 'Bible Reading 2027' })),
      h('h1', { text: 'The whole year' }),
      h('p', { class: 'seq', text: `${TOTAL_READINGS} readings, Monday to Friday, January 4 to December 31.` })),
    main);
}

function renderCatchUp(now, progress, settings, syncState) {
  const ids = catchUpIds(progress, now);
  const partners = mutualPartners(syncState);
  const main = h('main');
  if (!ids.length) {
    main.append(h('p', { class: 'empty', text: "You're all caught up." }), h('p', { class: 'catch' }, h('a', { href: '#/', text: 'Back to today' })));
  } else {
    itemsForIds(ids).forEach(g => main.append(h('h2', { text: longDate(dateFor(g.week, g.weekday)) }), readingList(g.items, progress, partners, settings)));
  }
  return h('div', { class: 'screen' },
    h('header', null, topBar(syncState), h('h1', { text: 'Catch up' }),
      ids.length ? h('p', { class: 'seq', text: `${plural(ids.length, 'reading')} from earlier days` }) : null),
    main);
}

function field(label, name, extra) {
  return h('label', { class: 'field' }, h('span', { text: label }), h('input', Object.assign({ name, autocomplete: 'off', autocapitalize: 'none', spellcheck: 'false' }, extra)));
}

function pinField(label, name) {
  return field(label, name, { type: 'password', inputmode: 'numeric', pattern: '[0-9]*', minlength: '4', maxlength: '8', required: true });
}

function forgotHref(username) {
  return `mailto:${HELP_EMAIL}?subject=PIN%20reset&body=${encodeURIComponent(`Username: ${username || ''}`)}`;
}

function accountSection(account, syncState) {
  if (account) {
    const partners = (syncState.partners || []).map(p => h('li', null,
      h('span', { class: 'name', text: p.username }),
      h('span', { class: 'muted', text: p.status === 'mutual' ? 'Reading together' : 'Waiting for them to add you' }),
      h('button', { type: 'button', class: 'text-btn', dataset: { remove: p.username }, text: 'Remove' })));
    const requests = (syncState.requests || []).map(name => h('li', null,
      h('span', { class: 'name', text: name }), h('span', { class: 'muted', text: 'added you' }),
      h('button', { type: 'button', class: 'btn', dataset: { addback: name }, text: 'Add back' })));
    return [
      h('section', null, h('h2', { text: 'Your account' }), h('p', null, 'Signed in as ', h('b', { text: account.username }))),
      h('section', null, h('h2', { text: 'Reading partners' }),
        h('p', { class: 'muted', text: "You see each other's checkmarks once you've both added each other." }),
        partners.length || requests.length ? h('ul', { class: 'people' }, requests, partners) : null,
        h('form', { class: 'add-partner' }, field('Add a partner', 'partner', { placeholder: 'Their username', required: true }),
          h('button', { class: 'btn', type: 'submit', text: 'Add' }), h('p', { class: 'error', role: 'alert' }))),
      h('section', null,
        hasPending() ? h('p', { class: 'muted', text: "Some checkmarks haven't synced yet. Signing out now removes them from this phone." }) : null,
        h('button', { type: 'button', class: 'btn signout', text: 'Sign out' })),
    ];
  }
  return [
    syncState.status === 'signed-out-expired'
      ? h('p', { class: 'notice', text: 'You were signed out. Sign in again to keep syncing; your checkmarks on this phone are safe.' }) : null,
    h('section', null, h('h2', { text: 'Optional account' }),
      h('p', { class: 'muted', text: "An account backs up your checkmarks and lets reading partners see them. You don't need one to use the plan." })),
    h('form', { class: 'signin' }, h('h3', { text: 'Sign in' }), field('Username', 'username', { required: true }), pinField('PIN', 'pin'),
      h('div', { class: 'actions' }, h('button', { class: 'btn primary', type: 'submit', text: 'Sign in' }),
        HELP_EMAIL ? h('a', { class: 'forgot', href: forgotHref(''), text: 'Forgot your PIN?' }) : null),
      h('p', { class: 'error', role: 'alert' })),
    h('form', { class: 'signup' }, h('h3', { text: 'Create an account' }), field('Username', 'username', { required: true }),
      pinField('PIN (4–8 digits)', 'pin'), pinField('PIN again', 'pin2'),
      h('div', { class: 'actions' }, h('button', { class: 'btn', type: 'submit', text: 'Create account' })),
      h('p', { class: 'error', role: 'alert' })),
  ];
}

function renderAccount(settings, account, syncState) {
  const standalone = typeof matchMedia === 'function' && matchMedia('(display-mode: standalone)').matches;
  return h('div', { class: 'screen' },
    h('header', null, topBar(syncState), h('h1', { text: 'Account and settings' })),
    h('main', { class: 'account' },
      syncEnabled() ? accountSection(account, syncState) : null,
      h('section', null, h('h2', { text: 'Settings' }),
        h('label', { class: 'field' }, h('span', { text: 'Translation for online links' }),
          h('select', { name: 'translation' }, TRANSLATIONS.map(t => h('option', { value: t.code, selected: t.code === settings.translation, text: t.name })))),
        h('label', { class: 'check-field' }, h('input', { type: 'checkbox', name: 'showLinks', checked: settings.showLinks }),
          h('span', { text: 'Show links to read online' }))),
      standalone ? null : h('p', { class: 'muted tip', text: 'Tip: add this app to your home screen. Your checkmarks are kept safest there.' })));
}

function tabBar(route, now) {
  const tabs = [['today', '#/', 'Today'], ['week', `#/week/${currentWeek(now)}`, 'Week'], ['plan', '#/plan', 'Plan'], ['account', '#/account', 'Account']];
  const active = route.name === 'catchup' ? 'today' : route.name;
  return h('nav', { class: 'tabs', 'aria-label': 'Sections' }, tabs.map(([name, href, label]) =>
    h('a', { href, class: name === active ? 'on' : null, 'aria-current': name === active ? 'page' : null }, icon(name), label)));
}

/* ---------- Running the app ---------- */

// "?date=2027-03-15" in the address previews that day (handy before January 4).
function appNow(search, real = new Date()) {
  const m = String(search || '').match(/[?&]date=(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return real;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), real.getHours(), real.getMinutes());
}

let renderTimer = null;

function render() {
  const app = document.getElementById('app');
  if (!app) return;
  const now = appNow(location.search);
  const route = parseRoute(location.hash);
  const progress = getProgress(), settings = getSettings(), state = getSyncState();
  const screens = {
    today: () => renderToday(now, progress, settings, state),
    week: () => renderWeek(route.week, now, progress, settings, state),
    plan: () => renderPlan(now, progress),
    catchup: () => renderCatchUp(now, progress, settings, state),
    account: () => renderAccount(settings, getAccount(), state),
  };
  const focusedId = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.id : null;
  app.replaceChildren(screens[route.name](), tabBar(route, now));
  if (focusedId) {
    const again = app.querySelector(`.tick[data-id="${focusedId}"]`);
    if (again) again.focus();
  }
}

function renderSoon(ms) {
  clearTimeout(renderTimer);
  renderTimer = setTimeout(render, ms);
}

function toggleReading(button) {
  const id = button.dataset.id;
  const nowDone = !isDone(getProgress(), id);
  setDone(id, nowDone);
  noteLocalChange();
  button.classList.remove('refresh');
  void button.offsetWidth; // restart the e-ink refresh animation
  button.classList.add('refresh');
  button.setAttribute('aria-pressed', String(nowDone));
  renderSoon(320);
}

function showError(form, res) {
  form.querySelector('.error').textContent = ERROR_MESSAGES[res.error] || ERROR_MESSAGES.network;
}

async function handleSubmit(form) {
  const data = Object.fromEntries(new FormData(form));
  const button = form.querySelector('button[type="submit"]');
  if (form.classList.contains('signup') && data.pin !== data.pin2) {
    form.querySelector('.error').textContent = "The two PINs don't match.";
    return;
  }
  button.disabled = true;
  let res;
  if (form.classList.contains('signin')) res = await signIn(data.username, data.pin);
  else if (form.classList.contains('signup')) res = await signUp(data.username, data.pin);
  else res = await addPartner(data.partner);
  button.disabled = false;
  if (res.ok) render();
  else showError(form, res);
}

function formFocused() {
  const el = document.activeElement;
  return !!el && ['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName);
}

function boot() {
  const app = document.getElementById('app');
  if (!app) return;

  app.addEventListener('click', e => {
    const tick = e.target.closest('button.tick');
    if (tick) return toggleReading(tick);
    const remove = e.target.closest('[data-remove]');
    if (remove) return removePartner(remove.dataset.remove).then(render);
    const addBack = e.target.closest('[data-addback]');
    if (addBack) return addPartner(addBack.dataset.addback).then(render);
    if (e.target.closest('.signout')) return signOut().then(render);
    return undefined;
  });
  app.addEventListener('change', e => {
    if (e.target.name === 'translation') saveSettings({ translation: e.target.value });
    else if (e.target.name === 'showLinks') saveSettings({ showLinks: e.target.checked });
    else if (e.target.classList.contains('partner-switch')) selectedPartner = Number(e.target.value);
    else return;
    render();
  });
  app.addEventListener('input', e => {
    const form = e.target.closest('form.signin');
    const forgot = form && form.querySelector('a.forgot');
    if (forgot && e.target.name === 'username') forgot.href = forgotHref(e.target.value.trim());
  });
  app.addEventListener('submit', e => {
    e.preventDefault();
    handleSubmit(e.target);
  });

  window.addEventListener('hashchange', () => { render(); window.scrollTo(0, 0); });
  onSyncChange(() => { if (!formFocused()) render(); });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') { render(); scheduleSync(); }
  });
  window.addEventListener('online', scheduleSync);

  render();
  if (syncEnabled() && getAccount()) syncNow();
}

document.addEventListener('DOMContentLoaded', boot);
