import { ConfigurationModule } from "@codependix/configuration";
import { TypescriptModule } from "@codependix/file-imports";
import {
  ModuleGraphModule,
  NestjsProjectModule,
} from "@codependix/nestjs-modules";
import { NeighborhoodModule } from "@codependix/nx-projects";
import { Module } from "@nestjs/common";

import { DeliveryModule } from "../delivery/delivery.module";

import { ProjectGraphsService } from "./project-graphs.service";

/** Provides every per-project graph pass: Nx, file-imports, and NestJS modules. */
@Module({
  controllers: [],
  exports: [ProjectGraphsService],
  imports: [
    ConfigurationModule,
    DeliveryModule,
    ModuleGraphModule,
    NeighborhoodModule,
    NestjsProjectModule,
    TypescriptModule,
  ],
  providers: [ProjectGraphsService],
})
export class ProjectGraphsModule {}
