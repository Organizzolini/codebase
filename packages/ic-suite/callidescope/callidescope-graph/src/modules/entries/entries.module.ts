import { Module } from "@nestjs/common";

import { LoggerModule } from "@codebase/logging";

import { CallablesModule } from "../callables/callables.module";

import { EntriesService } from "./entries.service";

/**
 * Provides the rules deciding which callables root a call stack.
 */
@Module({
  controllers: [],
  exports: [EntriesService],
  imports: [CallablesModule, LoggerModule],
  providers: [EntriesService],
})
export class EntriesModule {}
