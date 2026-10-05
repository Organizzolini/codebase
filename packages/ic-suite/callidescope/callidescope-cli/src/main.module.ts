import { ConfigurationModule } from "@callidescope/configuration";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { DiscoveryModule } from "@nestjs/core";

import { LoggerModule } from "@codebase/logging";

import { environmentSchema } from "./constants";
import { BreadthModule } from "./modules/breadth/breadth.module";
import { CallidescopeModule } from "./modules/callidescope/callidescope.module";
import { DepthModule } from "./modules/depth/depth.module";
import { LimitsModule } from "./modules/limits/limits.module";

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
    LoggerModule,
    BreadthModule,
    CallidescopeModule,
    DepthModule,
    LimitsModule,
    ConfigurationModule,
  ],
})
export class MainModule {}
