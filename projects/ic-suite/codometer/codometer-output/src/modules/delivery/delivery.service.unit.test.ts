import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  buildCodeStatistics,
  buildCodometerReport,
} from "../../../testing/mocks";
import { JsonService } from "../json/json.service";
import { MarkdownService } from "../markdown/markdown.service";

import { DeliveryService } from "./delivery.service";

import type { ResolvedMarkdownDestination } from "../destinations/destinations.types";
import type { RunMode } from "@codometer/configuration";
import type { MeasurementResult } from "@codometer/measurement";
import type { MockInstance } from "vitest";

const statistics = buildCodeStatistics();
const report = buildCodometerReport();

/** Builds a measurement carrying no inputs. */
function buildMeasurement(
  overrides: Partial<MeasurementResult> = {},
): MeasurementResult {
  return {
    failures: [],
    indexes: new Map(),
    inputs: [],
    limits: [],
    statistics,
    ...overrides,
  };
}

/** Builds a run mode with every flag off unless overridden. */
function buildMode(overrides: Partial<RunMode> = {}): RunMode {
  return {
    checksLimits: false,
    checksReports: false,
    writesJson: false,
    writesMarkdown: false,
    ...overrides,
  };
}

const markdownDestination: ResolvedMarkdownDestination = {
  custom: [],
  description: undefined,
  endMarker: "<!-- codometer:end -->",
  path: "README.md",
  startMarker: "<!-- codometer:start -->",
  type: "markdown",
  write: undefined,
};

describe(DeliveryService, () => {
  let service: DeliveryService;
  let jsonService: JsonService;
  let markdownService: MarkdownService;
  let standardOutput: MockInstance<typeof process.stdout.write>;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        DeliveryService,
        { provide: JsonService, useValue: createMock<JsonService>() },
        { provide: MarkdownService, useValue: createMock<MarkdownService>() },
      ],
    }).compile();

    service = await module.resolve(DeliveryService);
    jsonService = await module.resolve(JsonService);
    markdownService = await module.resolve(MarkdownService);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    standardOutput = vi.spyOn(process.stdout, "write").mockReturnValue(true);
    vi.mocked(jsonService.render).mockReturnValue("{}\n");
    vi.mocked(jsonService.sync).mockReturnValue(true);
    vi.mocked(markdownService.renderBlock).mockReturnValue("block");
    vi.mocked(markdownService.sync).mockReturnValue(true);
  });

  afterEach(() => {
    standardOutput.mockRestore();
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("produces nothing for a run declaring no destinations", () => {
    const stalePaths = service.deliver({
      consoleMarkdown: undefined,
      destinations: { json: undefined, markdown: undefined },
      format: undefined,
      measurement: buildMeasurement(),
      mode: buildMode(),
      report,
      scope: "project",
    });

    expect(stalePaths).toStrictEqual([]);
    expect(jsonService.sync).not.toHaveBeenCalled();
    expect(markdownService.sync).not.toHaveBeenCalled();
  });

  it("writes the JSON report where a path was resolved and the run writes", () => {
    service.deliver({
      consoleMarkdown: undefined,
      destinations: {
        json: { custom: [], indentation: 2, path: "output/codometer.json" },
        markdown: undefined,
      },
      format: undefined,
      measurement: buildMeasurement(),
      mode: buildMode({ writesJson: true }),
      report,
      scope: "project",
    });

    expect(jsonService.sync).toHaveBeenCalledExactlyOnceWith({
      check: false,
      indentation: 2,
      path: "output/codometer.json",
      report,
    });
  });

  it("names a stale JSON report the run was checking", () => {
    vi.mocked(jsonService.sync).mockReturnValue(false);

    const stalePaths = service.deliver({
      consoleMarkdown: undefined,
      destinations: {
        json: { custom: [], indentation: 2, path: "output/codometer.json" },
        markdown: undefined,
      },
      format: undefined,
      measurement: buildMeasurement(),
      mode: buildMode({ checksReports: true }),
      report,
      scope: "project",
    });

    expect(stalePaths).toStrictEqual(["output/codometer.json"]);
  });

  it("does not write the JSON report when the run neither writes nor checks it", () => {
    service.deliver({
      consoleMarkdown: undefined,
      destinations: {
        json: { custom: [], indentation: 2, path: "output/codometer.json" },
        markdown: undefined,
      },
      format: undefined,
      measurement: buildMeasurement(),
      mode: buildMode(),
      report,
      scope: "project",
    });

    expect(jsonService.sync).not.toHaveBeenCalled();
  });

  it("splices the badge block into its file when the run writes", () => {
    service.deliver({
      consoleMarkdown: undefined,
      destinations: {
        json: undefined,
        markdown: markdownDestination,
      },
      format: undefined,
      measurement: buildMeasurement(),
      mode: buildMode({ writesMarkdown: true }),
      report,
      scope: "project",
    });

    expect(markdownService.sync).toHaveBeenCalledExactlyOnceWith({
      check: false,
      destination: markdownDestination,
      scope: "project",
      statistics,
      targets: [],
    });
  });

  it("names a stale markdown destination the run was checking", () => {
    vi.mocked(markdownService.sync).mockReturnValue(false);

    const stalePaths = service.deliver({
      consoleMarkdown: undefined,
      destinations: { json: undefined, markdown: markdownDestination },
      format: undefined,
      measurement: buildMeasurement(),
      mode: buildMode({ checksReports: true }),
      report,
      scope: "project",
    });

    expect(stalePaths).toStrictEqual(["README.md"]);
  });

  it("names a configured writer's destination as 'markdown output' when it has no path", () => {
    vi.mocked(markdownService.sync).mockReturnValue(false);

    const stalePaths = service.deliver({
      consoleMarkdown: undefined,
      destinations: {
        json: undefined,
        markdown: { ...markdownDestination, path: undefined },
      },
      format: undefined,
      measurement: buildMeasurement(),
      mode: buildMode({ checksReports: true }),
      report,
      scope: "project",
    });

    expect(stalePaths).toStrictEqual(["markdown output"]);
  });

  it("hands the renderer the size of every input it measured, none for an empty one", () => {
    service.deliver({
      consoleMarkdown: undefined,
      destinations: {
        json: undefined,
        markdown: { ...markdownDestination, path: "docs/metrics.md" },
      },
      format: undefined,
      measurement: buildMeasurement({
        inputs: [
          {
            files: 5,
            language: undefined,
            name: "Compiled JavaScript",
            size: { bytes: 5324, compression: "gzip", files: 5 },
          },
          {
            files: 0,
            language: undefined,
            name: "Unsized",
            size: undefined,
          },
        ],
      }),
      mode: buildMode({ writesMarkdown: true }),
      report,
      scope: "project",
    });

    expect(markdownService.sync).toHaveBeenCalledExactlyOnceWith({
      check: false,
      destination: { ...markdownDestination, path: "docs/metrics.md" },
      scope: "project",
      statistics,
      targets: [
        { bytes: 5324, compression: "gzip", name: "Compiled JavaScript" },
      ],
    });
  });

  // 🖨️ The console

  it("prints the report when --format json asked for it", () => {
    service.deliver({
      consoleMarkdown: undefined,
      destinations: { json: undefined, markdown: undefined },
      format: "json",
      measurement: buildMeasurement(),
      mode: buildMode(),
      report,
      scope: "project",
    });

    expect(jsonService.render).toHaveBeenCalledExactlyOnceWith({
      indentation: 2,
      report,
    });
    expect(standardOutput).toHaveBeenCalledWith("{}\n");
  });

  it("prints the badges when --format markdown asked for them", () => {
    service.deliver({
      consoleMarkdown: undefined,
      destinations: { json: undefined, markdown: undefined },
      format: "markdown",
      measurement: buildMeasurement(),
      mode: buildMode(),
      report,
      scope: "project",
    });

    expect(standardOutput).toHaveBeenCalledWith("block\n");
  });

  // The regression this exists for: the console used to render whatever
  // `destinations.markdown` resolved to, which is `undefined` for a run that
  // named some other output flag but not `--output-markdown`. `consoleMarkdown`
  // is resolved independently of that, so it is what the console must render.
  it("renders the console from consoleMarkdown, not from destinations.markdown", () => {
    service.deliver({
      consoleMarkdown: markdownDestination,
      destinations: { json: undefined, markdown: undefined },
      format: "markdown",
      measurement: buildMeasurement(),
      mode: buildMode({ writesJson: true }),
      report,
      scope: "project",
    });

    expect(markdownService.renderBlock).toHaveBeenCalledExactlyOnceWith({
      destination: markdownDestination,
      scope: "project",
      statistics,
      targets: [],
    });
  });

  // The one writer of standard output. A file sink printing as well is how one
  // run put two documents on the stream a pipeline was parsing.
  it("prints nothing when no format was asked for, even writing a file", () => {
    service.deliver({
      consoleMarkdown: undefined,
      destinations: {
        json: { custom: [], indentation: 2, path: "output/codometer.json" },
        markdown: undefined,
      },
      format: undefined,
      measurement: buildMeasurement(),
      mode: buildMode({ writesJson: true }),
      report,
      scope: "project",
    });

    expect(standardOutput).not.toHaveBeenCalled();
  });

  it("prints and writes in the same run when both were asked for", () => {
    service.deliver({
      consoleMarkdown: undefined,
      destinations: {
        json: { custom: [], indentation: 2, path: "output/codometer.json" },
        markdown: undefined,
      },
      format: "markdown",
      measurement: buildMeasurement(),
      mode: buildMode({ writesJson: true }),
      report,
      scope: "project",
    });

    expect(standardOutput).toHaveBeenCalledWith("block\n");
    expect(jsonService.sync).toHaveBeenCalledExactlyOnceWith({
      check: false,
      indentation: 2,
      path: "output/codometer.json",
      report,
    });
  });
});
