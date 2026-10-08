import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { LoggerModule } from "@codebase/logging";

import { PerfectiveModule } from "../src/modules/perfective/perfective.module";
import { ProgressiveModule } from "../src/modules/progressive/progressive.module";

/** The application a sweep boots: both detection passes, nothing that stores or writes. */
@Module({
  imports: [
    // Some detectors reach `ConfigService` through the calendar module; the
    // sweep reads no variables, so ignore any `.env` rather than depend on it.
    ConfigModule.forRoot({ ignoreEnvFile: true, isGlobal: true }),
    LoggerModule,
    PerfectiveModule,
    ProgressiveModule,
  ],
})
export class PipelineWindowModule {}
