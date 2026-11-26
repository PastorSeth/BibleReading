test('plan: start and end', () => {
  assertEqual(planDayForDate(new Date(2027, 0, 4, 6)), { status: 'reading', week: 1, weekday: 1 });
  assertEqual(planDayForDate(new Date(2027, 11, 31, 23, 59)), { status: 'reading', week: 52, weekday: 5 });
  assertEqual(planDayForDate(new Date(2027, 0, 1)), { status: 'before', daysUntilStart: 3 });
  assertEqual(planDayForDate(new Date(2028, 0, 1)).status, 'after');
});

test('plan: weekends', () => {
  assertEqual(planDayForDate(new Date(2027, 0, 9)), { status: 'weekend', week: 1, nextWeek: 2 });
  assertEqual(planDayForDate(new Date(2027, 0, 10, 23)), { status: 'weekend', week: 1, nextWeek: 2 });
  assertEqual(planDayForDate(new Date(2028, 0, 2)).status, 'after');
});

test('plan: DST days', () => {
  assertEqual(planDayForDate(new Date(2027, 2, 15, 0, 30)), { status: 'reading', week: 11, weekday: 1 });
  assertEqual(planDayForDate(new Date(2027, 10, 8, 0, 30)), { status: 'reading', week: 45, weekday: 1 });
});

test('plan: dateFor round trip', () => {
  for (let w = 1; w <= 52; w++) {
    for (let d = 1; d <= 5; d++) {
      const got = planDayForDate(dateFor(w, d));
      assertEqual([got.week, got.weekday], [w, d], `week ${w} day ${d}`);
    }
  }
  const first = dateFor(1, 1);
  assertEqual([first.getFullYear(), first.getMonth(), first.getDate(), first.getHours()], [2027, 0, 4, 0]);
});

test('plan: readingsFor', () => {
  const mon = readingsFor(1, 1);
  assertEqual(mon.map(r => r.id), ['w01d1-nt', 'w01d1-ot', 'w01d1-ps']);
  assertEqual(mon.map(r => r.ref), ['Luke 1', 'Genesis 1', 'Psalm 1']);
  assertEqual(mon.map(r => r.track), ['nt', 'ot', 'ps']);
  assertEqual(mon.map(r => r.label), ['New Testament', 'Old Testament', 'Psalm']);
  assertEqual(readingsFor(1, 2)[2], { id: 'w01d2-pr', track: 'pr', label: 'Proverbs', ref: 'Proverbs 1:1-7' });
  assertEqual(readingsFor(52, 5).map(r => r.ref), ['Matthew 28', 'Malachi 3–4', 'Psalm 150']);
  assertEqual(readingsFor(52, 4)[2].ref, 'Proverbs 31:21-31');
});

test('plan: memory verse', () => {
  assertEqual(memoryVerseFor(1), { id: 'w01-mv', ref: 'Matthew 5:1-2' });
  assertEqual(memoryVerseFor(52), { id: 'w52-mv', ref: 'Matthew 7:28-29' });
});

test('plan: weekItemIds', () => {
  const ids = weekItemIds(3);
  assertEqual(ids.length, 15);
  assertEqual(ids[0], 'w03d1-nt');
  assertEqual(ids[14], 'w03d5-ps');
  assert(!ids.includes('w03-mv'));
});

test('plan: allItemIdsBefore', () => {
  assertEqual(allItemIdsBefore(new Date(2027, 0, 6, 21)),
    ['w01d1-nt', 'w01d1-ot', 'w01d1-ps', 'w01d2-nt', 'w01d2-ot', 'w01d2-pr']);
  const sat = allItemIdsBefore(new Date(2027, 0, 9));
  assertEqual(sat.length, 16);
  assertEqual(sat[15], 'w01-mv');
  assertEqual(allItemIdsBefore(new Date(2027, 0, 4, 12)), []);
  assertEqual(allItemIdsBefore(new Date(2026, 11, 1)), []);
  assertEqual(allItemIdsBefore(new Date(2028, 5, 1)).length, 832);
});
