test('sw: app shell lists every app file', async () => {
  const sw = await (await fetch('../service-worker.js')).text();
  assert(/const CACHE_NAME = 'bible-reading-2027-v\d+';/.test(sw), 'CACHE_NAME is versioned');
  ['./', 'index.html', 'style.css', 'readings.js', 'plan.js', 'links.js', 'store.js', 'sync-config.js', 'sync.js',
    'app.js', 'manifest.json', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
    'fonts/AtkinsonHyperlegible-Regular.woff2', 'fonts/AtkinsonHyperlegible-Bold.woff2']
    .forEach(f => assert(sw.includes(`'${f}'`), `service worker should cache ${f}`));
});

test('sw: every app shell file exists', async () => {
  const sw = await (await fetch('../service-worker.js')).text();
  const shell = sw.match(/const APP_SHELL = \[([\s\S]*?)\];/)[1].match(/'([^']+)'/g).map(s => s.slice(1, -1));
  for (const f of shell) {
    const res = await fetch(`../${f}`);
    assertEqual(res.status, 200, `${f} is missing, so the service worker would fail to install`);
  }
});

test('sw: manifest', async () => {
  const m = await (await fetch('../manifest.json')).json();
  assertEqual([m.name, m.short_name, m.display, m.start_url, m.scope], ['Bible Reading 2027', 'Reading 2027', 'standalone', './', './']);
  assertEqual(m.icons.length >= 3, true);
  for (const icon of m.icons) assertEqual((await fetch(`../${icon.src}`)).status, 200, icon.src);
});

test('sw: index.html links the manifest and icons', async () => {
  const html = await (await fetch('../index.html')).text();
  assertIncludes(html, '<link rel="manifest" href="manifest.json">');
  assertIncludes(html, '<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">');
});

test('sw: the app registers the service worker', async () => {
  const js = await (await fetch('../app.js')).text();
  assertIncludes(js, "navigator.serviceWorker.register('service-worker.js')");
});

test('sw: install fetches fresh copies, bypassing the browser cache', async () => {
  const sw = await (await fetch('../service-worker.js')).text();
  assertIncludes(sw, "new Request(url, { cache: 'reload' })");
});

// The tick's e-ink moment: a short ink flash, then the track color with the check visibly drawing.
async function tickAt(ms, pressed) {
  const f = document.createElement('iframe');
  f.src = 'tick-frame.html';
  document.body.appendChild(f);
  await new Promise(r => { f.onload = r; });
  const doc = f.contentDocument, btn = doc.querySelector('.tick'), path = doc.querySelector('.tick svg');
  btn.setAttribute('aria-pressed', String(pressed));
  btn.classList.add('refresh');
  btn.getAnimations({ subtree: true }).forEach(a => { a.pause(); a.currentTime = ms; });
  const bg = getComputedStyle(btn).backgroundColor, offset = parseFloat(getComputedStyle(path).strokeDashoffset);
  f.remove();
  return { bg, offset };
}

test('tick: ticking flashes ink first', async () => {
  assertEqual((await tickAt(40, true)).bg, 'rgb(30, 31, 31)');
});

test('tick: then the check draws over the track color', async () => {
  const mid = await tickAt(180, true);
  assertEqual(mid.bg, 'rgb(63, 110, 108)', 'box should already be New Testament teal while the check draws');
  assert(mid.offset > 0 && mid.offset < 24, `check should be part-drawn at 180ms, offset ${mid.offset}`);
});

test('tick: unticking flashes ink, then clears to paper', async () => {
  assertEqual((await tickAt(40, false)).bg, 'rgb(30, 31, 31)');
  assertEqual((await tickAt(180, false)).bg, 'rgb(231, 231, 226)');
});
