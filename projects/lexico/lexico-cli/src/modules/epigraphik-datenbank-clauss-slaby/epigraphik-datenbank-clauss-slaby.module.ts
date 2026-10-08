import { Module } from "@nestjs/common";

import { EpigraphikDatenbankClaussSlabyCommand } from "./epigraphik-datenbank-clauss-slaby.command";

/**
 * TODO: Document the epigraphikDatenbankClaussSlaby module.
 */
@Module({
  controllers: [],
  exports: [EpigraphikDatenbankClaussSlabyCommand],
  imports: [],
  providers: [EpigraphikDatenbankClaussSlabyCommand],
})
export class EpigraphikDatenbankClaussSlabyModule {}
