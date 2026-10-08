import { Module } from "@nestjs/common";

import { DatabaseModule } from "../../src/modules/database/database.module";

import { Widget } from "./widget.entity";

/**
 * A project's own database module, of the kind every feature module imports:
 * it connects through `DatabaseModule.forRoot` and re-exports it.
 */
@Module({
  exports: [DatabaseModule],
  imports: [DatabaseModule.forRoot({ entities: [Widget], project: "fixture" })],
})
export class FixtureDatabaseModule {}
