/* ============================================================
   PLAN CALENDAR — which readings fall on which day.
   The same plan runs every year: it starts on the first Monday
   of January and runs 52 weeks, Monday to Friday. Weekends are
   open for catching up. 2027 is the first year. "Today" is the
   phone's own local date, and dates are compared as whole
   calendar days (never clock times) so daylight-saving days work.
   ============================================================ */

const FIRST_YEAR = 2027;
const WEEKS = 52;

const TRACK_LABELS = { nt: 'New Testament', ot: 'Old Testament', ps: 'Psalm', pr: 'Proverbs' };

function dayNumber(y, m, d) {
  return Math.round(Date.UTC(y, m - 1, d) / 86400000);
}

function localDayNumber(date) {
  return dayNumber(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

// The first Monday on or after January 1.
function planStart(year) {
  const jan1 = new Date(year, 0, 1).getDay(); // 0 = Sunday … 6 = Saturday
  return new Date(year, 0, 1 + ((8 - jan1) % 7));
}

function planDayForDate(date) {
  const year = Math.max(FIRST_YEAR, date.getFullYear());
  const diff = localDayNumber(date) - localDayNumber(planStart(year));
  if (diff < 0) return { status: 'before', year, daysUntilStart: -diff };
  const week = Math.floor(diff / 7) + 1;
  const dow = diff % 7; // 0 = Monday … 6 = Sunday
  if (week > WEEKS || (week === WEEKS && dow >= 5)) return { status: 'after', year };
  if (dow >= 5) return { status: 'weekend', year, week, nextWeek: week + 1 };
  return { status: 'reading', year, week, weekday: dow + 1 };
}

function dateFor(year, week, weekday) {
  const start = planStart(year);
  return new Date(year, 0, start.getDate() + (week - 1) * 7 + (weekday - 1));
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function readingsFor(year, week, weekday) {
  const day = (week - 1) * 5 + (weekday - 1);
  const prefix = `${year}-w${pad2(week)}d${weekday}`;
  const isPsalmDay = weekday % 2 === 1;
  const wisdom = isPsalmDay
    ? { track: 'ps', ref: PSALM_READINGS[(week - 1) * 3 + (weekday - 1) / 2] }
    : { track: 'pr', ref: PROVERBS_READINGS[(week - 1) * 2 + (weekday / 2 - 1)] };
  return [
    { track: 'nt', ref: NT_READINGS[day] },
    { track: 'ot', ref: OT_READINGS[day] },
    wisdom,
  ].map(r => ({ id: `${prefix}-${r.track}`, track: r.track, label: TRACK_LABELS[r.track], ref: r.ref }));
}

// "2028-w03d2-pr" → { year: 2028, week: 3, weekday: 2, track: 'pr' }
function parseItemId(id) {
  const m = String(id).match(/^(\d{4})-w(\d\d)d([1-5])-(nt|ot|ps|pr)$/);
  return m ? { year: Number(m[1]), week: Number(m[2]), weekday: Number(m[3]), track: m[4] } : null;
}

function weekItemIds(year, week) {
  const ids = [];
  for (let d = 1; d <= 5; d++) readingsFor(year, week, d).forEach(r => ids.push(r.id));
  return ids;
}

// Every reading in the current plan year dated before the given day, in plan order.
function allItemIdsBefore(date) {
  const year = planDayForDate(date).year;
  const diff = localDayNumber(date) - localDayNumber(planStart(year));
  const ids = [];
  for (let w = 1; w <= WEEKS; w++) {
    for (let d = 1; d <= 5; d++) {
      if ((w - 1) * 7 + (d - 1) < diff) readingsFor(year, w, d).forEach(r => ids.push(r.id));
    }
  }
  return ids;
}
