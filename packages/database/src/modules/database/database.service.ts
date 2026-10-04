import { Inject, Injectable, Optional } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { DATABASE_OPTIONS } from "./database.constants";
import {
  postgresConnection,
  postgresDataSourceOptions,
  postgresEnvironmentKeys,
} from "./database.utilities";

import type {
  DatabaseModuleOptions,
  PostgresConnection,
  PostgresDataSourceOptions,
} from "./database.types";
import type { TypeOrmOptionsFactory } from "@nestjs/typeorm";

/**
 * Turns the options `DatabaseModule.forRoot` was given, and the project's
 * `<PROJECT>_POSTGRES_*` variables read through `ConfigService`, into
 * TypeORM's options: the factory `TypeOrmModule.forRootAsync` is handed.
 *
 * Unprefixed `POSTGRES_*` variables are never read, so the root's admin
 * login, which Nx loads into every task, cannot reach an application.
 */
@Injectable()
export class DatabaseService implements TypeOrmOptionsFactory {
  // 🏗 Dependency Injection

  constructor(
    private readonly configurationService: ConfigService,
    @Inject(DATABASE_OPTIONS)
    @Optional()
    private readonly options?: DatabaseModuleOptions,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * The options `DatabaseModule.forRoot` provides. Optional only so the bare
   * module still boots for a dependency graph; using it without them is a
   * mistake this names.
   */
  private databaseOptions(): DatabaseModuleOptions {
    if (this.options === undefined) {
      throw new Error(
        "DatabaseService has no options: import DatabaseModule.forRoot({ project, entities }) rather than DatabaseModule.",
      );
    }

    return this.options;
  }

  // 🌎 Public Methods

  /** Where the project's database is, read from its prefixed variables and defaulted from its name. */
  connection(): PostgresConnection {
    const { project } = this.databaseOptions();

    return postgresConnection({
      environment: Object.fromEntries(
        postgresEnvironmentKeys(project).map((key) => [
          key,
          this.configurationService.get<unknown>(key),
        ]),
      ),
      project,
    });
  }

  /** TypeORM's options for the project's connection, with no migrations: the runtime never runs them. */
  createTypeOrmOptions(): PostgresDataSourceOptions {
    return postgresDataSourceOptions(this.connection(), {
      ...this.databaseOptions(),
      migrations: [],
    });
  }
}
