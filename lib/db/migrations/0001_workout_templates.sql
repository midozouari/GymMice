CREATE TABLE "exercises" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(80) NOT NULL,
	"name" varchar(120) NOT NULL,
	"muscle_group" varchar(60) NOT NULL,
	CONSTRAINT "exercises_slug_unique" UNIQUE("slug"),
	CONSTRAINT "exercises_slug_format" CHECK ("exercises"."slug" ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
	CONSTRAINT "exercises_name_nonempty" CHECK (char_length("exercises"."name") >= 1),
	CONSTRAINT "exercises_muscle_group_nonempty" CHECK (char_length("exercises"."muscle_group") >= 1)
);
--> statement-breakpoint
CREATE TABLE "workout_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(80) NOT NULL,
	"name" varchar(120) NOT NULL,
	"duration_seconds" integer NOT NULL,
	CONSTRAINT "workout_templates_slug_unique" UNIQUE("slug"),
	CONSTRAINT "workout_templates_slug_format" CHECK ("workout_templates"."slug" ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
	CONSTRAINT "workout_templates_name_nonempty" CHECK (char_length("workout_templates"."name") >= 1),
	CONSTRAINT "workout_templates_duration_range" CHECK ("workout_templates"."duration_seconds" > 0 AND "workout_templates"."duration_seconds" <= 86400)
);
--> statement-breakpoint
CREATE TABLE "workout_template_exercises" (
	"template_id" uuid NOT NULL,
	"exercise_id" uuid NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "workout_template_exercises_pk" PRIMARY KEY("template_id","exercise_id"),
	CONSTRAINT "workout_template_exercises_template_position_unique" UNIQUE("template_id","position"),
	CONSTRAINT "workout_template_exercises_position_nonnegative" CHECK ("workout_template_exercises"."position" >= 0)
);
--> statement-breakpoint
ALTER TABLE "workout_template_exercises" ADD CONSTRAINT "workout_template_exercises_template_id_workout_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."workout_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_template_exercises" ADD CONSTRAINT "workout_template_exercises_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- Reviewed runtime access: public remains revoked and only an already-provisioned
-- environment runtime role receives read access during the explicit seed step.
-- Feature migrations never create roles.
REVOKE ALL ON TABLE "exercises", "workout_templates", "workout_template_exercises" FROM PUBLIC;