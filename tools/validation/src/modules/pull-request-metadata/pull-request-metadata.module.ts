import { Module } from "@nestjs/common";

import { LoggerModule } from "@codebase/logging";

import { PullRequestMetadataGithubService } from "./pull-request-metadata-github.service";
import { PullRequestMetadataCommand } from "./pull-request-metadata.command";
import { PullRequestMetadataService } from "./pull-request-metadata.service";

/** Provides the pull-request-metadata check command. */
@Module({
  controllers: [],
  exports: [PullRequestMetadataCommand, PullRequestMetadataService],
  imports: [LoggerModule],
  providers: [
    PullRequestMetadataCommand,
    PullRequestMetadataGithubService,
    PullRequestMetadataService,
  ],
})
export class PullRequestMetadataModule {}
