// 📤 Exports
export {
  DEFAULT_POSTGRES_HOST,
  DEFAULT_POSTGRES_PORT,
  POSTGRES_ENVIRONMENT_SUFFIXES,
} from "./modules/database/database.constants";
export { DatabaseModule } from "./modules/database/database.module";
export { DatabaseService } from "./modules/database/database.service";
export type {
  DatabaseOptions,
  PostgresConnection,
  PostgresConnectionField,
  PostgresConnectionSource,
  PostgresDataSourceOptions,
  PostgresDataSourceSettings,
  PostgresEnvironmentKey,
  PostgresEnvironmentShape,
  PostgresEnvironmentSuffix,
  PostgresProject,
} from "./modules/database/database.types";
export {
  createDataSource,
  postgresDataSourceOptions,
} from "./modules/database/database.utilities";
export {
  postgresConnection,
  postgresEnvironmentKeys,
  postgresEnvironmentSchema,
} from "./modules/database/database.utilities";
