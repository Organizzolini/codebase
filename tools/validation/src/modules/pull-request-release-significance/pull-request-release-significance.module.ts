import { Module } from "@nestjs/common";

import { LoggerModule } from "@codebase/logging";

import { PullRequestReleaseSignificanceGithubService } from "./pull-request-release-significance-github.service";
import { PullRequestReleaseSignificanceCommand } from "./pull-request-release-significance.command";
import { PullRequestReleaseSignificanceService } from "./pull-request-release-significance.service";

/** Provides the pull-request-release-significance check command. */
@Module({
  controllers: [],
  exports: [
    PullRequestReleaseSignificanceCommand,
    PullRequestReleaseSignificanceService,
  ],
  imports: [LoggerModule],
  providers: [
    PullRequestReleaseSignificanceCommand,
    PullRequestReleaseSignificanceGithubService,
    PullRequestReleaseSignificanceService,
  ],
})
export class PullRequestReleaseSignificanceModule {}
