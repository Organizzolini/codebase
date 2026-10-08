import { CallablesModule } from "../src/modules/callables/callables.module";
import { ClassesModule } from "../src/modules/classes/classes.module";
import { DocumentationModule } from "../src/modules/documentation/documentation.module";
import { EdgesModule } from "../src/modules/edges/edges.module";
import { EntriesModule } from "../src/modules/entries/entries.module";
import { GraphModule } from "../src/modules/graph/graph.module";
import { ProgramModule } from "../src/modules/program/program.module";
import { SignaturesModule } from "../src/modules/signatures/signatures.module";
import { WorkspaceModule } from "../src/modules/workspace/workspace.module";

/**
 * Every analysis module, for a testing module to import.
 *
 * Imported wholesale rather than picked per service: each module exports what
 * it provides, so importing all of them makes any service's dependencies
 * resolvable without each test having to restate that service's dependency
 * list — and then drift from it.
 */
export const ANALYSIS_MODULES = [
  CallablesModule,
  DocumentationModule,
  EdgesModule,
  EntriesModule,
  GraphModule,
  ClassesModule,
  ProgramModule,
  SignaturesModule,
  WorkspaceModule,
];
