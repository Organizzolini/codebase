import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";

import { meanderDataSourceOptions } from "./database.factories";
import { DatabaseService } from "./database.service";
import { Meander } from "./entities/Meander.entity";

/**
 * Wires up the Postgres database every meander is persisted to: the server,
 * credentials, database, and schema the `POSTGRES_*` variables name, by
 * default `meanderaw_development` for both of the last two.
 *
 * A test exercising `DatabaseService` builds its own `TestingModule`
 * against a throwaway Postgres container instead of importing this module,
 * the same way `DrawCommand`'s own "real generation integration" tests
 * assemble their providers directly rather than importing `DrawModule`.
 * See `meanderDataSourceOptions` for why the schema synchronizes rather
 * than migrates.
 */
@Module({
  controllers: [],
  exports: [DatabaseService, TypeOrmModule],
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configurationService: ConfigService) =>
        meanderDataSourceOptions({
          database: configurationService.getOrThrow<string>("POSTGRES_DB"),
          host: configurationService.getOrThrow<string>("POSTGRES_HOST"),
          password:
            configurationService.getOrThrow<string>("POSTGRES_PASSWORD"),
          port: configurationService.getOrThrow<number>("POSTGRES_PORT"),
          schema: configurationService.getOrThrow<string>("POSTGRES_SCHEMA"),
          username: configurationService.getOrThrow<string>("POSTGRES_USER"),
        }),
    }),
    TypeOrmModule.forFeature([Meander]),
  ],
  providers: [DatabaseService],
})
export class DatabaseModule {}
