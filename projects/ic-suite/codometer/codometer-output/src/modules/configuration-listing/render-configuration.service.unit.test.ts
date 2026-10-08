import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { RenderConfigurationService } from "./render-configuration.service";

import type {
  ConfiguredDirectory,
  ConfiguredLimitRow,
} from "./configuration-listing.types";
import type { ResolvedCodometerConfiguration } from "@codometer/configuration";

const LIMIT_ROW: ConfiguredLimitRow = {
  directory: "packages/logging",
  label: "—",
  metric: "Compiled JavaScript.size",
  path: "packages/logging/codometer.config.ts",
  severity: "fail",
  value: "6.00 kB",
};

const UNREADABLE: ConfiguredDirectory = {
  configuration: undefined,
  directory: "packages/broken",
  error: "Cannot find module",
  path: "packages/broken/codometer.config.ts",
};

describe(RenderConfigurationService, () => {
  let service: RenderConfigurationService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [RenderConfigurationService],
    }).compile();

    service = await module.resolve(RenderConfigurationService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("renders the limits as a markdown table naming the file each came from", () => {
    const document = service.render({
      described: [],
      format: "markdown",
      limitRows: [LIMIT_ROW],
      limitsOnly: true,
      rootError: undefined,
    });

    expect(document).toContain("| Directory | Metric | Label |");
    expect(document).toContain("`packages/logging/codometer.config.ts`");
    expect(document).toContain("6.00 kB");
  });

  it("says so plainly when nothing is configured rather than rendering an empty table", () => {
    expect(
      service.render({
        described: [],
        format: "markdown",
        limitRows: [],
        limitsOnly: true,
        rootError: undefined,
      }),
    ).toContain("No limits are configured.");
  });

  it("reports a configuration that could not be read instead of omitting it", () => {
    const document = service.render({
      described: [UNREADABLE],
      format: "markdown",
      limitRows: [],
      limitsOnly: false,
      rootError: undefined,
    });

    expect(document).toContain("packages/broken");
    expect(document).toContain("Could not be read: Cannot find module");
  });

  it("lists what each configuration resolved to when not limited to limits", () => {
    const document = service.render({
      described: [
        {
          configuration: {
            custom: [
              {
                color: "166534",
                comment: undefined,
                group: "typescript",
                label: "Service Files",
                patterns: ["**/*.service.ts"],
              },
            ],
            defaultInput: undefined,
            exclude: [],
            excludeFrom: [".codometerignore"],
            format: "json",
            inputs: [
              {
                analyses: ["size"],
                compression: "gzip",
                directory: "../..",
                exclude: [],
                include: ["dist/**/*.js"],
                name: "Compiled JavaScript",
              },
            ],
            limits: [],
            outputs: [
              {
                custom: [
                  {
                    color: "166534",
                    comment: undefined,
                    group: "typescript",
                    label: "Service Files",
                    patterns: ["**/*.service.ts"],
                  },
                ],
                indentation: 2,
                path: "codometer-report.json",
                type: "json",
              },
            ],
            python: { command: "uv run python" },
          } satisfies ResolvedCodometerConfiguration,
          directory: "packages/logging",
          error: undefined,
          path: "packages/logging/codometer.config.ts",
        },
      ],
      format: "markdown",
      limitRows: [],
      limitsOnly: false,
      rootError: undefined,
    });

    expect(document).toContain("- Inputs: Compiled JavaScript");
    expect(document).toContain("- Custom statistics: Service Files");
    expect(document).toContain("`uv run python`");
    expect(document).toContain("- Exclude files: .codometerignore");
  });

  it("renders an em dash for a list a configuration leaves empty", () => {
    const document = service.render({
      described: [UNREADABLE],
      format: "markdown",
      limitRows: [],
      limitsOnly: false,
      rootError: undefined,
    });

    expect(document).toContain("Could not be read");
  });

  it("emits every configuration under json when not limited to limits", () => {
    const document = service.render({
      described: [UNREADABLE],
      format: "json",
      limitRows: [],
      limitsOnly: false,
      rootError: undefined,
    });

    // `JSON.stringify` drops an undefined value rather than emitting it, so
    // the unreadable entry arrives without its absent configuration.
    expect(JSON.parse(document)).toStrictEqual({
      configurations: [
        {
          directory: UNREADABLE.directory,
          error: UNREADABLE.error,
          path: UNREADABLE.path,
        },
      ],
      rootError: null,
    });
  });

  it("says the walk root answered with nothing, above the limits it still found", () => {
    const document = service.render({
      described: [],
      format: "markdown",
      limitRows: [LIMIT_ROW],
      limitsOnly: true,
      rootError: "needs a format",
    });

    expect(document).toContain(
      "Nothing answered for the walk root, so the built-in exclusions were used instead: needs a format",
    );
    expect(document).toContain("6.00 kB");
  });

  it("emits only the limits under --limits when asked for json", () => {
    const document = service.render({
      described: [UNREADABLE],
      format: "json",
      limitRows: [LIMIT_ROW],
      limitsOnly: true,
      rootError: undefined,
    });

    expect(JSON.parse(document)).toStrictEqual({
      limits: [LIMIT_ROW],
      rootError: null,
    });
  });

  // A configuration that declares none of these still renders a row apiece,
  // so a reader can tell "declared nothing" from "this listing left it out".
  it("renders an em dash for every list a configuration left empty", () => {
    const document = service.render({
      described: [
        {
          configuration: {
            custom: [],
            defaultInput: undefined,
            exclude: [],
            excludeFrom: [],
            format: "markdown",
            inputs: [],
            limits: [],
            outputs: [],
            python: { command: "python3" },
          } satisfies ResolvedCodometerConfiguration,
          directory: "packages/bare",
          error: undefined,
          path: "packages/bare/codometer.config.ts",
        },
      ],
      format: "markdown",
      limitRows: [],
      limitsOnly: false,
      rootError: undefined,
    });

    expect(document).toContain("- Inputs: —");
    expect(document).toContain("- Custom statistics: —");
    expect(document).toContain("- Exclude files: —");
  });

  // Every failure this listing carries is a string today, but the field is
  // optional on the entry, and a reader must never be shown a bare "undefined".
  it("names an unreadable configuration whose failure went unrecorded", () => {
    const document = service.render({
      described: [{ ...UNREADABLE, error: undefined }],
      format: "markdown",
      limitRows: [],
      limitsOnly: false,
      rootError: undefined,
    });

    expect(document).toContain("Could not be read: unknown error");
  });
});
