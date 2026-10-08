import type { MigrationInterface, QueryRunner } from "typeorm";

/**
 * The integration suite's one migration, as `migration:generate` wrote it
 * for `Widget` in the `fixture` schema: what the suite proves the harness
 * runs, and what it proves leaves nothing for synchronize to do.
 */
export class CreateWidgets1767225600000 implements MigrationInterface {
  name = "CreateWidgets1767225600000";

  /** Drops the table. */
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "fixture"."widgets"`);
  }

  /** Creates the table, with a comment on every base column. */
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "fixture"."widgets" ("id" uuid NOT NULL DEFAULT uuidv7(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "created_by" uuid, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_by" uuid, "deleted_at" TIMESTAMP WITH TIME ZONE, "deleted_by" uuid, "display_name" text NOT NULL, CONSTRAINT "PK_da23136dbcfc91424451e24b725" PRIMARY KEY ("id")); COMMENT ON COLUMN "fixture"."widgets"."id" IS 'Primary key, a uuidv7 the database assigns on insert'; COMMENT ON COLUMN "fixture"."widgets"."created_at" IS 'Timestamp when the record was created'; COMMENT ON COLUMN "fixture"."widgets"."created_by" IS 'Identifier of the user or process that created the record'; COMMENT ON COLUMN "fixture"."widgets"."updated_at" IS 'Timestamp when the record was last updated'; COMMENT ON COLUMN "fixture"."widgets"."updated_by" IS 'Identifier of the user or process that last updated the record'; COMMENT ON COLUMN "fixture"."widgets"."deleted_at" IS 'Timestamp when the record was soft-deleted'; COMMENT ON COLUMN "fixture"."widgets"."deleted_by" IS 'Identifier of the user or process that soft-deleted the record'`,
    );
  }
}
