import { Module } from "@nestjs/common";

import { OptionsService } from "./options.service";

/** Provides the reader for this plugin's `nx.json` registration. */
@Module({
  controllers: [],
  exports: [OptionsService],
  imports: [],
  providers: [OptionsService],
})
export class OptionsModule {}
