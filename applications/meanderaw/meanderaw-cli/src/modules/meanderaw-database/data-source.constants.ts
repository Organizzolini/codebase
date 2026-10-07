import "reflect-metadata";

import { createDataSource } from "@codebase/database";

import { Meander } from "./entities/meander.entity";

/**
 * The TypeORM command-line data source `nx run meanderaw-cli:migration` runs
 * every configuration through: it connects as the `MEANDERAW_POSTGRES_*`
 * variables name, to the `meanderaw` schema, and compares {@link Meander}
 * against the migrations beside it.
 */
export const meanderawDataSource = createDataSource({
  entities: [Meander],
  migrations: ["src/modules/meanderaw-database/migrations/*.ts"],
  project: "meanderaw",
});
