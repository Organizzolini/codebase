import { Module } from "@nestjs/common";

import { RenderingService } from "./rendering.service";

/**
 * Owns template placeholder rendering for the whole workspace.
 *
 * Imported by `GenerationModule` to write files, and by
 * `conformetry-configuration` to render the same templates for comparison
 * during validation. Nothing else may reimplement substitution.
 */
@Module({
  controllers: [],
  exports: [RenderingService],
  imports: [],
  providers: [RenderingService],
})
export class RenderingModule {}
