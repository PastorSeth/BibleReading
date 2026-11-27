const ESV = 'https://ref.ly/';
const suffix = ref => bibliaLinks(ref, 'esv').map(l => l.url.slice(ESV.length));

test('links: tested formats', () => {
  const want = {
    'Genesis 1': 'Ge1',
    'Psalm 119:25-48': 'Ps119.25-48',
    'Proverbs 1:1-7': 'Pr1.1-7',
    'Exodus 13:17–14': 'Ex13.17-14.31',
    '1 Samuel 24–25:1': '1Sa24-25.1',
    '1 Kings 16:29–17': '1Ki16.29-17.24',
    'Malachi 3–4': 'Mal3-4',
    '2 John': '2Jn',
    'Philemon': 'Phm',
    'Judges 2': 'Jdg2',
    'Genesis 25:19-34': 'Ge25.19-34',
    'Jeremiah 2–3:5': 'Je2-3.5',
    'Joshua 5:10–6': 'Jos5.10-6.27',
  };
  Object.keys(want).forEach(ref => assertEqual(suffix(ref), [want[ref]], ref));
});

test('links: split pieces', () => {
  const deut = bibliaLinks('Deuteronomy 32:48-52; 34', 'esv');
  assertEqual(deut.map(l => l.url.slice(ESV.length)), ['Dt32.48-52', 'Dt34']);
  assertEqual(deut.map(l => l.label), ['Deuteronomy 32:48–52', 'Deuteronomy 34']);
  assertEqual(suffix('2 Samuel 2:1-7; 3:1'), ['2Sa2.1-7', '2Sa3.1']);
  assertEqual(suffix('Amos 1:1; 9'), ['Am1.1', 'Am9']);
  assertEqual(suffix('Ezekiel 1:1-3; 36:16-38'), ['Eze1.1-3', 'Eze36.16-38']);
});

test('links: every plan reference produces valid links', () => {
  const shape = /^https:\/\/ref\.ly\/[1-3]?[A-Z][a-z]{1,2}(\d+(\.\d+)?(-\d+(\.\d+)?)?)?$/;
  [NT_READINGS, OT_READINGS, PSALM_READINGS, PROVERBS_READINGS].forEach(list => {
    list.forEach(ref => {
      const links = bibliaLinks(ref, 'esv');
      assert(links.length >= 1, `no link for ${ref}`);
      links.forEach(l => {
        assert(shape.test(l.url), `${ref} → ${l.url}`);
        assert(!l.url.includes('undefined') && !l.label.includes('undefined'), `${ref} → ${l.url}`);
      });
    });
  });
});

test('links: ref.ly short links with no version', () => {
  assertEqual(bibliaLinks('Luke 3')[0].url, 'https://ref.ly/Lk3');
  assertEqual(bibliaLinks('John 3')[0].url, 'https://ref.ly/Jn3');
  assertEqual(bibliaLinks('Mark 13:25')[0].url, 'https://ref.ly/Mk13.25');
  assertEqual(bibliaLinks('Jude')[0].url, 'https://ref.ly/Jud');
  assertEqual(bibliaLinks('Jonah 1')[0].url, 'https://ref.ly/Jon1');
  assertEqual(bibliaLinks('Joel 2')[0].url, 'https://ref.ly/Joe2');
  assert(!bibliaLinks('Luke 3')[0].url.includes('esv'), 'no version in the link');
  assertEqual(typeof TRANSLATIONS, 'undefined', 'the translation list was removed');
});

test('links: displayRef', () => {
  assertEqual(displayRef('Psalm 119:25-48'), 'Psalm 119:25–48');
  assertEqual(displayRef('Malachi 3–4'), 'Malachi 3–4');
  assertEqual(displayRef('Deuteronomy 32:48-52; 34'), 'Deuteronomy 32:48–52; 34');
});
