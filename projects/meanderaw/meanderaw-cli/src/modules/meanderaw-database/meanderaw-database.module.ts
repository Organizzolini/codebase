import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { DatabaseModule } from "@codebase/database";

import { Meander } from "./entities/meander.entity";
import { MeanderawDatabaseService } from "./meanderaw-database.service";

/**
 * Wires up the Postgres database every meander is persisted to, through the
 * shared `@codebase/database` module: the server, credentials, database, and
 * schema the `MEANDERAW_POSTGRES_*` variables name, by default the
 * `meanderaw_development` database, its `meanderaw` schema, and the
 * `meanderaw_username` role.
 *
 * The table is built by the migrations under `./migrations`, run with
 * `nx run meanderaw-cli:migration:run`; the connection never synchronizes and
 * never runs them on start. A test exercising `MeanderawDatabaseService`
 * boots this module against a throwaway Postgres container, migrated by the
 * same migrations, through `startDatabaseTestingModule`.
 */
@Module({
  controllers: [],
  exports: [MeanderawDatabaseService, TypeOrmModule],
  imports: [
    DatabaseModule.forRoot({ entities: [Meander], project: "meanderaw" }),
    TypeOrmModule.forFeature([Meander]),
  ],
  providers: [MeanderawDatabaseService],
})
export class MeanderawDatabaseModule {}
