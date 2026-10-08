import path from "node:path";

import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { buildEmptyCallGraphResult } from "../../../testing/mocks";
import { OutputJsonService } from "../output-json/output-json.service";
import { OutputMarkdownService } from "../output-markdown/output-markdown.service";
import { MarkdownReportService } from "../report/markdown-report.service";
import { MermaidReportService } from "../report/mermaid-report.service";
import { ReportService } from "../report/report.service";
import { WorkspaceReportService } from "../report/workspace-report.service";

import { WriteDestinationsService } from "./write-destinations.service";

import type { SyncDestinationsArguments } from "./write-destinations.types";
import type {
  ProjectLimits,
  ProjectLimitsLookup,
  ResolvedCallidescopeConfiguration,
  ResolvedCallidescopeMarkdownOutputConfiguration,
  ResolvedCallidescopeWriteConfiguration,
} from "@callidescope/configuration";
import type { ProjectReport } from "@callidescope/core";

/** Builds a resolved configuration with no destinations configured. */
function buildConfiguration(
  write: Partial<ResolvedCallidescopeWriteConfiguration> = {},
): ResolvedCallidescopeConfiguration {
  return {
    directories: [],
    entryPoints: {
      addresses: [],
      decorators: [],
      includeExportedFunctions: true,
      includeOrphans: true,
      includeTests: false,
    },
    exclude: [],
    excludeCallees: [],
    excludeFrom: [],
    limits: { maximumDepth: 6 },
    write: buildWrite(write),
  };
}

/** Builds a markdown destination carrying nothing but the path it writes to. */
function buildDestination(
  destinationPath: string,
): ResolvedCallidescopeMarkdownOutputConfiguration {
  return {
    description: undefined,
    endMarker: "<!-- END -->",
    heading: "## 🔭 Callidescope",
    path: destinationPath,
    previewCount: 3,
    render: undefined,
    startMarker: "<!-- START -->",
    writeBlock: undefined,
  };
}

/** A project's own limits, taking the default depth and declaring no breadth. */
function buildProjectLimits(): ProjectLimits {
  return {
    maximumBreadth: undefined,
    maximumDepth: 6,
    path: undefined,
  };
}

/** A lookup naming every project a run reached. */
function buildProjectLimitsLookup(): ProjectLimitsLookup {
  return { byProject: new Map(), workspace: buildProjectLimits() };
}

/** Builds an empty report for one named project. */
function buildProjectReport(projectName: string): ProjectReport {
  return {
    callableBreadths: [],
    projectName,
    stacks: [],
    summary: {
      callableCount: 0,
      cyclicComponentCount: 0,
      edgeCount: 0,
      entryPointCount: 0,
      fileCount: 0,
      maximumDepth: 0,
      projectCount: 1,
      unresolvedCallCount: 0,
    },
  };
}

/** Builds a resolved write configuration, defaulting every destination away. */
function buildWrite(
  overrides: Partial<ResolvedCallidescopeWriteConfiguration> = {},
): ResolvedCallidescopeWriteConfiguration {
  return {
    json: undefined,
    markdown: undefined,
    mermaid: undefined,
    ...overrides,
  };
}

describe(WriteDestinationsService, () => {
  let outputJsonService: ReturnType<typeof createMock<OutputJsonService>>;
  let outputMarkdownService: ReturnType<
    typeof createMock<OutputMarkdownService>
  >;
  let service: WriteDestinationsService;

  /** The run's own destinations, plus whatever the one traced project declared. */
  function buildArguments(
    writeByProject: ReadonlyMap<
      string,
      ResolvedCallidescopeWriteConfiguration
    > = new Map(),
    write: Partial<ResolvedCallidescopeWriteConfiguration> = {},
  ): SyncDestinationsArguments {
    return {
      check: false,
      configuration: buildConfiguration(write),
      projectLimits: buildProjectLimitsLookup(),
      result: buildEmptyCallGraphResult({
        projects: [buildProjectReport("packages/example")],
      }),
      startingProjectRoots: new Map([["packages/example", "packages/example"]]),
      writeByProject,
    };
  }

  /** Points the markdown writer at a verdict, the way a real one returns one. */
  function stubWrites(current: boolean): void {
    outputMarkdownService.sync.mockReturnValue(current);
  }

  beforeAll(async () => {
    outputJsonService = createMock<OutputJsonService>();
    outputMarkdownService = createMock<OutputMarkdownService>();

    const module = await Test.createTestingModule({
      providers: [
        WriteDestinationsService,
        {
          provide: MarkdownReportService,
          useValue: new MarkdownReportService(
            new MermaidReportService(),
            new ReportService(),
            new WorkspaceReportService(),
          ),
        },
        { provide: OutputJsonService, useValue: outputJsonService },
        { provide: OutputMarkdownService, useValue: outputMarkdownService },
      ],
    }).compile();

    service = await module.resolve(WriteDestinationsService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  // 📝 A project's own destinations

  it("writes a project's declared destination under that project's root", () => {
    stubWrites(true);
    service.syncDestinations(
      buildArguments(
        new Map([
          [
            "packages/example",
            buildWrite({ markdown: buildDestination("docs/CALLS.md") }),
          ],
        ]),
      ),
    );

    expect(
      outputMarkdownService.sync.mock.calls.map(
        ([call]) => call.destination.path,
      ),
    ).toStrictEqual([path.join("packages/example", "docs/CALLS.md")]);
  });

  it("reports a project's own stale destination by its resolved path", () => {
    stubWrites(false);

    const stale = service.syncDestinations(
      buildArguments(
        new Map([
          [
            "packages/example",
            buildWrite({ markdown: buildDestination("docs/CALLS.md") }),
          ],
        ]),
      ),
    );

    expect(stale).toStrictEqual([
      path.join("packages/example", "docs/CALLS.md"),
    ]);
  });

  it("skips a project the run's own roots do not name", () => {
    // A project can declare a destination and still not be part of this run:
    // `--directories` scopes which roots were walked, and writing under a root
    // the run never resolved would put a report somewhere nobody asked for.
    stubWrites(true);

    const stale = service.syncDestinations({
      ...buildArguments(
        new Map([
          [
            "packages/elsewhere",
            buildWrite({ markdown: buildDestination("docs/CALLS.md") }),
          ],
        ]),
      ),
      result: buildEmptyCallGraphResult({
        projects: [buildProjectReport("packages/elsewhere")],
      }),
      startingProjectRoots: new Map(),
    });

    expect(outputMarkdownService.sync).not.toHaveBeenCalled();
    expect(stale).toStrictEqual([]);
  });

  // 📝 The run's own destinations

  it("reports the run's own stale JSON destination by its path", () => {
    stubWrites(true);
    outputJsonService.sync.mockReturnValue(false);

    const stale = service.syncDestinations(
      buildArguments(new Map(), {
        json: { indentation: 2, path: "output/calls.json" },
      }),
    );

    expect(stale).toStrictEqual(["output/calls.json"]);
  });

  it("writes the run's own markdown and mermaid destinations from one report", () => {
    stubWrites(true);
    outputJsonService.sync.mockReturnValue(true);
    service.syncDestinations(
      buildArguments(new Map(), {
        markdown: buildDestination("docs/RUN.md"),
        mermaid: buildDestination("docs/RUN-DIAGRAM.md"),
      }),
    );

    expect(
      outputMarkdownService.sync.mock.calls.map(
        ([call]) => call.destination.path,
      ),
    ).toStrictEqual(["docs/RUN.md", "docs/RUN-DIAGRAM.md"]);
  });

  it("publishes nothing for a project whose declared destinations are both absent", () => {
    // A project writing `markdown: undefined` has opted out in its own file,
    // and there is no longer a workspace fan-out to reach it anyway.
    stubWrites(true);
    service.syncDestinations(
      buildArguments(new Map([["packages/example", buildWrite()]])),
    );

    expect(outputMarkdownService.sync).not.toHaveBeenCalled();
  });
});
