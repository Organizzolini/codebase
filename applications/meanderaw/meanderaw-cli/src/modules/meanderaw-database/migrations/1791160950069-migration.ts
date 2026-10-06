import type { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Creates and drops the initial `meanders` table, its family enum, and its indexes.
 */
export class Migration1791160950069 implements MigrationInterface {
  name = "Migration1791160950069";

  /**
   * Reverts this migration by dropping the indexes, the table, and the enum.
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "meanderaw"."IDX_c81def2dd79d9e0b6c15f6c023"`,
    );
    await queryRunner.query(
      `DROP INDEX "meanderaw"."IDX_dd3b754ae6a08b7a3cd6e37fe8"`,
    );
    await queryRunner.query(`DROP TABLE "meanderaw"."meanders"`);
    await queryRunner.query(`DROP TYPE "meanderaw"."meanders_family_enum"`);
  }

  /**
   * Creates the family enum, the `meanders` table, and its two indexes.
   */
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "meanderaw"."meanders_family_enum" AS ENUM('dots', 'lines', 'bars', 'mesh', 'parallel', 'cross', 'arcade', 'comb', 'fork', 'tree', 'boxes', 'chain', 'double-chain', 'waterfalls', 'whirl', 'swirl', 'clasps', 'snake', 'stipple', 'unclassified')`,
    );
    await queryRunner.query(
      `CREATE TABLE "meanderaw"."meanders" ("id" uuid NOT NULL DEFAULT uuidv7(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "created_by" uuid, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_by" uuid, "characteristics" jsonb NOT NULL, "code" text NOT NULL, "columns" bigint NOT NULL, "family" "meanderaw"."meanders_family_enum" NOT NULL, "is_hardcoded" boolean NOT NULL, "lattice" text NOT NULL, "repeats" bigint NOT NULL DEFAULT '1', "rows" bigint NOT NULL, "symmetrical_codes" text NOT NULL DEFAULT '', CONSTRAINT "PK_3cc3fa006a39a4eb93550a14176" PRIMARY KEY ("id")); COMMENT ON COLUMN "meanderaw"."meanders"."id" IS 'Primary key, a uuidv7 the database assigns on insert'; COMMENT ON COLUMN "meanderaw"."meanders"."created_at" IS 'Timestamp when the record was created'; COMMENT ON COLUMN "meanderaw"."meanders"."created_by" IS 'Identifier of the user or process that created the record'; COMMENT ON COLUMN "meanderaw"."meanders"."updated_at" IS 'Timestamp when the record was last updated'; COMMENT ON COLUMN "meanderaw"."meanders"."updated_by" IS 'Identifier of the user or process that last updated the record'`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_dd3b754ae6a08b7a3cd6e37fe8" ON "meanderaw"."meanders"  ("family", "rows", "columns", "code") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_c81def2dd79d9e0b6c15f6c023" ON "meanderaw"."meanders"  ("code") `,
    );
  }
}
