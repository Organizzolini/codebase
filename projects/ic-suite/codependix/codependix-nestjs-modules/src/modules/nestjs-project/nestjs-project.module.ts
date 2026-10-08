import { Module } from "@nestjs/common";

import { LoggerModule } from "@codebase/logging";

import { NestjsProjectService } from "./nestjs-project.service";

/** Provides NestJS project discovery and container exploration. */
@Module({
  controllers: [],
  exports: [NestjsProjectService],
  imports: [LoggerModule],
  providers: [NestjsProjectService],
})
export class NestjsProjectModule {}
