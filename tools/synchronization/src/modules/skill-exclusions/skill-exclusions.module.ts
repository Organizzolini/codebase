import { Module } from "@nestjs/common";

import { LoggerModule } from "@codebase/logging";

import { SynchronizationService } from "../synchronization/synchronization.service";

import { SkillExclusionsCommand } from "./skill-exclusions.command";

/**
 * Provides the skill-exclusions synchronization command.
 *
 * `SynchronizationService` is provided here directly rather than imported
 * from a shared module, since no module exports it for reuse across sibling
 * commands.
 */
@Module({
  controllers: [],
  exports: [SkillExclusionsCommand],
  imports: [LoggerModule],
  providers: [SkillExclusionsCommand, SynchronizationService],
})
export class SkillExclusionsModule {}
