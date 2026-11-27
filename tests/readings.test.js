test('readings: counts', () => {
  assertEqual(NT_READINGS.length, 260);
  assertEqual(OT_READINGS.length, 260);
  assertEqual(typeof MEMORY_VERSES, 'undefined', 'memory verses were taken out of the plan');
  assertEqual(PSALM_READINGS.length, 156);
  assertEqual(PROVERBS_READINGS.length, 104);
  assertEqual(PROVERBS_VERSE_COUNTS.reduce((a, b) => a + b, 0), 915);
});

test('readings: NT spot checks', () => {
  const want = { 0: 'Luke 1', 35: 'Acts 12', 39: 'James 2', 146: 'Philemon', 207: '2 John',
    209: 'Jude', 231: 'Revelation 22', 259: 'Matthew 28' };
  Object.keys(want).forEach(i => assertEqual(NT_READINGS[i], want[i], `NT ${i}`));
});

test('readings: OT spot checks', () => {
  const want = { 0: 'Genesis 1', 26: 'Genesis 25:19-34', 61: 'Exodus 13:17–14',
    105: 'Deuteronomy 32:48-52; 34', 178: 'Amos 1:1; 9', 210: 'Ezekiel 1:1-3; 36:16-38', 259: 'Malachi 3–4' };
  Object.keys(want).forEach(i => assertEqual(OT_READINGS[i], want[i], `OT ${i}`));
  OT_READINGS.forEach(r => assert(!/^(Psalm|Proverbs)/.test(r), `unexpected ${r}`));
});

test('readings: Psalms', () => {
  assertEqual(PSALM_READINGS[0], 'Psalm 1');
  assertEqual(PSALM_READINGS[118], 'Psalm 119:1-24');
  assertEqual(PSALM_READINGS[124], 'Psalm 119:145-176');
  assertEqual(PSALM_READINGS[125], 'Psalm 120');
  assertEqual(PSALM_READINGS[155], 'Psalm 150');
});

test('readings: Proverbs cover every verse once', () => {
  let c = 1, v = 0;
  PROVERBS_READINGS.forEach(ref => {
    const m = ref.match(/^Proverbs (\d+):(\d+)-(\d+)$/);
    assert(m, `bad proverbs ref ${ref}`);
    const [ch, a, b] = [+m[1], +m[2], +m[3]];
    if (v === PROVERBS_VERSE_COUNTS[c - 1]) { c++; v = 0; }
    assertEqual([ch, a], [c, v + 1], `${ref} should start at ${c}:${v + 1}`);
    assert(b >= a, `${ref} runs backwards`);
    v = b;
  });
  assertEqual([c, v], [31, 31]);
});
