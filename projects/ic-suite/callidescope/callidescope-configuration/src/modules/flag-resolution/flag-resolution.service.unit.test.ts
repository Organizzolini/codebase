import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { ConfigurationFileService } from "../configuration/configuration-file.service";
import { DEFAULT_EXCLUDE_GLOBS } from "../configuration/configuration.constants";

import { FlagResolutionService } from "./flag-resolution.service";

import type { ResolvedCallidescopeConfiguration } from "../configuration/configuration.types";
import type {
  CallidescopeRunFlags,
  ResolvedRunFlags,
} from "./flag-resolution.types";

// A deliberate misspelling: the example of a `--format` value nobody
// recognizes, which is exactly what these tests are about.
// cspell:ignore markdwon

describe(FlagResolutionService, () => {
  let configurationService: ConfigurationFileService;
  let service: FlagResolutionService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [ConfigurationFileService, FlagResolutionService],
    }).compile();

    configurationService = await module.resolve(ConfigurationFileService);
    service = await module.resolve(FlagResolutionService);
  });

  /** A configuration declaring every value a flag may override. */
  const fullyConfigured = (): ResolvedCallidescopeConfiguration =>
    configurationService.resolveConfiguration({
      directories: ["packages/one"],
      entryPoints: {
        addresses: ["src/main.ts#main"],
        decorators: ["Command"],
        includeExportedFunctions: true,
        includeOrphans: true,
        includeTests: false,
      },
      exclude: ["**/*.generated.ts"],
      excludeCallees: ["LoggerService.*"],
      limits: { maximumBreadth: 7, maximumDepth: 5 },
      write: {
        json: { indentation: 4, path: "output/report.json" },
        markdown: {
          description: "What the run found.",
          endMarker: "<!-- END -->",
          heading: "## 🔭 Configured",
          path: "docs/report.md",
          startMarker: "<!-- START -->",
        },
        mermaid: {
          heading: "## 🔭 Diagram",
          path: "docs/diagram.md",
        },
      },
    });

  /** A configuration declaring nothing a destination flag could override. */
  const bare = (): ResolvedCallidescopeConfiguration =>
    configurationService.resolveConfiguration({});

  const resolve = (args: {
    configuration?: ResolvedCallidescopeConfiguration | undefined;
    flags: CallidescopeRunFlags;
  }): ResolvedRunFlags =>
    service.resolveRunFlags({
      configuration: args.configuration ?? fullyConfigured(),
      flags: args.flags,
    });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  // 🎛️ One case per flag, against the documented precedence rule

  // A flag that selects mode or presentation is command-line only: it never
  // reaches the configuration, because neither can make an under-configured
  // run legal. A flag that changes what a run judges or writes may override a
  // value the configuration already declares, and only that value.
  it.each<{
    expectation: (resolved: ResolvedRunFlags) => void;
    flag: string;
    flags: CallidescopeRunFlags;
  }>([
    {
      expectation: (resolved): void => {
        expect(resolved.errors).toStrictEqual([]);
        // Mode only. It changes nothing the configuration declares, and it
        // selects no presentation either. `RunPlanService.prepareRun` really
        // passes it, so this is the rule being kept rather than a field
        // nothing populates.
        expect(resolved.configuration).toStrictEqual(fullyConfigured());
        expect(resolved.format).toBe("markdown");
      },
      flag: "--check, the check selector",
      flags: { check: "depth,reports" },
    },
    {
      expectation: (resolved): void => {
        expect(resolved.errors).toStrictEqual([]);
        expect(resolved.configuration).toStrictEqual(fullyConfigured());
        expect(resolved.format).toBe("markdown");
      },
      flag: "--write, the write switch",
      flags: { write: true },
    },
    {
      expectation: (resolved): void => {
        expect(resolved.errors).toStrictEqual([]);
        expect(resolved.format).toBe("mermaid");
        // Presentation only, and never written into the configuration.
        expect(resolved.configuration).toStrictEqual(fullyConfigured());
      },
      flag: "--format, presentation",
      flags: { format: "mermaid" },
    },
    {
      expectation: (resolved): void => {
        expect(resolved.errors).toStrictEqual([]);
        expect(resolved.configuration.directories).toStrictEqual([
          "packages/two",
        ]);
      },
      flag: "--directories, overriding the configured list",
      flags: { directories: ["packages/two"] },
    },
    {
      expectation: (resolved): void => {
        expect(resolved.errors).toStrictEqual([]);
        expect(resolved.configuration.write.markdown).toStrictEqual({
          ...fullyConfigured().write.markdown,
          path: "docs/elsewhere.md",
        });
      },
      flag: "--markdown, overriding the path and nothing else",
      flags: { markdown: "docs/elsewhere.md" },
    },
    {
      expectation: (resolved): void => {
        expect(resolved.errors).toStrictEqual([]);
        expect(resolved.configuration.write.json).toStrictEqual({
          indentation: 4,
          path: "output/elsewhere.json",
        });
      },
      flag: "--json, overriding the path and nothing else",
      flags: { json: "output/elsewhere.json" },
    },
    {
      expectation: (resolved): void => {
        expect(resolved.errors).toStrictEqual([]);
        expect(resolved.configuration.write.mermaid).toStrictEqual({
          ...fullyConfigured().write.mermaid,
          path: "docs/elsewhere.md",
        });
      },
      flag: "--mermaid, overriding the path and nothing else",
      flags: { mermaid: "docs/elsewhere.md" },
    },
    {
      expectation: (resolved): void => {
        expect(resolved.errors).toStrictEqual([]);
        expect(resolved.configuration.exclude).toStrictEqual([
          ...DEFAULT_EXCLUDE_GLOBS,
          "src/**",
        ]);
      },
      flag: "--exclude, overriding the authored globs and keeping the defaults",
      flags: { exclude: ["src/**"] },
    },
    {
      expectation: (resolved): void => {
        expect(resolved.errors).toStrictEqual([]);
        expect(resolved.configuration.excludeCallees).toStrictEqual([
          "TracerService.*",
        ]);
      },
      flag: "--exclude-callees, overriding the configured globs",
      flags: { excludeCallees: ["TracerService.*"] },
    },
    {
      expectation: (resolved): void => {
        expect(resolved.errors).toStrictEqual([]);
        expect(resolved.configuration.entryPoints.addresses).toStrictEqual([
          "src/other.ts#other",
        ]);
      },
      flag: "--entry-point-addresses, overriding the declared roots",
      flags: { entryPointAddresses: ["src/other.ts#other"] },
    },
    {
      expectation: (resolved): void => {
        expect(resolved.errors).toStrictEqual([]);
        expect(resolved.configuration.entryPoints.decorators).toStrictEqual([
          "Resolver",
        ]);
      },
      flag: "--entry-point-decorators, overriding the declared decorators",
      flags: { entryPointDecorators: ["Resolver"] },
    },
    {
      expectation: (resolved): void => {
        expect(resolved.errors).toStrictEqual([]);
        expect(
          resolved.configuration.entryPoints.includeExportedFunctions,
        ).toBe(false);
      },
      flag: "--include-exported-functions, overriding the configured switch",
      flags: { includeExportedFunctions: "false" },
    },
    {
      expectation: (resolved): void => {
        expect(resolved.errors).toStrictEqual([]);
        expect(resolved.configuration.entryPoints.includeOrphans).toBe(false);
      },
      flag: "--include-orphans, overriding the configured switch",
      flags: { includeOrphans: "false" },
    },
    {
      expectation: (resolved): void => {
        expect(resolved.errors).toStrictEqual([]);
        expect(resolved.configuration.entryPoints.includeTests).toBe(true);
      },
      flag: "--include-tests, overriding the configured switch",
      flags: { includeTests: "true" },
    },
    {
      expectation: (resolved): void => {
        expect(resolved.errors).toStrictEqual([]);
        expect(resolved.configuration.limits.maximumDepth).toBe(9);
        // The neighboring limit is left exactly as the configuration wrote it.
        expect(resolved.configuration.limits.maximumBreadth).toBe(7);
      },
      flag: "--maximum-depth, overriding the configured limit",
      flags: { maximumDepth: "9" },
    },
    {
      expectation: (resolved): void => {
        expect(resolved.errors).toStrictEqual([]);
        expect(resolved.configuration.limits.maximumBreadth).toBe(12);
        expect(resolved.configuration.limits.maximumDepth).toBe(5);
      },
      flag: "--maximum-breadth, overriding the configured limit",
      flags: { maximumBreadth: "12" },
    },
    {
      expectation: (resolved): void => {
        expect(resolved.errors).toStrictEqual([]);
        expect(resolved.format).toBe("markdown");
        expect(resolved.configuration).toStrictEqual(fullyConfigured());
      },
      // `--config` chooses the file everything else is resolved against, so
      // it never reaches this call at all: it is neither mode, nor
      // presentation, nor an override of anything a configuration declares.
      flag: "no flags at all, the configuration standing alone",
      flags: {},
    },
  ])("resolves $flag", ({ expectation, flags }) => {
    expectation(resolve({ flags }));
  });

  // 🐛 The four defects

  it("treats an empty directories value as absent rather than as an empty list", () => {
    const resolved = resolve({ flags: { directories: [] } });

    expect(resolved.configuration.directories).toStrictEqual(["packages/one"]);
  });

  it("keeps the default exclusions through an exclude override", () => {
    // The defect this exists for: `--exclude` replaced the resolved array,
    // which is the authored globs *and* the six directories no repository
    // wants traced, so narrowing the exclusions quietly started tracing
    // `node_modules` and `dist`.
    const resolved = resolve({ flags: { exclude: ["src/**"] } });

    expect(resolved.configuration.exclude).toStrictEqual([
      ...DEFAULT_EXCLUDE_GLOBS,
      "src/**",
    ]);
  });

  it("names a default exclusion once when the flag repeats it", () => {
    const resolved = resolve({
      flags: { exclude: ["**/dist/**", "src/**"] },
    });

    expect(resolved.configuration.exclude).toStrictEqual([
      ...DEFAULT_EXCLUDE_GLOBS,
      "src/**",
    ]);
  });

  it("keeps a configured indentation through a JSON path override", () => {
    const resolved = resolve({ flags: { json: "output/elsewhere.json" } });

    expect(resolved.configuration.write.json?.indentation).toBe(4);
  });

  it("keeps every other markdown property through a path override", () => {
    const resolved = resolve({ flags: { markdown: "docs/elsewhere.md" } });
    const markdown = resolved.configuration.write.markdown;

    expect(markdown?.description).toBe("What the run found.");
    expect(markdown?.endMarker).toBe("<!-- END -->");
    expect(markdown?.heading).toBe("## 🔭 Configured");
    expect(markdown?.startMarker).toBe("<!-- START -->");
  });

  it("carries a configured render hook through a path override", () => {
    const render = (): string => "rendered";
    const configuration = configurationService.resolveConfiguration({
      write: { markdown: { path: "docs/report.md", render } },
    });

    const resolved = resolve({
      configuration,
      flags: { markdown: "docs/elsewhere.md" },
    });

    expect(resolved.configuration.write.markdown?.render).toBe(render);
  });

  it("refuses an unrecognized format rather than rewriting it to markdown", () => {
    const resolved = resolve({ flags: { format: "markdwon" } });

    expect(resolved.errors).toStrictEqual([
      '--format does not accept "markdwon". It takes one of "markdown", "mermaid", "json".',
    ]);
  });

  it("prints in the default format while refusing the one it was given", () => {
    const resolved = resolve({ flags: { format: "markdwon" } });

    expect(resolved.format).toBe("markdown");
  });

  // 🚫 A flag may override a declared value, never supply a missing one

  it.each<[string, CallidescopeRunFlags, string]>([
    ["--json", { json: "output/report.json" }, "write.json"],
    ["--markdown", { markdown: "docs/report.md" }, "write.markdown"],
    ["--mermaid", { mermaid: "docs/diagram.md" }, "write.mermaid"],
  ])(
    "refuses %s when the configuration declares no such destination",
    (flag, flags, field) => {
      const resolved = resolve({ configuration: bare(), flags });

      expect(resolved.errors).toStrictEqual([
        `${flag} overrides a destination the configuration does not declare. ` +
          `Add \`${field}\` to the configuration this run reads, then use ${flag} to send it somewhere else.`,
      ]);
    },
  );

  it("leaves an undeclared destination undeclared rather than inventing one", () => {
    const resolved = resolve({
      configuration: bare(),
      flags: { json: "output/report.json" },
    });

    expect(resolved.configuration.write.json).toBeUndefined();
  });

  it("refuses --maximum-breadth when the configuration declares no breadth limit", () => {
    const resolved = resolve({
      configuration: bare(),
      flags: { maximumBreadth: "12" },
    });

    expect(resolved.errors).toStrictEqual([
      "--maximum-breadth overrides a value the configuration does not declare. " +
        "Add `limits.maximumBreadth` to the configuration this run reads, then use --maximum-breadth to change it.",
    ]);
  });

  it("leaves an undeclared breadth limit undeclared rather than supplying one", () => {
    const resolved = resolve({
      configuration: bare(),
      flags: { maximumBreadth: "12" },
    });

    expect(resolved.configuration.limits.maximumBreadth).toBeUndefined();
  });

  // 📏 A limit override is reported, because a limit is enforced per project

  it("reports the limits a flag chose, so the override can reach each project", () => {
    const resolved = resolve({
      flags: { maximumBreadth: "12", maximumDepth: "9" },
    });

    expect(resolved.limitOverrides).toStrictEqual({
      maximumBreadth: 12,
      maximumDepth: 9,
    });
  });

  it("reports no override when no limit flag was given", () => {
    // Empty rather than the configured numbers: every project declares its
    // own, and a run that reported the workspace's as overrides would quietly
    // replace all thirty-seven of them with one.
    expect(resolve({ flags: {} }).limitOverrides).toStrictEqual({});
  });

  it("reports no override for a limit flag it refused", () => {
    const resolved = resolve({ flags: { maximumDepth: "deep" } });

    expect(resolved.limitOverrides).toStrictEqual({});
  });

  // 🔢 A value nobody can read is refused rather than guessed at

  it.each<[string, CallidescopeRunFlags]>([
    ["--maximum-breadth", { maximumBreadth: "wide" }],
    ["--maximum-depth", { maximumDepth: "deep" }],
  ])("refuses %s when it was not given a whole number", (flag, flags) => {
    const resolved = resolve({ flags });

    expect(resolved.errors).toStrictEqual([
      `${flag} does not accept "${flag === "--maximum-depth" ? "deep" : "wide"}". It takes a positive whole number.`,
    ]);
  });

  it("keeps the configured limit while refusing the value it was given", () => {
    const resolved = resolve({ flags: { maximumDepth: "deep" } });

    expect(resolved.configuration.limits.maximumDepth).toBe(5);
  });

  it("reads a switch written with no value as asking for it", () => {
    const resolved = resolve({ flags: { includeTests: true } });

    expect(resolved.errors).toStrictEqual([]);
    expect(resolved.configuration.entryPoints.includeTests).toBe(true);
  });

  it.each<[string, CallidescopeRunFlags]>([
    ["--include-exported-functions", { includeExportedFunctions: "yes" }],
    ["--include-orphans", { includeOrphans: "yes" }],
    ["--include-tests", { includeTests: "yes" }],
  ])("refuses %s when it was not given true or false", (flag, flags) => {
    const resolved = resolve({ flags });

    expect(resolved.errors).toStrictEqual([
      `${flag} does not accept "yes". It takes "true" or "false", or the flag on its own for "true".`,
    ]);
  });

  // 📃 An empty list flag is absent, the same rule --directories already obeys

  it.each<
    [string, CallidescopeRunFlags, keyof ResolvedCallidescopeConfiguration]
  >([
    ["--exclude", { exclude: [] }, "exclude"],
    ["--exclude-callees", { excludeCallees: [] }, "excludeCallees"],
  ])(
    "treats an empty %s value as absent rather than as an empty list",
    (_flag, flags, field) => {
      const resolved = resolve({ flags });

      expect(resolved.configuration[field]).toStrictEqual(
        fullyConfigured()[field],
      );
    },
  );

  it("treats empty entry-point list flags as absent rather than as empty lists", () => {
    const resolved = resolve({
      flags: { entryPointAddresses: [], entryPointDecorators: [] },
    });

    expect(resolved.configuration.entryPoints).toStrictEqual(
      fullyConfigured().entryPoints,
    );
  });

  it("collects every complaint before reporting any of them", () => {
    const resolved = resolve({
      configuration: bare(),
      flags: { format: "yaml", json: "output/report.json" },
    });

    expect(resolved.errors).toHaveLength(2);
  });
});
