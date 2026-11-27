# Chosen visual direction

**The Plan Sheet, e-ink** — `docs/mockups/plan-sheet-eink.html` (picture: `plan-sheet-eink.png`).
Chosen by Seth on 2026-11-26 over the earlier Ribbon / Three Tracks / Lamplight mockups, the Date-Due Card and category-standard directions, and three layout variations (Focus, Week sheet, Side by side).

## World
- Ground: e-paper grey `#E7E7E2`. Ink `#1E1F1F`, secondary ink `#474A49`, rules `#B5B6B0`, faint `#CFD0CA`.
- Muted e-ink track colors: New Testament slate teal `#3F6E6C`, Old Testament faded brick `#95533F`, Psalms/Proverbs dusty ochre `#85703A`.
- Flat: solid 1–2.5px ink rules, no shadows, no gradients, square corners.
- Type: Atkinson Hyperlegible (400/700), self-hosted in `fonts/` once Seth approves the download; falls back to Avenir Next / Segoe UI.
- Your marks are solid fills; a reading partner's marks are halftone patterns. Each partner gets their own pattern (dots, diagonal lines, stripes).

## Today layout
Date (largest) and "Week N, day D"; three reading rows (square tick box, reference 26px bold, track name with a small Biblia link icon, partner names on the right); "This week" grid (3 tracks × Mon–Fri, each cell split: you left, partner right); "N readings to catch up" link; four-tab bar (Today, Week, Plan, Account).

## Signature move
Ticking a box plays a tiny e-ink partial refresh: the box flashes ink for ~120ms, then settles into the track color while the check draws in 4 steps. Instant under reduced motion.

## Multiple partners (agreed with Seth)
- Rows list who else read it: pattern swatch + first name; initials with 3+ partners; "+N" past three.
- The week grid shows one partner at a time; with 2+ partners a "Showing: <name>" switch appears, and a summary line lists everyone ("Anna 2 of 15, Mark 5 of 15").
- With no partners, partner names, the grid's right halves and the key are hidden.

No memory verse (removed by Seth).
