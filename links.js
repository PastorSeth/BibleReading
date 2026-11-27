/* ============================================================
   PASSAGE LINKS — turns a reading like "Exodus 13:17–14" into a
   Biblia.com link. These links are a quiet extra: the reading
   itself happens in a physical Bible.

   Biblia link format: https://biblia.com/bible/esv/Exodus13.17-14.31
   - Book names are written in full with spaces removed. (Never
     abbreviate: "Jud" means Jude on Biblia, not Judges.)
   - In the plan data, an en dash (–) after a verse means "through
     the end of that chapter" ("Exodus 13:17–14"); a hyphen (-) is a
     verse range ("Genesis 25:19-34").
   - "Deuteronomy 32:48-52; 34" becomes two links, because Biblia
     would read it as one range from 32:48 straight through 34.
   ============================================================ */

// Links always open the ESV (Seth's choice: one translation keeps it simple).
const BIBLIA_VERSION = 'esv';

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
      url: `https://biblia.com/bible/${BIBLIA_VERSION}/${book.replace(/ /g, '')}${bibliaPassage(book, rest)}`,
    });
  });
  return links;
}
