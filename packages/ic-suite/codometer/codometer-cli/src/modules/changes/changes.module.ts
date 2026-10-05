import { ConfigurationModule } from "@codometer/configuration";
import {
  ChangesModule as CodometerChangesModule,
  DocumentsModule,
  RenderModule,
} from "@codometer/output";
import { Module } from "@nestjs/common";

import { LoggerModule } from "@codebase/logging";

import { ChangesCommand } from "./changes.command";

/** Wires the `changes` command that reports codometer's diff against main. */
@Module({
  controllers: [],
  exports: [ChangesCommand],
  imports: [
    CodometerChangesModule,
    ConfigurationModule,
    DocumentsModule,
    LoggerModule,
    RenderModule,
  ],
  providers: [ChangesCommand],
})
export class ChangesModule {}
