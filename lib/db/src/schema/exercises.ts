import { check, pgTable, unique, uuid, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const exercisesTable = pgTable("exercises", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: varchar("slug", { length: 80 }).notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  muscleGroup: varchar("muscle_group", { length: 60 }).notNull(),
}, (table) => [
  unique("exercises_slug_unique").on(table.slug),
  check("exercises_slug_format", sql`${table.slug} ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'`),
  check("exercises_name_nonempty", sql`char_length(${table.name}) >= 1`),
  check("exercises_muscle_group_nonempty", sql`char_length(${table.muscleGroup}) >= 1`),
]);