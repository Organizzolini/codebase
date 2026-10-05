import { Test } from "@nestjs/testing";
import prompts from "prompts";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { missingInputError, promptCancelledError } from "./input.constants";
import { InputService } from "./input.service";

// Mocked at the module boundary so the service's own wiring is exercised and
// no test ever reaches for a terminal.
vi.mock("prompts", () => ({ default: vi.fn() }));

const promptRunner = vi.mocked(prompts);

describe(InputService, () => {
  let service: InputService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [InputService],
    }).compile();

    service = await module.resolve(InputService);
  });

  const originalIsTty = process.stdin.isTTY;

  afterEach(() => {
    promptRunner.mockReset();
    delete process.env["CI"];
    process.stdin.isTTY = originalIsTty;
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  // 📋 Comma-delimited option

  it("splits a comma-delimited option, trimming each entry", () => {
    expect(service.parseCommaDelimitedOption("alpha, beta")).toStrictEqual([
      "alpha",
      "beta",
    ]);
  });

  it("drops blank entries from a comma-delimited option", () => {
    expect(service.parseCommaDelimitedOption("alpha,,beta,")).toStrictEqual([
      "alpha",
      "beta",
    ]);
  });

  it("reads an absent comma-delimited option as an empty list", () => {
    expect(service.parseCommaDelimitedOption(undefined)).toStrictEqual([]);
  });

  // 🚩 Flag option

  it("reads a valueless boolean flag as present", () => {
    expect(service.parseFlagOption(undefined)).toBe(true);
  });

  it("passes an explicit boolean flag value through", () => {
    expect(service.parseFlagOption(false)).toBe(false);
  });

  // 🔡 Optional option

  it("passes a non-blank optional option through trimmed", () => {
    expect(service.parseOptionalOption("  codependix.config.ts  ")).toBe(
      "codependix.config.ts",
    );
  });

  it("reads a blank optional option as absent", () => {
    expect(service.parseOptionalOption("   ")).toBeUndefined();
  });

  it("reads an absent optional option as absent", () => {
    expect(service.parseOptionalOption(undefined)).toBeUndefined();
  });

  // 📂 Path option

  it("passes a given path option through trimmed", () => {
    expect(service.parsePathOption("  packages/logging  ")).toBe(
      "packages/logging",
    );
  });

  it("falls back to the working directory for an absent path option", () => {
    expect(service.parsePathOption(undefined)).toBe(process.cwd());
  });

  it("falls back to the working directory for a blank path option", () => {
    expect(service.parsePathOption("   ")).toBe(process.cwd());
  });

  // 🗣️ Prompting

  it("resolves a select prompt to the choice the user picked", async () => {
    process.stdin.isTTY = true;
    promptRunner.mockResolvedValue({ value: "write" });

    await expect(
      service.promptForSelect({
        choices: ["check", "write"],
        message: "Which mode?",
        subject: "A run mode",
      }),
    ).resolves.toBe("write");
  });

  it("rejects a select prompt that resolved outside its choices", async () => {
    process.stdin.isTTY = true;
    promptRunner.mockResolvedValue({ value: "nonsense" });

    await expect(
      service.promptForSelect({
        choices: ["check", "write"],
        message: "Which mode?",
        subject: "A run mode",
      }),
    ).rejects.toThrow("Prompt did not resolve to one of");
  });

  it("reports a dismissed select prompt as cancelled, not as a fault", async () => {
    process.stdin.isTTY = true;
    promptRunner.mockResolvedValue({});

    await expect(
      service.promptForSelect({
        choices: ["check", "write"],
        message: "Which mode?",
        subject: "A run mode",
      }),
    ).rejects.toThrow(promptCancelledError("A run mode").message);
  });

  // `prompts` draws its menu on a non-terminal stdin, never resolves, and lets
  // the process exit 0 — so the refusal has to come before it is ever called.
  it("refuses to draw a prompt when stdin is not a terminal", async () => {
    process.stdin.isTTY = false;

    await expect(
      service.promptForSelect({
        choices: ["check", "write"],
        message: "Which mode?",
        subject: "A run mode",
      }),
    ).rejects.toThrow(missingInputError("A run mode").message);
    expect(promptRunner).not.toHaveBeenCalled();
  });
});
