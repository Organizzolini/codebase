import { Module } from "@nestjs/common";

import { LoggerModule } from "@codebase/logging";

import { LockfileCommand } from "./lockfile.command";
import { LockfileService } from "./lockfile.service";

/** Provides the lockfile check command. */
@Module({
  controllers: [],
  exports: [LockfileCommand, LockfileService],
  imports: [LoggerModule],
  providers: [LockfileCommand, LockfileService],
})
export class LockfileModule {}
