import { Test } from "@nestjs/testing";
import prompts from "prompts";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { InputOptionsService } from "./input-options.service";
import { InputPromptingService } from "./input-prompting.service";
import { InputSchemaService } from "./input-schema.service";
import { InputService } from "./input.service";

// Mocked at the module boundary so the interactive path is exercised without
// a terminal.
vi.mock("prompts", () => ({ default: vi.fn() }));

const promptRunner = vi.mocked(prompts);

const REQUIRED_NAME_SCHEMA = {
  properties: { name: { description: "Module name", type: "string" } },
  required: ["name"],
};

describe(InputService, () => {
  let service: InputService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        InputOptionsService,
        InputPromptingService,
        InputSchemaService,
        InputService,
      ],
    }).compile();

    service = await module.resolve(InputService);
  });

  const originalIsTty = process.stdin.isTTY;

  beforeEach(() => {
    promptRunner.mockReset();
    // Not a terminal by default, which is what a script, a hook, or a CI job
    // gets — and what the removed `--no-interactive` used to stand for.
    process.stdin.isTTY = false;
  });

  afterEach(() => {
    process.stdin.isTTY = originalIsTty;
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("option parsing", () => {
    it("treats blank optional options as absent", () => {
      expect(service.parseOptionalOption("  ")).toBeUndefined();
      expect(service.parseOptionalOption(undefined)).toBeUndefined();
      expect(service.parseOptionalOption(" path ")).toBe("path");
    });

    it("reads a threshold as a ratio", () => {
      expect(service.parseThresholdOption("0.9")).toBe(0.9);
      expect(service.parseThresholdOption("0")).toBe(0);
      expect(service.parseThresholdOption("1")).toBe(1);
      expect(service.parseThresholdOption("  ")).toBeUndefined();
      expect(service.parseThresholdOption(undefined)).toBeUndefined();
    });

    it("rejects a threshold outside the 0-to-1 range", () => {
      // `--threshold 90` is someone meaning 90%. Clamping it to 1 would turn a
      // typo into a validation run that can never fail.
      expect(() => service.parseThresholdOption("90")).toThrow(
        /between 0 and 1/,
      );
      expect(() => service.parseThresholdOption("-1")).toThrow(
        /between 0 and 1/,
      );
    });

    it("rejects a threshold that is not a number", () => {
      expect(() => service.parseThresholdOption("high")).toThrow(
        /between 0 and 1/,
      );
    });

    it("rejects a blank required option", () => {
      expect(() =>
        service.parseRequiredOption({ optionName: "generator", value: "  " }),
      ).toThrow("generator must not be empty");
    });

    it("trims and accepts a non-blank required option", () => {
      expect(
        service.parseRequiredOption({
          optionName: "generator",
          value: " widget ",
        }),
      ).toBe("widget");
    });

    it("splits comma-delimited filters and drops empties", () => {
      expect(service.parseCommaDelimitedOption("a, ,b ")).toStrictEqual([
        "a",
        "b",
      ]);
      expect(service.parseCommaDelimitedOption(" , ")).toBeUndefined();
      expect(service.parseCommaDelimitedOption(undefined)).toBeUndefined();
    });
  });

  describe("resolveGeneratorInputs", () => {
    it("reads a schema-backed flag from raw arguments", async () => {
      const inputs = await service.resolveGeneratorInputs({
        rawArguments: ["generate", "--name", "my-widget"],
        schema: REQUIRED_NAME_SCHEMA,
      });

      expect(inputs).toStrictEqual({ name: "my-widget" });
    });

    it("reads the inline --flag=value form", async () => {
      const inputs = await service.resolveGeneratorInputs({
        rawArguments: ["--name=my-widget"],
        schema: REQUIRED_NAME_SCHEMA,
      });

      expect(inputs).toStrictEqual({ name: "my-widget" });
    });

    it("refuses a missing required value with no terminal to ask at", async () => {
      await expect(
        service.resolveGeneratorInputs({
          rawArguments: [],
          schema: REQUIRED_NAME_SCHEMA,
        }),
      ).rejects.toThrow(
        "name is required, and stdin is not a terminal so it cannot be asked for. Pass --name.",
      );
    });

    // An optional input nobody can be asked about is left out rather than
    // refused: the run never needed the value.
    it("skips a missing optional value with no terminal to ask at", async () => {
      const inputs = await service.resolveGeneratorInputs({
        rawArguments: [],
        schema: { properties: { note: { type: "string" } } },
      });

      expect(inputs).toStrictEqual({});
    });

    it("prompts for a missing required value at a terminal", async () => {
      process.stdin.isTTY = true;
      promptRunner.mockResolvedValue({ value: "my-widget" });

      const inputs = await service.resolveGeneratorInputs({
        rawArguments: [],
        schema: REQUIRED_NAME_SCHEMA,
      });

      expect(inputs).toStrictEqual({ name: "my-widget" });
    });

    it("drops a prompted value the caller left blank", async () => {
      process.stdin.isTTY = true;
      promptRunner.mockResolvedValue({ value: "   " });

      const inputs = await service.resolveGeneratorInputs({
        rawArguments: [],
        schema: { properties: { note: { type: "string" } } },
      });

      expect(inputs).toStrictEqual({});
    });

    it("rejects a prompted value the schema refuses", async () => {
      process.stdin.isTTY = true;
      promptRunner.mockResolvedValue({ value: "nope" });

      await expect(
        service.resolveGeneratorInputs({
          rawArguments: [],
          schema: {
            properties: { type: { enum: ["packages", "applications"] } },
            required: ["type"],
          },
        }),
      ).rejects.toThrow("type must be one of: packages, applications");
    });

    it("rejects a value outside the schema enum", async () => {
      await expect(
        service.resolveGeneratorInputs({
          rawArguments: ["--type", "nope"],
          schema: {
            properties: { type: { enum: ["packages", "applications"] } },
            required: ["type"],
          },
        }),
      ).rejects.toThrow("type must be one of: packages, applications");
    });
  });

  describe("resolveInputsFromValues", () => {
    it("passes through values the caller already had", async () => {
      const inputs = await service.resolveInputsFromValues({
        providedInputs: { config: "configuration/conformetry.config.ts" },
        schema: { properties: { config: { type: "string" } } },
      });

      expect(inputs).toStrictEqual({
        config: "configuration/conformetry.config.ts",
      });
    });

    it("omits values the caller left undefined", async () => {
      const inputs = await service.resolveInputsFromValues({
        providedInputs: { projects: undefined },
        schema: { properties: { projects: { type: "string" } } },
      });

      expect(inputs).toStrictEqual({});
    });
  });

  describe("prompt gating", () => {
    // The precondition that makes the flag's removal safe: `prompts` draws its
    // menu on a non-terminal stdin, never resolves, and lets the process exit
    // 0 — which is exactly how this CLI used to hang.
    it("never reaches the prompt runner with no terminal to ask at", async () => {
      await expect(
        service.resolveGeneratorInputs({
          rawArguments: [],
          schema: REQUIRED_NAME_SCHEMA,
        }),
      ).rejects.toThrow("stdin is not a terminal");
      expect(promptRunner).not.toHaveBeenCalled();
    });

    // Nothing consults an environment variable any more: CI has no terminal,
    // so the terminal test already covers it.
    it("prompts in CI when a terminal is attached", async () => {
      process.stdin.isTTY = true;
      process.env["CI"] = "true";
      promptRunner.mockResolvedValue({ value: "my-widget" });

      try {
        await expect(
          service.resolveGeneratorInputs({
            rawArguments: [],
            schema: REQUIRED_NAME_SCHEMA,
          }),
        ).resolves.toStrictEqual({ name: "my-widget" });
      } finally {
        delete process.env["CI"];
      }
    });
  });
});
