import { Module } from "@nestjs/common";

import { GraphService } from "./graph.service";

/**
 * Wires up the graph primitives. It imports nothing and is imported by
 * whatever has ink to count, which is the whole of the arrangement: a walk
 * that knows what it is walking over is a walk each caller has to write
 * again.
 */
@Module({
  controllers: [],
  exports: [GraphService],
  imports: [],
  providers: [GraphService],
})
export class GraphModule {}
