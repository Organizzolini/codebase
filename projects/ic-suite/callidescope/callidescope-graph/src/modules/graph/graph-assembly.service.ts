import { Injectable } from "@nestjs/common";

import { EdgesService } from "../edges/edges.service";

import { BreadthService } from "./breadth.service";
import { ComponentsService } from "./components.service";
import { GraphDepthService } from "./graph-depth.service";
import { GraphService } from "./graph.service";

import type {
  AssembledGraph,
  AssembleGraphArguments,
} from "./graph-assembly.types";

/**
 * Builds the call graph, its cycle condensation, and its depth measurement.
 *
 * Groups the four collaborators a full call-graph assembly needs behind one
 * call, so a consumer that wants "the graph and everything derived from it"
 * does not have to know the assembly order or re-wire them itself.
 */
@Injectable()
export class GraphAssemblyService {
  // 🏗 Dependency Injection

  constructor(
    private readonly breadthService: BreadthService,
    private readonly componentsService: ComponentsService,
    private readonly depthService: GraphDepthService,
    private readonly edgesService: EdgesService,
    private readonly graphService: GraphService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Builds the call graph and everything derived from it. */
  public assemble(args: AssembleGraphArguments): AssembledGraph {
    const graph = this.graphService.assemble(
      this.edgesService.build({
        callablesById: args.callablesById,
        excludeCallees: args.excludeCallees,
        includeConstructorEdges: args.includeConstructorEdges,
        workspaceRoot: args.workspaceRoot,
      }),
    );
    const condensed = this.componentsService.condense({
      callableIds: args.callablesById.keys(),
      graph,
    });
    return {
      breadthMeasurement: this.breadthService.measure({
        callableIds: [...args.callablesById.keys()],
        graph,
      }),
      condensed,
      graph,
      measurement: this.depthService.measure({ condensed, graph }),
    };
  }
}
