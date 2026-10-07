import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { DATABASE_OPTIONS } from "./database.constants";
import { DatabaseService } from "./database.service";

import type { DatabaseModuleOptions } from "./database.types";
import type { DynamicModule } from "@nestjs/common";

/**
 * Connects a project to its own Postgres database through TypeORM, the one
 * way every database-backed project does:
 *
 * ```ts
 * DatabaseModule.forRoot({
 *   entities: [Meander],
 *   project: "meanderaw",
 * })
 * ```
 *
 * Reads the project's `<PROJECT>_POSTGRES_*` variables through
 * `ConfigService`, so the application's `ConfigModule` must be global. Never
 * synchronizes and never runs migrations, so it takes none: they run on
 * their own, through the command-line data source. Each feature module
 * still registers its repositories with `TypeOrmModule.forFeature`.
 */
@Module({
  controllers: [],
  exports: [DatabaseService],
  imports: [],
  providers: [DatabaseService],
})
export class DatabaseModule {
  /** Connects the importing application as `options.project`. */
  static forRoot(options: DatabaseModuleOptions): DynamicModule {
    const optionsProvider = { provide: DATABASE_OPTIONS, useValue: options };

    return {
      exports: [TypeOrmModule],
      imports: [
        TypeOrmModule.forRootAsync({
          extraProviders: [optionsProvider],
          useClass: DatabaseService,
        }),
      ],
      module: DatabaseModule,
      providers: [optionsProvider],
    };
  }
}
