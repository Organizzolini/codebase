import { Module } from "@nestjs/common";

import { ScoringModule } from "../scoring/scoring.module";

import { TypescriptCommentsService } from "./typescript-comments.service";
import { TypescriptNodesService } from "./typescript-nodes.service";
import { TypescriptTreeService } from "./typescript-tree.service";
import { TypescriptService } from "./typescript.service";

/**
 * Provides the TypeScript language validator.
 *
 * Split into node keying, tree walking, and comment comparison so each concern
 * stays independently testable — the same decomposition the previous
 * conformance tool used.
 */
@Module({
  controllers: [],
  exports: [TypescriptService],
  imports: [ScoringModule],
  providers: [
    TypescriptCommentsService,
    TypescriptNodesService,
    TypescriptTreeService,
    TypescriptService,
  ],
})
export class TypescriptModule {}
