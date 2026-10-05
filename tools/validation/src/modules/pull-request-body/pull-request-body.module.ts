import { Module } from "@nestjs/common";

import { LoggerModule } from "@codebase/logging";

import { PullRequestBodyCommand } from "./pull-request-body.command";
import { PullRequestBodyService } from "./pull-request-body.service";

/** Provides the pull-request-body check command. */
@Module({
  controllers: [],
  exports: [PullRequestBodyCommand, PullRequestBodyService],
  imports: [LoggerModule],
  providers: [PullRequestBodyCommand, PullRequestBodyService],
})
export class PullRequestBodyModule {}
