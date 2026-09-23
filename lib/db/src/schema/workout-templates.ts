import { sql } from "drizzle-orm";
import { check, integer, pgTable, unique, uuid, varchar } from "drizzle-orm/pg-core";

export const workoutTemplatesTable = pgTable("workout_templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: varchar("slug", { length: 80 }).notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  durationSeconds: integer("duration_seconds").notNull(),
}, (table) => [
  unique("workout_templates_slug_unique").on(table.slug),
  check("workout_templates_slug_format", sql`${table.slug} ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'`),
  check("workout_templates_name_nonempty", sql`char_length(${table.name}) >= 1`),
  check("workout_templates_duration_range", sql`${table.durationSeconds} > 0 AND ${table.durationSeconds} <= 86400`),
]);