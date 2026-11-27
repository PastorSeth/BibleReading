# Bible Reading 2027 — Design

*Working name; easy to change. Written 2026-11-26. Starts Monday, January 4, 2027.*

> **Update 2026-11-26:** Seth removed the weekly memory verse from the app. Anything below about memory verses no longer applies. The visual direction is "The Plan Sheet" with an e-ink feel and muted accent colors (see `.impeccable/` surface brief). Online links are always ESV; the translation choice was removed at Seth's request (the show/hide links switch stays).

## Why

Seth and his wife want to read through a shared plan in 2027, each on their own phone at their own time, and be able to see each other's progress. Anyone else Seth shares it with should be able to just open it and read today's passages — tracking and accounts are extras, never a gate.

## The reading plan (decided)

52 weeks, weekdays only (Mon–Fri). Weekends are left open for catch-up or rest. Week 1 starts Mon Jan 4, 2027; week 52 ends Fri Dec 31, 2027.

Each weekday has three readings, plus one memory verse per week:

| | Source | Notes |
|---|---|---|
| **New Testament** | Foundations NT260 (Replicate.org), day N = Nth chapter in the PDF | `~/Downloads/NT260 New Testament Reading Plan - Adult Version.pdf` |
| **Old Testament** | F260 OT, one reading a day, 52 weeks | `F260 OT One Chapter a Day - 52 Weeks.md` (the 260-reading version, *not* the 266 one). Some readings are partial chapters or ranges (e.g. "Exodus 13:17–14", "Deuteronomy 32:48-52; 34") — keep them exactly as written. |
| **Wisdom** | Psalms on Mon/Wed/Fri, Proverbs on Tue/Thu | Details below |
| **Memory verse** | One per week, from NT260 (Matthew 5:1-2 … 7:28-29) | Shown all week, checked off once per week |

**Psalms (Mon/Wed/Fri, 156 slots):** in order, one psalm per reading. Psalm 119 is split into 7 parts along its 8-verse stanzas: 1–24, 25–48, 49–72, 73–96, 97–120, 121–144, 145–176. 149 + 7 = 156 = 52 × 3, so Psalms end exactly on the last Friday.

**Proverbs (Tue/Thu, 104 slots):** all 31 chapters (915 verses) in order, split into 104 portions averaging ~9 verses. Portions break at natural seams (the "my son" discourses in chapters 1–9, section headings like 10:1, 22:17, 25:1, 30:1, 31:1, and thought units in the saying collections) and never cut a saying in half. A portion may cross a chapter boundary only where the chapters are short sayings anyway. The builder writes this list and checks it totals 104 and covers every verse once.

## Goals

1. **Today** is the front page: today's date, week/day number, the three readings and the week's memory verse. The app is a companion to a **physical Bible**: the reference itself ("Genesis 1") is the big, readable thing, so you can glance at it and open your own Bible to it.
2. **Anyone can use it with no account.** Checkmarks are optional and saved on the phone.
3. **Optional account (username + PIN)** to sync progress to a Google Sheet and back it up.
4. **Reading partners:** with an account, add someone's username; once they add you back, you see their checkmarks next to yours.
5. **Catch-up:** an easy way to see and check off readings you missed.
6. **Installable and offline**, like First 10 Days.

## Non-goals (for this version)

- Showing the Bible text inside the app (copyright/API keys). We link out instead.
- Notes, journaling, or discussion.
- Push notifications / reminders (need a server we don't have for free).
- A leader dashboard. (The Google Sheet itself shows everyone's progress to Seth; a dashboard could come later.)
- Plans other than this one, or other years.

## Anti-goals — it's a failure if…

- Someone has to make an account, or type a name, before they can read.
- It costs anything to run.
- Missing a few days makes the app feel like it's scolding you. Being behind is shown calmly ("3 readings to catch up"), with no streak-breaking shame.
- A checkmark made offline or on a slow connection gets lost.

## Approaches considered

| | Approach | Trade-off | Picked? |
|---|---|---|---|
| A | Progress only on each phone | Simplest, but no seeing each other, no backup | No |
| B | GitHub Pages + Firebase with Google sign-in | Real sign-in, fast, scales to thousands; a new service to learn | No |
| C | GitHub Pages + Google Sheet via Apps Script, username + PIN (same setup as First 10 Days) | Familiar, free, Seth can read the sheet; ~1–2 s per sync; good for hundreds of users, not thousands; PIN is a gate, not strong security | **Yes — Seth's choice** |

## How it works

### Hosting and structure
Static PWA on GitHub Pages, plain HTML/CSS/JS with no build step, like First 10 Days: `index.html`, `style.css`, `app.js`, `plan.js` (all the readings as data), `sync-config.js` (the Apps Script URL), `manifest.json`, `service-worker.js`, `icons/`, `sheet-setup/apps-script-code.gs`, `tests/`, `README.md`. New GitHub repo under PastorSeth. Project lives in `~/Claude Code Files/Bible Reading 2027/`.

### Screens
- **Today** — the default. On a weekend it shows "Weekend — catch up or rest" with any missed readings and a peek at Monday. Before Jan 4 it shows a countdown and lets you preview week 1. After Dec 31 it shows a finish/summary.
- **Week** — the five days of the current week, with arrows to move between weeks.
- **Plan** — all 52 weeks, collapsed, jump to any week.
- **Catch up** — every unchecked reading before today, oldest first. Only shown when there is something to catch up on.
- **Account** (in a menu) — create account / sign in / sign out, reading partners, translation choice.

### Checkmarks without an account
Tapping a reading's circle marks it done; tapping again undoes it. Saved in the phone's local storage. A small note explains that installing to the home screen keeps progress safest, because iPhones may clear website storage for sites not opened in a while; installed apps are exempt.

### Optional account
- **Create:** username (3–20 letters, numbers, `_`; not case-sensitive; must be unique) + PIN (4–8 digits, entered twice). Any checkmarks already on the phone are uploaded into the new account.
- **Sign in on another phone:** username + PIN. Progress on the phone and in the sheet is merged (nothing is lost).
- **Sign out:** keeps nothing account-related on the phone; the phone goes back to no-account mode with an empty slate.
- **Forgot PIN:** no self-service reset. The sign-in screen has a "Forgot your PIN?" link that opens an email to Seth (`mailto: the address in HELP_EMAIL`, subject "PIN reset" with the username filled in if typed). Seth clears the PIN in the sheet (README explains how); the person then sets a new one on next sign-in. The address lives in one config line so it's easy to change. Note: it will be visible in the public GitHub repo and on the site.
- **Wrong PIN:** after 5 wrong tries, that username is locked for 15 minutes.

### Reading partners
With an account, add a partner by username. You see someone's progress only when **both** have added each other (mutual, so nobody is watched without agreeing). Partners appear as small initials/dots next to each reading on Today and Week, plus a "this week: 12/15" line. More than one partner is allowed (a couple, a small group). Remove a partner any time.

### Sync
- Every checkmark is saved on the phone first and shown instantly, then sent to the sheet in the background. Unsent changes queue and retry when back online.
- Each item stores `done` + a timestamp; merges keep the newest change per item, so two phones can't erase each other.
- On opening the app (and when it comes back to the foreground), it pulls your own and your partners' progress.
- If the sheet can't be reached, the app keeps working and shows a quiet "not synced yet" marker.

### Google Sheet / Apps Script
A new spreadsheet (separate from First 10 Days) with two tabs, set up the same way as First 10 Days (Extensions → Apps Script → deploy as web app, Execute as **Me**, access **Anyone**):

- **Users:** username, PIN hash, salt, session token, partners (comma list), failed tries, locked-until, created, last seen.
- **Progress:** username, progress (compact JSON of item id → done + timestamp), updated.

The PIN is stored as a salted SHA-256 hash (`Utilities.computeDigest`), never as plain text. Sign-in returns a random session token the phone keeps; later requests send username + token, not the PIN. All requests are POSTs with `Content-Type: text/plain` so the browser can read the reply without a CORS preflight. `LockService` prevents two simultaneous saves from clobbering each other. Actions: `signup`, `signin`, `save`, `load` (self + mutual partners), `addPartner`, `removePartner`, `signout`.

### Item IDs and "today"
"Today" is the phone's own local date. Stable, plan-based IDs: `w01d1-nt`, `w01d1-ot`, `w01d1-ps` (or `-pr`), `w01-mv` for the week's memory verse. Dates are computed from the week/day, so the plan data never stores dates.

### Passage links
**Kept quiet on purpose.** The reading happens in each person's own physical Bible, so the online link is secondary: a small, low-contrast "read online" icon beside each reference, never the main tap target (tapping the reference does nothing; the check circle marks it done). Account has a "Show online links" switch (on by default) to hide them entirely.

The link opens the passage on **Biblia.com** (Faithlife/Logos) in a new tab, in a translation set once in Account (default **ESV**, choice saved on the phone; the list offers only translations Biblia shows for free).

Link format: `https://biblia.com/bible/{version}/{Book}{chapter}.{verse}-{chapter}.{verse}`, using full book names with no spaces (`1Samuel`, `Psalm`, `2John`). Tested 2026-11-26; all of these resolve correctly:
`Genesis1`, `Psalm119.25-48`, `Proverbs1.1-7`, `Exodus13.17-14.31`, `1Samuel24-25.1`, `1Kings16.29-17.24`, `Malachi3-4`, `2John`, `Philemon`.

Rules:
- Use full book names, never abbreviations (`Jud` means Jude on Biblia, not Judges).
- A range that runs to the end of a chapter ("Exodus 13:17–14") is written to the chapter's last verse (`Exodus13.17-14.31`) or as a chapter range (`1Samuel24-25.1`).
- A reading with two separate pieces ("Deuteronomy 32:48-52; 34", "Amos 1:1; 9", "2 Samuel 2:1-7; 3:1", "Ezekiel 1:1-3; 36:16-38") gets one link per piece. Biblia reads `Deut32.48-52;34` as one continuous range (32:48 through 34), which would add chapter 33.
- A plan-data test builds every link and checks it against these rules.

If someone has the Logos app installed, their phone may offer to open Biblia links there; that isn't verified and isn't relied on.

### Updates
Same rule as First 10 Days: bump `CACHE_NAME` in `service-worker.js` whenever app files change. README covers this, the Sheet setup, how to reset someone's PIN, and how to test.

## Constraints
- $0: GitHub Pages + Google Apps Script/Sheets on Seth's Google account.
- Must work on iPhone and Android, installed or in the browser, and offline.
- Apps Script limits (≈30 simultaneous requests, a few seconds per call) are fine for hundreds of users.
- Seth's Mac has no PowerShell; tests run in the browser via a simple local server (see First 10 Days notes).

## Left to the builder
- Visual design, with 2–3 mockups shown to Seth before screens are built. It doesn't need to match First 10 Days.
- Exact Proverbs split (rules above).
- Wording of messages, empty states and onboarding.
- Test approach (in-browser tests like First 10 Days; plan-data checks: 260 NT, 260 OT, 156 Psalms, 104 Proverbs, 52 memory verses, every Psalm/Proverbs verse covered exactly once).
