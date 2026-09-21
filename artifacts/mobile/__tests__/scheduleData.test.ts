import {
  addDays,
  formatCountdown,
  getNextUpcomingEvent,
  getTodaysGymEvent,
  isSameDate,
  minutesToLabel,
  monthGridDates,
  startOfWeek,
  timeToMinutes,
  toISODate,
  type ScheduleEvent,
} from '@/constants/scheduleData';

// Fixed local calendar dates match the existing device-local schedule contract.
const now = new Date(2026, 0, 4, 10, 0);
const event = (id: string, overrides: Partial<ScheduleEvent> = {}): ScheduleEvent => ({
  id,
  title: `Test event ${id}`,
  category: 'gym',
  date: '2026-01-04',
  startTime: '11:00',
  endTime: '12:00',
  source: 'local',
  ...overrides,
});

describe('schedule calendar helpers', () => {
  it('formats local dates and compares dates without time of day', () => {
    expect(toISODate(now)).toBe('2026-01-04');
    expect(isSameDate(now, new Date(2026, 0, 4, 23, 59))).toBe(true);
    expect(isSameDate(now, new Date(2026, 0, 5))).toBe(false);
  });

  it('adds across leap-day and year boundaries without mutating the input', () => {
    const original = new Date(2024, 1, 28, 12);
    expect(toISODate(addDays(original, 1))).toBe('2024-02-29');
    expect(toISODate(addDays(original, 2))).toBe('2024-03-01');
    expect(toISODate(addDays(new Date(2026, 0, 1), -1))).toBe('2025-12-31');
    expect(toISODate(original)).toBe('2024-02-28');
    expect(original.getHours()).toBe(12);
  });

  it.each([5, 6, 7, 8, 9, 10, 11])('starts January %i in the Monday week', (day) => {
    const input = new Date(2026, 0, day, 16);
    const result = startOfWeek(input);
    expect(toISODate(result)).toBe('2026-01-05');
    expect(result.getHours()).toBe(0);
    expect(input.getHours()).toBe(16);
  });

  it('builds a consecutive six-week Monday-start month grid', () => {
    const grid = monthGridDates(new Date(2026, 1, 15));
    expect(grid).toHaveLength(42);
    expect(toISODate(grid[0])).toBe('2026-01-26');
    expect(toISODate(grid[41])).toBe('2026-03-08');
    expect(grid[0].getDay()).toBe(1);
    grid.slice(1).forEach((date, i) => {
      expect(toISODate(date)).toBe(toISODate(addDays(grid[i], 1)));
    });
  });

  it.each([['00:00', 0], ['09:05', 545], ['23:59', 1439], ['24:00', 1440]])(
    'converts %s to minutes and back',
    (label, minutes) => {
      expect(timeToMinutes(label)).toBe(minutes);
      expect(minutesToLabel(minutes)).toBe(label);
    },
  );
});

describe('schedule event queries', () => {
  it('finds the earliest upcoming event in unsorted input, including exactly now', () => {
    const current = event('current', { startTime: '10:00' });
    const events = [
      event('tomorrow', { date: '2026-01-05' }),
      event('future'),
      event('past', { startTime: '09:00' }),
      current,
    ];
    const original = [...events];
    expect(getNextUpcomingEvent(events, now)).toBe(current);
    expect(events).toEqual(original);
    expect(getNextUpcomingEvent(events.slice(0, 3), now)?.id).toBe('future');
  });

  it('returns null for empty schedules or schedules with only past events', () => {
    expect(getNextUpcomingEvent([], now)).toBeNull();
    expect(getNextUpcomingEvent([event('past', { date: '2026-01-03' })], now)).toBeNull();
    expect(getTodaysGymEvent([], now)).toBeNull();
  });

  it('finds the first gym event today even if it already started, without sorting input', () => {
    const morning = event('morning', { startTime: '08:00' });
    const events = [
      event('later'),
      event('other-day', { date: '2026-01-03', startTime: '06:00' }),
      event('work', { category: 'work', startTime: '07:00' }),
      morning,
    ];
    const original = [...events];
    expect(getTodaysGymEvent(events, now)).toBe(morning);
    expect(events).toEqual(original);
    expect(getTodaysGymEvent(events.slice(1, 3), now)).toBeNull();
  });

  it.each([
    [-1, 'Now'],
    [0, 'Now'],
    [45, '45m'],
    [192, '3h 12m'],
    [3120, '2d 4h'],
  ])('formats a countdown of %i minutes', (minutes, label) => {
    expect(formatCountdown(new Date(now.getTime() + minutes * 60000), now)).toBe(label);
  });
});