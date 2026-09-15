// ─────────────────────────────────────────────────────────────────────────────
// Analytics data model
//
// Mirrors the "decoupled data, not implemented UI" pattern used across the
// app (see scheduleData.ts / workoutData.ts). This file is the seam for:
//   • Real workout-history logging → replace generateSeries()'s synthetic
//     output with actual logged sets, ExerciseProgress shape stays the same
//   • Estimated 1RM                → derive per data point from weight/reps
//   • Weekly / monthly volume      → aggregate ExerciseProgress.points
// Progress is intentionally NOT a straight line — plateaus, small
// regressions and PR jumps are generated so the charts read as realistic
// training data rather than a demo curve.
// ─────────────────────────────────────────────────────────────────────────────

export type MuscleSplit = 'Push' | 'Pull' | 'Legs';

export type ExerciseDataPoint = {
  week: number;      // weeks ago is (TOTAL_WEEKS - 1 - index); index 0 = oldest
  weight: number;     // kg, working-set top weight
  isPR: boolean;
};

export type ExerciseProgress = {
  name: string;
  unit: 'kg';
  points: ExerciseDataPoint[];
  current: number;
  personalRecord: number;
  // Reserved for future features — unused today.
  estimated1RM?: number;
};

export const MUSCLE_SPLITS: MuscleSplit[] = ['Push', 'Pull', 'Legs'];

const EXERCISES_BY_SPLIT: Record<MuscleSplit, { name: string; start: number }[]> = {
  Push: [
    { name: 'Bench Press', start: 60 },
    { name: 'Incline DB Press', start: 22 },
    { name: 'Shoulder Press', start: 30 },
    { name: 'Cable Fly', start: 14 },
    { name: 'Triceps Pushdown', start: 25 },
  ],
  Pull: [
    { name: 'Pull Ups', start: 0 },
    { name: 'Lat Pulldown', start: 45 },
    { name: 'Barbell Row', start: 50 },
    { name: 'Cable Row', start: 40 },
    { name: 'Face Pull', start: 12 },
  ],
  Legs: [
    { name: 'Squat', start: 70 },
    { name: 'Romanian Deadlift', start: 60 },
    { name: 'Leg Press', start: 90 },
    { name: 'Leg Extension', start: 35 },
    { name: 'Hamstring Curl', start: 20 },
  ],
};

const TOTAL_WEEKS = 16;

// Small deterministic string hash → used to seed a PRNG per exercise so the
// "realistic" fluctuation pattern is stable across renders/reloads instead
// of re-randomizing every time the analytics screen opens.
function hashSeed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) || 1;
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Generates a realistic-looking progression: gradual upward trend, punctuated
// by plateaus (several weeks of no change), small regressions (a rep-max dip
// after a hard week), and occasional PR jumps — never a straight line.
function generateSeries(name: string, start: number): ExerciseProgress {
  const rand = mulberry32(hashSeed(name));
  const points: ExerciseDataPoint[] = [];
  let weight = start;
  let personalRecord = start;
  let weeksSincePR = 0;

  for (let i = 0; i < TOTAL_WEEKS; i++) {
    const roll = rand();
    if (roll < 0.12) {
      // Plateau — hold steady.
    } else if (roll < 0.20 && i > 2) {
      // Small regression (fatigue / deload week).
      weight = Math.max(start * 0.85, weight - (weight * (0.02 + rand() * 0.03)));
    } else if (roll < 0.30 && weeksSincePR > 2) {
      // PR jump.
      weight = weight + (weight * (0.04 + rand() * 0.05));
    } else {
      // Normal small progression.
      weight = weight + (weight * (0.005 + rand() * 0.015));
    }

    weight = Math.round(weight * 2) / 2; // nearest 0.5kg
    const isPR = weight > personalRecord;
    if (isPR) { personalRecord = weight; weeksSincePR = 0; } else { weeksSincePR++; }

    points.push({ week: i, weight, isPR });
  }

  return {
    name,
    unit: 'kg',
    points,
    current: points[points.length - 1].weight,
    personalRecord,
  };
}

export const ANALYTICS_DATA: Record<MuscleSplit, ExerciseProgress[]> = MUSCLE_SPLITS.reduce(
  (acc, split) => {
    acc[split] = EXERCISES_BY_SPLIT[split].map(e => generateSeries(e.name, e.start));
    return acc;
  },
  {} as Record<MuscleSplit, ExerciseProgress[]>,
);
