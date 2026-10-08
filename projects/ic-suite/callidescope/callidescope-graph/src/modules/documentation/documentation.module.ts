import { Module } from "@nestjs/common";

import { DocumentationService } from "./documentation.service";

/**
 * Provides the prose a report prints beneath a frame.
 */
@Module({
  controllers: [],
  exports: [DocumentationService],
  imports: [],
  providers: [DocumentationService],
})
export class DocumentationModule {}
