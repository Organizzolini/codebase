import { Module } from "@nestjs/common";

import { ScoringModule } from "../scoring/scoring.module";

import { MarkdownNodesService } from "./markdown-nodes.service";
import { MarkdownTreeService } from "./markdown-tree.service";
import { MarkdownService } from "./markdown.service";

/**
 * Provides the markdown language validator.
 *
 * Imported by the Languages module, and by the Jupyter module, which reuses
 * it for a notebook's markdown cells.
 */
@Module({
  controllers: [],
  exports: [MarkdownService],
  imports: [ScoringModule],
  providers: [MarkdownNodesService, MarkdownService, MarkdownTreeService],
})
export class MarkdownModule {}
