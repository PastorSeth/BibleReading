/* ============================================================
   PASSAGE LINKS — turns a reading like "Exodus 13:17–14" into a
   ref.ly link (Faithlife's short links). These links are a quiet extra: the reading
   itself happens in a physical Bible.

   Link format: https://ref.ly/Ex13.17-14.31 — no version, so Biblia
   uses the reader's preferred Bible when they're signed in (ESV for
   everyone else). On an iPhone with Logos, Faithlife Study Bible or
   the Biblia app installed, ref.ly links open that app instead.
   - Books use Biblia's short names (BOOK_ABBR below), each checked
     against Biblia on 2026-11-26. Watch the look-alikes: Jud is Jude
     and Jdg is Judges; Jn John, Jon Jonah, Joe Joel, Jos Joshua.
   - In the plan data, an en dash (–) after a verse means "through
     the end of that chapter" ("Exodus 13:17–14"); a hyphen (-) is a
     verse range ("Genesis 25:19-34").
   - "Deuteronomy 32:48-52; 34" becomes two links, because Biblia
     would read it as one range from 32:48 straight through 34.
   ============================================================ */


const BOOK_ABBR = {
  'Genesis': 'Ge', 'Exodus': 'Ex', 'Leviticus': 'Le', 'Numbers': 'Nu', 'Deuteronomy': 'Dt',
  'Joshua': 'Jos', 'Judges': 'Jdg', 'Ruth': 'Ru', '1 Samuel': '1Sa', '2 Samuel': '2Sa',
  '1 Kings': '1Ki', '2 Kings': '2Ki', 'Ezra': 'Ezr', 'Nehemiah': 'Ne', 'Esther': 'Es', 'Job': 'Job',
  'Psalm': 'Ps', 'Proverbs': 'Pr', 'Isaiah': 'Is', 'Jeremiah': 'Je', 'Ezekiel': 'Eze', 'Daniel': 'Da',
  'Hosea': 'Ho', 'Joel': 'Joe', 'Amos': 'Am', 'Jonah': 'Jon', 'Micah': 'Mic', 'Zechariah': 'Zec',
  'Malachi': 'Mal', 'Matthew': 'Mt', 'Mark': 'Mk', 'Luke': 'Lk', 'John': 'Jn', 'Acts': 'Ac',
  'Romans': 'Ro', '1 Corinthians': '1Co', '2 Corinthians': '2Co', 'Galatians': 'Ga', 'Ephesians': 'Eph',
  'Philippians': 'Php', 'Colossians': 'Col', '1 Thessalonians': '1Th', '2 Thessalonians': '2Th',
  '1 Timothy': '1Ti', '2 Timothy': '2Ti', 'Titus': 'Tt', 'Philemon': 'Phm', 'Hebrews': 'Heb',
  'James': 'Jas', '1 Peter': '1Pe', '2 Peter': '2Pe', '1 John': '1Jn', '2 John': '2Jn', '3 John': '3Jn',
  'Jude': 'Jud', 'Revelation': 'Re',
};

// Last verse of each chapter that a "through the end of chapter" reading reaches.
const LAST_VERSE = { 'Exodus 14': 31, 'Joshua 6': 27, '1 Kings 17': 24 };

function displayRef(ref) {
  return ref.replace(/(\d)-(?=\d)/g, '$1–');
}

// "C", "C:A", "C:A-B", "C–D", "C–D:B", "C:A–D:B", "C:A–D" → Biblia's "C.A-D.B" form.
function bibliaPassage(book, rest) {
  if (!rest) return '';
  const chapterRange = rest.match(/^(\d+):(\d+)–(\d+)$/);
  if (chapterRange) {
    const [, c, a, d] = chapterRange;
    const last = LAST_VERSE[`${book} ${d}`];
    return last ? `${c}.${a}-${d}.${last}` : `${c}-${d}`;
  }
  return rest.replace(/–/g, '-').replace(/:/g, '.');
}

function bibliaLinks(ref) {
  const links = [];
  let book = '';
  ref.split(';').map(p => p.trim()).filter(Boolean).forEach(piece => {
    const named = piece.match(/^((?:[1-3] )?[A-Za-z]+(?: [A-Za-z]+)*)(?: (.+))?$/);
    const rest = named ? named[2] || '' : piece;
    if (named) book = named[1];
    links.push({
      label: displayRef(rest ? `${book} ${rest}` : book),
      url: `https://ref.ly/${BOOK_ABBR[book] || book.replace(/ /g, '')}${bibliaPassage(book, rest)}`,
    });
  });
  return links;
}

/* Android: plain ref.ly links don't open Logos there (no app-link file), so on
   Android we use Chrome's "intent" link: it opens the Logos app if it's
   installed and accepts the link, and otherwise goes to the normal web link. */
const LOGOS_ANDROID_PACKAGE = 'com.logos.androidlogos';

function isAndroid(userAgent) {
  return /Android/i.test(String(userAgent || ''));
}

function appLink(url, android) {
  if (!android) return url;
  return `intent://${url.replace(/^https:\/\//, '')}#Intent;scheme=https;package=${LOGOS_ANDROID_PACKAGE};` +
    `S.browser_fallback_url=${encodeURIComponent(url)};end`;
}
