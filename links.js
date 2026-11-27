/* ============================================================
   PASSAGE LINKS — turns a reading like "Exodus 13:17–14" into an
   ESV.org link. These links are a quiet extra: the reading itself
   happens in a physical Bible.

   Link format: https://www.esv.org/verses/Exodus+13:17-14:31/
   - "/verses/" pages show only that passage and stop at its last
     verse (plain esv.org/Luke+3/ keeps scrolling into Luke 4).
   - On iPhone and Android, the ESV Bible app claims /verses/ links,
     so they open the app when it's installed and the ad-free
     ESV.org page when it isn't.
   - In the plan data, an en dash (–) after a verse means "through
     the end of that chapter" ("Exodus 13:17–14"); a hyphen (-) is a
     verse range ("Genesis 25:19-34").
   - A reading in two pieces ("Deuteronomy 32:48-52; 34") is one
     link with the book named in each piece, so "34" can't be read
     as a verse.
   ============================================================ */

// Last verse of each chapter that a "through the end of chapter" reading reaches.
const LAST_VERSE = { 'Exodus 14': 31, 'Joshua 6': 27, '1 Kings 17': 24 };

function displayRef(ref) {
  return ref.replace(/(\d)-(?=\d)/g, '$1–');
}

// "C", "C:A", "C:A-B", "C–D", "C–D:B", "C:A–D" → ESV.org's "C:A-D:B" form.
function esvPassage(book, rest) {
  if (!rest) return '';
  const chapterRange = rest.match(/^(\d+):(\d+)–(\d+)$/);
  if (chapterRange) {
    const [, c, a, d] = chapterRange;
    const last = LAST_VERSE[`${book} ${d}`];
    return last ? `${c}:${a}-${d}:${last}` : `${c}-${d}`;
  }
  return rest.replace(/–/g, '-');
}

function passageLinks(ref) {
  let book = '';
  const pieces = ref.split(';').map(p => p.trim()).filter(Boolean).map(piece => {
    const named = piece.match(/^((?:[1-3] )?[A-Za-z]+(?: [A-Za-z]+)*)(?: (.+))?$/);
    const rest = named ? named[2] || '' : piece;
    if (named) book = named[1];
    return [book, esvPassage(book, rest)].filter(Boolean).join(' ').replace(/ /g, '+');
  });
  return [{ label: displayRef(ref), url: `https://www.esv.org/verses/${pieces.join(';')}/` }];
}
