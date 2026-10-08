import { ConfigurationModule } from "@callidescope/configuration";
import { GraphModule } from "@callidescope/graph";
import { AddressReportModule } from "@callidescope/output";
import { Module } from "@nestjs/common";

import { LoggerModule } from "@codebase/logging";

import { AddressLookupModule } from "../address-lookup/address-lookup.module";

import { BreadthCommand } from "./breadth.command";

/**
 * NestJS module that wires the `breadth` command.
 */
@Module({
  controllers: [],
  exports: [BreadthCommand],
  imports: [
    AddressLookupModule,
    AddressReportModule,
    GraphModule,
    ConfigurationModule,
    LoggerModule,
  ],
  providers: [BreadthCommand],
})
export class BreadthModule {}
