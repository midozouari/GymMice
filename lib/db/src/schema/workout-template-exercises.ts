import { sql } from "drizzle-orm";
import { check, integer, pgTable, primaryKey, unique, uuid } from "drizzle-orm/pg-core";
import { exercisesTable } from "./exercises.js";
import { workoutTemplatesTable } from "./workout-templates.js";

export const workoutTemplateExercisesTable = pgTable("workout_template_exercises", {
  templateId: uuid("template_id").notNull().references(() => workoutTemplatesTable.id),
  exerciseId: uuid("exercise_id").notNull().references(() => exercisesTable.id),
  position: integer("position").notNull(),
}, (table) => [
  primaryKey({ name: "workout_template_exercises_pk", columns: [table.templateId, table.exerciseId] }),
  unique("workout_template_exercises_template_position_unique").on(table.templateId, table.position),
  check("workout_template_exercises_position_nonnegative", sql`${table.position} >= 0`),
]);