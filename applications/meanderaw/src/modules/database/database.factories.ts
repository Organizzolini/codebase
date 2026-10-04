import { SnakeNamingStrategy } from "typeorm-naming-strategies";

import { Meander } from "./entities/Meander.entity";

import type { MeanderDatabaseConnection } from "./database.types";
import type { TypeOrmModuleOptions } from "@nestjs/typeorm";

/**
 * The TypeORM options for the meander database at `connection`, shared by
 * `DatabaseModule` and the integration suites so both build the same schema.
 *
 * `synchronize: true` rather than a migrations directory: this database has
 * exactly one writer, the CLI itself, and no concurrent consumer ever runs a
 * stale schema against a newer one the way a shared service's migration
 * discipline guards against. Spec #813 also asks for a schema "extensible
 * with new Characteristic columns over time... without a large migration",
 * which letting TypeORM synchronize on every run already buys — the same
 * choice `packages/lexico-entities` makes for its own runtime connection.
 *
 * Snake case, so a raw SQL reader never quotes a column.
 */
export function meanderDataSourceOptions(
  connection: MeanderDatabaseConnection,
): TypeOrmModuleOptions {
  return {
    ...connection,
    entities: [Meander],
    logging: false,
    namingStrategy: new SnakeNamingStrategy(),
    synchronize: true,
    type: "postgres",
  };
}
