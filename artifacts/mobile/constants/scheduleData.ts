// ─────────────────────────────────────────────────────────────────────────────
// Schedule data model
//
// This file is intentionally decoupled from the UI (app/schedule.tsx) so the
// data shape can absorb future capabilities without touching screen code:
//   • AI-generated workout sessions      → set `source: 'ai'` + `aiGenerated: true`
//   • AI schedule optimization           → optimizer only needs to read/write
//                                          ScheduleEvent[], no shape changes
//   • Google Calendar sync               → set `source: 'google'` + `externalId`
//   • Apple Calendar sync                → set `source: 'apple'` + `externalId`
//   • Recurring events                   → populate `recurrence`
//   • Reminders                          → populate `reminder`
// None of these are implemented yet — the fields simply exist so a future
// integration is additive rather than a refactor.
// ─────────────────────────────────────────────────────────────────────────────

export type EventCategory = 'gym' | 'study' | 'work' | 'meal' | 'personal' | 'social';

export const CATEGORIES: EventCategory[] = ['gym', 'study', 'work', 'meal', 'personal', 'social'];

export const CATEGORY_META: Record<EventCategory, { label: string; color: string; tint: string; icon: keyof typeof import('@expo/vector-icons').Feather.glyphMap }> = {
  gym:      { label: 'Gym',      color: '#D94040', tint: '#D9404018', icon: 'activity' },
  study:    { label: 'Study',    color: '#3B8BD4', tint: '#3B8BD418', icon: 'book-open' },
  work:     { label: 'Work',     color: '#E8692A', tint: '#E8692A18', icon: 'briefcase' },
  meal:     { label: 'Meal',     color: '#1D9E75', tint: '#1D9E7518', icon: 'coffee' },
  personal: { label: 'Personal', color: '#7C3AED', tint: '#7C3AED18', icon: 'user' },
  social:   { label: 'Social',   color: '#E91E8C', tint: '#E91E8C18', icon: 'users' },
};

// Reserved for future recurring-event support. Not implemented yet.
export type RecurrenceRule = {
  freq: 'daily' | 'weekly';
  interval: number;
  until?: string; // ISO date
} | null;

// Reserved for future reminder support. Not implemented yet.
export type ReminderRule = {
  minutesBefore: number;
} | null;

export type EventSource = 'local' | 'google' | 'apple' | 'ai';

export type ScheduleEvent = {
  id: string;
  title: string;
  category: EventCategory;
  date: string;       // ISO date, 'YYYY-MM-DD'
  startTime: string;  // 24h 'HH:MM'
  endTime: string;    // 24h 'HH:MM'
  notes?: string;
  // Future-proofing — unused today, present so later features are additive:
  source: EventSource;
  recurrence?: RecurrenceRule;
  reminder?: ReminderRule;
  aiGenerated?: boolean;
  externalId?: string; // id in an external calendar (Google/Apple) once synced
};

// ── Date helpers ─────────────────────────────────────────────────────────────

export const pad2 = (n: number) => String(n).padStart(2, '0');

export const toISODate = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

export const isSameDate = (a: Date, b: Date) => toISODate(a) === toISODate(b);

export const addDays = (d: Date, n: number) => {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
};

// Monday-start week
export const startOfWeek = (d: Date) => {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = copy.getDay(); // 0 = Sun
  const diff = dow === 0 ? -6 : 1 - dow;
  return addDays(copy, diff);
};

export const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const WEEKDAY_LABELS_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const MONTH_LABELS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export const timeToMinutes = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

export const minutesToLabel = (mins: number) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${pad2(h)}:${pad2(m)}`;
};

// Full 6-row x 7-col grid (Monday-start) covering the given month, including
// the leading/trailing days needed to fill whole weeks.
export const monthGridDates = (monthDate: Date): Date[] => {
  const firstOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const gridStart = startOfWeek(firstOfMonth);
  return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
};

// ── Time-picker option list (used by the Add Event modal) ───────────────────
export const TIME_OPTIONS: string[] = (() => {
  const out: string[] = [];
  for (let h = 0; h <= 23; h++) {
    out.push(`${pad2(h)}:00`);
    out.push(`${pad2(h)}:30`);
  }
  return out;
})();

// ── Week timeline range ───────────────────────────────────────────────────
// Full 24-hour day, per Ticket 5 follow-up. The grid always spans 00:00–24:00;
// screens using it are expected to auto-scroll to a sensible starting offset
// (e.g. near the current time) rather than forcing users to start at midnight.
export const GRID_START_HOUR = 0;
export const GRID_END_HOUR = 24;
export const HOUR_HEIGHT = 56;

// ── Mock base events for the current week ────────────────────────────────
// Diverse, realistic daily plans — every day feels different, per Ticket 5 §3.
const monday = startOfWeek(new Date());
const dateFor = (offset: number) => toISODate(addDays(monday, offset));

let idCounter = 1;
const ev = (
  offset: number, title: string, category: EventCategory, startTime: string, endTime: string, notes?: string,
): ScheduleEvent => ({
  id: `base-${idCounter++}`,
  title, category, startTime, endTime, notes,
  date: dateFor(offset),
  source: 'local',
});

// ── Shared persistence keys ───────────────────────────────────────────────
// Hoisted here (rather than kept local to app/schedule.tsx) so any other
// screen — e.g. the Home dashboard's "Next Event" / "Today's Workout" cards —
// can read the exact same merged event set without duplicating storage logic.
export const CUSTOM_EVENTS_STORAGE_KEY = '@gymmice_custom_events';
export const DELETED_EVENT_IDS_STORAGE_KEY = '@gymmice_deleted_event_ids';

// ── Cross-screen event queries ───────────────────────────────────────────
// Pure helpers so both the Schedule screen and the Home dashboard compute
// "what's next" identically. Also the natural seam for future AI schedule
// optimization: an optimizer only needs to produce ScheduleEvent[] and these
// helpers keep working unchanged.
export const getNextUpcomingEvent = (events: ScheduleEvent[], now: Date = new Date()): ScheduleEvent | null => {
  const nowTs = now.getTime();
  let best: ScheduleEvent | null = null;
  let bestTs = Infinity;
  for (const e of events) {
    const ts = new Date(`${e.date}T${e.startTime}:00`).getTime();
    if (ts >= nowTs && ts < bestTs) { best = e; bestTs = ts; }
  }
  return best;
};

export const getTodaysGymEvent = (events: ScheduleEvent[], now: Date = new Date()): ScheduleEvent | null => {
  const iso = toISODate(now);
  const todays = events
    .filter(e => e.date === iso && e.category === 'gym')
    .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
  return todays[0] ?? null;
};

// Formats the gap between `now` and a future Date as a short countdown label,
// e.g. "2d 4h", "3h 12m", "45m". Falls back to "Now" once the gap collapses.
export const formatCountdown = (target: Date, now: Date = new Date()): string => {
  const diffMs = target.getTime() - now.getTime();
  if (diffMs <= 0) return 'Now';
  const totalMinutes = Math.round(diffMs / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

export const BASE_EVENTS: ScheduleEvent[] = [
  // Monday
  ev(0, 'University', 'study', '09:00', '12:30'),
  ev(0, 'Push Workout', 'gym', '18:00', '19:30', 'Bench, incline press, dips'),
  ev(0, 'Dinner', 'meal', '20:00', '21:00'),
  // Tuesday
  ev(1, 'Work', 'work', '09:00', '17:00'),
  ev(1, 'Study Session', 'study', '19:00', '20:30'),
  // Wednesday
  ev(2, 'University', 'study', '09:00', '12:00'),
  ev(2, 'Pull Workout', 'gym', '18:00', '19:30', 'Deadlifts, rows, pull-ups'),
  ev(2, 'Meal Prep', 'meal', '20:00', '21:30'),
  // Thursday
  ev(3, 'Work', 'work', '09:00', '17:00'),
  ev(3, 'Leg Day', 'gym', '18:30', '20:00', 'Squats, leg press, calves'),
  ev(3, 'Stretching', 'gym', '20:15', '20:45'),
  // Friday
  ev(4, 'University', 'study', '09:00', '11:30'),
  ev(4, 'Grocery Shopping', 'personal', '17:00', '18:00'),
  ev(4, 'Coffee with Friends', 'social', '19:00', '20:30'),
  // Saturday
  ev(5, 'Recovery', 'personal', '09:00', '10:00', 'Foam rolling + mobility'),
  ev(5, 'Laundry', 'personal', '11:00', '12:00'),
  ev(5, 'Dinner', 'meal', '19:30', '21:00'),
  // Sunday
  ev(6, 'Rest', 'personal', '10:00', '12:00'),
  ev(6, 'Study Session', 'study', '18:00', '19:30'),
];
