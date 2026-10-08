import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { ConfigurationFileService } from "../configuration/configuration-file.service";
import { FlagResolutionService } from "../flag-resolution/flag-resolution.service";

import { RunPlanService } from "./run-plan.service";

import type { ResolvedCallidescopeConfiguration } from "../configuration/configuration.types";

// A deliberate misspelling: the example of a `--format` value nobody
// recognizes, which is exactly what the refusal below is about.
// cspell:ignore markdwon

/** What `--check` says it accepts, quoted the way every message quotes it. */
const ACCEPTED =
  `It takes a comma-separated set drawn from "breadth" and "depth" and "reports", ` +
  `as in "--check breadth,depth,reports".`;

/** A resolved configuration with the defaults this suite assumes. */
function buildConfiguration(
  overrides: Partial<ResolvedCallidescopeConfiguration> = {},
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
    limits: {
      maximumDepth: 6,
    },
    write: {
      json: undefined,
      markdown: undefined,
      mermaid: undefined,
    },
    ...overrides,
  };
}

describe(RunPlanService, () => {
  let service: RunPlanService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        RunPlanService,
        FlagResolutionService,
        {
          provide: ConfigurationFileService,
          useValue: createMock<ConfigurationFileService>(),
        },
      ],
    }).compile();

    service = await module.resolve(RunPlanService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  // 🎛️ Reading the check set

  it("gates nothing when the flag is absent", () => {
    const { errors, mode } = service.selectMode({});

    expect(errors).toStrictEqual([]);
    expect(mode).toStrictEqual({
      checksBreadth: false,
      checksDepth: false,
      checksReports: false,
      writes: false,
    });
  });

  it("gates breadth alone when breadth alone was named", () => {
    const { errors, mode } = service.selectMode({ check: "breadth" });

    expect(errors).toStrictEqual([]);
    expect(mode.checksBreadth).toBe(true);
    expect(mode.checksDepth).toBe(false);
    expect(mode.checksReports).toBe(false);
  });

  it("gates depth alone when depth alone was named", () => {
    const { errors, mode } = service.selectMode({ check: "depth" });

    expect(errors).toStrictEqual([]);
    expect(mode.checksBreadth).toBe(false);
    expect(mode.checksDepth).toBe(true);
    expect(mode.checksReports).toBe(false);
  });

  it("gates staleness alone when reports alone was named", () => {
    const { mode } = service.selectMode({ check: "reports" });

    expect(mode.checksBreadth).toBe(false);
    expect(mode.checksDepth).toBe(false);
    expect(mode.checksReports).toBe(true);
  });

  it("gates all three when all three were named", () => {
    const { errors, mode } = service.selectMode({
      check: "breadth,depth,reports",
    });

    expect(errors).toStrictEqual([]);
    expect(mode.checksBreadth).toBe(true);
    expect(mode.checksDepth).toBe(true);
    expect(mode.checksReports).toBe(true);
  });

  it("gates depth and breadth independently of one another", () => {
    const { mode } = service.selectMode({ check: "breadth" });

    expect(mode.checksBreadth).toBe(true);
    expect(mode.checksDepth).toBe(false);
  });

  it("ignores the spaces somebody wrote around a name", () => {
    const { errors, mode } = service.selectMode({ check: " depth , reports " });

    expect(errors).toStrictEqual([]);
    expect(mode.checksDepth).toBe(true);
    expect(mode.checksReports).toBe(true);
  });

  it("refuses a flag carrying no value", () => {
    // Read as "gate everything" this used to be one flag over two findings,
    // which is the conflation the set exists to undo.
    const { errors, mode } = service.selectMode({ check: true });

    expect(errors).toStrictEqual([`--check needs a value. ${ACCEPTED}`]);
    expect(mode.checksDepth).toBe(false);
    expect(mode.checksReports).toBe(false);
  });

  it("refuses an empty value", () => {
    const { errors } = service.selectMode({ check: "" });

    expect(errors).toStrictEqual([`--check needs a value. ${ACCEPTED}`]);
  });

  it("refuses a value that is nothing but separators", () => {
    const { errors } = service.selectMode({ check: " , " });

    expect(errors).toStrictEqual([`--check needs a value. ${ACCEPTED}`]);
  });

  it("refuses a name it does not know, and names what it takes", () => {
    const { errors, mode } = service.selectMode({ check: "limits" });

    expect(errors).toStrictEqual([
      `--check does not accept "limits". ${ACCEPTED}`,
    ]);
    expect(mode.checksDepth).toBe(false);
  });

  it("reports every unknown name in one run", () => {
    const { errors } = service.selectMode({ check: "limits,stacks" });

    expect(errors).toHaveLength(2);
  });

  it("keeps the names it knows from a set that also holds one it does not", () => {
    const { errors, mode } = service.selectMode({ check: "depth,limits" });

    expect(errors).toHaveLength(1);
    expect(mode.checksDepth).toBe(true);
  });

  // ✍️ Writing

  it("writes when the write flag was given", () => {
    const { errors, mode } = service.selectMode({ write: true });

    expect(errors).toStrictEqual([]);
    expect(mode.writes).toBe(true);
  });

  it("does not write for a flag that was explicitly turned off", () => {
    const { mode } = service.selectMode({ write: false });

    expect(mode.writes).toBe(false);
  });

  it("writes and gates depth in one run", () => {
    const { errors, mode } = service.selectMode({
      check: "depth",
      write: true,
    });

    expect(errors).toStrictEqual([]);
    expect(mode).toStrictEqual({
      checksBreadth: false,
      checksDepth: true,
      checksReports: false,
      writes: true,
    });
  });

  it("refuses writing and checking reports at once", () => {
    const { errors } = service.selectMode({ check: "reports", write: true });

    expect(errors).toStrictEqual([
      `--write cannot be combined with --check reports: a report cannot be stale in the run that just wrote it. Drop one of them, or run --write and --check reports separately.`,
    ]);
  });

  it("refuses a destination flag that nothing writes or compares", () => {
    // This used to exit 0, log a finished trace, and write no file and no
    // warning — a flag naming a destination taught people the tool had run.
    const { errors } = service.selectMode({ json: "report.json" });

    expect(errors).toStrictEqual([
      "--json names a destination but nothing writes or compares it. Add --write to write it, or --check reports to fail on it being out of date.",
    ]);
  });

  it("names every destination flag the command line supplied", () => {
    const { errors } = service.selectMode({
      json: "report.json",
      markdown: "report.md",
    });

    expect(errors).toStrictEqual([
      "--json and --markdown name destinations but nothing writes or compares them. Add --write to write them, or --check reports to fail on them being out of date.",
    ]);
  });

  it("accepts a destination flag alongside --write", () => {
    const { errors } = service.selectMode({ json: "report.json", write: true });

    expect(errors).toStrictEqual([]);
  });

  it("accepts a destination flag alongside --check reports", () => {
    // `--check reports` compares a destination, so an override is meaningful
    // there too. Refusing on a missing `--write` alone would be wrong.
    const { errors } = service.selectMode({
      check: "reports",
      json: "report.json",
    });

    expect(errors).toStrictEqual([]);
  });

  it("leaves a run naming no destination flag alone", () => {
    // The safety property the refusal must not disturb: a bare run with
    // destinations in the configuration still writes nothing and complains
    // about nothing, which is what makes it safe to type in a checkout.
    const { errors } = service.selectMode({});

    expect(errors).toStrictEqual([]);
  });

  // 🔍 Lookup preparation

  describe("prepareRun", () => {
    // The whole command line reaches the one resolver, mode flags included:
    // the rule that `--check` and `--write` change nothing it resolves is only
    // a rule if the resolver is actually given them.
    it("hands the mode flags to the resolver and resolves the same configuration", async () => {
      const configurationFileService = createMock<ConfigurationFileService>();

      configurationFileService.loadConfigurationFile.mockResolvedValue({
        authored: {},
        configuration: buildConfiguration({ directories: ["packages/one"] }),
        path: undefined,
      });

      const flagResolutionService = new FlagResolutionService();
      const resolveRunFlags = vi.spyOn(
        flagResolutionService,
        "resolveRunFlags",
      );
      const subject = new RunPlanService(flagResolutionService);

      const prepared = await subject.prepareRun(
        {
          check: "depth,reports",
          write: false,
        },
        configurationFileService,
      );

      // Read off the call rather than matched with `objectContaining`, which
      // returns `any` and would cost the project its type coverage.
      // Every flag the command accepts is handed over, absent ones included:
      // the resolver is the one place a flag meets the field it overrides, so
      // a flag withheld here is a flag that silently does nothing.
      expect(resolveRunFlags.mock.calls[0]?.[0].flags).toStrictEqual({
        check: "depth,reports",
        directories: undefined,
        entryPointAddresses: undefined,
        entryPointDecorators: undefined,
        exclude: undefined,
        excludeCallees: undefined,
        format: undefined,
        includeExportedFunctions: undefined,
        includeOrphans: undefined,
        includeTests: undefined,
        json: undefined,
        markdown: undefined,
        maximumBreadth: undefined,
        maximumDepth: undefined,
        mermaid: undefined,
        write: false,
      });
      expect(prepared.run?.configuration).toStrictEqual(
        buildConfiguration({ directories: ["packages/one"] }),
      );
    });
  });

  describe("prepareLookup", () => {
    // The refusal path `depth` and `breadth` reach: a lookup has no
    // half-prepared state to hand back, so an unusable flag is thrown rather
    // than logged and returned the way a run's is.
    it("refuses a format nobody recognizes rather than tracing anyway", async () => {
      const configurationFileService = createMock<ConfigurationFileService>();

      configurationFileService.loadConfigurationFile.mockResolvedValue({
        authored: {},
        configuration: buildConfiguration(),
        path: undefined,
      });

      const subject = new RunPlanService(new FlagResolutionService());

      await expect(
        subject.prepareLookup({ format: "markdwon" }, configurationFileService),
      ).rejects.toThrow(
        '--format does not accept "markdwon". It takes one of "markdown", "mermaid", "json".',
      );
    });

    it("resolves the workspace root to the working directory", async () => {
      const configurationFileService = createMock<ConfigurationFileService>();

      configurationFileService.loadConfigurationFile.mockResolvedValue({
        authored: {},
        configuration: buildConfiguration(),
        path: undefined,
      });

      const subject = new RunPlanService(new FlagResolutionService());

      const prepared = await subject.prepareLookup(
        {},
        configurationFileService,
      );

      expect(prepared.workspaceRoot).toBe(process.cwd());
      expect(
        configurationFileService.loadConfigurationFile,
      ).toHaveBeenCalledWith({
        configurationPath: undefined,
        searchDirectory: process.cwd(),
      });
    });

    // Without the path a lookup pointed at a configuration sitting at some
    // project's root reads that same file again as that project's own, and
    // refuses it for the workspace-only fields it legitimately sets.
    it("reports the file the configuration was read from", async () => {
      const configurationFileService = createMock<ConfigurationFileService>();

      configurationFileService.loadConfigurationFile.mockResolvedValue({
        authored: {},
        configuration: buildConfiguration(),
        path: "/workspace/configuration/callidescope.config.ts",
      });

      const subject = new RunPlanService(new FlagResolutionService());

      const prepared = await subject.prepareLookup(
        {},
        configurationFileService,
      );

      expect(prepared.configurationPath).toBe(
        "/workspace/configuration/callidescope.config.ts",
      );
    });
  });

  // 📄 Touching files

  // The depth row is the one that says what this method is for: a run gating
  // depth alone reads and writes nothing, which is what makes a bare run safe
  // to type inside somebody's checkout.
  it.each([
    { checksDepth: false, checksReports: true, touched: true, writes: false },
    { checksDepth: false, checksReports: false, touched: true, writes: true },
    { checksDepth: true, checksReports: false, touched: false, writes: false },
    { checksDepth: false, checksReports: false, touched: false, writes: false },
  ])(
    "reads checksDepth=$checksDepth checksReports=$checksReports writes=$writes as touching files: $touched",
    ({ checksDepth, checksReports, touched, writes }) => {
      expect(
        service.touchesFiles({
          checksBreadth: false,
          checksDepth,
          checksReports,
          writes,
        }),
      ).toBe(touched);
    },
  );
});
