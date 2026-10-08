import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { ConfigurationFlagsService } from "./configuration-flags.service";

import type { MeasureCommandOptions, RunMode } from "./configuration.types";

describe(ConfigurationFlagsService, () => {
  let service: ConfigurationFlagsService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [ConfigurationFlagsService],
    }).compile();

    service = await module.resolve(ConfigurationFlagsService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  // 🔤 Optional option

  it("reads a written value as itself", () => {
    expect(service.parseOptionalOption("reports")).toBe("reports");
  });

  it("reads an omitted option as absent", () => {
    expect(service.parseOptionalOption(undefined)).toBeUndefined();
  });

  it("reads an empty value as absent", () => {
    expect(service.parseOptionalOption("")).toBeUndefined();
  });

  it("reads a valueless flag's boolean as absent", () => {
    expect(service.parseOptionalOption(true)).toBeUndefined();
  });

  // 🗂️ Defaulted option

  it("falls back to the given default when the option is absent", () => {
    expect(service.parseDefaultedOption(undefined, "table")).toBe("table");
  });

  it("keeps a written value over the given default", () => {
    expect(service.parseDefaultedOption("json", "table")).toBe("json");
  });

  it("falls back to the given default for a valueless flag's boolean", () => {
    expect(service.parseDefaultedOption(true, "table")).toBe("table");
  });

  // 📁 Directory option

  it("reads a written directory as itself", () => {
    expect(
      service.parseDirectoryOption("packages/ic-suite/codometer/codometer-cli"),
    ).toBe("packages/ic-suite/codometer/codometer-cli");
  });

  it("falls back to the working directory when no directory was given", () => {
    expect(service.parseDirectoryOption(undefined)).toBe(process.cwd());
  });

  it("falls back to the working directory when the directory is a boolean", () => {
    expect(service.parseDirectoryOption(true)).toBe(process.cwd());
  });

  it("falls back to the working directory for an empty directory", () => {
    expect(service.parseDirectoryOption("")).toBe(process.cwd());
  });

  describe("what the run does", () => {
    it.each<[MeasureCommandOptions, RunMode]>([
      [
        {},
        {
          checksLimits: false,
          checksReports: false,
          writesJson: false,
          writesMarkdown: false,
        },
      ],
      [
        { check: "limits" },
        {
          checksLimits: true,
          checksReports: false,
          writesJson: false,
          writesMarkdown: false,
        },
      ],
      [
        { outputJson: true },
        {
          checksLimits: false,
          checksReports: false,
          writesJson: true,
          writesMarkdown: false,
        },
      ],
      [
        { outputMarkdown: "README.md" },
        {
          checksLimits: false,
          checksReports: false,
          writesJson: false,
          writesMarkdown: true,
        },
      ],
    ])("reads %o as %o", (options, mode) => {
      const selection = service.selectMode(options);

      expect(selection.errors).toStrictEqual([]);
      expect(selection.mode).toStrictEqual(mode);
    });

    it("tolerates spaces around the names in a --check set", () => {
      expect(
        service.selectMode({ check: " reports , limits " }).mode,
      ).toStrictEqual({
        checksLimits: true,
        checksReports: true,
        writesJson: false,
        writesMarkdown: false,
      });
    });

    // Nothing can be stale immediately after being written, so a run asking
    // for both on the same output has misunderstood one of them.
    it.each<[MeasureCommandOptions]>([
      [{ check: "reports", outputJson: true }],
      [{ check: "reports", outputMarkdown: true }],
    ])(
      "refuses --check reports together with an --output-* flag",
      (options) => {
        expect(service.selectMode(options).errors).toStrictEqual([
          expect.stringContaining(
            "cannot be combined with --check reports",
          ) as string,
        ]);
      },
    );

    // The scenario this exists for: CI runs `--check "$GATES"` with the
    // variable unset or misspelled. Read as "gate nothing" the run would pass
    // forever against a stale report, which is worse than no gate because it
    // looks like one.
    it.each([[""], [","], ["  "], [" , "]])(
      "refuses a --check value of %j, which names nothing",
      (check) => {
        const selection = service.selectMode({ check });

        expect(selection.errors).toStrictEqual([
          '--check needs a value. It takes a comma-separated set drawn from "limits" and "reports", as in "--check limits,reports".',
        ]);
        expect(selection.mode).toStrictEqual({
          checksLimits: false,
          checksReports: false,
          writesJson: false,
          writesMarkdown: false,
        });
      },
    );

    it("complains once about an unknown value rather than also about emptiness", () => {
      expect(service.selectMode({ check: "bogus" }).errors).toStrictEqual([
        expect.stringContaining('does not accept "bogus"') as string,
      ]);
    });
  });

  describe("what it prints", () => {
    it("reads an explicit --format value", () => {
      const errors: string[] = [];

      expect(service.resolveFormat("json", "markdown", errors)).toBe("json");
      expect(errors).toStrictEqual([]);
    });

    it("falls back to the resolved configuration's format when omitted", () => {
      const errors: string[] = [];

      expect(service.resolveFormat(undefined, "markdown", errors)).toBe(
        "markdown",
      );
      expect(errors).toStrictEqual([]);
    });

    // Not inferred from whether the run writes a file: the omitted flag
    // always reads the configured format, whatever else the command line
    // asks the run to do.
    it("does not infer the fallback from any other flag", () => {
      expect(service.resolveFormat(undefined, "json", [])).toBe("json");
    });

    it("refuses a --format it does not know, naming the ones it does", () => {
      const errors: string[] = [];
      const format = service.resolveFormat("yaml", "markdown", errors);

      expect(errors).toStrictEqual([
        expect.stringContaining('--format does not accept "yaml"') as string,
      ]);
      expect(format).toBeUndefined();
    });
  });
});
