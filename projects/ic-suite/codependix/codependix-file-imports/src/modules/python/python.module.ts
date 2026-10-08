import { Module } from "@nestjs/common";

import { PythonImportGraphService } from "./python-import-graph.service";
import { PythonImportParserService } from "./python-import-parser.service";
import { PythonProjectService } from "./python-project.service";
import { PythonService } from "./python.service";

/**
 * Provides the `python` module's public surface, `PythonService`.
 *
 * `PythonProjectService`, `PythonImportParserService`, and
 * `PythonImportGraphService` stay internal collaborators — not exported —
 * so a consumer of this package reaches every Python capability through one
 * facade.
 */
@Module({
  controllers: [],
  exports: [PythonService],
  imports: [],
  providers: [
    PythonImportGraphService,
    PythonImportParserService,
    PythonProjectService,
    PythonService,
  ],
})
export class PythonModule {}
