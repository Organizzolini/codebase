import { Module } from "@nestjs/common";

import { LoggerModule } from "@codebase/logging";

import { SynchronizationService } from "../synchronization/synchronization.service";

import { PullRequestTemplateCommand } from "./pull-request-template.command";

/**
 * TODO: Document the pullRequestTemplate module.
 */
@Module({
  controllers: [],
  exports: [PullRequestTemplateCommand],
  imports: [LoggerModule],
  providers: [PullRequestTemplateCommand, SynchronizationService],
})
export class PullRequestTemplateModule {}
