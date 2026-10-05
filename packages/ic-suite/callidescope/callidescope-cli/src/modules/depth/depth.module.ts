import { ConfigurationModule } from "@callidescope/configuration";
import { GraphModule } from "@callidescope/graph";
import { AddressReportModule } from "@callidescope/output";
import { Module } from "@nestjs/common";

import { LoggerModule } from "@codebase/logging";

import { AddressLookupModule } from "../address-lookup/address-lookup.module";

import { DepthCommand } from "./depth.command";

/**
 * NestJS module that wires the `depth` command.
 */
@Module({
  controllers: [],
  exports: [DepthCommand],
  imports: [
    AddressLookupModule,
    AddressReportModule,
    GraphModule,
    ConfigurationModule,
    LoggerModule,
  ],
  providers: [DepthCommand],
})
export class DepthModule {}
