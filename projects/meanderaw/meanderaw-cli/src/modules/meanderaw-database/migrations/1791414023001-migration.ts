import type { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Drops the `family` column, its enum, and the index that led with it, and
 * indexes `(rows, columns, code)` instead — the order a pattern page reads
 * its rows in. See ADR 0023.
 */
export class Migration1791414023001 implements MigrationInterface {
  name = "Migration1791414023001";

  /**
   * Reverts this migration by restoring the family enum, column, and index.
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "meanderaw"."IDX_71c06a26e0ba2b8cb1125d7fd5"`,
    );
    await queryRunner.query(
      `CREATE TYPE "meanderaw"."meanders_family_enum" AS ENUM('dots', 'lines', 'bars', 'mesh', 'parallel', 'cross', 'arcade', 'comb', 'fork', 'tree', 'boxes', 'chain', 'double-chain', 'waterfalls', 'whirl', 'swirl', 'clasps', 'snake', 'stipple', 'unclassified')`,
    );
    await queryRunner.query(
      `ALTER TABLE "meanderaw"."meanders" ADD "family" "meanderaw"."meanders_family_enum" NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_dd3b754ae6a08b7a3cd6e37fe8" ON "meanderaw"."meanders"  ("family", "rows", "columns", "code") `,
    );
  }

  /**
   * Drops the family index, column, and enum, and indexes the page order.
   */
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "meanderaw"."IDX_dd3b754ae6a08b7a3cd6e37fe8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "meanderaw"."meanders" DROP COLUMN "family"`,
    );
    await queryRunner.query(`DROP TYPE "meanderaw"."meanders_family_enum"`);
    await queryRunner.query(
      `CREATE INDEX "IDX_71c06a26e0ba2b8cb1125d7fd5" ON "meanderaw"."meanders"  ("rows", "columns", "code") `,
    );
  }
}
