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
