/* ============================================================
   SYNC SETTINGS
   ------------------------------------------------------------
   Leave SYNC_ENDPOINT empty and the app works with no accounts
   at all — every checkmark just stays on each person's phone,
   and the account screens are hidden.

   To turn on optional accounts, follow README.md ("Turning on
   accounts"), then paste your Apps Script Web app URL between
   the quotes below.

   HELP_EMAIL is where the "Forgot your PIN?" link sends people.
   Leave it empty to hide that link. It will be visible to anyone
   who looks at the site or the GitHub repo.

   After changing this file, bump CACHE_NAME in service-worker.js.
   ============================================================ */

let SYNC_ENDPOINT = 'https://script.google.com/macros/s/AKfycbxUH_et_Kbaz4ife73mPHAoTWw1EyJ05RDALMQJ6Ke8cKq_1QDBaQL9jIojeveF2a4Zmg/exec';
let HELP_EMAIL = '';
