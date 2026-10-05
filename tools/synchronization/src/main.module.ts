import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { DiscoveryModule } from "@nestjs/core";

import { LoggerModule } from "@codebase/logging";

import { environmentSchema } from "./constants";
import { IssueLabelsModule } from "./modules/issue-labels/issue-labels.module";
import { SynchronizationModule } from "./modules/synchronization/synchronization.module";

/**
 * Root NestJS application module.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: ".env",
      isGlobal: true,
      validate: (config: Record<string, unknown>) =>
        environmentSchema.parse(config),
    }),
    DiscoveryModule,
    IssueLabelsModule,
    LoggerModule,
    SynchronizationModule,
  ],
})
export class MainModule {}
