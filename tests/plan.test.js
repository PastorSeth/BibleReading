const ymd = d => [d.getFullYear(), d.getMonth() + 1, d.getDate()];

test('plan: each year starts on the first Monday of January', () => {
  assertEqual(ymd(planStart(2027)), [2027, 1, 4]);
  assertEqual(ymd(planStart(2028)), [2028, 1, 3]);
  assertEqual(ymd(planStart(2029)), [2029, 1, 1]);
  assertEqual(planStart(2028).getDay(), 1);
});

test('plan: start and end of a year', () => {
  assertEqual(planDayForDate(new Date(2027, 0, 4, 6)), { status: 'reading', year: 2027, week: 1, weekday: 1 });
  assertEqual(planDayForDate(new Date(2027, 11, 31, 23, 59)), { status: 'reading', year: 2027, week: 52, weekday: 5 });
  assertEqual(planDayForDate(new Date(2027, 0, 1)), { status: 'before', year: 2027, daysUntilStart: 3 });
  assertEqual(planDayForDate(new Date(2028, 11, 30)), { status: 'after', year: 2028 });
});

test('plan: before the first year counts down to 2027', () => {
  assertEqual(planDayForDate(new Date(2026, 10, 26, 15)), { status: 'before', year: 2027, daysUntilStart: 39 });
});

test('plan: the plan restarts every January', () => {
  assertEqual(planDayForDate(new Date(2028, 0, 1)), { status: 'before', year: 2028, daysUntilStart: 2 });
  assertEqual(planDayForDate(new Date(2028, 0, 3, 7)), { status: 'reading', year: 2028, week: 1, weekday: 1 });
  assertEqual(planDayForDate(new Date(2029, 0, 1, 7)), { status: 'reading', year: 2029, week: 1, weekday: 1 });
  assertEqual(planDayForDate(new Date(2028, 11, 29, 20)), { status: 'reading', year: 2028, week: 52, weekday: 5 });
});

test('plan: weekends', () => {
  assertEqual(planDayForDate(new Date(2027, 0, 9)), { status: 'weekend', year: 2027, week: 1, nextWeek: 2 });
  assertEqual(planDayForDate(new Date(2027, 0, 10, 23)), { status: 'weekend', year: 2027, week: 1, nextWeek: 2 });
});

test('plan: DST days', () => {
  assertEqual(planDayForDate(new Date(2027, 2, 15, 0, 30)), { status: 'reading', year: 2027, week: 11, weekday: 1 });
  assertEqual(planDayForDate(new Date(2027, 10, 8, 0, 30)), { status: 'reading', year: 2027, week: 45, weekday: 1 });
});

test('plan: dateFor round trip', () => {
  [2027, 2028, 2032].forEach(y => {
    for (let w = 1; w <= 52; w++) {
      for (let d = 1; d <= 5; d++) {
        const got = planDayForDate(dateFor(y, w, d));
        assertEqual([got.year, got.week, got.weekday], [y, w, d], `${y} week ${w} day ${d}`);
      }
    }
  });
  const first = dateFor(2027, 1, 1);
  assertEqual([first.getFullYear(), first.getMonth(), first.getDate(), first.getHours()], [2027, 0, 4, 0]);
});

test('plan: readingsFor', () => {
  const mon = readingsFor(2027, 1, 1);
  assertEqual(mon.map(r => r.id), ['2027-w01d1-nt', '2027-w01d1-ot', '2027-w01d1-ps']);
  assertEqual(mon.map(r => r.ref), ['Luke 1', 'Genesis 1', 'Psalm 1']);
  assertEqual(mon.map(r => r.track), ['nt', 'ot', 'ps']);
  assertEqual(mon.map(r => r.label), ['New Testament', 'Old Testament', 'Psalm']);
  assertEqual(readingsFor(2027, 1, 2)[2], { id: '2027-w01d2-pr', track: 'pr', label: 'Proverbs', ref: 'Proverbs 1:1-7' });
  assertEqual(readingsFor(2027, 52, 5).map(r => r.ref), ['Matthew 28', 'Malachi 3–4', 'Psalm 150']);
  assertEqual(readingsFor(2027, 52, 4)[2].ref, 'Proverbs 31:21-31');
  assertEqual(readingsFor(2028, 1, 1).map(r => r.id), ['2028-w01d1-nt', '2028-w01d1-ot', '2028-w01d1-ps']);
  assertEqual(readingsFor(2028, 1, 1).map(r => r.ref), ['Luke 1', 'Genesis 1', 'Psalm 1']);
});

test('plan: parseItemId', () => {
  assertEqual(parseItemId('2028-w03d2-pr'), { year: 2028, week: 3, weekday: 2, track: 'pr' });
  assertEqual(parseItemId('w03d2-pr'), null);
});

test('plan: weekItemIds', () => {
  const ids = weekItemIds(2027, 3);
  assertEqual(ids.length, 15);
  assertEqual(ids[0], '2027-w03d1-nt');
  assertEqual(ids[14], '2027-w03d5-ps');
});

test('plan: allItemIdsBefore covers only the current plan year', () => {
  assertEqual(allItemIdsBefore(new Date(2027, 0, 6, 21)),
    ['2027-w01d1-nt', '2027-w01d1-ot', '2027-w01d1-ps', '2027-w01d2-nt', '2027-w01d2-ot', '2027-w01d2-pr']);
  const sat = allItemIdsBefore(new Date(2027, 0, 9));
  assertEqual(sat.length, 15);
  assertEqual(sat[14], '2027-w01d5-ps');
  assertEqual(allItemIdsBefore(new Date(2027, 0, 4, 12)), []);
  assertEqual(allItemIdsBefore(new Date(2026, 11, 1)), []);
  assertEqual(allItemIdsBefore(new Date(2028, 0, 2)), [], 'a new year starts with nothing to catch up');
  assertEqual(allItemIdsBefore(new Date(2028, 0, 5, 9)).length, 6);
  assert(allItemIdsBefore(new Date(2028, 0, 5, 9)).every(id => id.startsWith('2028-')));
  assertEqual(allItemIdsBefore(new Date(2028, 11, 30)).length, 780);
});
