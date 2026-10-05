import { Module } from "@nestjs/common";

import { LoggerModule } from "@codebase/logging";

import { IssueLabelsGithubService } from "./issue-labels-github.service";
import { IssueLabelsCommand } from "./issue-labels.command";
import { IssueLabelsService } from "./issue-labels.service";

/** Provides the issue-labels reconciliation command. */
@Module({
  controllers: [],
  exports: [IssueLabelsCommand, IssueLabelsService],
  imports: [LoggerModule],
  providers: [IssueLabelsCommand, IssueLabelsGithubService, IssueLabelsService],
})
export class IssueLabelsModule {}
