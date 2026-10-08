import { ConfigurationModule } from "@callidescope/configuration";
import {
  CallablesModule,
  ClassesModule,
  DocumentationModule,
  EdgesModule,
  EntriesModule,
  GraphModule,
  ProgramModule,
  SignaturesModule,
  WorkspaceModule,
} from "@callidescope/graph";
import {
  OutputJsonModule,
  OutputMarkdownModule,
  ProjectReportsModule,
  ReportModule,
} from "@callidescope/output";

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
  ConfigurationModule,
  DocumentationModule,
  EdgesModule,
  EntriesModule,
  GraphModule,
  ClassesModule,
  OutputJsonModule,
  OutputMarkdownModule,
  ProgramModule,
  ProjectReportsModule,
  ReportModule,
  SignaturesModule,
  WorkspaceModule,
];
