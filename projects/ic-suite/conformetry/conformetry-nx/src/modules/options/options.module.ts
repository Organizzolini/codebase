import { Module } from "@nestjs/common";

import { OptionsService } from "./options.service";

/**
 * Provides resolution of the options Nx passes this plugin.
 *
 * Kept apart from the modules that consume them so that adding an option
 * touches one service rather than every call site that reads `nx.json`.
 */
@Module({
  controllers: [],
  exports: [OptionsService],
  imports: [],
  providers: [OptionsService],
})
export class OptionsModule {}
