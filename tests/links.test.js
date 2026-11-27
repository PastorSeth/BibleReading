const ESV = 'https://biblia.com/bible/esv/';
const suffix = ref => bibliaLinks(ref, 'esv').map(l => l.url.slice(ESV.length));

test('links: tested formats', () => {
  const want = {
    'Genesis 1': 'Genesis1',
    'Psalm 119:25-48': 'Psalm119.25-48',
    'Proverbs 1:1-7': 'Proverbs1.1-7',
    'Exodus 13:17–14': 'Exodus13.17-14.31',
    '1 Samuel 24–25:1': '1Samuel24-25.1',
    '1 Kings 16:29–17': '1Kings16.29-17.24',
    'Malachi 3–4': 'Malachi3-4',
    '2 John': '2John',
    'Philemon': 'Philemon',
    'Judges 2': 'Judges2',
    'Genesis 25:19-34': 'Genesis25.19-34',
    'Jeremiah 2–3:5': 'Jeremiah2-3.5',
    'Joshua 5:10–6': 'Joshua5.10-6.27',
  };
  Object.keys(want).forEach(ref => assertEqual(suffix(ref), [want[ref]], ref));
});

test('links: split pieces', () => {
  const deut = bibliaLinks('Deuteronomy 32:48-52; 34', 'esv');
  assertEqual(deut.map(l => l.url.slice(ESV.length)), ['Deuteronomy32.48-52', 'Deuteronomy34']);
  assertEqual(deut.map(l => l.label), ['Deuteronomy 32:48–52', 'Deuteronomy 34']);
  assertEqual(suffix('2 Samuel 2:1-7; 3:1'), ['2Samuel2.1-7', '2Samuel3.1']);
  assertEqual(suffix('Amos 1:1; 9'), ['Amos1.1', 'Amos9']);
  assertEqual(suffix('Ezekiel 1:1-3; 36:16-38'), ['Ezekiel1.1-3', 'Ezekiel36.16-38']);
});

test('links: every plan reference produces valid links', () => {
  const shape = /^https:\/\/biblia\.com\/bible\/esv\/[1-3]?[A-Za-z]+(\d+(\.\d+)?(-\d+(\.\d+)?)?)?$/;
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

test('links: translation', () => {
  assertEqual(bibliaLinks('John 3', 'kjv')[0].url, 'https://biblia.com/bible/kjv/John3');
});

test('links: displayRef', () => {
  assertEqual(displayRef('Psalm 119:25-48'), 'Psalm 119:25–48');
  assertEqual(displayRef('Malachi 3–4'), 'Malachi 3–4');
  assertEqual(displayRef('Deuteronomy 32:48-52; 34'), 'Deuteronomy 32:48–52; 34');
});
