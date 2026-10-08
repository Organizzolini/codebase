import { Module } from "@nestjs/common";

import { TypescriptImportGraphService } from "./typescript-import-graph.service";
import { TypescriptProjectService } from "./typescript-project.service";
import { TypescriptService } from "./typescript.service";

/**
 * Provides the `typescript` module's public surface, `TypescriptService`.
 *
 * `TypescriptProjectService` and `TypescriptImportGraphService` stay
 * internal collaborators — not exported — so a consumer of this package
 * reaches every TypeScript capability through one facade.
 */
@Module({
  controllers: [],
  exports: [TypescriptService],
  imports: [],
  providers: [
    TypescriptImportGraphService,
    TypescriptProjectService,
    TypescriptService,
  ],
})
export class TypescriptModule {}
