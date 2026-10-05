import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { DatabaseModule } from "@codebase/database";

import {
  DATABASE_ENTITIES,
  DATABASE_PROJECT,
} from "./caelundas-database.constants";
import { CaelundasDatabaseService } from "./caelundas-database.service";
import { CalendarEvent } from "./entities/calendar-event.entity";

/**
 * Connects caelundas to the Postgres database its `CAELUNDAS_POSTGRES_*`
 * variables name, by default `caelundas_development`, in the `caelundas`
 * schema.
 *
 * The shared `DatabaseModule.forRoot` reads those variables through the
 * application's global `ConfigModule`. It never synchronizes the schema or
 * runs migrations on start: `nx run caelundas-cli:migration:run` does that.
 */
@Module({
  controllers: [],
  exports: [CaelundasDatabaseService, TypeOrmModule],
  imports: [
    DatabaseModule.forRoot({
      entities: DATABASE_ENTITIES,
      project: DATABASE_PROJECT,
    }),
    TypeOrmModule.forFeature([CalendarEvent]),
  ],
  providers: [CaelundasDatabaseService],
})
export class CaelundasDatabaseModule {}
