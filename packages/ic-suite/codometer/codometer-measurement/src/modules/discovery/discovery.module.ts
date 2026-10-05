import { Module } from "@nestjs/common";

import { LoggerModule } from "@codebase/logging";

import { DiscoveryService } from "./discovery.service";
import { IgnoreRulesService } from "./ignore-rules.service";

/**
 * NestJS module that discovers and categorizes the files of a codebase.
 */
@Module({
  controllers: [],
  exports: [DiscoveryService],
  imports: [LoggerModule],
  providers: [DiscoveryService, IgnoreRulesService],
})
export class DiscoveryModule {}
