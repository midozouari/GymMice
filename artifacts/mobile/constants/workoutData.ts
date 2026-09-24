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

export type WorkoutExerciseGroup = {
  group: string;
  moves: WorkoutExercise[];
};

export type WorkoutExercise = {
  id: string;
  name: string;
};

export type TodaysWorkout = {
  id: string;
  slug: string;
  name: string;
  muscles: string[];
  exercises: WorkoutExerciseGroup[];
  exerciseIds: string[];
  exerciseCount: number;
  durationMinutes: number;
};

export type WorkoutTemplateSummary = {
  id: string;
  slug: string;
  name: string;
  durationSeconds: number;
  exerciseCount: number;
};
