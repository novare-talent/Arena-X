// Week-number → start/close timestamps.
// Anchor date is the day the series goes live; set FORGE_ANCHOR_DATE in env
// to override. Each week opens Mon 00:00 IST, closes Sun 21:30 IST.
//
// Times stored in DB are UTC (timestamptz). We compute in IST then to-UTC.

const IST_OFFSET_MIN = 330; // +05:30

function defaultAnchorIso(): string {
  // Monday 2026-06-22 00:00 IST → 2026-06-21 18:30 UTC.
  return process.env.FORGE_ANCHOR_DATE ?? "2026-06-21T18:30:00.000Z";
}

export function weekStart(weekNumber: number): Date {
  const anchor = new Date(defaultAnchorIso());
  const d = new Date(anchor);
  d.setUTCDate(d.getUTCDate() + (weekNumber - 1) * 7);
  return d;
}

export function weekClose(weekNumber: number): Date {
  // Close = start + 6d 21h (Sun 21:30 IST). 6*24+21 = 165h. Minus 30m = 164.5h.
  // Easier: start + 6d + 21h30m relative to start time-of-day (which is 00:00 IST).
  const start = weekStart(weekNumber);
  const close = new Date(start);
  close.setUTCDate(close.getUTCDate() + 6);     // Sunday same day-time
  close.setUTCHours(close.getUTCHours() + 21);  // 21h later
  close.setUTCMinutes(close.getUTCMinutes() + 30);
  return close;
}

/**
 * Sunday 23:59:59.999 IST of the week containing `from`. Used when an admin
 * force-opens a week off-schedule: the window still ends on that calendar
 * week's Sunday instead of running a full 7 days from the click.
 */
export function endOfWeekIST(from: Date = new Date()): Date {
  const ist = new Date(from.getTime() + IST_OFFSET_MIN * 60_000);
  const daysUntilSunday = (7 - ist.getUTCDay()) % 7;
  ist.setUTCDate(ist.getUTCDate() + daysUntilSunday);
  ist.setUTCHours(23, 59, 59, 999);
  return new Date(ist.getTime() - IST_OFFSET_MIN * 60_000);
}

export function currentActiveWeek(now = new Date()): number | null {
  const anchor = new Date(defaultAnchorIso());
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const diff = now.getTime() - anchor.getTime();
  if (diff < 0) return null;
  const week = Math.floor(diff / msPerWeek) + 1;
  if (week < 1 || week > 40) return null;
  return week;
}

export { IST_OFFSET_MIN };
