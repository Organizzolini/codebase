import { Module } from "@nestjs/common";

import { GraphModule } from "../../graph/graph.module";

import { ConnectivityService } from "./connectivity.service";

/**
 * Provides and exports the one stateless `ConnectivityService` every path
 * group reads a Code's ink graph through, so the topology, tile-crossing,
 * turn, and end groups import a single shared instance rather than each
 * providing its own. It imports `GraphModule` for the component walk that
 * service counts with.
 */
@Module({
  controllers: [],
  exports: [ConnectivityService],
  imports: [GraphModule],
  providers: [ConnectivityService],
})
export class ConnectivityModule {}
