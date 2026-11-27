/* ============================================================
   THE READING PLAN — every reading for 2027, in order.
   ------------------------------------------------------------
   Five readings a week (Mon–Fri) for 52 weeks.
   - NT_READINGS: Foundations NT260 (Replicate.org), 260 chapters.
   - OT_READINGS: F260 Old Testament, one reading a day (260).
   - PSALM_READINGS: Mon/Wed/Fri, all 150 Psalms (Psalm 119 in 7 parts).
   - PROVERBS_READINGS: Tue/Thu, all of Proverbs in 104 short portions.
   ============================================================ */

function expandChapters(runs) {
  const out = [];
  runs.forEach(([book, first, last]) => {
    if (first === null) { out.push(book); return; }
    for (let c = first; c <= last; c++) out.push(`${book} ${c}`);
  });
  return out;
}

// [book, first chapter, last chapter]; null = a one-chapter book, named alone.
const NT_READINGS = expandChapters([
  ['Luke', 1, 24], ['Acts', 1, 14], ['James', 1, 5], ['Acts', 15, 16],
  ['Galatians', 1, 6], ['Acts', 17, 18], ['1 Thessalonians', 1, 5],
  ['2 Thessalonians', 1, 3], ['Acts', 19, 19], ['1 Corinthians', 1, 16],
  ['2 Corinthians', 1, 13], ['Mark', 1, 16], ['Romans', 1, 16], ['Acts', 20, 28],
  ['Colossians', 1, 4], ['Ephesians', 1, 6], ['Philippians', 1, 4], ['Philemon', null],
  ['Hebrews', 1, 13], ['1 Timothy', 1, 6], ['2 Timothy', 1, 4], ['Titus', 1, 3],
  ['1 Peter', 1, 5], ['2 Peter', 1, 3], ['John', 1, 21], ['1 John', 1, 5],
  ['2 John', null], ['3 John', null], ['Jude', null], ['Revelation', 1, 22],
  ['Matthew', 1, 28],
]);

const OT_READINGS = [
  "Genesis 1", "Genesis 2", "Genesis 3", "Genesis 4", "Genesis 6",  // week 1
  "Genesis 7", "Genesis 8", "Genesis 9", "Job 1", "Job 2",  // week 2
  "Job 38", "Job 39", "Job 40", "Job 41", "Job 42",  // week 3
  "Genesis 11", "Genesis 12", "Genesis 15", "Genesis 16", "Genesis 17",  // week 4
  "Genesis 18", "Genesis 19", "Genesis 20", "Genesis 21", "Genesis 22",  // week 5
  "Genesis 24", "Genesis 25:19-34", "Genesis 26", "Genesis 27", "Genesis 28",  // week 6
  "Genesis 29", "Genesis 30:1-24", "Genesis 31", "Genesis 32", "Genesis 33",  // week 7
  "Genesis 35", "Genesis 37", "Genesis 39", "Genesis 40", "Genesis 41",  // week 8
  "Genesis 42", "Genesis 43", "Genesis 44", "Genesis 45", "Genesis 46",  // week 9
  "Genesis 47", "Genesis 48", "Genesis 49", "Genesis 50", "Exodus 1",  // week 10
  "Exodus 2", "Exodus 3", "Exodus 4", "Exodus 5", "Exodus 6",  // week 11
  "Exodus 7", "Exodus 8", "Exodus 9", "Exodus 10", "Exodus 11",  // week 12
  "Exodus 12", "Exodus 13:17–14", "Exodus 16", "Exodus 17", "Exodus 19",  // week 13
  "Exodus 20", "Exodus 24", "Exodus 25", "Exodus 26", "Exodus 27",  // week 14
  "Exodus 28", "Exodus 29", "Exodus 30", "Exodus 31", "Exodus 32",  // week 15
  "Exodus 33", "Exodus 34", "Exodus 35–36:1", "Exodus 40", "Leviticus 8",  // week 16
  "Leviticus 9", "Leviticus 16", "Leviticus 17", "Leviticus 23", "Leviticus 26",  // week 17
  "Numbers 11", "Numbers 12", "Numbers 13", "Numbers 14", "Numbers 16",  // week 18
  "Numbers 17", "Numbers 20", "Numbers 27:12-23", "Numbers 34", "Numbers 35",  // week 19
  "Deuteronomy 1", "Deuteronomy 2", "Deuteronomy 3", "Deuteronomy 4", "Deuteronomy 6",  // week 20
  "Deuteronomy 7", "Deuteronomy 8", "Deuteronomy 9", "Deuteronomy 30", "Deuteronomy 31",  // week 21
  "Deuteronomy 32:48-52; 34", "Joshua 1", "Joshua 2", "Joshua 3", "Joshua 4",  // week 22
  "Joshua 5:10–6", "Joshua 7", "Joshua 8", "Joshua 23", "Joshua 24",  // week 23
  "Judges 2", "Judges 3", "Judges 4", "Judges 6", "Judges 7",  // week 24
  "Judges 13", "Judges 14", "Judges 15", "Judges 16", "Ruth 1",  // week 25
  "Ruth 2", "Ruth 3", "Ruth 4", "1 Samuel 1", "1 Samuel 2",  // week 26
  "1 Samuel 3", "1 Samuel 8", "1 Samuel 9", "1 Samuel 10", "1 Samuel 13",  // week 27
  "1 Samuel 14", "1 Samuel 15", "1 Samuel 16", "1 Samuel 17", "1 Samuel 18",  // week 28
  "1 Samuel 19", "1 Samuel 20", "1 Samuel 21", "1 Samuel 22", "1 Samuel 24–25:1",  // week 29
  "1 Samuel 28", "1 Samuel 31", "2 Samuel 1", "2 Samuel 2:1-7; 3:1", "2 Samuel 5",  // week 30
  "2 Samuel 6", "2 Samuel 7", "2 Samuel 9", "2 Samuel 11", "2 Samuel 12",  // week 31
  "2 Samuel 24", "1 Kings 2", "1 Kings 3", "1 Kings 6", "1 Kings 8",  // week 32
  "1 Kings 9:1-9", "1 Kings 11", "1 Kings 12", "1 Kings 16:29–17", "1 Kings 18",  // week 33
  "1 Kings 19", "1 Kings 21", "1 Kings 22", "2 Kings 2", "2 Kings 5",  // week 34
  "2 Kings 6:1-23", "Jonah 1", "Jonah 2", "Jonah 3", "Jonah 4",  // week 35
  "Hosea 1", "Hosea 2", "Hosea 3", "Amos 1:1; 9", "Joel 1",  // week 36
  "Joel 2", "Joel 3", "Isaiah 6", "Isaiah 9", "Isaiah 44",  // week 37
  "Isaiah 45", "Isaiah 52", "Isaiah 53", "Isaiah 65", "Isaiah 66",  // week 38
  "Micah 1", "Micah 4:6-13", "Micah 5", "2 Kings 17", "2 Kings 18",  // week 39
  "2 Kings 19", "2 Kings 20", "2 Kings 21", "2 Kings 22", "2 Kings 23",  // week 40
  "Jeremiah 1", "Jeremiah 2–3:5", "Jeremiah 25", "Jeremiah 29", "Jeremiah 31:31-40",  // week 41
  "Jeremiah 32", "Jeremiah 33", "Jeremiah 52", "2 Kings 24", "2 Kings 25",  // week 42
  "Ezekiel 1:1-3; 36:16-38", "Ezekiel 37", "Daniel 1", "Daniel 2", "Daniel 3",  // week 43
  "Daniel 4", "Daniel 5", "Daniel 6", "Daniel 9", "Daniel 10",  // week 44
  "Daniel 12", "Ezra 1", "Ezra 2", "Ezra 3", "Ezra 4",  // week 45
  "Ezra 5", "Ezra 6", "Zechariah 1:1-6", "Zechariah 2", "Zechariah 12",  // week 46
  "Ezra 7", "Ezra 8", "Ezra 9", "Ezra 10", "Esther 1",  // week 47
  "Esther 2", "Esther 3", "Esther 4", "Esther 5", "Esther 6",  // week 48
  "Esther 7", "Esther 8", "Esther 9", "Esther 10", "Nehemiah 1",  // week 49
  "Nehemiah 2", "Nehemiah 3", "Nehemiah 4", "Nehemiah 5", "Nehemiah 6",  // week 50
  "Nehemiah 7", "Nehemiah 8", "Nehemiah 9", "Nehemiah 10", "Nehemiah 11",  // week 51
  "Nehemiah 12", "Nehemiah 13", "Malachi 1", "Malachi 2", "Malachi 3–4",  // week 52
];

const PSALM_READINGS = (() => {
  const out = [];
  for (let p = 1; p <= 150; p++) {
    if (p === 119) {
      ['1-24', '25-48', '49-72', '73-96', '97-120', '121-144', '145-176']
        .forEach(r => out.push(`Psalm 119:${r}`));
    } else {
      out.push(`Psalm ${p}`);
    }
  }
  return out;
})();

const PROVERBS_VERSE_COUNTS = [33, 22, 35, 27, 23, 35, 27, 36, 18, 32, 31, 28, 25, 35, 33, 33,
  28, 24, 29, 30, 31, 29, 35, 34, 28, 28, 27, 28, 27, 33, 31];

// Each chapter's portions, split at natural breaks (about 9 verses each).
const PROVERBS_READINGS = [
  '1-7, 8-19, 20-33', '1-11, 12-22', '1-12, 13-20, 21-26, 27-35', '1-9, 10-19, 20-27',
  '1-14, 15-23', '1-11, 12-19, 20-29, 30-35', '1-9, 10-20, 21-27', '1-11, 12-21, 22-31, 32-36',
  '1-12, 13-18', '1-8, 9-16, 17-24, 25-32', '1-8, 9-15, 16-23, 24-31', '1-9, 10-19, 20-28',
  '1-8, 9-16, 17-25', '1-9, 10-18, 19-27, 28-35', '1-8, 9-17, 18-25, 26-33', '1-9, 10-15, 16-24, 25-33',
  '1-9, 10-19, 20-28', '1-8, 9-16, 17-24', '1-7, 8-14, 15-22, 23-29', '1-7, 8-15, 16-23, 24-30',
  '1-8, 9-16, 17-24, 25-31', '1-9, 10-16, 17-29', '1-8, 9-18, 19-28, 29-35', '1-12, 13-22, 23-29, 30-34',
  '1-10, 11-20, 21-28', '1-12, 13-19, 20-28', '1-9, 10-17, 18-27', '1-9, 10-18, 19-28',
  '1-9, 10-18, 19-27', '1-9, 10-17, 18-23, 24-33', '1-9, 10-20, 21-31',
].flatMap((ranges, i) => ranges.split(', ').map(r => `Proverbs ${i + 1}:${r}`));
