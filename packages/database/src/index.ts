// 📤 Exports
export {
  DEFAULT_POSTGRES_HOST,
  DEFAULT_POSTGRES_PORT,
  POSTGRES_ENVIRONMENT_SUFFIXES,
} from "./modules/database/database.constants";
export { DatabaseModule } from "./modules/database/database.module";
export { DatabaseService } from "./modules/database/database.service";
export type {
  DatabaseModuleOptions,
  DatabaseOptions,
  PostgresConnection,
  PostgresConnectionField,
  PostgresConnectionSource,
  PostgresDataSourceOptions,
  PostgresDataSourceSettings,
  PostgresEnvironmentKey,
  PostgresEnvironmentShape,
  PostgresEnvironmentSource,
  PostgresEnvironmentSuffix,
  PostgresProject,
} from "./modules/database/database.types";
export {
  createDataSource,
  postgresConnection,
  postgresDataSourceOptions,
  postgresEnvironment,
  postgresEnvironmentKey,
  postgresEnvironmentKeys,
  postgresEnvironmentSchema,
} from "./modules/database/database.utilities";
export { CreatableEntity } from "./modules/database/entities/creatable.entity";
export { DeletableEntity } from "./modules/database/entities/deletable.entity";
export { IdentifiableEntity } from "./modules/database/entities/identifiable.entity";
export { UpdatableEntity } from "./modules/database/entities/updatable.entity";
