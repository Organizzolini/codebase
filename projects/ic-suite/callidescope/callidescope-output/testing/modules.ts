import { GraphModule, SignaturesModule } from "@callidescope/graph";

import { OutputJsonModule } from "../src/modules/output-json/output-json.module";
import { OutputMarkdownModule } from "../src/modules/output-markdown/output-markdown.module";
import { ProjectReportsModule } from "../src/modules/project-reports/project-reports.module";
import { ReportModule } from "../src/modules/report/report.module";

/**
 * Every output module, for a testing module to import.
 *
 * Imported wholesale rather than picked per service: each module exports what
 * it provides, so importing all of them makes any service's dependencies
 * resolvable without each test having to restate that service's dependency
 * list — and then drift from it. `GraphModule` and `SignaturesModule` come
 * from `@callidescope/graph` rather than this package's own modules, because
 * `ProjectReportsService` reaches across that package boundary.
 */
export const ANALYSIS_MODULES = [
  GraphModule,
  OutputJsonModule,
  OutputMarkdownModule,
  ProjectReportsModule,
  ReportModule,
  SignaturesModule,
];
