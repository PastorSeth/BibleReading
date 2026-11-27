/* ============================================================
   PLAN CALENDAR — which readings fall on which day.
   Week 1 starts Monday, January 4, 2027. Readings are Mon–Fri;
   weekends are open for catching up. "Today" is the phone's own
   local date. Dates are compared as whole calendar days (never
   by subtracting clock times) so daylight-saving days work.
   ============================================================ */

const PLAN_START = { y: 2027, m: 1, d: 4 };
const WEEKS = 52;

const TRACK_LABELS = { nt: 'New Testament', ot: 'Old Testament', ps: 'Psalm', pr: 'Proverbs' };

function dayNumber(y, m, d) {
  return Math.round(Date.UTC(y, m - 1, d) / 86400000);
}

// Whole days from the plan's first Monday to the given date's local day.
function daysSinceStart(date) {
  return dayNumber(date.getFullYear(), date.getMonth() + 1, date.getDate())
    - dayNumber(PLAN_START.y, PLAN_START.m, PLAN_START.d);
}

function planDayForDate(date) {
  const diff = daysSinceStart(date);
  if (diff < 0) return { status: 'before', daysUntilStart: -diff };
  const week = Math.floor(diff / 7) + 1;
  const dow = diff % 7; // 0 = Monday … 6 = Sunday
  if (week > WEEKS || (week === WEEKS && dow >= 5)) return { status: 'after' };
  if (dow >= 5) return { status: 'weekend', week, nextWeek: week + 1 };
  return { status: 'reading', week, weekday: dow + 1 };
}

function dateFor(week, weekday) {
  return new Date(PLAN_START.y, PLAN_START.m - 1, PLAN_START.d + (week - 1) * 7 + (weekday - 1));
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function readingsFor(week, weekday) {
  const day = (week - 1) * 5 + (weekday - 1);
  const prefix = `w${pad2(week)}d${weekday}`;
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

function weekItemIds(week) {
  const ids = [];
  for (let d = 1; d <= 5; d++) readingsFor(week, d).forEach(r => ids.push(r.id));
  return ids;
}

// Every reading dated before the given day, in plan order.
function allItemIdsBefore(date) {
  const diff = daysSinceStart(date);
  const ids = [];
  for (let w = 1; w <= WEEKS; w++) {
    for (let d = 1; d <= 5; d++) {
      if ((w - 1) * 7 + (d - 1) < diff) readingsFor(w, d).forEach(r => ids.push(r.id));
    }
  }
  return ids;
}
