import { Module } from "@nestjs/common";

import { DatabaseModule } from "@codebase/database";

import { LEXICO_DATABASE_ENTITIES } from "./data-source.constants";
import { LexicoNamingStrategy } from "./lexico-database.constants";
import { LexicoDatabaseService } from "./lexico-database.service";

/**
 * Connects lexico to `lexico_development`.`lexico` as `lexico_username`, the
 * way every database-backed project does, through the shared
 * `DatabaseModule.forRoot` and lexico's pluralizing naming strategy. Never
 * synchronizes and never runs migrations on start.
 *
 * Reads `LEXICO_POSTGRES_*` through `ConfigService`, so the importing
 * application's `ConfigModule` must be global.
 */
@Module({
  controllers: [],
  exports: [LexicoDatabaseService, DatabaseModule],
  imports: [
    DatabaseModule.forRoot({
      entities: [...LEXICO_DATABASE_ENTITIES],
      namingStrategy: new LexicoNamingStrategy(),
      project: "lexico",
    }),
  ],
  providers: [LexicoDatabaseService],
})
export class LexicoDatabaseModule {}
