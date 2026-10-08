import { Module } from "@nestjs/common";

import { DocumentationModule } from "../documentation/documentation.module";
import { EdgesModule } from "../edges/edges.module";
import { SignaturesModule } from "../signatures/signatures.module";

import { AddressDepthService } from "./address-depth.service";
import { BreadthService } from "./breadth.service";
import { ComponentsService } from "./components.service";
import { GraphAssemblyService } from "./graph-assembly.service";
import { GraphDepthService } from "./graph-depth.service";
import { GraphService } from "./graph.service";
import { PathsService } from "./paths.service";

/**
 * Provides graph assembly, cycle condensation, and depth and breadth measurement.
 */
@Module({
  controllers: [],
  exports: [
    BreadthService,
    AddressDepthService,
    ComponentsService,
    GraphDepthService,
    GraphAssemblyService,
    GraphService,
    PathsService,
  ],
  imports: [DocumentationModule, EdgesModule, SignaturesModule],
  providers: [
    BreadthService,
    AddressDepthService,
    ComponentsService,
    GraphDepthService,
    GraphAssemblyService,
    GraphService,
    PathsService,
  ],
})
export class GraphModule {}
