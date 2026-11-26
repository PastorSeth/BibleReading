# Bible Reading 2027 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An installable, offline-capable reading-plan companion for 2027 (NT260 + F260 OT + Psalms/Proverbs + weekly memory verse) with optional username + PIN accounts that sync to a Google Sheet and let reading partners see each other's checkmarks.

**Architecture:** Static PWA in plain HTML/CSS/JS (no build step, no dependencies), served from GitHub Pages. Every script defines globals and is loaded by `<script>` tags in a fixed order. All progress lives in `localStorage` first; an optional Apps Script web app bound to a Google Sheet stores accounts and progress, reached by `fetch` POSTs with `Content-Type: text/plain`.

**Tech Stack:** Vanilla JS (ES2020), CSS, Service Worker, Google Apps Script (V8) + Google Sheets. Tests: tiny in-browser harness copied from First 10 Days.

**Spec:** `docs/specs/2026-11-26-reading-plan-app-design.md` (read it before starting any task).

## Global Constraints

- Project root: `/Users/sethpeacock/Claude Code Files/Bible Reading 2027/`. All paths below are relative to it.
- $0 to run: GitHub Pages + Apps Script/Sheets only. No npm, no frameworks, no CDN scripts.
- No Node or PowerShell on this Mac. Serve with `python3 -m http.server 8790` from the project root and open `http://localhost:8790/tests/` in the built-in browser; results are in `window.__testResults` and on the page. Keep the browser pane visible while tests run.
- Plan dates: week 1 day 1 = **Monday 2027-01-04**; 52 weeks × Mon–Fri = 260 days; last day **Friday 2027-12-31**. "Today" = the phone's local calendar date.
- Item IDs (exact): `w01d1-nt`, `w01d1-ot`, `w01d1-ps` (Mon/Wed/Fri) or `w01d2-pr` (Tue/Thu), `w01-mv`. Week is two digits, day is 1–5.
- Username: 3–20 chars of `[A-Za-z0-9_]`, trimmed, case-insensitive (stored key = lowercase; display = as first typed). PIN: 4–8 digits.
- Wrong PIN: 5 tries → locked 15 minutes.
- Forgot PIN: `mailto:` to `HELP_EMAIL`, subject `PIN reset`, body includes the typed username if any. `HELP_EMAIL` lives in `sync-config.js`; Seth fills in the address himself (a privacy hook blocks the agent from writing it) — ship with `HELP_EMAIL = ''` and hide the link while it's empty.
- Online links: Biblia.com, small and low-contrast, never the main tap target; tapping the reference text does nothing. Setting `showLinks` (default `true`). Translation default `esv`.
- Being behind is shown calmly ("3 readings to catch up"). No streaks, no red, no scolding copy.
- Accounts are never required: if `SYNC_ENDPOINT` is `''`, every account UI element is hidden and the app works fully.
- Bump `CACHE_NAME` in `service-worker.js` whenever any app file changes (start at `bible-reading-2027-v1`).
- Commit after each task: `git add -A && git commit -m "<message>"` with the trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Never push or create a GitHub repo without Seth's explicit yes (Task 10).

## Review Focus

1. **Daylight-saving days** (Mar 14 and Nov 7, 2027) and late-night use: `planDayForDate` must use local Y/M/D arithmetic, not millisecond differences. Test in Task 2.
2. **The same reading toggled on two phones while one is offline:** newest timestamp wins per item on both client and server; a tie resolves to `done: true`. Tests in Task 4 and Task 5.
3. **Apps Script returns a non-JSON page, a quota error, or the network is down:** the app keeps working, pending changes stay queued, status shows "Not synced yet". Test in Task 6.
4. **Username typed with spaces or different capitals** (`" Seth "` vs `"seth"`) is the same account, for sign-in and for adding partners. Tests in Task 5.
5. **Token no longer valid** (signed out elsewhere, or Seth reset the PIN): the app returns to signed-out state but keeps the phone's checkmarks and tells the person to sign in again. Corrupt `localStorage` JSON loads as empty instead of crashing. Tests in Tasks 4 and 6.

---

### Task 1: Project setup, test harness, and the reading lists

**Files:**
- Create: `readings.js`, `tests/index.html`, `tests/harness.js` (copy of `~/Documents/FirstTenDays/tests/harness.js`, header comment updated), `tests/readings.test.js`, `.gitignore` (`.DS_Store`)
- Run `git init` in the project root (`docs/` already exists).

**Interfaces:**
- Produces (globals in `readings.js`):
  - `NT_READINGS: string[260]` — e.g. `"Luke 1"`, `"Philemon"`, `"2 John"`.
  - `OT_READINGS: string[260]` — verbatim strings from the OT file.
  - `MEMORY_VERSES: string[52]` — e.g. `"Matthew 5:1-2"`.
  - `PSALM_READINGS: string[156]`, `PROVERBS_READINGS: string[104]`.
  - `PROVERBS_VERSE_COUNTS: number[31]`.

**Data sources (exact):**
- `NT_READINGS` is this sequence of whole chapters, in order (single-chapter books have no number: `"Philemon"`, `"2 John"`, `"3 John"`, `"Jude"`): Luke 1–24, Acts 1–14, James 1–5, Acts 15–16, Galatians 1–6, Acts 17–18, 1 Thessalonians 1–5, 2 Thessalonians 1–3, Acts 19, 1 Corinthians 1–16, 2 Corinthians 1–13, Mark 1–16, Romans 1–16, Acts 20–28, Colossians 1–4, Ephesians 1–6, Philippians 1–4, Philemon, Hebrews 1–13, 1 Timothy 1–6, 2 Timothy 1–4, Titus 1–3, 1 Peter 1–5, 2 Peter 1–3, John 1–21, 1 John 1–5, 2 John, 3 John, Jude, Revelation 1–22, Matthew 1–28. Write it as a compact list of `[book, firstChapter, lastChapter]` expanded by a helper, or as literal strings; either is fine.
- `OT_READINGS`: every `Day N: <reference>` line of `/Users/sethpeacock/Claude Code Files/F260 OT One Chapter a Day - 52 Weeks.md`, in order, text after `: ` kept exactly (en dashes included).
- `MEMORY_VERSES` (week 1→52), all Matthew: 5:1-2, 5:3-4, 5:5-6, 5:7-8, 5:9-10, 5:11-12, 5:13-14, 5:15-16, 5:17-18, 5:19-20, 5:21-22, 5:23-24, 5:25-26, 5:27-28, 5:29-30, 5:31-32, 5:33-35, 5:36-37, 5:38-39, 5:40-42, 5:43-44, 5:45-46, 5:47-48, 6:1-2, 6:3-4, 6:5-6, 6:7-8, 6:9-11, 6:12-13, 6:14-15, 6:16-18, 6:19-21, 6:22-24, 6:25-26, 6:27-28, 6:29-30, 6:31-32, 6:33-34, 7:1-2, 7:3-4, 7:5-6, 7:7-8, 7:9-10, 7:11-12, 7:13-14, 7:15-16, 7:17-18, 7:19-20, 7:21-23, 7:24-25, 7:26-27, 7:28-29.
- `PSALM_READINGS`: `"Psalm 1"` … `"Psalm 150"` in order, with Psalm 119 replaced by `"Psalm 119:1-24"`, `"Psalm 119:25-48"`, `"Psalm 119:49-72"`, `"Psalm 119:73-96"`, `"Psalm 119:97-120"`, `"Psalm 119:121-144"`, `"Psalm 119:145-176"`.
- `PROVERBS_VERSE_COUNTS`: 33,22,35,27,23,35,27,36,18,32,31,28,25,35,33,33,28,24,29,30,31,29,35,34,28,28,27,28,27,33,31 (sum 915).
- `PROVERBS_READINGS`: `"Proverbs C:A-B"` for each range below, in order (verified: 104 portions, every verse once, sizes 5–14):

| Ch | Ranges | Ch | Ranges |
|---|---|---|---|
| 1 | 1-7, 8-19, 20-33 | 17 | 1-9, 10-19, 20-28 |
| 2 | 1-11, 12-22 | 18 | 1-8, 9-16, 17-24 |
| 3 | 1-12, 13-20, 21-26, 27-35 | 19 | 1-7, 8-14, 15-22, 23-29 |
| 4 | 1-9, 10-19, 20-27 | 20 | 1-7, 8-15, 16-23, 24-30 |
| 5 | 1-14, 15-23 | 21 | 1-8, 9-16, 17-24, 25-31 |
| 6 | 1-11, 12-19, 20-29, 30-35 | 22 | 1-9, 10-16, 17-29 |
| 7 | 1-9, 10-20, 21-27 | 23 | 1-8, 9-18, 19-28, 29-35 |
| 8 | 1-11, 12-21, 22-31, 32-36 | 24 | 1-12, 13-22, 23-29, 30-34 |
| 9 | 1-12, 13-18 | 25 | 1-10, 11-20, 21-28 |
| 10 | 1-8, 9-16, 17-24, 25-32 | 26 | 1-12, 13-19, 20-28 |
| 11 | 1-8, 9-15, 16-23, 24-31 | 27 | 1-9, 10-17, 18-27 |
| 12 | 1-9, 10-19, 20-28 | 28 | 1-9, 10-18, 19-28 |
| 13 | 1-8, 9-16, 17-25 | 29 | 1-9, 10-18, 19-27 |
| 14 | 1-9, 10-18, 19-27, 28-35 | 30 | 1-9, 10-17, 18-23, 24-33 |
| 15 | 1-8, 9-17, 18-25, 26-33 | 31 | 1-9, 10-20, 21-31 |
| 16 | 1-9, 10-15, 16-24, 25-33 | | |

- [ ] **Step 1: Write the failing tests** in `tests/readings.test.js`:
  - `readings: counts` — lengths 260, 260, 52, 156, 104; `PROVERBS_VERSE_COUNTS` sums to 915.
  - `readings: NT spot checks` — index 0 `"Luke 1"`, 35 `"Acts 12"`, 39 `"James 2"`, 146 `"Philemon"`, 207 `"2 John"`, 209 `"Jude"`, 231 `"Revelation 22"`, 259 `"Matthew 28"`.
  - `readings: OT spot checks` — 0 `"Genesis 1"`, 26 `"Genesis 25:19-34"`, 61 `"Exodus 13:17–14"`, 105 `"Deuteronomy 32:48-52; 34"`, 178 `"Amos 1:1; 9"`, 210 `"Ezekiel 1:1-3; 36:16-38"`, 259 `"Malachi 3–4"`; no entry starts with `"Psalm"` or `"Proverbs"`.
  - `readings: memory verses tile Matthew 5:1–7:29` — parse each, assert each starts at the verse after the previous one ended (chapter ends: 5:48, 6:34), first `5:1`, last ends `7:29`.
  - `readings: Psalms` — index 0 `"Psalm 1"`, 118 `"Psalm 119:1-24"`, 124 `"Psalm 119:145-176"`, 125 `"Psalm 120"`, 155 `"Psalm 150"`.
  - `readings: Proverbs cover every verse once` — walk the list, assert ranges are contiguous within each chapter starting at 1 and ending at `PROVERBS_VERSE_COUNTS[c-1]`.
- [ ] **Step 2:** Create `tests/index.html` (same shape as First 10 Days': harness, then app scripts in order `readings.js`, `plan.js`, `links.js`, `store.js`, `sync-config.js`, `sync.js`, `app.js`, then test files). Scripts not yet created will report load errors — expected. Run: open `http://localhost:8790/tests/`. Expected: readings tests FAIL (`NT_READINGS is not defined`).
- [ ] **Step 3:** Implement `readings.js`.
- [ ] **Step 4:** Run tests. Expected: all `readings:` tests PASS (load errors for later files are fine until their tasks).
- [ ] **Step 5:** Commit `feat: reading lists and test harness`.

---

### Task 2: Plan calendar (`plan.js`)

**Files:** Create `plan.js`, `tests/plan.test.js`

**Interfaces:**
- Consumes: Task 1 globals.
- Produces:
  - `PLAN_START = { y: 2027, m: 1, d: 4 }`, `WEEKS = 52`.
  - `planDayForDate(date: Date) -> { status: 'before'|'reading'|'weekend'|'after', week?: number, weekday?: 1..5, nextWeek?: number, daysUntilStart?: number }` — `'weekend'` includes `week` (the week just finished) and `nextWeek`; the weekend after week 52 is `'after'`.
  - `dateFor(week: number, weekday: number) -> Date` (local midnight).
  - `readingsFor(week: number, weekday: number) -> Array<{ id: string, track: 'nt'|'ot'|'ps'|'pr', label: string, ref: string }>` — always 3 items in order NT, OT, wisdom. Labels: `'New Testament'`, `'Old Testament'`, `'Psalm'`, `'Proverbs'`.
  - `memoryVerseFor(week) -> { id: 'wNN-mv', ref: string }`.
  - `weekItemIds(week) -> string[]` (15 reading ids, excluding memory verse).
  - `allItemIdsBefore(date: Date) -> string[]` — every reading id whose date is before `date`'s local day, plus memory-verse ids of weeks whose Friday is before it; in plan order.

Wisdom mapping: weekday 1/3/5 → `PSALM_READINGS[(week-1)*3 + {1:0,3:1,5:2}[weekday]]`, id suffix `-ps`; weekday 2/4 → `PROVERBS_READINGS[(week-1)*2 + {2:0,4:1}[weekday]]`, suffix `-pr`.

Day arithmetic: convert local Y/M/D to a day number with `Date.UTC(y, m-1, d) / 86400000`; never subtract local `Date` objects.

- [ ] **Step 1: Failing tests** `tests/plan.test.js`:
  - `plan: start and end` — `planDayForDate(new Date(2027,0,4,6))` → `{status:'reading', week:1, weekday:1}`; `new Date(2027,11,31,23,59)` → week 52 weekday 5; `new Date(2027,0,1)` → `{status:'before', daysUntilStart:3}`; `new Date(2028,0,1)` → `status:'after'`.
  - `plan: weekends` — `new Date(2027,0,9)` → `{status:'weekend', week:1, nextWeek:2}`; `new Date(2028,0,2)` → `'after'`.
  - `plan: DST days` — `new Date(2027,2,15,0,30)` (Mon after DST start) → week 11 weekday 1; `new Date(2027,10,8,0,30)` → week 45 weekday 1.
  - `plan: dateFor round trip` — for every week/weekday, `planDayForDate(dateFor(w,d))` returns the same week/weekday.
  - `plan: readingsFor` — `readingsFor(1,1)` ids `['w01d1-nt','w01d1-ot','w01d1-ps']`, refs `['Luke 1','Genesis 1','Psalm 1']`; `readingsFor(1,2)[2]` → `{id:'w01d2-pr', ref:'Proverbs 1:1-7'}`; `readingsFor(52,5)` refs `['Matthew 28','Malachi 3–4','Psalm 150']`; `readingsFor(52,4)[2].ref` → `'Proverbs 31:21-31'`.
  - `plan: memory verse` — `memoryVerseFor(1)` → `{id:'w01-mv', ref:'Matthew 5:1-2'}`; week 52 → `'Matthew 7:28-29'`.
  - `plan: allItemIdsBefore` — `new Date(2027,0,6)` (Wed) → 6 ids (Mon+Tue readings); `new Date(2027,0,9)` (Sat) → 15 readings + `'w01-mv'` = 16; before start → `[]`.
- [ ] **Step 2:** Run; expected FAIL (`planDayForDate is not defined`).
- [ ] **Step 3:** Implement `plan.js`.
- [ ] **Step 4:** Run; expected all `plan:` PASS.
- [ ] **Step 5:** Commit `feat: plan calendar`.

---

### Task 3: References and Biblia links (`links.js`)

**Files:** Create `links.js`, `tests/links.test.js`

**Interfaces:**
- Produces:
  - `TRANSLATIONS = [{ code:'esv', name:'ESV' }, { code:'nkjv', name:'NKJV' }, { code:'kjv', name:'KJV' }, { code:'nasb95', name:'NASB 1995' }, { code:'leb', name:'LEB' }]` — before shipping, confirm each code opens a free passage on biblia.com (curl a chapter URL and check it isn't a sign-in/purchase page); drop any that don't.
  - `bibliaLinks(ref: string, translation: string) -> Array<{ label: string, url: string }>` — one entry per `;`-separated piece.
  - `displayRef(ref: string) -> string` — replaces a hyphen between digits with an en dash.
- URL: `https://biblia.com/bible/{translation}/{Book}{rest}` where `{Book}` is the book name with spaces removed (`1 Samuel` → `1Samuel`), and `{rest}`: chapter `C` → `C`; `C:A-B` → `C.A-B`; `C:A` → `C.A`; `C–D` → `C-D`; `C–D:B` → `C-D.B`; `C:A–D` (range to the end of chapter D) → `C.A-D.{LAST_VERSE[book+' '+D]}`; whole single-chapter book (no number) → nothing. A `;` piece with no book (`"34"`, `"9"`, `"3:1"`, `"36:16-38"`) inherits the previous piece's book. Accept `-` and `–` as range marks.
- `LAST_VERSE = { 'Exodus 14': 31, 'Joshua 6': 27, '1 Kings 17': 24 }` — the only chapter-end ranges in the data.
- `label` = `displayRef` of the piece with the book name (e.g. `"Deuteronomy 34"`).

- [ ] **Step 1: Failing tests** `tests/links.test.js`:
  - `links: tested formats` — with `'esv'`, the URL suffixes after `/bible/esv/` are: `"Genesis 1"`→`Genesis1`, `"Psalm 119:25-48"`→`Psalm119.25-48`, `"Proverbs 1:1-7"`→`Proverbs1.1-7`, `"Exodus 13:17–14"`→`Exodus13.17-14.31`, `"1 Samuel 24–25:1"`→`1Samuel24-25.1`, `"1 Kings 16:29–17"`→`1Kings16.29-17.24`, `"Malachi 3–4"`→`Malachi3-4`, `"2 John"`→`2John`, `"Philemon"`→`Philemon`, `"Judges 2"`→`Judges2`.
  - `links: split pieces` — `"Deuteronomy 32:48-52; 34"` → 2 links, suffixes `Deuteronomy32.48-52`, `Deuteronomy34`, labels `'Deuteronomy 32:48–52'`, `'Deuteronomy 34'`; `"2 Samuel 2:1-7; 3:1"` → `2Samuel2.1-7`, `2Samuel3.1`.
  - `links: every plan reference produces valid links` — for all of `NT_READINGS`, `OT_READINGS`, `PSALM_READINGS`, `PROVERBS_READINGS`, `MEMORY_VERSES`: at least one link, each URL matches `/^https:\/\/biblia\.com\/bible\/esv\/[1-3]?[A-Za-z]+(\d+(\.\d+)?(-\d+(\.\d+)?)?)?$/`, and no URL contains `undefined`.
  - `links: translation` — `bibliaLinks('John 3','kjv')[0].url` → `'https://biblia.com/bible/kjv/John3'`.
  - `links: displayRef` — `'Psalm 119:25-48'` → `'Psalm 119:25–48'`; `'Malachi 3–4'` unchanged.
- [ ] **Step 2:** Run; FAIL. **Step 3:** Implement. **Step 4:** Run; PASS.
- [ ] **Step 5:** Spot-check 5 generated URLs with `curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" -A "Mozilla/5.0" <url>`; expected `301` to the matching biblia passage path. Verify the `TRANSLATIONS` codes as described above.
- [ ] **Step 6:** Commit `feat: Biblia passage links`.

---

### Task 4: Local progress store (`store.js`)

**Files:** Create `store.js`, `tests/store.test.js`

**Interfaces:**
- Consumes: `allItemIdsBefore`, `weekItemIds` (Task 2).
- Produces:
  - Keys: `KEYS = { progress:'br27.progress', pending:'br27.pending', account:'br27.account', settings:'br27.settings' }`.
  - Type `Progress = { [itemId]: { done: boolean, t: number } }` (`t` = ms epoch).
  - `readJSON(key, fallback)` / `writeJSON(key, value)` — corrupt or missing JSON returns `fallback`.
  - `mergeProgress(a: Progress, b: Progress) -> Progress` — per id, larger `t` wins; equal `t` → the `done:true` entry.
  - `getProgress() -> Progress`, `setDone(id: string, done: boolean, now = Date.now()) -> Progress` — writes progress and adds the entry to pending.
  - `getPending() -> Progress`, `clearPending(sent: Progress)` — removes ids whose pending `t` ≤ `sent[id].t`.
  - `replaceProgress(p: Progress)`, `resetLocal()` — clears progress, pending, account (keeps settings).
  - `getSettings() -> { translation:'esv', showLinks:true }` merged with stored; `saveSettings(partial)`.
  - `getAccount() -> { username, token } | null`, `saveAccount(a)`, `clearAccount()`.
  - `catchUpIds(progress: Progress, today: Date) -> string[]` — `allItemIdsBefore(today)` not done.
  - `weekDoneCount(progress, week) -> number` — done count among `weekItemIds(week)`.
- [ ] **Step 1: Failing tests** `tests/store.test.js` (use the harness's `withStorage`):
  - `store: merge newest wins` — `mergeProgress({x:{done:true,t:1}},{x:{done:false,t:2}})` → `{x:{done:false,t:2}}`; and the reverse order gives the same result.
  - `store: merge tie prefers done` — `{done:false,t:5}` vs `{done:true,t:5}` → `done:true`, both orders.
  - `store: setDone queues pending` — after `setDone('w01d1-nt', true, 10)`, `getProgress()` and `getPending()` both have it; `clearPending({ 'w01d1-nt': {done:true,t:10} })` empties pending; a later `setDone(..., false, 20)` survives `clearPending` of the `t:10` entry.
  - `store: corrupt storage` — `localStorage['br27.progress'] = '{oops'` → `getProgress()` is `{}`.
  - `store: settings defaults` — empty storage → `{translation:'esv', showLinks:true}`; `saveSettings({showLinks:false})` keeps translation.
  - `store: catch-up` — today `new Date(2027,0,6)` with `w01d1-nt` done → 5 ids, first `'w01d1-ot'`.
  - `store: resetLocal keeps settings`.
- [ ] **Step 2:** Run; FAIL. **Step 3:** Implement. **Step 4:** Run; PASS.
- [ ] **Step 5:** Commit `feat: local progress store`.

---

### Task 5: Google Sheet backend (`sheet-setup/apps-script-code.gs`)

**Files:** Create `sheet-setup/apps-script-code.gs`, `tests/server.test.js`, `tests/fake-google.js`

**Interfaces:**
- `doPost(e)` reads `JSON.parse(e.postData.contents)` → `{ action, ...fields }`, returns `ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON)`. Wrap the body in `LockService.getScriptLock().waitLock(10000)` / `releaseLock()`. Unknown action or bad JSON → `{ok:false, error:'bad_request'}`.
- Sheets (created with headers if missing, on the active spreadsheet):
  - `Users`: `key | username | pinHash | salt | tokens | partners | failedTries | lockedUntil | created | lastSeen` (`tokens` and `partners` are comma lists).
  - `Progress`: `key | progress | updated` (`progress` = JSON string of `Progress`).
- Actions and results (all success results include `ok:true`):
  - `signup {username, pin}` → `{ok, username, token}`; errors `invalid_username`, `invalid_pin`, `username_taken`.
  - `signin {username, pin}` → `{ok, username, token}`; if the stored `pinHash` is empty (Seth cleared it), the given valid PIN becomes the new PIN. Errors `no_such_user`, `bad_credentials`, `locked` (with `lockedUntil`), `invalid_pin`.
  - `save {username, token, changes: Progress}` → `{ok, progress}` (server-merged result, same rule as `mergeProgress`).
  - `load {username, token}` → `{ok, progress, partners: [{username, status:'mutual'|'waiting', progress?}], requests: [username]}` — `progress` only for mutual partners; `requests` = users who added you that you haven't added.
  - `addPartner {username, token, partner}` → `{ok}`; errors `no_such_user`, `bad_request` (adding yourself).
  - `removePartner {username, token, partner}` → `{ok}`.
  - `signout {username, token}` → `{ok}` (removes that token).
  - Any action with a token not in `tokens` → `{ok:false, error:'bad_token'}`.
- PIN hash: hex of `Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt + ':' + pin)`; `salt` and tokens from `Utilities.getUuid()`. Keep at most 10 tokens per user (drop oldest). 5 failed sign-ins → `lockedUntil = Date.now() + 15 min`; reset `failedTries` on success.
- Usernames: `trim()`, validate, key = lowercase.
- `tests/fake-google.js` defines `makeFakeGoogle()` → `{ SpreadsheetApp, Utilities, LockService, ContentService, sheets }` with in-memory sheets supporting exactly the calls the script uses (`getActiveSpreadsheet`, `getSheetByName`, `insertSheet`, `getDataRange().getValues()`, `getRange(r,c,nr,nc).getValues/setValues`, `appendRow`, `getLastRow`). `computeDigest` may be a deterministic fake returning a byte array derived from the input; `getUuid` a counter.
- `tests/server.test.js` loads the script with `const code = await (await fetch('../sheet-setup/apps-script-code.gs')).text(); const api = new Function('SpreadsheetApp','Utilities','LockService','ContentService', code + '\nreturn { doPost };')(g.SpreadsheetApp, g.Utilities, g.LockService, g.ContentService);` and calls `api.doPost({ postData: { contents: JSON.stringify(body) } })`, parsing `.getContent()`. Fresh fake per test. Time travel: stub `Date.now` and restore it in `finally`.

- [ ] **Step 1: Failing tests** `tests/server.test.js`:
  - `server: signup then signin` — signup `{username:'Seth', pin:'1234'}` → ok with token; signin `{username:' seth ', pin:'1234'}` → ok, `username:'Seth'`.
  - `server: validation` — `'ab'` → `invalid_username`; `'has space'` → `invalid_username`; pin `'12a4'` and `'123'` → `invalid_pin`; second signup `'SETH'` → `username_taken`.
  - `server: lockout` — 5 wrong pins → 5th returns `bad_credentials`, 6th (even with right pin) `locked`; after stubbing `Date.now` +16 min, right pin → ok.
  - `server: PIN stored hashed` — no cell in the `Users` sheet equals `'1234'`.
  - `server: cleared PIN resets` — set `pinHash` cell to `''` in the fake sheet; signin with `'9999'` → ok; then `'1234'` → `bad_credentials`.
  - `server: save merges` — save `{a:{done:true,t:2}}`, then save `{a:{done:false,t:1}}` → returned `progress.a` is `{done:true,t:2}`.
  - `server: partners are mutual` — seth adds `anna`; seth's load shows `anna` as `waiting` with no progress; anna's load has `requests:['Seth']`; anna adds `SETH ` → both loads show `mutual` with the other's progress.
  - `server: bad token` — save with token `'nope'` → `bad_token`.
  - `server: signout invalidates token`.
- [ ] **Step 2:** Run; FAIL. **Step 3:** Implement. **Step 4:** Run; PASS.
- [ ] **Step 5:** Commit `feat: Apps Script backend`.

---

### Task 6: Sync client (`sync-config.js`, `sync.js`)

**Files:** Create `sync-config.js`, `sync.js`, `tests/sync.test.js`

**Interfaces:**
- `sync-config.js`: `const SYNC_ENDPOINT = '';` and `const HELP_EMAIL = '';` with comments pointing to the README (Seth fills both in).
- Consumes: Task 4 store functions.
- Produces:
  - `syncEnabled() -> boolean` (`SYNC_ENDPOINT !== ''`).
  - `setFetch(fn)` — test hook; defaults to `window.fetch`.
  - `api(action, fields) -> Promise<object>` — POST `JSON.stringify({action, ...fields})` with header `Content-Type: text/plain;charset=utf-8`; non-OK status, non-JSON body or network error → resolves `{ok:false, error:'network'}` (never rejects).
  - `signUp(username, pin)`, `signIn(username, pin)` → result; on success `saveAccount`, then `syncNow({ uploadAll: true })` (sends **all** local progress as `changes`, so checkmarks made before the account are kept).
  - `signOut()` → calls `signout` (ignore failure), then `resetLocal()`.
  - `syncNow({ uploadAll = false } = {}) -> Promise<SyncState>` — if signed in: `save` pending (or all) → `replaceProgress(mergeProgress(getProgress(), result.progress))`, `clearPending(sent)`; then `load` → merge own progress again and keep partners/requests in memory. On `bad_token`: `clearAccount()` (keep progress and pending), status `'signed-out-expired'`. On `network`: status `'offline'` if pending is non-empty.
  - `SyncState = { status: 'off'|'synced'|'pending'|'offline'|'signed-out-expired', partners: Array, requests: string[] }`, via `getSyncState()`; `onSyncChange(fn)` subscribes.
  - `addPartner(name)`, `removePartner(name)` → result, then `syncNow()`.
  - `scheduleSync()` — debounced 1500 ms.
- [ ] **Step 1: Failing tests** `tests/sync.test.js` (set `SYNC_ENDPOINT` via a test-only reassignment, e.g. declare it with `let` in `sync-config.js`, and use `setFetch`):
  - `sync: html error page` — fake fetch returns status 200 with body `'<html>Error</html>'` → `api` resolves `{ok:false,error:'network'}`; after `setDone` + `syncNow`, pending still holds the item and status is `'offline'`.
  - `sync: network down` — fake fetch rejects → same as above.
  - `sync: successful save clears pending and merges server progress` — server returns progress containing an extra item from another phone → it appears in `getProgress()`; pending empty; status `'synced'`.
  - `sync: bad token` — fake returns `{ok:false,error:'bad_token'}` → account cleared, local progress kept, status `'signed-out-expired'`.
  - `sync: sign-up uploads existing checkmarks` — with 2 local items and no account, `signUp` sends a `save` whose `changes` has both.
- [ ] **Step 2:** Run; FAIL. **Step 3:** Implement. **Step 4:** Run; PASS.
- [ ] **Step 5:** Commit `feat: sync client`.

---

### Task 7: Look-and-feel checkpoint (needs Seth)

**Files:** Create `docs/mockups/` (throwaway HTML), `docs/mockups/CHOICE.md`

- [ ] **Step 1:** Load the `frontend-design:frontend-design` skill. Make 2–3 distinct static mockups of the **Today** screen at phone width (390 px), using real week 1 Monday data (Luke 1 / Genesis 1 / Psalm 1, memory verse Matthew 5:1-2), each showing: the reference as the dominant element, the check circle, the small online-link icon, one partner's initials, the "this week" line and a "Not synced yet" marker. Calm and readable, no streak/fire imagery, light and dark (`prefers-color-scheme`).
- [ ] **Step 2:** Show them to Seth in the built-in browser and **stop until he picks one** (or asks for changes). Record the choice, palette and fonts in `docs/mockups/CHOICE.md`.
- [ ] **Step 3:** Commit `docs: chosen visual direction`.

---

### Task 8: The app screens (`index.html`, `style.css`, `app.js`)

**Files:** Create `index.html`, `style.css`, `app.js`, `tests/app.test.js`

**Interfaces:**
- Consumes: everything above; visual direction from `docs/mockups/CHOICE.md`.
- Produces:
  - `parseRoute(hash) -> { name:'today' } | { name:'week', week:number } | { name:'plan' } | { name:'catchup' } | { name:'account' }` — invalid → `{name:'today'}`; week clamped to 1–52.
  - `renderToday(now: Date, progress, settings, syncState) -> HTMLElement`, `renderWeek(week, now, progress, settings, syncState)`, `renderPlan(now, progress)`, `renderCatchUp(now, progress, settings)`, `renderAccount(settings, account, syncState)`.
  - `readingRow(item, done, partnersDone: string[], settings) -> HTMLElement` — check button (`aria-pressed`, label "Mark Luke 1 read"), reference text (not a link), partner initials, and, only if `settings.showLinks`, a small `<a target="_blank" rel="noopener" class="read-online" aria-label="Read Luke 1 online">` per `bibliaLinks` piece.
  - `boot()` — on `DOMContentLoaded`: renders the route, registers `service-worker.js`, wires `hashchange`, `visibilitychange` (visible → `scheduleSync()`), `online` → `scheduleSync()`, and calls `scheduleSync()` if signed in.
- Screen rules (from the spec):
  - Today, `'reading'`: date, "Week N · Day D", three rows, memory-verse row, partner "this week: X/15" lines, catch-up note "N readings to catch up" linking to `#/catchup` when > 0.
  - Today, `'weekend'`: "Weekend — catch up or rest", catch-up list if any, and a peek at next Monday's three references.
  - Today, `'before'`: countdown ("Starts Monday, January 4 — N days") and a link to preview week 1.
  - Today, `'after'`: finished summary (readings done out of 832 = 780 readings + 52 memory verses).
  - Week: 5 day groups, prev/next arrows, memory verse.
  - Plan: 52 collapsed weeks (`<details>`), current week open, each showing its done count.
  - Catch up: oldest first, each with its date; checking one removes it from the list.
  - Account (only when `syncEnabled()`): sign up / sign in forms (username, PIN, PIN again for sign up; `inputmode="numeric"`, `autocomplete="off"`), "Forgot your PIN?" (only when `HELP_EMAIL` is set) `mailto:` with subject `PIN reset` and body `Username: <typed>`, signed-in view with partner list (mutual / waiting), incoming requests with "Add back", add-partner field, sign out (warn if pending changes unsent). Always: translation `<select>` from `TRANSLATIONS`, "Show online links" switch, and the "install to your home screen to keep progress safe" note when not standalone (`matchMedia('(display-mode: standalone)')`).
  - Header: app name + menu (Today / Week / Plan / Account). Sync marker shows "Not synced yet" only for `'pending'` or `'offline'`; `'signed-out-expired'` shows "Please sign in again".
  - Error copy: `bad_credentials` → "That PIN doesn't match. Try again."; `locked` → "Too many tries. Try again in 15 minutes."; `username_taken` → "That username is taken."; `invalid_username` → "Use 3–20 letters, numbers or _."; `invalid_pin` → "Use 4–8 digits."; `no_such_user` → "No account with that username."; `network` → "Couldn't reach the server. Your checkmarks are saved on this phone."
- [ ] **Step 1: Failing tests** `tests/app.test.js`:
  - `app: parseRoute` — `''`→today, `'#/week/3'`→`{name:'week',week:3}`, `'#/week/99'`→week 52, `'#/week/x'`→today, `'#/plan'`, `'#/catchup'`, `'#/account'`, `'#/nope'`→today.
  - `app: today on a reading day` — `renderToday(new Date(2027,0,4,8), {}, {translation:'esv',showLinks:true}, {status:'off',partners:[],requests:[]})` text includes `Luke 1`, `Genesis 1`, `Psalm 1`, `Matthew 5:1–2`; 4 check buttons; no reference text inside an `<a>`.
  - `app: links hidden` — same with `showLinks:false` → no `.read-online` elements.
  - `app: weekend and before` — Saturday 2027-01-09 text includes "Weekend"; 2027-01-01 includes "January 4".
  - `app: catch-up wording` — Wednesday 2027-01-06 with nothing done includes "6 readings to catch up"; with those 6 done, no catch-up text.
  - `app: account hidden when sync off` — with `SYNC_ENDPOINT === ''`, `renderAccount` has no username input but has the translation select.
  - `app: partner initials` — sync state with mutual partner `Anna` whose progress has `w01d1-nt` done → the Luke 1 row shows `A`.
- [ ] **Step 2:** Run; FAIL. **Step 3:** Implement following `docs/mockups/CHOICE.md`. **Step 4:** Run; PASS.
- [ ] **Step 5:** Manual check at `http://localhost:8790/` in the built-in browser at 375×812, light and dark: tap checks, move weeks, catch-up flow, settings. Fix anything off.
- [ ] **Step 6:** Commit `feat: app screens`.

---

### Task 9: Installable and offline (`manifest.json`, `service-worker.js`, icons)

**Files:** Create `manifest.json`, `service-worker.js`, `icons/icon.svg`, `icons/icon-192.png`, `icons/icon-512.png`, `icons/apple-touch-icon.png` (180), `tests/sw.test.js`; modify `index.html` (manifest link, `apple-touch-icon`, `theme-color`, `apple-mobile-web-app-capable`).

**Interfaces:**
- `service-worker.js`: `const CACHE_NAME = 'bible-reading-2027-v1'; const APP_SHELL = [...]` (every app file + icons); install caches `APP_SHELL`; activate deletes other caches; fetch handles only same-origin `GET`s, cache-first then network; everything else (Apps Script, Biblia) is not intercepted.
- `manifest.json`: `name` "Bible Reading 2027", `short_name` "Reading 2027", `start_url` `"./"`, `scope` `"./"`, `display` `"standalone"`, colors from `CHOICE.md`, the three PNG icons.
- Icons: draw `icons/icon.svg` from the chosen direction; render the PNGs (e.g. `qlmanage -t -s 512 -o icons icons/icon.svg`, then `sips -z 192 192` / `-z 180 180` copies); look at them to confirm.
- [ ] **Step 1: Failing tests** `tests/sw.test.js`: `sw: app shell lists every app file` (fetch `../service-worker.js` text; it contains each of `index.html`, `style.css`, `readings.js`, `plan.js`, `links.js`, `store.js`, `sync-config.js`, `sync.js`, `app.js`, `manifest.json`, and the icon files); `sw: manifest` (fetch and parse; `display === 'standalone'`, 3 icons, each icon URL returns 200).
- [ ] **Step 2:** Run; FAIL. **Step 3:** Implement. **Step 4:** Run; PASS. In the built-in browser, load the app and confirm `navigator.serviceWorker.controller` is set and `caches.keys()` includes `CACHE_NAME`.
- [ ] **Step 5:** Commit `feat: installable offline app`.

---

### Task 10: README, final check, and publishing (needs Seth)

**Files:** Create `README.md`

- [ ] **Step 1:** Write `README.md` in the voice of First 10 Days' README: what's in the folder; **Turning on accounts** (new Google Sheet → Extensions → Apps Script → paste `sheet-setup/apps-script-code.gs` → Deploy → New deployment → Web app, Execute as **Me**, access **Anyone** → authorize → copy URL into `SYNC_ENDPOINT` in `sync-config.js` → bump `CACHE_NAME` → push); **Setting the help email** (`HELP_EMAIL` in `sync-config.js`; note it's public on GitHub); **Updating the script** (Manage deployments → pencil → New version, so the URL stays the same); **Resetting someone's PIN** (Users tab → clear that row's `pinHash` cell; they choose a new PIN on next sign-in); **Cache bump rule**; **Running tests on the Mac** (`python3 -m http.server 8790`, open `/tests/`).
- [ ] **Step 2:** Full test run: all tests PASS with zero load errors. Report the summary line.
- [ ] **Step 3:** Commit `docs: README`.
- [ ] **Step 4:** **Ask Seth** before creating the GitHub repo (proposed `PastorSeth/BibleReading2027`, public, Pages from `main`), pushing, or enabling Pages. Push with `git -c credential.helper= -c credential.helper='!gh auth git-credential' push` unless `gh auth setup-git` has been run. Then walk Seth through the Apps Script setup and filling in `HELP_EMAIL`; paste his web app URL into `SYNC_ENDPOINT`, bump `CACHE_NAME`, commit, and (with his OK) push.
- [ ] **Step 5:** On the live site: create two test accounts, link them as partners, check both directions, then ask Seth whether to delete the test rows from the sheet.
