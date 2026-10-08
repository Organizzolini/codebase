import { LanguagesService } from "@codometer/languages";
import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { throwUnknown } from "../../../testing/mocks";
import { CustomizationService } from "../customization/customization.service";
import { DiscoveryService } from "../discovery/discovery.service";
import { InputsService } from "../inputs/inputs.service";
import { LimitsService } from "../limits/limits.service";
import { MetricIndexService } from "../limits/metric-index.service";
import { SizeService } from "../size/size.service";

import { MeasureService } from "./measure.service";

import type { DiscoveryResult } from "../discovery/discovery.types";
import type {
  ResolvedCodometerConfiguration,
  ResolvedCodometerInput,
} from "@codometer/configuration";
import type { LanguageResults } from "@codometer/languages";

const codebaseInput: ResolvedCodometerInput = {
  analyses: ["language"],
  compression: "none",
  directory: ".",
  exclude: [],
  include: ["**/*"],
  name: "codebase",
};

const customStatistic = {
  color: "7c3aed",
  comment: undefined,
  group: "conventions" as const,
  label: "Service Files",
  patterns: ["**/*.service.ts"],
};

const configuration: ResolvedCodometerConfiguration = {
  custom: [customStatistic],
  defaultInput: undefined,
  exclude: ["**/node_modules/**"],
  excludeFrom: [],
  format: "json",
  inputs: [codebaseInput],
  limits: [],
  outputs: [
    {
      custom: [customStatistic],
      indentation: 2,
      path: "codometer-report.json",
      type: "json",
    },
  ],
  python: { command: "uv run python" },
};

const compiledInput: ResolvedCodometerInput = {
  analyses: ["size"],
  compression: "gzip",
  directory: ".",
  exclude: ["dist/**/*.map.js"],
  include: ["dist/**/*.js"],
  name: "compiled",
};

const discoveredFiles: DiscoveryResult = {
  cssFiles: ["src/styles.css"],
  files: ["src/app.ts", "scripts/check.py"],
  hclFiles: ["infrastructure/main.tf"],
  jsFiles: ["src/app.js"],
  jsonFiles: [],
  markdownFiles: ["docs/guide.md"],
  notebookFiles: ["notebooks/explore.ipynb"],
  pyFiles: ["scripts/check.py"],
  shellFiles: ["scripts/setup.sh"],
  sourceFiles: ["src/app.ts", "scripts/check.py"],
  sqlFiles: ["data/schema.sql"],
  testFiles: [],
  tomlFiles: ["pyproject.toml"],
  tsFiles: ["src/app.ts"],
  yamlFiles: [".github/workflows/ci.yml"],
};

/** Builds a language report carrying the counters these assertions read. */
function buildLanguageResults(): LanguageResults {
  return createMock<LanguageResults>({
    commentCounts: {},
    jupyter: createMock<LanguageResults["jupyter"]>({
      cells: 7,
      codeCells: 6,
      codeLines: 40,
    }),
    python: createMock<LanguageResults["python"]>({ files: 1, lines: 11 }),
    typescript: createMock<LanguageResults["typescript"]>({
      classes: 10,
      declarationCommentCounts: {},
      externalPackages: new Set(["react"]),
      jsFiles: 1,
      lines: 19,
      symbolCounts: {},
      tsFiles: 1,
    }),
  });
}

describe(MeasureService, () => {
  let service: MeasureService;
  let customizationService: CustomizationService;
  let discoveryService: DiscoveryService;
  let inputsService: InputsService;
  let languagesService: LanguagesService;
  let limitsService: LimitsService;
  let metricIndexService: MetricIndexService;
  let sizeService: SizeService;

  /** Builds an aggregator whose collaborators are all mocked. */
  function buildService(): MeasureService {
    return new MeasureService(
      discoveryService,
      languagesService,
      customizationService,
      inputsService,
      sizeService,
      limitsService,
      metricIndexService,
    );
  }

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        MeasureService,
        {
          provide: CustomizationService,
          useValue: createMock<CustomizationService>(),
        },
        {
          provide: DiscoveryService,
          useValue: createMock<DiscoveryService>(),
        },
        { provide: LanguagesService, useValue: createMock<LanguagesService>() },
        { provide: LimitsService, useValue: createMock<LimitsService>() },
        { provide: MetricIndexService, useValue: new MetricIndexService() },
        {
          provide: SizeService,
          useValue: createMock<SizeService>(),
        },
        { provide: InputsService, useValue: createMock<InputsService>() },
      ],
    }).compile();

    service = await module.resolve(MeasureService);
  });

  beforeEach(() => {
    customizationService = createMock<CustomizationService>();
    discoveryService = createMock<DiscoveryService>();
    languagesService = createMock<LanguagesService>();
    limitsService = createMock<LimitsService>();
    metricIndexService = new MetricIndexService();
    sizeService = createMock<SizeService>();
    vi.mocked(limitsService.evaluate).mockReturnValue({
      failures: [],
      limits: [],
    });
    inputsService = createMock<InputsService>();
    vi.mocked(inputsService.matchFiles).mockReturnValue([
      "dist/index.js",
      "dist/nested/deep.js",
    ]);
    vi.mocked(sizeService.analyze).mockReturnValue({
      bytes: 4529,
      compression: "gzip",
      files: 2,
    });
    vi.mocked(discoveryService.categorize).mockReturnValue(discoveredFiles);
    vi.mocked(discoveryService.discoverFiles).mockReturnValue({
      ...discoveredFiles,
    });
    vi.mocked(languagesService.analyze).mockReturnValue(buildLanguageResults());
    vi.mocked(customizationService.buildSymbolCounters).mockReturnValue([]);
    vi.mocked(customizationService.buildCommentCounters).mockReturnValue([]);
    vi.mocked(customizationService.analyze).mockReturnValue([
      {
        color: "7c3aed",
        count: 3,
        group: "conventions",
        label: "Service Files",
      },
    ]);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("discovers the codebase input by its ignore files, not its globs", () => {
    buildService().measure({
      configuration,
      outputPaths: [],
      workingDirectory: "/repo",
    });

    expect(discoveryService.discoverFiles).toHaveBeenCalledExactlyOnceWith({
      exclude: ["**/node_modules/**"],
      excludeFrom: [],
      workingDirectory: "/repo",
    });
  });

  it("hands the discovered files to every language analyzer at once", () => {
    buildService().measure({
      configuration,
      outputPaths: [],
      workingDirectory: "/repo",
    });

    expect(languagesService.analyze).toHaveBeenCalledExactlyOnceWith({
      commentCounters: [],
      configuration,
      discoveredFiles,
      symbolCounters: [],
      workingDirectory: "/repo",
    });
  });

  it("measures every top-level custom statistic over the tracked files", () => {
    const result = buildService().measure({
      configuration,
      outputPaths: [],
      workingDirectory: "/repo",
    });

    expect(customizationService.analyze).toHaveBeenCalledExactlyOnceWith({
      commentCounts: {},
      files: discoveredFiles.files,
      statistics: configuration.custom,
      symbolCounts: {},
    });
    expect(result.statistics.custom).toStrictEqual([
      {
        color: "7c3aed",
        count: 3,
        group: "conventions",
        label: "Service Files",
      },
    ]);
  });

  it("projects the TypeScript analyzer onto both language groups", () => {
    const result = buildService().measure({
      configuration,
      outputPaths: [],
      workingDirectory: "/repo",
    });

    expect(result.statistics.typescript.files).toBe(1);
    expect(result.statistics.javascript.files).toBe(1);
    expect(result.statistics.javascript.classes).toBe(10);
    // The analyzer reports a set; the report carries how many are in it.
    expect(result.statistics.javascript.externalPackages).toBe(1);
  });

  it("counts notebook code toward the repository total exactly once", () => {
    const result = buildService().measure({
      configuration,
      outputPaths: [],
      workingDirectory: "/repo",
    });

    // 19 TypeScript lines, 11 Python lines, 40 lines inside notebook cells.
    expect(result.statistics.linesOfCode).toBe(70);
    expect(result.statistics.sourceFiles).toBe(3);
  });

  it("reports the codebase as an input of its own", () => {
    const result = buildService().measure({
      configuration,
      outputPaths: [],
      workingDirectory: "/repo",
    });

    expect(result.inputs).toStrictEqual([
      {
        files: 2,
        language: result.statistics,
        name: "codebase",
        // Nobody asked what the codebase compresses to, so nothing answered —
        // its byte-precise total lives on `language.repositoryBytes` instead,
        // from the same size analysis measured with no compression.
        size: undefined,
      },
    ]);
  });

  it("measures the codebase's own bytes with no compression", () => {
    const result = buildService().measure({
      configuration,
      outputPaths: [],
      workingDirectory: "/repo",
    });

    // No other input here, so the codebase's own language analysis is the
    // only thing that could have called it — pinned exactly, not just "at
    // least once with these args".
    expect(sizeService.analyze).toHaveBeenCalledExactlyOnceWith({
      compression: "none",
      files: discoveredFiles.files,
      workingDirectory: "/repo",
    });
    expect(result.statistics.repositoryBytes).toBe(4529);
  });

  // `--inputs` replaces the built-in `codebase` input outright (see
  // `MeasureCommand.applyInputsOverride`), so a headline derived by looking
  // up an input literally named "codebase" always fell back to zero under
  // that flag. The headline has to come from whichever input actually ran
  // language analysis, whatever it is named.
  it("derives the headline statistics from whichever input ran language analysis, not one named codebase", () => {
    const result = buildService().measure({
      configuration: {
        ...configuration,
        inputs: [{ ...codebaseInput, name: "Command Line" }],
      },
      outputPaths: [],
      workingDirectory: "/repo",
    });

    expect(result.inputs).toStrictEqual([
      {
        files: 2,
        language: result.statistics,
        name: "Command Line",
        size: undefined,
      },
    ]);
    expect(result.statistics.linesOfCode).toBe(70);
  });

  it("measures the size of a declared input and leaves its language alone", () => {
    const result = buildService().measure({
      configuration: {
        ...configuration,
        inputs: [codebaseInput, compiledInput],
      },
      outputPaths: [],
      workingDirectory: "/repo",
    });

    expect(inputsService.matchFiles).toHaveBeenCalledExactlyOnceWith({
      input: compiledInput,
      workingDirectory: "/repo",
    });
    // Exactly two calls: the codebase's own uncompressed total first, then
    // this declared input's compressed `size` metric — not "at least one
    // matching call", which would pass even if size analysis ran twice.
    expect(sizeService.analyze).toHaveBeenCalledTimes(2);
    expect(sizeService.analyze).toHaveBeenNthCalledWith(2, {
      compression: "gzip",
      files: ["dist/index.js", "dist/nested/deep.js"],
      workingDirectory: "/repo",
    });
    expect(result.inputs[1]).toStrictEqual({
      files: 2,
      language: undefined,
      name: "compiled",
      size: { bytes: 4529, compression: "gzip", files: 2 },
    });
  });

  it("runs language analysis over an input that asks for it", () => {
    const result = buildService().measure({
      configuration: {
        ...configuration,
        inputs: [codebaseInput, { ...compiledInput, analyses: ["language"] }],
      },
      outputPaths: [],
      workingDirectory: "/repo",
    });

    // The same analyzers the codebase gets, over the files the globs claimed.
    expect(discoveryService.categorize).toHaveBeenCalledWith([
      "dist/index.js",
      "dist/nested/deep.js",
    ]);
    // Language analysis measures its own byte-precise total the same way the
    // codebase does — with no compression — rather than a declared input's
    // own compressed `size` metric, which nothing here asked for. Exactly two
    // calls: the codebase's own, then this input's — never a third, which is
    // what a declared `size` analysis running alongside "language" here would
    // look like.
    expect(sizeService.analyze).toHaveBeenCalledTimes(2);
    expect(sizeService.analyze).toHaveBeenNthCalledWith(1, {
      compression: "none",
      files: discoveredFiles.files,
      workingDirectory: "/repo",
    });
    expect(sizeService.analyze).toHaveBeenNthCalledWith(2, {
      compression: "none",
      files: discoveredFiles.files,
      workingDirectory: "/repo",
    });
    expect(result.inputs[1]?.language?.linesOfCode).toBe(70);
    expect(result.inputs[1]?.language?.repositoryBytes).toBe(4529);
  });

  // One unreadable file used to take the whole run with it, including the
  // codebase's own statistics, which the failing input had nothing to do with.
  it("steps over an input it cannot measure and keeps the rest", () => {
    vi.mocked(inputsService.matchFiles).mockImplementation(({ input }) => {
      if (input.name === "broken") {
        throw new Error("dist/ vanished mid-walk");
      }

      return ["dist/index.js", "dist/nested/deep.js"];
    });

    const result = buildService().measure({
      configuration: {
        ...configuration,
        inputs: [
          codebaseInput,
          { ...compiledInput, name: "broken" },
          compiledInput,
        ],
      },
      outputPaths: [],
      workingDirectory: "/repo",
    });

    expect(result.failures).toStrictEqual([
      {
        kind: "input",
        reason: "dist/ vanished mid-walk",
        subject: "broken",
      },
    ]);
    expect(result.statistics.linesOfCode).toBe(70);
    expect(result.inputs.map((input) => input.name)).toStrictEqual([
      "codebase",
      "compiled",
    ]);
  });

  // Ruling H: the `codebase` input is measured under the same try/catch as
  // every other input now, so a discovery failure is recorded and stepped
  // over rather than propagating and losing every other input's report.
  it("records the codebase's own discovery failure and still measures the rest", () => {
    vi.mocked(discoveryService.discoverFiles).mockImplementation(() => {
      throw new Error("directory vanished mid-walk");
    });

    const result = buildService().measure({
      configuration: {
        ...configuration,
        inputs: [codebaseInput, compiledInput],
      },
      outputPaths: [],
      workingDirectory: "/repo",
    });

    expect(result.failures).toStrictEqual([
      {
        kind: "input",
        reason: "directory vanished mid-walk",
        subject: "codebase",
      },
    ]);
    expect(result.inputs.map((input) => input.name)).toStrictEqual([
      "compiled",
    ]);
    // No input ran language analysis, so the headline falls back rather than
    // throwing or reading a partially-built result.
    expect(result.statistics.linesOfCode).toBe(0);
  });

  it("collects a failure from every input that could not be measured", () => {
    vi.mocked(inputsService.matchFiles).mockImplementation(({ input }) => {
      throw new Error(`${input.name} is gone`);
    });

    const result = buildService().measure({
      configuration: {
        ...configuration,
        inputs: [
          codebaseInput,
          { ...compiledInput, name: "first" },
          { ...compiledInput, name: "second" },
        ],
      },
      outputPaths: [],
      workingDirectory: "/repo",
    });

    expect(
      result.failures
        .filter((failure) => failure.kind === "input")
        .map((failure) => failure.subject),
    ).toStrictEqual(["first", "second"]);
  });

  it("reports a non-Error thrown value as a plain string", () => {
    vi.mocked(inputsService.matchFiles).mockImplementation(() => {
      throwUnknown("not an Error");
    });

    const result = buildService().measure({
      configuration: {
        ...configuration,
        inputs: [codebaseInput, { ...compiledInput, name: "broken" }],
      },
      outputPaths: [],
      workingDirectory: "/repo",
    });

    expect(
      result.failures.filter((failure) => failure.kind === "input"),
    ).toStrictEqual([
      { kind: "input", reason: "not an Error", subject: "broken" },
    ]);
  });

  it("reports the limits layer's failures in the report's vocabulary", () => {
    vi.mocked(limitsService.evaluate).mockReturnValue({
      failures: [{ metric: "codebase.nowhere", reason: "nothing answers" }],
      limits: [],
    });

    const result = buildService().measure({
      configuration,
      outputPaths: [],
      workingDirectory: "/repo",
    });

    expect(
      result.failures.filter((failure) => failure.kind === "limit"),
    ).toStrictEqual([
      { kind: "limit", reason: "nothing answers", subject: "codebase.nowhere" },
    ]);
  });

  it("reports two inputs sharing one name without dropping the run", () => {
    const result = buildService().measure({
      configuration: {
        ...configuration,
        inputs: [codebaseInput, compiledInput, compiledInput],
      },
      outputPaths: [],
      workingDirectory: "/repo",
    });

    expect(
      result.failures.filter((failure) => failure.kind === "input"),
    ).toStrictEqual([
      {
        kind: "input",
        reason: expect.stringContaining(
          'Two measured targets are called "compiled"',
        ) as string,
        subject: "compiled",
      },
    ]);
    expect([...result.indexes.keys()]).toStrictEqual(["codebase", "compiled"]);
  });

  // Codometer's reports are made of what it measured, so measuring them makes
  // every report an input to the next one.
  it("never measures the files it writes itself", () => {
    vi.mocked(discoveryService.discoverFiles).mockReturnValue({
      ...discoveredFiles,
      files: ["README.md", "src/app.ts"],
    });

    buildService().measure({
      configuration,
      outputPaths: ["README.md"],
      workingDirectory: "/repo",
    });

    expect(discoveryService.categorize).toHaveBeenCalledExactlyOnceWith([
      "src/app.ts",
    ]);
  });

  it("keeps a written file out of a declared input's matches too", () => {
    vi.mocked(inputsService.matchFiles).mockReturnValue([
      "dist/index.js",
      "dist/report.json",
    ]);

    const result = buildService().measure({
      configuration: {
        ...configuration,
        inputs: [codebaseInput, compiledInput],
      },
      outputPaths: ["dist/report.json"],
      workingDirectory: "/repo",
    });

    // Exactly two calls: the codebase's own uncompressed total first, then
    // this declared input's compressed `size` metric over the one file left
    // once the written report is excluded.
    expect(sizeService.analyze).toHaveBeenCalledTimes(2);
    expect(sizeService.analyze).toHaveBeenNthCalledWith(2, {
      compression: "gzip",
      files: ["dist/index.js"],
      workingDirectory: "/repo",
    });
    expect(result.inputs[1]?.files).toBe(1);
  });
});
