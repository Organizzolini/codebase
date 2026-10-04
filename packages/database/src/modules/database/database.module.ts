import { Module } from "@nestjs/common";

import { DatabaseService } from "./database.service";

/**
 * TODO: Document the database module.
 */
@Module({
  controllers: [],
  exports: [DatabaseService],
  imports: [],
  providers: [DatabaseService],
})
export class DatabaseModule {}
