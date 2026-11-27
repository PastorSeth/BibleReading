---
name: Bible Reading 2027
description: The printed reading-plan sheet you keep in your Bible, rendered as an e-paper screen.
colors:
  ink: "#1E1F1F"
  ink-2: "#474A49"
  paper: "#E7E7E2"
  field: "#F1F1ED"
  rule: "#B5B6B0"
  faint: "#CFD0CA"
  nt-slate-teal: "#3F6E6C"
  ot-faded-brick: "#95533F"
  wis-dusty-ochre: "#85703A"
typography:
  display:
    fontFamily: "Vollkorn, Georgia, Times New Roman, serif"
    fontSize: "32px"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.005em"
  headline:
    fontFamily: "Vollkorn, Georgia, Times New Roman, serif"
    fontSize: "29px"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.005em"
  title:
    fontFamily: "Vollkorn, Georgia, Times New Roman, serif"
    fontSize: "19px"
    fontWeight: 700
    lineHeight: 1.4
  body:
    fontFamily: "Alegreya Sans, Avenir Next, Segoe UI, Roboto, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.4
  label:
    fontFamily: "Alegreya Sans, Avenir Next, Segoe UI, Roboto, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.4
  label-sm:
    fontFamily: "Alegreya Sans, Avenir Next, Segoe UI, Roboto, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.4
rounded:
  none: "0px"
spacing:
  xs: "4px"
  sm: "10px"
  md: "14px"
  gutter: "20px"
  section: "28px"
components:
  tick-box:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.none}"
    size: "36px"
  tick-box-done-nt:
    backgroundColor: "{colors.nt-slate-teal}"
    textColor: "{colors.paper}"
  tick-box-done-ot:
    backgroundColor: "{colors.ot-faded-brick}"
    textColor: "{colors.paper}"
  tick-box-done-wis:
    backgroundColor: "{colors.wis-dusty-ochre}"
    textColor: "{colors.paper}"
  reading-ref:
    textColor: "{colors.ink}"
    typography: "{typography.headline}"
    padding: "14px 0"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "10px 16px"
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.none}"
    padding: "10px 16px"
  input-field:
    backgroundColor: "{colors.field}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "10px 12px"
  week-cell:
    backgroundColor: "transparent"
    rounded: "{rounded.none}"
    height: "28px"
  tab-bar:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink-2}"
    typography: "{typography.label-sm}"
  tab-bar-active:
    textColor: "{colors.ink}"
  preview-banner:
    backgroundColor: "{colors.faint}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    padding: "10px 20px"
---

# Design System: Bible Reading 2027

## Overview

**Creative North Star: "The Plan Sheet"**

The app is the printed reading-plan sheet tucked inside a Bible, shown on an e-paper screen. It is a list you tick, not a feed you scroll: a large date, three large references, square boxes with heavy ink borders, and a small week grid. Everything sits on one flat sheet of grey e-paper, separated by solid ink rules instead of cards, panels or shadows. The physical Bible is the main event; the screen points to it and gets out of the way.

Density is calm and single-column (480px max). Color is rare and functional: three muted, Kaleido-style e-ink inks, one per reading track, appear only where a reading is done. A reading partner's marks are the same inks rendered as halftone patterns, so "you" and "them" read apart without labels. Motion is a single e-ink partial refresh on the tick box; nothing else moves.

Confirmed rejections: a dark theme (light e-paper only), card stacks, streak flames and badges, photo heroes, red warnings about being behind, and anything churchy or ornate (stained glass, scrolls, parchment, calligraphy).

**Key Characteristics:**
- E-paper grey ground, near-black ink, flat solid rules (1px to 2.5px).
- Square corners everywhere; no radius in the system.
- Three muted track inks, used as fills for completed readings only.
- Solid fill is you; halftone pattern is a partner.
- Two typefaces: Vollkorn Bold for the date, readings and headings; Alegreya Sans (400/700) for everything small. Standard numbers in both.
- One signature motion: the tick box's ink flash and stepped check.

## Colors

An e-paper palette: grey ground, two inks, two rule greys, and three desaturated e-ink colors that each belong to one reading track.

### Primary
- **Slate Teal** (nt-slate-teal): New Testament. Fill of a done NT tick box, week cell and plan dot; the partner's NT halftone. Also the app icon's tick.

### Secondary
- **Faded Brick** (ot-faded-brick): Old Testament. Same roles as Slate Teal for the OT track. It also colors inline form error text (4.7:1 on paper); it is a muted brick, never a warning red.

### Tertiary
- **Dusty Ochre** (wis-dusty-ochre): Psalms and Proverbs. Same roles for the wisdom track. At 3.9:1 on paper it clears graphic contrast but not small-text contrast: use it as a fill, never for body text.

### Neutral
- **Ink** (ink): text, heavy rules, tick-box borders, primary button fill, focus rings, selection background, the current day in the week grid.
- **Secondary Ink** (ink-2): meta text (track names, week sequence, sync state, inactive tabs, grid labels, link icons), 7.2:1 on paper. The default color of an uncolored halftone swatch.
- **E-Paper** (paper): the whole ground, plus the check stroke drawn inside a done tick box.
- **Field White** (field): the slightly lighter fill inside text inputs and selects, so an editable field reads as a cut-out in the sheet.
- **Rule Grey** (rule): 1px hairlines between list rows, and the empty outline of plan-day dots.
- **Faint Grey** (faint): empty week-grid cell borders, the preview banner ground, and on screens 600px and wider the darker "desk" behind the sheet.

### Named Rules
**The Ink-Means-Done Rule.** A track color appears only where a reading is done (a tick, a cell, a plan dot) or as the key for one. It never decorates headings, links, buttons or backgrounds.

**The Solid-Is-You Rule.** Your marks are solid fills of the track ink. A partner's marks are the same ink as a halftone pattern (dots, diagonal, lines), one pattern per partner in the order they were added. Never distinguish people by a new hue.

**The Quiet-About-Behind Rule.** Being behind is a plain underlined line in ink ("6 readings to catch up"), never a colored alert, badge or count bubble.

## Typography

**Display Font:** Vollkorn Bold (self-hosted, 700 only; falls back to Georgia, Times New Roman, serif). Chosen by Seth on 2026-11-26 over Literata, Bitter and other slab and book serifs.
**Body Font:** Alegreya Sans (self-hosted, 400 and 700; falls back to Avenir Next, Segoe UI, Roboto, sans-serif). Chosen by Seth on 2026-11-26 to replace Atkinson Hyperlegible, whose engineered shapes read as technical next to Vollkorn.

**Character:** Vollkorn is a dark, warm book serif: the big type reads like a well-printed Bible, without ornament. Alegreya Sans is a humanist sans with calligraphic roots, so the small text shares Vollkorn's hand-made warmth. It runs small, so every small size is one pixel larger than a typical sans. No italics. Both fonts default to book-style numbers, where 1 looks like a capital I ("Psalm 11" would read "Psalm II"), so standard (lining) numbers are switched on for the whole page (Seth's choice).

### Hierarchy
- **Display** (Vollkorn 700, 32px, 1.1, -0.005em): the date on Today and the week title on Week. The largest text on any screen. Balanced wrapping.
- **Headline** (Vollkorn 700, 29px, 1.1, -0.005em): a Bible reference in a reading row. References are glanced at from beside an open Bible, so they stay this large. Week previews use a reduced 21px.
- **Title** (Vollkorn 700, 19px): section headings ("This week") and week summaries in the Plan list.
- **Body** (Alegreya Sans 400, 17px, 1.4): the week sequence line, settings rows, button text (at 700).
- **Label** (Alegreya Sans 400, 15px): track names, sync state, meta counts, form labels, text buttons, preview banner.
- **Label small** (Alegreya Sans 400, 14px; tabs at 13px): week-grid labels, partner names, the key, tab-bar captions. The current day and active tab switch to ink at 700.

### Named Rules
**The Two-Voices Rule.** Big type (date, references, section and week headings, the caught-up message) is Vollkorn; everything else is Alegreya Sans. Hierarchy comes from size, the two faces and 400/700 only. No italics, no uppercase labels, no letter-spaced small caps.

**The Reference-Is-Biggest-in-Its-Row Rule.** In any list of readings, the reference is the dominant text; track name and links sit under it at 14px in secondary ink.

## Layout

A single column, max 480px, centred. Horizontal gutter is 20px; the header starts at max(16px, safe-area inset). Content flows top to bottom: an app bar (name left, sync state right), the display date with its sequence line, then lists opened by a 2px ink rule and divided by 1px rule hairlines (14px row padding). Sections are spaced 28px apart with 10px below their heading. The tab bar is sticky at the bottom, four equal columns, honoring the bottom safe area.

The week grid is a CSS grid: an 88px label column and five equal day columns, 5px gaps, 28px-tall cells. Each cell is split in half (you left, partner right) only when a partner exists; otherwise it is one solid cell.

From 600px wide the sheet becomes a physical object: the page behind it turns Faint Grey (the desk) and the 480px column gets 2px ink borders left and right. Nothing else changes; there is no multi-column desktop layout.

Touch targets: tick boxes 36px with 16px gap to the reference; week arrows 44px; the quiet link icon pads out to about 26px.

## Elevation & Depth

None. The system is flat: no box-shadow, no blur, no tonal layering. Structure comes from rule weight alone: 2.5px ink for tick boxes, 2px ink to open a list, form, notice or tab bar, 1.5px for grid cells and small selects, 1px rule grey between rows. The only "depth" is the wide-screen desk, a flat darker grey behind the sheet.

### Named Rules
**The Rule-Weight Rule.** To separate or group, change the rule, not the surface. Heavier ink rules start things; light grey hairlines divide within them.

**The No-Smooth-Gradient Rule.** No smooth or tonal gradients and no shadows. Hard-stop repeating gradients are allowed because they are how the halftone patterns and the select chevron are drawn; those are print devices, not lighting.

## Shapes

Square everywhere (0px radius), including inputs and selects with native rounding removed. The recurring silhouette is the square: tick boxes, grid cells, plan-day dots (9px), partner swatches (14px), key chips (12px), the app icon's teal square. Icons are 1.6 to 1.8px stroked line drawings with square caps in their own style (calendar, three lines, four squares, person, arrows, a small external-link mark), never filled glyphs or emoji.

## Components

### Tick Box (signature)
A heavy-bordered square you press like a pen.
- **Shape:** 36px square, 2.5px ink border, no radius; a 24px check inside, 3px stroke in paper, square caps.
- **Done:** fill and border take the row's track ink; the check is visible.
- **Ticking motion:** an e-ink partial refresh. The box flashes solid ink for about 120ms (stepped, not eased), settles to the track ink, and the check draws itself in 4 steps over 200ms. Unticking flashes ink, then returns to paper. Under reduced motion the change is instant.
- **Focus:** 3px ink outline, 3px offset.

### Reading Row
- Tick box left, then the reference (Headline), then a 14px secondary-ink line with track name and a quiet 14px external-link icon (ESV.org online link, hidden when links are switched off). Partner names stack on the right at 13px, each with a 14px halftone swatch; initials with 3+ partners, "+N" past three.
- Rows are separated by 1px rule hairlines; the list opens with a 2px ink rule.

### Week Grid
- 3 tracks by Mon to Fri. Cells: 28px tall, 1.5px Faint Grey border; today's column has ink borders and an ink, bold day label.
- Your half fills solid with the track ink; the partner half shows that partner's halftone. With no partners the cell is whole and the key is hidden.
- With 2+ partners a "Showing:" select appears beside the heading, and a 14px totals line lists everyone. With one partner there is no totals line.

### Buttons
- **Shape:** square (0px), 2px ink border, 10px by 16px padding, 16px bold.
- **Outline (default):** transparent fill, ink text.
- **Primary:** ink fill, paper text. One per form.
- **Disabled:** 50% opacity.
- **Text button:** 14px ink, underlined (3px offset), no border; for low-stakes actions like Remove.

### Inputs / Fields
- **Style:** Field White fill, 2px ink border, square, 10px by 12px padding, 17px ink text; label above at 14px secondary ink.
- **Select:** same, with a small ink chevron drawn from two hard-stop gradients.
- **Focus:** the global 3px ink outline at 3px offset.
- **Error:** a 14px Faded Brick line below the form; nothing turns red, nothing shakes.

### Notice and Preview Banner
- **Notice:** a 2px ink box, 12px by 14px padding, for one-off messages (signed out).
- **Preview banner:** full-width strip at the top of the sheet on Faint Grey, 14px text, closed by a 2px ink rule. Appears only in date-preview mode.

### Navigation
- Four-tab bar (Today, Week, Plan, Account), sticky at the bottom, opened by a 2px ink rule on paper. Each tab is a 24px line icon over a 12px caption in secondary ink; the active tab is ink and bold. No pill, no underline, no fill.
- Week paging uses 44px chevron arrows either side of the display title.

## Do's and Don'ts

### Do:
- **Do** keep every surface on E-Paper with square corners and solid rules (2px ink to open, 1px rule grey to divide).
- **Do** use a track ink only for a done reading, its grid cell, its plan dot, or its key.
- **Do** draw a partner's marks as a halftone of the track ink (dots, diagonal, lines, in that order); keep your own marks solid.
- **Do** keep references at 26px bold and the date as the largest text on the screen.
- **Do** keep the online-link icon small and in secondary ink (at least 3:1), pointing at ESV.org /verses/ pages, and hide it entirely when links are switched off.
- **Do** honor reduced motion: the tick-box refresh becomes an instant change.

### Don't:
- **Don't** add a dark theme; the system is e-paper light only.
- **Don't** use shadows, blur, smooth gradients, or rounded corners.
- **Don't** add cards, streaks, badges, flames, count bubbles or red warnings; being behind is a quiet ink line.
- **Don't** set text in Dusty Ochre (3.9:1); of the track inks, only Faded Brick carries text, and only for form errors.
- **Don't** introduce new hues to tell partners apart; vary the pattern, not the color.
- **Don't** add anything churchy or ornate: no stained glass, scrolls, parchment, calligraphy or decorative crosses.
- **Don't** show scripture text or a memory verse; the app points to the printed Bible.
