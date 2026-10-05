import { Module } from "@nestjs/common";

import { LoggerModule } from "@codebase/logging";

import { SynchronizationService } from "../synchronization/synchronization.service";

import { PullRequestLabelsGithubService } from "./pull-request-labels-github.service";
import { PullRequestLabelsCommand } from "./pull-request-labels.command";
import { PullRequestLabelsService } from "./pull-request-labels.service";

/**
 * Provides the pull-request-labels synchronization command.
 *
 * `SynchronizationService` is provided here directly rather than imported
 * from a shared module, since no module exports it for reuse across sibling
 * commands.
 */
@Module({
  controllers: [],
  exports: [PullRequestLabelsCommand, PullRequestLabelsService],
  imports: [LoggerModule],
  providers: [
    PullRequestLabelsCommand,
    PullRequestLabelsGithubService,
    PullRequestLabelsService,
    SynchronizationService,
  ],
})
export class PullRequestLabelsModule {}
