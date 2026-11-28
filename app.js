/* ============================================================
   THE APP — draws the screens (Today, Week, Plan, Catch up,
   Account) and handles taps. Everything here is built with
   plain DOM calls; names people type (usernames) are always set
   as text, never as HTML.
   ============================================================ */

const PATTERNS = ['pat-dots', 'pat-diag', 'pat-lines'];
const READING_DAYS = 260; // a "reading" in counts the person sees = one day's set of passages
const SVG_NS = 'http://www.w3.org/2000/svg';

const ICONS = {
  check: ['0 0 24 24', '<path d="M5 12.5l4.5 4.5L19 7.5"/>'],
  link: ['0 0 16 16', '<path d="M9 3h4v4M13 3 7.5 8.5M11 9.5V13H3V5h3.5"/>'],
  clock: ['0 0 16 16', '<circle cx="8" cy="8" r="5.5"/><path d="M8 5v3.5"/>'],
  today: ['0 0 24 24', '<rect x="4" y="5" width="16" height="15"/><path d="M4 10h16M9 3v4M15 3v4"/>'],
  week: ['0 0 24 24', '<path d="M4 6h16M4 12h16M4 18h16"/>'],
  plan: ['0 0 24 24', '<rect x="4" y="4" width="6" height="6"/><rect x="14" y="4" width="6" height="6"/><rect x="4" y="14" width="6" height="6"/><rect x="14" y="14" width="6" height="6"/>'],
  account: ['0 0 24 24', '<circle cx="12" cy="9" r="4"/><path d="M5 20c1.5-3.5 4-5 7-5s5.5 1.5 7 5"/>'],
  extras: ['0 0 24 24', '<circle cx="12" cy="12" r="9"/><circle cx="8" cy="12" r="0.9"/><circle cx="12" cy="12" r="0.9"/><circle cx="16" cy="12" r="0.9"/>'],
  prev: ['0 0 24 24', '<path d="M15 5l-7 7 7 7"/>'],
  next: ['0 0 24 24', '<path d="M9 5l7 7-7 7"/>'],
  up: ['0 0 24 24', '<path d="M5 15l7-7 7 7"/>'],
  down: ['0 0 24 24', '<path d="M5 9l7 7 7-7"/>'],
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
  server_error: 'Something went wrong on the server. Your checkmarks are saved on this phone.',
  network: "Couldn't reach the server. Your checkmarks are saved on this phone.",
};

let selectedPartner = 0;
let confirmingCatchUp = false; // the "Catch me up" confirm step is showing
let reordering = false; // the Account page's "Change order" view is showing

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

// Like el.append, but skips null/false (Element.append would print "null").
function append(el, ...kids) {
  kids.flat(Infinity).forEach(kid => {
    if (kid !== null && kid !== undefined && kid !== false) el.append(kid);
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
  const clampWeek = n => Math.min(WEEKS, Math.max(1, Number(n)));
  const yearWeek = path.match(/^\/week\/(\d{4})\/(\d+)$/);
  if (yearWeek) return { name: 'week', year: Math.max(FIRST_YEAR, Number(yearWeek[1])), week: clampWeek(yearWeek[2]) };
  const week = path.match(/^\/week\/(\d+)$/);
  if (week) return { name: 'week', week: clampWeek(week[1]) };
  const planYear = path.match(/^\/plan\/(\d{4})$/);
  if (planYear) return { name: 'plan', year: Math.max(FIRST_YEAR, Number(planYear[1])) };
  const printYear = path.match(/^\/print\/(\d{4})$/);
  if (printYear) return { name: 'print', year: Math.max(FIRST_YEAR, Number(printYear[1])) };
  if (['/plan', '/catchup', '/account', '/extras', '/print', '/about', '/gospel', '/hear', '/maps', '/requests'].includes(path)) return { name: path.slice(1) };
  return { name: 'today' };
}

function currentWeek(now) {
  const day = planDayForDate(now);
  if (day.status === 'before') return 1;
  if (day.status === 'after') return WEEKS;
  return day.week;
}

const currentYear = now => planDayForDate(now).year;

// "January 4 to December 31", or "January 5 to January 1, 2027" when the plan ends next January.
function planRange(year) {
  const end = dateFor(year, WEEKS, 5);
  return `${shortDate(planStart(year))} to ${shortDate(end)}${end.getFullYear() !== year ? `, ${end.getFullYear()}` : ''}`;
}

/* ---------- Partners ---------- */

// The sync state as this phone shows it: partners in the order saved on this
// phone, and requests you've dismissed here set aside (as "dismissed").
function shapePartners(state, account) {
  if (!account) return state;
  const hidden = getDismissed(account.username);
  const requests = state.requests || [];
  return Object.assign({}, state, {
    partners: orderPartners(state.partners || [], getPartnerOrder(account.username)),
    requests: requests.filter(n => !hidden.includes(n.toLowerCase())),
    dismissed: requests.filter(n => hidden.includes(n.toLowerCase())),
  });
}

// The partner order after moving one name up (-1) or down (+1).
function movedOrder(names, name, delta) {
  const list = names.map(n => n.toLowerCase());
  const i = list.indexOf(name.toLowerCase()), j = i + delta;
  if (i !== -1 && j >= 0 && j < list.length) [list[i], list[j]] = [list[j], list[i]];
  return list;
}

function mutualPartners(syncState) {
  return ((syncState && syncState.partners) || [])
    .filter(p => p.status === 'mutual')
    .map((p, i) => ({ name: p.username, progress: withYears(p.progress || {}), pattern: PATTERNS[i % PATTERNS.length] }));
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
  if (status === 'offline') {
    marker = h('span', { class: 'sync' }, icon('clock'), 'Not synced yet');
  } else if (status === 'signed-out-expired') {
    marker = h('a', { class: 'sync', href: '#/account' }, 'Please sign in again');
  }
  return h('div', { class: 'bar' }, h('span', { text: 'Bible Reading' }), marker);
}

function readingRow(item, done, partners, settings) {
  const links = settings.showLinks
    ? bibliaLinks(item.ref).map(l =>
      h('a', { class: 'read-online', href: appLink(l.url, !!settings.android), target: '_blank', rel: 'noopener', 'aria-label': `Read ${l.label} online` }, icon('link')))
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

// "New Testament only" shows just the NT track; otherwise null means the whole plan.
const tracksFor = settings => (settings && settings.ntOnly ? ['nt'] : null);
const visible = (items, settings) => items.filter(i => inTracks(i.id, tracksFor(settings)));

function catchUpLine(progress, now, settings) {
  if (settings && settings.hideBehind) return null;
  const n = catchUpDays(progress, now, tracksFor(settings));
  return n ? h('p', { class: 'catch' }, h('a', { href: '#/catchup', text: `${plural(n, 'reading')} to catch up` })) : null;
}

function weekGrid(year, week, now, progress, partners, settings) {
  const tracks = tracksFor(settings);
  const day = planDayForDate(now);
  const today = day.status === 'reading' && day.year === year && day.week === week ? day.weekday : 0;
  if (selectedPartner >= partners.length) selectedPartner = 0;
  const shown = partners[selectedPartner];

  const head = [h('span')].concat([1, 2, 3, 4, 5].map(d =>
    h('span', { class: d === today ? 'day now' : 'day', text: dayName(dateFor(year, week, d)) })));
  const rows = [['nt', 'New Test.'], ['ot', 'Old Test.'], ['wis', 'Psalm/Prov.']].map(([cls, label], r) => (tracks && !tracks.includes(cls) ? [] : [
    h('span', { class: `label ${cls}`, text: label }),
    [1, 2, 3, 4, 5].map(d => {
      const id = readingsFor(year, week, d)[r].id;
      return h('span', { class: `cell ${cls}${d === today ? ' now' : ''}` },
        h('i', { class: isDone(progress, id) ? 'me on' : 'me' }),
        shown ? h('i', { class: `her ${shown.pattern}${isDone(shown.progress, id) ? ' on' : ''}` }) : null);
    }),
  ]));

  const counts = partners.length >= 2
    ? h('p', { class: 'counts', text: [`You ${weekDaysDone(progress, year, week, tracks)} of 5`]
      .concat(partners.map(p => `${p.name} ${weekDaysDone(p.progress, year, week, tracks)} of 5`)).join(', ') })
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

function previewList(year, week, weekday, settings) {
  return h('ul', { class: 'preview' }, visible(readingsFor(year, week, weekday), settings).map(item =>
    h('li', { class: trackClass(item.track) }, h('i', { class: 'solid' }), h('span', { text: displayRef(item.ref) }), h('span', { class: 'muted', text: item.label }))));
}

function itemsForIds(ids) {
  const groups = [];
  ids.forEach(id => {
    const p = parseItemId(id);
    if (!p) return;
    const key = `${p.year}-${p.week}-${p.weekday}`;
    let g = groups.find(x => x.key === key);
    if (!g) groups.push(g = { key, year: p.year, week: p.week, weekday: p.weekday, items: [] });
    g.items.push(readingsFor(p.year, p.week, p.weekday).find(r => r.id === id));
  });
  return groups;
}

// Catch-up order everywhere: newest week first; within a week, Monday to Friday.
function newestWeekFirst(groups) {
  return groups.slice().sort((a, b) => (b.year - a.year) || (b.week - a.week) || (a.weekday - b.weekday));
}

/* ---------- Screens ---------- */

function renderToday(now, progress, settings, syncState) {
  const day = planDayForDate(now);
  const partners = mutualPartners(syncState);
  const root = h('div', { class: 'screen' }, h('header', null, topBar(syncState)));
  const main = h('main');
  append(root, main);

  if (day.status === 'before') {
    append(root.querySelector('header'), h('h1', { text: `Starts ${longDate(planStart(day.year))}` }),
      h('p', { class: 'seq', text: `${plural(day.daysUntilStart, 'day')} to go` }));
    append(main, h('h2', { text: 'The first day' }), previewList(day.year, 1, 1, settings),
      h('p', { class: 'catch' }, h('a', { href: `#/week/${day.year}/1`, text: 'Preview week 1' })));
    return root;
  }
  if (day.status === 'after') {
    let read = 0;
    for (let w = 1; w <= WEEKS; w++) read += weekDaysDone(progress, day.year, w, tracksFor(settings));
    append(root.querySelector('header'), h('h1', { text: 'The year is done' }),
      h('p', { class: 'seq', text: `You read ${read} of ${READING_DAYS} readings in ${day.year}.` }));
    append(main, h('p', null, `The plan starts again ${longDate(planStart(day.year + 1))}.`),
      h('p', { class: 'catch' }, h('a', { href: `#/plan/${day.year}`, text: 'Look back over the year' })));
    return root;
  }

  append(root.querySelector('header'), h('h1', { text: longDate(now) }));
  if (day.status === 'weekend') {
    append(root.querySelector('header'), h('p', { class: 'seq', text: 'Weekend. Catch up or rest.' }));
    const behind = settings.hideBehind ? [] : catchUpIds(progress, now, tracksFor(settings));
    if (behind.length) {
      append(main, h('h2', { text: 'To catch up' }));
      let shown = 0;
      newestWeekFirst(itemsForIds(behind)).forEach(g => {
        if (shown >= 6) return;
        const items = g.items.slice(0, 6 - shown);
        shown += items.length;
        append(main, h('h3', { class: 'day-head', text: longDate(dateFor(g.year, g.week, g.weekday)) }),
          readingList(items, progress, partners, settings));
      });
      if (behind.length > 6) append(main, h('p', { class: 'catch' }, h('a', { href: '#/catchup', text: `See all ${catchUpDays(progress, now, tracksFor(settings))}` })));
    }
    append(main, h('h2', { text: `Monday, ${shortDate(dateFor(day.year, day.nextWeek, 1))}` }), previewList(day.year, day.nextWeek, 1, settings));
    append(main, weekGrid(day.year, day.week, now, progress, partners, settings));
    return root;
  }

  append(root.querySelector('header'), h('p', { class: 'seq', text: `Week ${day.week}, day ${day.weekday}` }));
  append(main, readingList(visible(readingsFor(day.year, day.week, day.weekday), settings), progress, partners, settings),
    weekGrid(day.year, day.week, now, progress, partners, settings),
    catchUpLine(progress, now, settings));
  return root;
}

function renderWeek(year, week, now, progress, settings, syncState) {
  const partners = mutualPartners(syncState);
  const today = planDayForDate(now);
  const prev = week > 1 ? [year, week - 1] : (year > FIRST_YEAR ? [year - 1, WEEKS] : null);
  const next = week < WEEKS ? [year, week + 1] : [year + 1, 1];
  const root = h('div', { class: 'screen' },
    h('header', null, topBar(syncState),
      h('div', { class: 'week-nav' },
        prev ? h('a', { class: 'prev', href: `#/week/${prev[0]}/${prev[1]}`, 'aria-label': `Week ${prev[1]}, ${prev[0]}` }, icon('prev')) : h('span'),
        h('h1', { text: `Week ${week}` }),
        h('a', { class: 'next', href: `#/week/${next[0]}/${next[1]}`, 'aria-label': `Week ${next[1]}, ${next[0]}` }, icon('next'))),
      h('p', { class: 'seq centered', text: `${shortDate(dateFor(year, week, 1))} to ${shortDate(dateFor(year, week, 5))}, ${year}` })));
  const main = h('main');
  for (let d = 1; d <= 5; d++) {
    const isToday = today.status === 'reading' && today.year === year && today.week === week && today.weekday === d;
    append(main, h('h2', { text: longDate(dateFor(year, week, d)) + (isToday ? ', today' : '') }),
      readingList(visible(readingsFor(year, week, d), settings), progress, partners, settings));
  }
  append(root, main);
  return root;
}

function renderPlan(year, now, progress, settings = {}) {
  const day = planDayForDate(now);
  const openWeek = day.year !== year ? 0 : (day.status === 'before' ? 1 : day.week || 0);
  const main = h('main');
  for (let w = 1; w <= WEEKS; w++) {
    const days = [1, 2, 3, 4, 5].map(d => h('li', null,
      h('span', { class: 'muted', text: dayName(dateFor(year, w, d)) }),
      visible(readingsFor(year, w, d), settings).map(r => h('span', { class: `${trackClass(r.track)}${isDone(progress, r.id) ? ' done' : ''}`, text: displayRef(r.ref) }))));
    append(main, h('details', { open: w === openWeek },
      h('summary', null, h('b', { text: `Week ${w}` }), h('span', { class: 'muted', text: `${shortDate(dateFor(year, w, 1))} to ${shortDate(dateFor(year, w, 5))}` }),
        h('span', { class: 'count', text: `${weekDaysDone(progress, year, w, tracksFor(settings))} of 5` })),
      h('ul', { class: 'plan-days' }, days),
      h('a', { class: 'open-week', href: `#/week/${year}/${w}`, text: `Open week ${w}` })));
  }
  const lastYear = Math.max(day.year, year);
  const years = [];
  for (let y = FIRST_YEAR; y <= lastYear; y++) years.push(y);
  return h('div', { class: 'screen' },
    h('header', null, h('div', { class: 'bar' }, h('span', { text: 'Bible Reading' })),
      h('h1', { text: `The ${year} plan` }),
      h('p', { class: 'seq', text: `${READING_DAYS} readings, Monday to Friday, ${planRange(year)}.` }),
      years.length > 1 ? h('nav', { class: 'years', 'aria-label': 'Years' }, years.map(y =>
        h('a', { href: `#/plan/${y}`, 'aria-current': y === year ? 'page' : null, text: String(y) }))) : null),
    main);
}

function renderCatchUp(now, progress, settings, syncState) {
  const ids = catchUpIds(progress, now, tracksFor(settings));
  const partners = mutualPartners(syncState);
  const main = h('main');
  if (!ids.length) {
    append(main, h('p', { class: 'empty', text: "You're all caught up." }), h('p', { class: 'catch' }, h('a', { href: '#/', text: 'Back to today' })));
  } else {
    // Newest week first; within a week, Monday to Friday.
    const groups = newestWeekFirst(itemsForIds(ids));
    let lastWeek = null;
    groups.forEach(g => {
      const weekKey = `${g.year}-${g.week}`;
      if (weekKey !== lastWeek) append(main, h('h2', { text: `Week ${g.week}` }));
      lastWeek = weekKey;
      append(main, h('h3', { class: 'day-head', text: longDate(dateFor(g.year, g.week, g.weekday)) }), readingList(g.items, progress, partners, settings));
    });
  }
  return h('div', { class: 'screen' },
    h('header', null, topBar(syncState), h('h1', { text: 'Catch up' }),
      ids.length ? h('p', { class: 'seq', text: `${plural(catchUpDays(progress, now, tracksFor(settings)), 'reading')} from earlier days` }) : null),
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

/* Buttons that wait on the server (sign in, partners, sign out) say what
   they're doing and show three small squares filling in turn until the
   server answers. The keys of the calls still running are kept here, so a
   button redrawn mid-wait keeps showing it. */
const waiting = new Set();

function waitMark() {
  return h('span', { class: 'wait', 'aria-hidden': 'true' }, h('i'), h('i'), h('i'));
}

function showWaiting(button, on) {
  if (on === button.classList.contains('busy')) return;
  if (on) {
    button.dataset.label = button.textContent;
    button.textContent = button.dataset.waitLabel;
    button.append(waitMark());
    button.setAttribute('aria-busy', 'true');
  } else {
    button.textContent = button.dataset.label;
    button.removeAttribute('aria-busy');
  }
  button.classList.toggle('busy', on);
  button.disabled = on;
}

function waitButtonState(button) {
  if (waiting.has(button.dataset.wait)) showWaiting(button, true);
  return button;
}

function waitButton(props, wait, waitLabel) {
  return waitButtonState(h('button', Object.assign({}, props, { dataset: Object.assign({ wait, waitLabel }, props.dataset) })));
}

async function whileWaiting(button, work) {
  const key = button.dataset.wait;
  waiting.add(key);
  showWaiting(button, true);
  try {
    return await work();
  } finally {
    waiting.delete(key);
    document.querySelectorAll('[data-wait]').forEach(b => { if (b.dataset.wait === key) showWaiting(b, false); });
    if (button.dataset.wait === key) showWaiting(button, false);
  }
}

function requestsDetail(n) {
  if (!n) return 'No requests right now';
  return n === 1 ? '1 person added you' : `${n} people added you`;
}

function partnerRow(p, i, count, ordering) {
  if (ordering) {
    const move = (dir, label, off) => h('button', { type: 'button', class: 'icon-btn', dataset: { move: dir, name: p.username },
      'aria-label': `Move ${p.username} ${label}`, disabled: off }, icon(dir));
    return h('li', { class: 'ordering' }, h('span', { class: 'name', text: p.username }),
      h('span', { class: 'move' }, move('up', 'up', i === 0), move('down', 'down', i === count - 1)));
  }
  return h('li', null,
    h('span', { class: 'name', text: p.username }),
    h('span', { class: 'muted', text: p.status === 'mutual' ? 'Reading together' : 'Waiting for them to add you' }),
    waitButton({ type: 'button', class: 'text-btn', dataset: { remove: p.username }, text: 'Remove' }, `remove:${p.username}`, 'Removing'));
}

function accountSection(account, syncState, ordering = false) {
  if (account) {
    const list = syncState.partners || [];
    const partners = list.map((p, i) => partnerRow(p, i, list.length, ordering));
    const orderControl = list.length < 2 ? null : ordering
      ? h('div', { class: 'order-actions' }, h('button', { type: 'button', class: 'btn primary reorder-done', text: 'Done' }))
      : h('div', { class: 'order-actions' }, h('button', { type: 'button', class: 'text-btn reorder-start', text: 'Change order' }));
    return [
      h('section', null, h('h2', { text: 'Your account' }), h('p', null, 'Signed in as ', h('b', { text: account.username }))),
      h('section', null, h('h2', { text: 'Reading partners' }),
        h('p', { class: 'muted', text: ordering ? 'Partners show in this order across the app, on this phone.' : "You see each other's checkmarks once you've both added each other." }),
        syncState.loading && !ordering ? h('p', { class: 'loading', role: 'status' },
          partners.length ? 'Checking for updates' : 'Loading reading partners', waitMark()) : null,
        partners.length ? h('ul', { class: 'people' }, partners) : null,
        orderControl,
        ordering ? null : h('nav', { class: 'requests-menu', 'aria-label': 'Partner requests' },
          extrasRow('#/requests', 'Partner requests', requestsDetail((syncState.requests || []).length))),
        ordering ? null : h('form', { class: 'add-partner' }, field('Add a partner', 'partner', { placeholder: 'Their username', required: true }),
          waitButton({ class: 'btn', type: 'submit', text: 'Add' }, 'addPartner', 'Adding'), h('p', { class: 'error', role: 'alert' }))),
      h('section', null,
        hasPending() ? h('p', { class: 'muted', text: "Some checkmarks haven't synced yet. Signing out now removes them from this phone." }) : null,
        waitButton({ type: 'button', class: 'btn signout', text: 'Sign out' }, 'signout', 'Signing out')),
    ];
  }
  return [
    syncState.status === 'signed-out-expired'
      ? h('p', { class: 'notice', text: 'You were signed out. Sign in again to keep syncing; your checkmarks on this phone are safe.' }) : null,
    h('section', null, h('h2', { text: 'Optional account' }),
      h('p', { class: 'muted', text: "An account backs up your checkmarks and lets reading partners see them. You don't need one to use the plan." })),
    h('form', { class: 'signin' }, h('h3', { text: 'Sign in' }), field('Username', 'username', { required: true }), pinField('PIN', 'pin'),
      h('div', { class: 'actions' }, waitButton({ class: 'btn primary', type: 'submit', text: 'Sign in' }, 'signin', 'Signing in'),
        HELP_EMAIL ? h('a', { class: 'forgot', href: forgotHref(''), text: 'Forgot your PIN?' }) : null),
      h('p', { class: 'error', role: 'alert' })),
    h('form', { class: 'signup' }, h('h3', { text: 'Create an account' }), field('Username', 'username', { required: true }),
      pinField('PIN (4–8 digits)', 'pin'), pinField('PIN again', 'pin2'),
      h('p', { class: 'disclaimer' }, h('b', { text: '✧Disclaimer✧' }),
        " This is a small, free app. Not a bank with top tier encryption. Choose a PIN you don't use everywhere else."),
      h('div', { class: 'actions' }, waitButton({ class: 'btn', type: 'submit', text: 'Create account' }, 'signup', 'Creating account')),
      h('p', { class: 'error', role: 'alert' })),
  ];
}

// Marks every unread reading before today (this plan year) as read; returns how many.
function catchMeUp(now, tracks = null) {
  const ids = catchUpIds(getProgress(), now, tracks);
  if (ids.length) {
    setManyDone(ids, true);
    noteLocalChange();
  }
  return ids.length;
}

function catchMeUpSection(behind, confirming) {
  let body;
  if (!behind) {
    body = h('p', { class: 'muted', text: "You're all caught up." });
  } else if (confirming) {
    body = [
      h('p', { class: 'notice', text: `This marks all ${plural(behind, 'reading')} before today as read. You can untick any of them later.` }),
      h('div', { class: 'actions' },
        h('button', { type: 'button', class: 'btn primary catch-me-up-yes', text: 'Yes, mark them read' }),
        h('button', { type: 'button', class: 'text-btn catch-me-up-no', text: 'Cancel' })),
    ];
  } else {
    body = h('button', { type: 'button', class: 'btn catch-me-up', text: `Mark ${plural(behind, 'reading')} as read` });
  }
  return h('section', { class: 'catch-me-up-section' }, h('h2', { text: 'Catch me up' }),
    h('p', { class: 'muted', text: "Starting partway through the year? Mark every reading before today as read. Today's readings stay unticked." }),
    body);
}

function renderAccount(settings, account, syncState, behind = 0, confirming = false, ordering = false) {
  const standalone = typeof matchMedia === 'function' && matchMedia('(display-mode: standalone)').matches;
  return h('div', { class: 'screen' },
    h('header', null, topBar(syncState), h('h1', { text: 'Account and settings' })),
    h('main', { class: 'account' },
      syncEnabled() ? accountSection(account, syncState, ordering) : null,
      h('section', null, h('h2', { text: 'Settings' }),
        h('label', { class: 'check-field' }, h('input', { type: 'checkbox', name: 'hideBehind', checked: settings.hideBehind }),
          h('span', { text: 'Hide how far behind I am' })),
        h('label', { class: 'check-field' }, h('input', { type: 'checkbox', name: 'ntOnly', checked: settings.ntOnly }),
          h('span', { text: 'New Testament only' })),
        h('label', { class: 'check-field' }, h('input', { type: 'checkbox', name: 'showLinks', checked: settings.showLinks }),
          h('span', { text: 'Show links to read online' }))),
      catchMeUpSection(behind, confirming),
      standalone ? null : h('p', { class: 'muted tip', text: 'Tip: add this app to your home screen. Your checkmarks are kept safest there.' })));
}

/* ---------- Extras ---------- */

// The app's own address to share: no ?date= preview, no #/screen.
function appShareUrl(loc) {
  return loc.origin + loc.pathname.replace(/index\.html$/, '');
}

async function shareApp(button, nav = navigator, loc = location) {
  const url = appShareUrl(loc);
  const note = button.closest('section').querySelector('.share-note');
  try {
    if (nav.share) {
      await nav.share({ title: 'Bible Reading', text: 'A daily Bible reading plan I use. Have a look:', url });
      return;
    }
    await nav.clipboard.writeText(url);
    note.textContent = 'Link copied. Paste it into a message to a friend.';
  } catch (err) {
    if (err && err.name === 'AbortError') return; // they closed the share sheet
    note.textContent = `Copy this link: ${url}`;
  }
}

function backLink(href = '#/extras', label = 'Extras') {
  return h('a', { class: 'back', href }, icon('prev'), label);
}

/* ---------- Partner requests (from the Account page) ----------
   People who added you but you haven't added back. Dismissing one hides
   it on this phone only; they aren't told, and still see "Waiting for
   them to add you". */
function renderRequests(account, syncState) {
  const requests = syncState.requests || [];
  const dismissed = syncState.dismissed || [];
  const main = h('main', { class: 'requests' });
  if (!account) {
    append(main, h('p', { class: 'muted intro', text: 'Sign in on the Account tab to see who has added you as a reading partner.' }));
  } else {
    append(main,
      h('p', { class: 'muted intro', text: 'These people added you as a reading partner. Add them back to see each other’s checkmarks.' }),
      syncState.loading ? h('p', { class: 'loading', role: 'status' }, 'Checking for requests', waitMark()) : null,
      requests.length ? h('ul', { class: 'people' }, requests.map(name => h('li', null,
        h('span', { class: 'name', text: name }), h('span', { class: 'muted', text: 'added you' }),
        h('span', { class: 'request-actions' },
          h('button', { type: 'button', class: 'text-btn', dataset: { dismiss: name }, text: 'Dismiss' }),
          waitButton({ type: 'button', class: 'btn', dataset: { addback: name }, text: 'Add back' }, `addback:${name}`, 'Adding')))))
        : syncState.loading ? null : h('p', { class: 'empty', text: 'No one is waiting on you right now.' }),
      dismissed.length ? h('p', { class: 'muted dismissed-note' }, `You dismissed ${plural(dismissed.length, 'request')}. `,
        h('button', { type: 'button', class: 'text-btn undismiss', text: dismissed.length === 1 ? 'Show it again' : 'Show them again' })) : null);
  }
  return h('div', { class: 'screen' },
    h('header', null, h('div', { class: 'bar' }, backLink('#/account', 'Account')), h('h1', { text: 'Partner requests' })),
    main);
}

function extrasRow(href, title, detail) {
  return h('a', { class: 'extras-row', href },
    h('span', null, h('span', { class: 'row-title', text: title }), h('span', { class: 'row-detail', text: detail })),
    icon('next'));
}

function renderExtras(now) {
  const year = currentYear(now);
  return h('div', { class: 'screen' },
    h('header', null, h('div', { class: 'bar' }, h('span', { text: 'Bible Reading' })), h('h1', { text: 'Extras' })),
    h('main', { class: 'extras' },
      h('nav', { class: 'extras-menu', 'aria-label': 'Extras' },
        extrasRow('#/about', 'About this reading plan', 'Where the readings come from and how the year works.'),
        extrasRow(`#/print/${year}`, 'Printable plan', 'The whole year on paper, with a box for every reading.'),
        extrasRow('#/hear', 'HEAR Method for Bible Study', 'A simple way to journal through a reading: Highlight, Explain, Apply, Respond.'),
        extrasRow('#/maps', 'MAPS Method for Bible Study', 'Meditate, Apply, Pray, Share: a guide for your time alone with God.'),
        extrasRow('#/gospel', 'The Gospel', 'The good news of Jesus in four parts: God, Man, Jesus and our response.')),
      h('section', null, h('h2', { text: 'Share this app with a friend' }),
        h('p', { text: "Send a friend the link. Accounts are optional, and you can add each other as reading partners to see each other's progress." }),
        h('div', { class: 'actions' }, h('button', { type: 'button', class: 'btn primary share-app', text: 'Share the app' })),
        h('p', { class: 'muted share-note', role: 'status' }))));
}

function renderAbout() {
  return h('div', { class: 'screen' },
    h('header', null, h('div', { class: 'bar' }, backLink()), h('h1', { text: 'About this reading plan' })),
    h('main', { class: 'extras about' },
      h('section', null, h('h2', { text: 'The M260 Reading Plan' }),
        h('p', { text: 'I love the Bible, but I also have crippling ADHD, and I’ve always struggled to find a reading plan that works with my brain. So I made one.' }),
        h('p', { text: 'The M260 combines my favorite parts of two plans. It has the organized structure of the M’Cheyne plan, reading from different parts of the Bible each day, and the steady pace and outline of the F260 plan from Replicate Ministries. I believe the result is the perfect Bible reading plan.' }),
        h('p', { text: 'Each weekday has three short readings: one from the New Testament, one from the Old Testament, and a Psalm or Proverbs. That’s 260 days a year, Monday to Friday. Weekends are left open for catching up or resting, and the plan starts again on the first Monday of January each year.' })),
      h('section', null, h('h2', { text: 'Old Testament' }),
        h('p', { text: 'Following the F260 outline, the Old Testament readings take about one chapter a day (with a few partial or combined chapters) and walk through the story of the Old Testament in the order it happened, from Genesis to Malachi.' }),
        h('p', { text: 'To keep that one-chapter-a-day pace, the Replicate Ministries team carefully left some chapters and books out, so the plan hits the meatiest chapters and helps you take in the big story of the Old Testament every year.' })),
      h('section', null, h('h2', { text: 'New Testament' }),
        h('p', { text: 'The New Testament readings go through every chapter of the New Testament, one a day, in roughly the order things happened and were written. Acts is woven in with the letters Paul and the other apostles wrote along the way.' }),
        h('p', { text: 'The one exception is the Gospels. Instead of reading all four back to back at the start, you read one Gospel each quarter: Luke in January, Mark in May, John in September and Matthew to finish the year.' })),
      h('section', null, h('h2', { text: 'Psalms and Proverbs' }),
        h('p', { text: 'The third reading each day comes from the Bible’s wisdom books:' }),
        h('ul', { class: 'about-list' },
          h('li', null, h('b', { text: 'Monday, Wednesday and Friday: ' }), 'a Psalm. You read all 150 Psalms in order over the year. Psalm 119, the longest, is split into seven parts.'),
          h('li', null, h('b', { text: 'Tuesday and Thursday: ' }), 'a short passage from Proverbs, about nine verses. You read the whole book over the year, a little at a time.')))));
}

/* ---------- Bible study methods (Extras): HEAR and MAPS ----------
   Two ways to journal through a reading, each written in our own words
   after its source, which is credited and linked at the bottom of the
   page. Both pages share one layout: a short note on how to begin, four
   steps under big boxed letters with questions to ask (a question can
   have a bold lead, like "Head:"), a sample entry set as a notebook page,
   and the source. */

const HEAR_METHOD = {
  title: 'HEAR Method for Bible Study',
  intro: [
    'HEAR is a simple way to journal through a passage, so a reading becomes more than a box to tick. Grab a notebook, write H, E, A and R down the side of a page, and work through them in order.',
    'With three readings a day, pick the one that stood out most and HEAR that one.',
  ],
  before: ['Pray first', 'Ask God to help you understand what you read. Psalm 119:18 is a good prayer to borrow:',
    'Psalm 119:18', '“Open my eyes, that I may behold wondrous things out of your law.”'],
  steps: [
    ['H', 'Highlight', 'Read the passage slowly. When a verse stands out to you, copy it down. Note the book, chapter and verse, and give the passage a short title of your own so you can find it again.',
      ['Which verse caught my attention?', 'What title sums up this passage?']],
    ['E', 'Explain', 'Before asking what it means for you, work out what it meant for the people who first heard it. Then sum it up in a sentence or two.',
      ['Who was this written to, and why?', 'How does it fit with the verses around it?', 'What is God showing about Himself here?']],
    ['A', 'Apply', 'This is the heart of it. Ask what this truth looks like in your life right now, and write a few sentences.',
      ['What would change if I took this seriously?', 'Where does this meet my week?', 'What is God saying to me through it?']],
    ['R', 'Respond', 'Answer God. Write a short prayer, or one thing you will do differently because of what you read.',
      ['What do I want to say to God about this?', 'What is one step I can take this week?']],
  ],
  example: [
    ['H', 'Psalm 1:3, “Planted by the stream”', '“He is like a tree planted by streams of water that yields its fruit in its season, and its leaf does not wither.”'],
    ['E', null, 'Psalm 1 opens the Psalms with two ways to live. The person who keeps coming back to God’s word is like a tree with its roots in a stream: steady, alive and fruitful, even in a dry season.'],
    ['A', null, 'When I’m worn out, I reach for my phone to refill. This says lasting strength comes from staying rooted in God’s word, day after day.'],
    ['R', null, 'Lord, plant me by your stream. Help me open your word before anything else tomorrow morning.'],
  ],
  source: ['https://replicate.org/resources/hear-journal', 'H.E.A.R. Journal', ' by Replicate Ministries, the team behind the F260 reading plan.'],
};

const MAPS_METHOD = {
  title: 'MAPS Method for Bible Study',
  intro: [
    'MAPS is a guide for your time alone with God: Meditate, Apply, Pray and Share. It moves from understanding a passage, to letting it change you, to talking with God about it, to passing it on.',
    'You can walk through MAPS with one of the day’s readings or with all three together. You don’t have to answer every question; they’re there to help you think.',
  ],
  before: ['Before you start', 'Find a quiet place, and bring your Bible and something to write with. Start by praising God and telling Him you want to know Him more, then ask Him to teach you as you read. Keep it from becoming a routine: the point is time with Him.',
    'Psalm 63:1', '“O God, you are my God; earnestly I seek you; my soul thirsts for you; my flesh faints for you, as in a dry and weary land where there is no water.”'],
  steps: [
    ['M', 'Meditate & Memorize', 'To meditate is to reflect. Read slowly, then think about what the passage says and means, and write down a few thoughts. If a verse stands out, start memorizing it, and go back over the ones you’ve already learned.',
      ['What is happening here: who, what, where, when and why?', 'Which words or ideas seem most important?', 'What does it show about God, about us, and about following Jesus?', 'What is the main point? Is there anything to look into further?']],
    ['A', 'Apply', 'Let the passage change you in three ways, then make a plan to follow through.',
      [['Head:', 'How should I think differently about God, others, myself or the world?'], ['Heart:', 'How does this change what I want?'], ['Hands:', 'What does this call me to do, or stop doing?']]],
    ['P', 'Pray', 'Pray through what you read and how you want to apply it, asking God to change your mind, heart and life. Then let your prayer widen out:',
      [['Praise:', 'What does this show about God’s character? Praise Him for it.'], ['Repent:', 'Where does it show your sin or unbelief? Confess it.'], ['Ask:', 'Pray one thing for yourself and one for someone else.'], ['Yield:', 'Tell God how you want to live this out.']]],
    ['S', 'Share', 'Finish by choosing at least one person to tell what God showed you. Pray through your day, and ask Him for a chance, and the courage, to share the gospel.',
      ['Who could I tell about this today?', 'Where might God give me a chance to share the gospel?']],
  ],
  example: [
    ['M', 'Luke 5:1–11', 'Simon has fished all night and caught nothing, but he lets down the nets again because Jesus says so. The huge catch shows who Jesus is, and Simon falls at His feet. To memorize, Luke 5:5: “Master, we toiled all night and took nothing! But at your word I will let down the nets.”'],
    ['A', null, 'Head: Jesus is Lord over my ordinary work, too. Heart: I want to trust His word more than my own experience. Hands: do the thing I’ve been putting off because I doubted it would matter.'],
    ['P', null, 'Lord, you see where I’ve worked hard and come up empty. Help me trust your word and obey, even when it doesn’t make sense to me.'],
    ['S', null, 'Tell my small group about this passage on Thursday and ask them to pray for me.'],
  ],
  source: ['https://mcleanbible.org/wp-content/uploads/2020/05/MAPS-GUIDE.pdf', 'Guide to Personal Worship Using “MAPS”', ' by McLean Bible Church.'],
};

function renderMethod(m) {
  const [beforeTitle, beforeText, verseRef, verseText] = m.before;
  const [href, sourceTitle, sourceRest] = m.source;
  return h('div', { class: 'screen' },
    h('header', null, h('div', { class: 'bar' }, backLink()), h('h1', { text: m.title })),
    h('main', { class: 'extras about method' },
      m.intro.map(text => h('p', { text })),
      h('section', { class: 'before' }, h('h2', { text: beforeTitle }), h('p', { text: beforeText }),
        h('blockquote', { class: 'verse' }, h('p', { text: verseText }), h('cite', { text: verseRef }))),
      m.steps.map(([letter, word, what, prompts]) => h('section', { class: 'step' },
        h('span', { class: 'step-letter', 'aria-hidden': 'true', text: letter }),
        h('div', null, h('h2', { text: word }), h('p', { text: what }),
          h('ul', { class: 'prompts' }, prompts.map(q => (Array.isArray(q) ? h('li', null, h('b', { text: q[0] }), ` ${q[1]}`) : h('li', { text: q }))))))),
      h('section', null, h('h2', { text: 'An example' }),
        h('div', { class: 'journal' }, m.example.map(([letter, title, text]) => h('div', { class: 'journal-line' },
          h('span', { class: 'journal-letter', text: letter }),
          h('p', null, title ? h('b', { text: title }) : null, title ? h('br') : null, text))))),
      h('footer', { class: 'source' },
        h('span', { class: 'source-label', text: 'Source' }),
        h('p', null, 'Adapted from the ', h('a', { href, target: '_blank', rel: 'noopener', text: sourceTitle }), sourceRest))));
}

const renderHear = () => renderMethod(HEAR_METHOD);
const renderMaps = () => renderMethod(MAPS_METHOD);

/* ---------- The Gospel (Extras) ----------
   Content and drawing are in gospel.js. The drawing pins to the top of
   the screen while God, Man, Jesus and Response scroll up under it, and
   each part draws its piece of the bridge as it's read. */

function renderGospel() {
  const art = document.createElementNS(SVG_NS, 'svg');
  art.setAttribute('class', 'bridge-art');
  art.setAttribute('viewBox', '0 0 360 232');
  art.setAttribute('role', 'img');
  art.setAttribute('aria-label', BRIDGE_SUMMARY);
  art.innerHTML = BRIDGE_ART; // fixed markup from gospel.js, never user text
  const parts = GOSPEL_PARTS.map((part, i) => h('section', { class: 'bridge-part' },
    h('h2', null, h('span', { class: 'part-n', text: `${i + 1} of ${GOSPEL_PARTS.length}` }), h('span', { class: 'part-name', text: part.name })),
    part.paragraphs.map(text => h('p', { text })),
    part.list ? h('ul', { class: 'about-list' }, part.list.map(([lead, rest]) => h('li', null, h('b', { text: lead }), ` ${rest}`))) : null,
    h('blockquote', { class: 'verse' }, h('p', { text: part.verse[1] }), h('cite', { text: part.verse[0] }))));
  return h('div', { class: 'screen' },
    h('header', null, h('div', { class: 'bar' }, backLink()), h('h1', { text: 'What is the Gospel?' })),
    h('main', { class: 'extras about gospel' },
      GOSPEL_INTRO.map(text => h('p', { text })),
      h('div', { class: 'bridge' },
        h('div', { class: 'bridge-stage' }, art,
          h('ol', { class: 'bridge-steps', 'aria-hidden': 'true' }, GOSPEL_PARTS.map(part => h('li', { text: part.name })))),
        parts)));
}

const clamp01 = v => Math.min(1, Math.max(0, v));
const BRIDGE_WALK = 218; // how far the person walks, left cliff to right

/* How much of the bridge is drawn, 0 to 4: each part counts from 0 to 1,
   starting once its top has slid 10px under the drawing (so nothing is
   drawn until the drawing is pinned and you start reading) and done 60%
   of the way through. The last part has only the rest of the page: it
   also draws over whatever scrolling is left once the part before it is
   done, so it never rushes and always finishes at the end of the page. */
function bridgeProgress(stageBottom, remaining, parts) {
  const line = stageBottom - 10;
  const left = Math.max(0, remaining);
  return parts.reduce((s, part, i) => {
    const passed = line - part.top; // how far the part has slid up under the drawing
    const span = part.height * 0.6;
    if (i < parts.length - 1) return s + clamp01(passed / span);
    const total = passed + left; // how far it can ever slide
    const own = total <= 0 ? (left <= 1 ? 1 : 0) : clamp01(passed / Math.min(span, total));
    const before = parts[i - 1];
    const since = before ? (line - before.top) - before.height * 0.6 : 0; // scrolled since that part was done
    return s + Math.max(own, since > 0 ? since / (since + left) : 0);
  }, 0);
}

// Draw every line and label whose data-at window the reading has reached.
function bridgeApply(fx, s) {
  fx.querySelectorAll('[data-at]').forEach(el => {
    const [a, b] = el.dataset.at.split(',').map(Number);
    const p = clamp01((s - a) / (b - a));
    if (el.tagName.toLowerCase() === 'path') el.style.strokeDashoffset = (1 - p).toFixed(3);
    else el.style.setProperty('--p', p.toFixed(3));
    // Nothing shows before its turn: a line's round pen tip or a letter's flourish would peek out.
    el.style.opacity = p > 0 ? '1' : '0';
  });
  // Response: the person walks across the cross, stepping up onto it.
  const who = fx.querySelector('[data-who]');
  if (who) {
    const dx = BRIDGE_WALK * clamp01((s - 3) / 0.7);
    const x = 55 + dx;
    const up = x < 98 ? 0 : x < 110 ? (x - 98) / 12 : x < 250 ? 1 : x < 262 ? (262 - x) / 12 : 0;
    who.setAttribute('transform', `translate(${dx.toFixed(1)},${(-up * Number(who.dataset.lift || 0) || 0).toFixed(1)})`);
  }
  const now = Math.min(3, Math.floor(s));
  fx.querySelectorAll('.bridge-steps li').forEach((li, i) => {
    li.classList.toggle('now', s > 0.05 && i === now && s < 3.95);
    li.classList.toggle('done', i < now || s >= 3.95);
  });
}

// Reads where the parts are on screen and draws to match. With Reduce Motion it's simply complete.
function updateBridge(root) {
  const fx = root.querySelector('.bridge');
  if (!fx) return;
  const still = !window.matchMedia || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  fx.classList.toggle('drawing', !still);
  if (still) { bridgeApply(fx, 4); return; }
  const remaining = document.documentElement.scrollHeight - (window.scrollY + window.innerHeight);
  const parts = [...fx.querySelectorAll('.bridge-part')].map(el => { const r = el.getBoundingClientRect(); return { top: r.top, height: r.height }; });
  bridgeApply(fx, bridgeProgress(fx.querySelector('.bridge-stage').getBoundingClientRect().bottom, remaining, parts));
}

function renderPrint(year, now, settings = {}) {
  const thisYear = currentYear(now);
  const years = [thisYear, thisYear + 1];
  if (!years.includes(year)) years.push(year);
  const weeks = [];
  for (let w = 1; w <= WEEKS; w++) {
    weeks.push(h('section', { class: 'print-week' },
      h('h2', null, `Week ${w} `, h('span', { class: 'muted', text: `${shortDate(dateFor(year, w, 1))} to ${shortDate(dateFor(year, w, 5))}` })),
      h('ol', { class: 'print-days' }, [1, 2, 3, 4, 5].map(d => h('li', { class: 'print-day' },
        h('span', { class: 'print-dow', text: dayName(dateFor(year, w, d)) }),
        visible(readingsFor(year, w, d), settings).map(r => h('span', { class: 'print-ref' }, h('i', { class: 'box' }), displayRef(r.ref))))))));
  }
  return h('div', { class: 'screen print-screen' },
    h('header', null,
      h('div', { class: 'bar print-actions' }, backLink(),
        h('button', { type: 'button', class: 'btn primary print-now', text: 'Print' })),
      h('nav', { class: 'years print-actions', 'aria-label': 'Which year' }, years.map(y =>
        h('a', { href: `#/print/${y}`, 'aria-current': y === year ? 'page' : null, text: String(y) }))),
      h('h1', { text: `M260 ${year} Bible Reading Plan` }),
      h('p', { class: 'seq', text: `${READING_DAYS} readings, Monday to Friday, ${planRange(year)}. ${settings.ntOnly ? 'One New Testament chapter each day.' : 'New Testament, Old Testament, and a Psalm or Proverbs each day.'}` })),
    h('main', { class: 'print-weeks' }, weeks));
}

function tabBar(route, now) {
  const tabs = [['extras', '#/extras', 'Extras'], ['week', `#/week/${currentYear(now)}/${currentWeek(now)}`, 'Week'],
    ['today', '#/', 'Today'], ['plan', '#/plan', 'Plan'], ['account', '#/account', 'Account']];
  const active = { catchup: 'today', print: 'extras', about: 'extras', gospel: 'extras', hear: 'extras', maps: 'extras', requests: 'account' }[route.name] || route.name;
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

function previewBanner(now) {
  return h('p', { class: 'preview-note' }, `Previewing ${longDate(now)}. Checkmarks made here are real. `,
    h('a', { href: './', text: 'Back to today' }));
}

// True when someone has started typing in a form (so a re-render would wipe it).
function formHasValues(root) {
  return [...root.querySelectorAll('form input')].some(i => i.type !== 'checkbox' && i.type !== 'hidden' && i.value !== '');
}

/* ---------- Install prompt ---------- */

let deferredInstall = null; // Android/Chrome's saved install event

function installEnv() {
  const standalone = (typeof matchMedia === 'function' && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  return {
    standalone,
    dismissed: localStorage.getItem('br27.installDismissed') === '1',
    canPrompt: !!deferredInstall,
    ios: /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1),
  };
}

function installPrompt(env) {
  if (env.standalone || env.dismissed || (!env.canPrompt && !env.ios)) return null;
  const dismiss = h('button', { type: 'button', class: 'text-btn install-dismiss', text: 'Not now' });
  if (env.canPrompt) {
    return h('div', { class: 'install-note' },
      h('p', { text: 'Install this app on your phone. It works offline and opens like any other app.' }),
      h('div', { class: 'actions' }, h('button', { type: 'button', class: 'btn primary install', text: 'Install app' }), dismiss));
  }
  return h('div', { class: 'install-note' },
    h('p', null, 'Install this app: in Safari, tap ', h('b', { text: 'Share' }), ', then ', h('b', { text: 'Add to Home Screen' }), '.'),
    h('div', { class: 'actions' }, dismiss));
}

let renderTimer = null;

function render() {
  const app = document.getElementById('app');
  if (!app) return;
  const now = appNow(location.search);
  const route = parseRoute(location.hash);
  const progress = getProgress(), state = shapePartners(getSyncState(), getAccount());
  const settings = Object.assign(getSettings(), { android: isAndroid(navigator.userAgent) });
  const screens = {
    today: () => renderToday(now, progress, settings, state),
    week: () => renderWeek(route.year || currentYear(now), route.week, now, progress, settings, state),
    plan: () => renderPlan(route.year || currentYear(now), now, progress, settings),
    catchup: () => renderCatchUp(now, progress, settings, state),
    account: () => renderAccount(settings, getAccount(), state, catchUpDays(progress, now, tracksFor(settings)), confirmingCatchUp, reordering),
    requests: () => renderRequests(getAccount(), state),
    extras: () => renderExtras(now),
    print: () => renderPrint(route.year || currentYear(now), now, settings),
    about: () => renderAbout(),
    gospel: () => renderGospel(),
    hear: () => renderHear(),
    maps: () => renderMaps(),
  };
  const focusedId = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.id : null;
  const previewing = /[?&]date=/.test(location.search);
  const screen = screens[route.name]();
  // The page title names a saved PDF of the printable plan.
  document.title = route.name === 'print' ? `M260 ${route.year || currentYear(now)} Bible Reading Plan` : 'Bible Reading';
  if (route.name === 'today') {
    const prompt = installPrompt(installEnv());
    if (prompt) screen.querySelector('header').after(prompt);
  }
  app.replaceChildren(...[previewing ? previewBanner(now) : null, screen, tabBar(route, now)].filter(Boolean));
  updateBridge(app);
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
  const res = await whileWaiting(button, () => {
    if (form.classList.contains('signin')) return signIn(data.username, data.pin);
    if (form.classList.contains('signup')) return signUp(data.username, data.pin);
    return addPartner(data.partner);
  });
  if (res.ok && form.classList.contains('add-partner') && getAccount()) forgetDismissed(getAccount().username, data.partner);
  if (res.ok) render();
  else showError(form, res);
}

// Opening the Account tab or the requests page fetches fresh partners and requests.
function screenOpened(name) {
  if (!['account', 'requests'].includes(name) || !syncEnabled() || !getAccount()) return null;
  return syncNow();
}

// Move a partner up or down, save the order on this phone, and keep focus on the arrow pressed.
function movePartner(account, name, dir) {
  const names = shapePartners(getSyncState(), account).partners.map(p => p.username);
  savePartnerOrder(account.username, movedOrder(names, name, dir === 'up' ? -1 : 1));
  render();
  const same = [...document.querySelectorAll('[data-move]')].find(b => b.dataset.name === name && b.dataset.move === dir);
  const target = same && !same.disabled ? same : [...document.querySelectorAll('[data-move]')].find(b => b.dataset.name === name && !b.disabled);
  if (target) target.focus();
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
    if (remove) return whileWaiting(remove, () => removePartner(remove.dataset.remove)).then(render);
    const addBack = e.target.closest('[data-addback]');
    if (addBack) return whileWaiting(addBack, () => addPartner(addBack.dataset.addback)).then(render);
    const account = getAccount();
    if (e.target.closest('.reorder-start')) { reordering = true; return render(); }
    if (e.target.closest('.reorder-done')) { reordering = false; return render(); }
    const move = e.target.closest('[data-move]');
    if (move && account) return movePartner(account, move.dataset.name, move.dataset.move);
    const dismiss = e.target.closest('[data-dismiss]');
    if (dismiss && account) { dismissRequest(account.username, dismiss.dataset.dismiss); return render(); }
    if (e.target.closest('.undismiss') && account) { forgetDismissed(account.username); return render(); }
    const signout = e.target.closest('.signout');
    if (signout) return whileWaiting(signout, signOut).then(render);
    const share = e.target.closest('.share-app');
    if (share) return shareApp(share);
    if (e.target.closest('.print-now')) return window.print();
    if (e.target.closest('.catch-me-up')) { confirmingCatchUp = true; return render(); }
    if (e.target.closest('.catch-me-up-no')) { confirmingCatchUp = false; return render(); }
    if (e.target.closest('.catch-me-up-yes')) { confirmingCatchUp = false; catchMeUp(appNow(location.search), tracksFor(getSettings())); return render(); }
    if (e.target.closest('.install-dismiss')) { localStorage.setItem('br27.installDismissed', '1'); return render(); }
    if (e.target.closest('button.install') && deferredInstall) {
      const ev = deferredInstall;
      deferredInstall = null;
      return ev.prompt().then(() => ev.userChoice).finally(render);
    }
    return undefined;
  });
  app.addEventListener('change', e => {
    if (['showLinks', 'hideBehind', 'ntOnly'].includes(e.target.name)) saveSettings({ [e.target.name]: e.target.checked });
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

  window.addEventListener('hashchange', () => {
    confirmingCatchUp = false;
    reordering = false;
    render();
    window.scrollTo(0, 0);
    screenOpened(parseRoute(location.hash).name);
  });
  const safeRender = () => { if (!formFocused() && !formHasValues(app)) render(); };
  onSyncChange(safeRender);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') { safeRender(); scheduleSync(); }
  });
  window.addEventListener('online', scheduleSync);
  let bridgeFrame = 0;
  const drawBridge = () => { cancelAnimationFrame(bridgeFrame); bridgeFrame = requestAnimationFrame(() => updateBridge(app)); };
  window.addEventListener('scroll', drawBridge, { passive: true });
  window.addEventListener('resize', drawBridge);
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredInstall = e; render(); });
  window.addEventListener('appinstalled', () => { deferredInstall = null; render(); });

  render();
  if (syncEnabled() && getAccount()) syncNow();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('service-worker.js').catch(() => {});
}

document.addEventListener('DOMContentLoaded', boot);
