import {
  exercisesTable,
  getRuntimeDatabase,
  workoutTemplateExercisesTable,
  workoutTemplatesTable,
} from "@workspace/db";
import { asc, count, eq } from "drizzle-orm";
import { AppError } from "./errors";

type Database = ReturnType<typeof getRuntimeDatabase>["db"];

export interface WorkoutTemplateSummaryRecord {
  id: string;
  slug: string;
  name: string;
  durationSeconds: number;
  exerciseCount: number;
}

export interface WorkoutTemplateDetailRecord {
  id: string;
  slug: string;
  name: string;
  durationSeconds: number;
  exercises: Array<{
    id: string;
    name: string;
    muscleGroup: string;
    position: number;
  }>;
}

export interface WorkoutTemplateRepository {
  list(): Promise<WorkoutTemplateSummaryRecord[]>;
  getById(id: string): Promise<WorkoutTemplateDetailRecord | undefined>;
}

export function createWorkoutTemplateRepository(
  getDatabase: () => Database = () => getRuntimeDatabase().db,
): WorkoutTemplateRepository {
  return {
    async list() {
      try {
        const db = getDatabase();
        return await db
          .select({
            id: workoutTemplatesTable.id,
            slug: workoutTemplatesTable.slug,
            name: workoutTemplatesTable.name,
            durationSeconds: workoutTemplatesTable.durationSeconds,
            exerciseCount: count(workoutTemplateExercisesTable.exerciseId),
          })
          .from(workoutTemplatesTable)
          .leftJoin(
            workoutTemplateExercisesTable,
            eq(
              workoutTemplateExercisesTable.templateId,
              workoutTemplatesTable.id,
            ),
          )
          .groupBy(workoutTemplatesTable.id)
          .orderBy(asc(workoutTemplatesTable.slug))
          .limit(100);
      } catch {
        throw new AppError("SERVICE_UNAVAILABLE");
      }
    },

    async getById(id) {
      try {
        const db = getDatabase();
        const templates = await db
          .select({
            id: workoutTemplatesTable.id,
            slug: workoutTemplatesTable.slug,
            name: workoutTemplatesTable.name,
            durationSeconds: workoutTemplatesTable.durationSeconds,
          })
          .from(workoutTemplatesTable)
          .where(eq(workoutTemplatesTable.id, id))
          .limit(1);
        const template = templates[0];
        if (!template) return undefined;

        const exercises = await db
          .select({
            id: exercisesTable.id,
            name: exercisesTable.name,
            muscleGroup: exercisesTable.muscleGroup,
            position: workoutTemplateExercisesTable.position,
          })
          .from(workoutTemplateExercisesTable)
          .innerJoin(
            exercisesTable,
            eq(workoutTemplateExercisesTable.exerciseId, exercisesTable.id),
          )
          .where(eq(workoutTemplateExercisesTable.templateId, id))
          .orderBy(asc(workoutTemplateExercisesTable.position));

        return { ...template, exercises };
      } catch {
        throw new AppError("SERVICE_UNAVAILABLE");
      }
    },
  };
}