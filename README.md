# Bible Reading 2027

A companion app for the 2027 reading plan, installable on any phone as a "PWA". It doesn't show Bible text. It tells you what to open your own Bible to today, remembers what you've read, and, if you want, lets reading partners see each other's checkmarks.

**The plan:** 52 weeks, Monday to Friday, from Monday, January 4, 2027 to Friday, December 31, 2027. That's 780 readings. Each weekday has:

- **New Testament:** Foundations NT260, one chapter a day.
- **Old Testament:** the F260 Old Testament selection, one reading a day.
- **Psalms (Mon/Wed/Fri) or Proverbs (Tue/Thu):** all 150 Psalms (Psalm 119 in 7 parts) and all of Proverbs in 104 short readings.

Weekends are left open for catching up or rest.

## What's in this folder

- `readings.js`: **every reading in the plan**, in order. Change a reading here and the app follows.
- `plan.js`: works out which readings fall on which day.
- `links.js`: builds the small "read online" links to Biblia.com.
- `store.js`: saves checkmarks and settings on the phone.
- `sync.js` and `sync-config.js`: the optional link to your Google Sheet. **`sync-config.js` is the file you'll edit** to turn accounts on.
- `app.js`, `index.html`, `style.css`: the screens and the look.
- `manifest.json`, `service-worker.js`, `icons/`: what makes it installable and work offline.
- `fonts/`: the Atkinson Hyperlegible font files (until they're added, phones use a similar built-in font).
- `sheet-setup/apps-script-code.gs`: the script that runs inside your Google Sheet for accounts and syncing.
- `tests/` and `tools/run-tests.sh`: automated checks.
- `docs/`: the design, the build plan and the mockups.

## Previewing a day

Before January 4 the app only shows a countdown. To see any day of the plan, add `?date=` to the address:

```
https://<your-site>/?date=2027-03-15
```

This only changes what that page displays; it doesn't change anyone's checkmarks.

## Accounts and reading partners (optional)

With `SYNC_ENDPOINT` empty (how it ships), there are no accounts. Everyone's checkmarks stay on their own phone and the account screens are hidden. To turn accounts on:

1. Go to [sheets.google.com](https://sheets.google.com) and create a new blank sheet. Name it something like "Bible Reading 2027 — Accounts". Keep it separate from the First 10 Days sheet.
2. In the sheet, go to **Extensions → Apps Script**.
3. Delete anything in the editor, then paste in all of `sheet-setup/apps-script-code.gs`.
4. Click **Save**, then **Deploy → New deployment**.
5. Click the gear next to "Select type" and choose **Web app**.
6. Set "Execute as" to **Me** and "Who has access" to **Anyone**. (This lets the app talk to the script. The spreadsheet itself stays private to you.)
7. Click **Deploy** and authorize it. Google shows "Advanced → Go to (unsafe)"; that's normal for your own script.
8. Copy the **Web app URL**.
9. Open `sync-config.js` and paste it between the quotes: `let SYNC_ENDPOINT = 'https://script.google.com/macros/s/…/exec';`
10. Bump `CACHE_NAME` in `service-worker.js` (see below) and upload to GitHub.

The script creates two tabs the first time someone signs up. **Don't create or rename these tabs yourself**: the script sets them up as plain text, so a username like "007" isn't turned into the number 7.

- **Users:** one row per account. PINs are stored scrambled (salted SHA-256), never as typed.
- **Progress:** each person's checkmarks, stored compactly.

Reading partners only see each other once **both** have added each other's username. More than two people can read together.

### The "Forgot your PIN?" link

Put the email address you want people to write to in `sync-config.js`:

```js
let HELP_EMAIL = 'you@example.com';
```

Leave it empty to hide the link. Anything you put here is visible to anyone who looks at the site or the GitHub repo.

### Resetting someone's PIN

Open the sheet's **Users** tab, find their row, and clear the cell in the **pinHash** column. The next time they sign in, whatever PIN they type becomes their new PIN, and every other phone signed in to that account is signed out (their checkmarks stay on those phones).

Do this soon after they ask: until they sign in, whoever signs in first with that username sets the PIN.

### Signing someone out everywhere (a lost phone)

In the **Users** tab, clear the cell in the **tokens** column on their row. Every phone signed in to that account is signed out; the person signs back in with their PIN.

### Deleting an account

Delete the person's row in **both** tabs (**Users** and **Progress**). If someone later signs up with the same username, they start with no checkmarks either way.

After 5 wrong PINs, an account is locked for 15 minutes.

### If something goes wrong on the server

The app shows "Something went wrong on the server" and keeps everyone's checkmarks on their phones. To see what happened, open the Apps Script editor and look under **Executions**.

### Updating the script later

Paste the new version into the Apps Script editor, **Save**, then **Deploy → Manage deployments → pencil icon → Version: "New version" → Deploy**. Doing it that way keeps the same Web app URL, so `sync-config.js` doesn't change. Choosing "New deployment" instead gives you a new URL that you'd have to paste in again.

## IMPORTANT: after changing any app file

The app works offline, so phones keep a copy of every file. After changing any file in this folder (except `docs/` and `tests/`), open `service-worker.js` and bump the number:

```js
const CACHE_NAME = 'bible-reading-2027-v2';
```

Otherwise people who already opened the app may keep seeing the old version.

## Running the tests on the Mac

```bash
tools/run-tests.sh
```

It serves the folder, runs the checks in headless Chrome, and prints any failures plus a line like `67 passed, 0 failed`. You can also run `python3 -m http.server 8790` in this folder and open `http://localhost:8790/tests/` in a browser.

## Publishing on GitHub Pages

Push this folder to a GitHub repository, then in the repository go to **Settings → Pages**, choose **Deploy from a branch**, pick `main` and `/ (root)`, and save. The site appears at `https://<your-username>.github.io/<repo-name>/`.
