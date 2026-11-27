const ESV = 'https://www.esv.org/verses/';
const path = ref => passageLinks(ref).map(l => l.url.slice(ESV.length, -1));

test('links: ESV.org /verses/ format', () => {
  const want = {
    'Genesis 1': 'Genesis+1',
    'Luke 3': 'Luke+3',
    'Psalm 119:25-48': 'Psalm+119:25-48',
    'Proverbs 1:1-7': 'Proverbs+1:1-7',
    'Exodus 13:17–14': 'Exodus+13:17-14:31',
    '1 Samuel 24–25:1': '1+Samuel+24-25:1',
    '1 Kings 16:29–17': '1+Kings+16:29-17:24',
    'Malachi 3–4': 'Malachi+3-4',
    '2 John': '2+John',
    'Philemon': 'Philemon',
    'Judges 2': 'Judges+2',
    'Genesis 25:19-34': 'Genesis+25:19-34',
    'Jeremiah 2–3:5': 'Jeremiah+2-3:5',
    'Joshua 5:10–6': 'Joshua+5:10-6:27',
  };
  Object.keys(want).forEach(ref => assertEqual(path(ref), [want[ref]], ref));
  assertEqual(passageLinks('Luke 3')[0].url, 'https://www.esv.org/verses/Luke+3/');
});

test('links: two-piece readings are one link, each piece naming its book', () => {
  const deut = passageLinks('Deuteronomy 32:48-52; 34');
  assertEqual(deut.length, 1);
  assertEqual(path('Deuteronomy 32:48-52; 34'), ['Deuteronomy+32:48-52;Deuteronomy+34']);
  assertEqual(deut[0].label, 'Deuteronomy 32:48–52; 34');
  assertEqual(path('2 Samuel 2:1-7; 3:1'), ['2+Samuel+2:1-7;2+Samuel+3:1']);
  assertEqual(path('Amos 1:1; 9'), ['Amos+1:1;Amos+9']);
  assertEqual(path('Ezekiel 1:1-3; 36:16-38'), ['Ezekiel+1:1-3;Ezekiel+36:16-38']);
});

test('links: every plan reference produces a clean link', () => {
  [NT_READINGS, OT_READINGS, PSALM_READINGS, PROVERBS_READINGS].forEach(list => {
    list.forEach(ref => {
      const links = passageLinks(ref);
      assertEqual(links.length, 1, ref);
      const u = links[0].url;
      assert(u.startsWith(ESV) && u.endsWith('/'), `${ref} → ${u}`);
      assert(!/undefined|\s|–/.test(u), `${ref} → ${u}`);
    });
  });
});

test('links: displayRef', () => {
  assertEqual(displayRef('Psalm 119:25-48'), 'Psalm 119:25–48');
  assertEqual(displayRef('Malachi 3–4'), 'Malachi 3–4');
  assertEqual(displayRef('Deuteronomy 32:48-52; 34'), 'Deuteronomy 32:48–52; 34');
});
