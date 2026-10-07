import type { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Creates and drops the initial caelundas schema: the `calendar_events`
 * table.
 */
export class Migration1791255787877 implements MigrationInterface {
  name = "Migration1791255787877";

  /**
   * Reverts this migration by dropping the categories index and the table.
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "caelundas"."calendar_events_categories_gin"`,
    );
    await queryRunner.query(`DROP TABLE "calendar_events"`);
  }

  /**
   * Applies this migration by creating the `calendar_events` table and its
   * index.
   */
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "calendar_events" ("id" uuid NOT NULL DEFAULT uuidv7(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "created_by" uuid, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_by" uuid, "categories" text array NOT NULL, "color" text, "description" text NOT NULL, "end" TIMESTAMP WITH TIME ZONE NOT NULL, "latitude" numeric(8,6) NOT NULL, "location" text, "longitude" numeric(9,6) NOT NULL, "start" TIMESTAMP WITH TIME ZONE NOT NULL, "summary" text NOT NULL, CONSTRAINT "calendar_events_natural_key" UNIQUE ("summary", "start", "latitude", "longitude"), CONSTRAINT "PK_faf5391d232322a87cdd1c6f30c" PRIMARY KEY ("id")); COMMENT ON COLUMN "calendar_events"."id" IS 'Primary key, a uuidv7 the database assigns on insert'; COMMENT ON COLUMN "calendar_events"."created_at" IS 'Timestamp when the record was created'; COMMENT ON COLUMN "calendar_events"."created_by" IS 'Identifier of the user or process that created the record'; COMMENT ON COLUMN "calendar_events"."updated_at" IS 'Timestamp when the record was last updated'; COMMENT ON COLUMN "calendar_events"."updated_by" IS 'Identifier of the user or process that last updated the record'; COMMENT ON COLUMN "calendar_events"."categories" IS 'Category tags for filtering, such as aspects, major, and moon'; COMMENT ON COLUMN "calendar_events"."color" IS 'Color hint for calendar display'; COMMENT ON COLUMN "calendar_events"."description" IS 'Detailed description with additional context'; COMMENT ON COLUMN "calendar_events"."end" IS 'When the event ends'; COMMENT ON COLUMN "calendar_events"."latitude" IS 'Observer latitude in degrees the event was computed for'; COMMENT ON COLUMN "calendar_events"."location" IS 'Human-readable location of the event'; COMMENT ON COLUMN "calendar_events"."longitude" IS 'Observer longitude in degrees the event was computed for'; COMMENT ON COLUMN "calendar_events"."start" IS 'When the event starts'; COMMENT ON COLUMN "calendar_events"."summary" IS 'Brief event title shown in calendar views'`,
    );
    await queryRunner.query(
      `CREATE INDEX "calendar_events_categories_gin" ON "calendar_events" USING gin ("categories") `,
    );
  }
}
