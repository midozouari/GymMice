// ─────────────────────────────────────────────────────────────────────────────
// Workout data model
//
// Decoupled from the Home dashboard UI (app/(tabs)/index.tsx) for the same
// reason constants/scheduleData.ts is decoupled from app/schedule.tsx: so
// future capabilities are additive, not a rewrite —
//   • AI workout generation   → produce a TodaysWorkout, screen code unchanged
//   • Personal records (PRs)  → populate ExerciseSummary.personalRecord
//   • Estimated 1RM           → derive from analyticsData set history, attach
//                                to ExerciseSummary.estimated1RM
//   • Weekly / monthly volume → aggregate ScheduleEvent + WorkoutExercise sets
// None of these are implemented yet — the shape simply has room for them.
// ─────────────────────────────────────────────────────────────────────────────

export type MuscleGroup = 'Chest' | 'Shoulders' | 'Triceps' | 'Back' | 'Biceps' | 'Legs' | 'Core';

export type WorkoutExerciseGroup = {
  group: string;
  moves: string[];
};

export type TodaysWorkout = {
  name: string;
  muscles: string[];
  exercises: WorkoutExerciseGroup[];
  durationMinutes: number;
  // Reserved for future personalization/AI features — unused today.
  estimated1RM?: Record<string, number>;
  personalRecords?: Record<string, number>;
};

export const exerciseCount = (workout: TodaysWorkout): number =>
  workout.exercises.reduce((sum, g) => sum + g.moves.length, 0);

export const TODAYS_WORKOUT: TodaysWorkout = {
  name: 'Push Day',
  muscles: ['Chest', 'Shoulders', 'Triceps'],
  exercises: [
    { group: 'Chest', moves: ['Bench press', 'Incline DB press', 'H2L cable flies'] },
    { group: 'Shoulders', moves: ['Lateral raises', 'German raises'] },
    { group: 'Triceps', moves: ['Cable tricep extension', 'Skull crusher'] },
  ],
  durationMinutes: 55,
};
