import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { missingInputError } from "../input/input.constants";
import { InputService } from "../input/input.service";

import { RUN_MODE_CHOICES, RUN_MODE_SUBJECT } from "./configuration.constants";
import { FlagResolutionService } from "./flag-resolution.service";

import type { RunMode } from "@codependix/core";

describe(FlagResolutionService, () => {
  let inputService: InputService;
  let service: FlagResolutionService;

  beforeAll(async () => {
    inputService = createMock<InputService>();

    const module = await Test.createTestingModule({
      providers: [
        FlagResolutionService,
        { provide: InputService, useValue: inputService },
      ],
    }).compile();

    service = await module.resolve(FlagResolutionService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("reads one check name", async () => {
    const { errors, mode } = await service.selectMode({ check: "boundaries" });

    expect(errors).toStrictEqual([]);
    expect(mode).toStrictEqual({
      checksBoundaries: true,
      checksReports: false,
      writes: false,
    });
  });

  it("reads a comma-separated set, ignoring surrounding space", async () => {
    const { mode } = await service.selectMode({
      check: " boundaries , reports ",
    });

    expect(mode.checksBoundaries).toBe(true);
    expect(mode.checksReports).toBe(true);
  });

  it("refuses a --check carrying no value", async () => {
    const { errors } = await service.selectMode({ check: true });

    expect(errors).toStrictEqual([
      '--check needs a value. It takes a comma-separated set drawn from "boundaries" and "reports", as in "--check boundaries,reports".',
    ]);
    expect(inputService.promptForSelect).not.toHaveBeenCalled();
  });

  it("refuses a --check whose value is only separators", async () => {
    const { errors } = await service.selectMode({ check: " , " });

    expect(errors).toHaveLength(1);
  });

  it("refuses a name it does not know, and names the ones it does", async () => {
    const { errors } = await service.selectMode({ check: "limits" });

    expect(errors).toStrictEqual([
      '--check does not accept "limits". It takes a comma-separated set drawn from "boundaries" and "reports", as in "--check boundaries,reports".',
    ]);
  });

  it("collects every mistake on one command line before reporting any", async () => {
    const { errors } = await service.selectMode({ check: "limits,depth" });

    expect(errors).toHaveLength(2);
  });

  it("refuses --write together with --check reports", async () => {
    const { errors } = await service.selectMode({
      check: "reports",
      write: true,
    });

    expect(errors).toStrictEqual([
      "--write cannot be combined with --check reports: an export cannot be stale in the run that just wrote it. Drop one of them, or run --write and --check reports separately.",
    ]);
  });

  it("allows --write together with --check boundaries", async () => {
    const { errors, mode } = await service.selectMode({
      check: "boundaries",
      write: true,
    });

    expect(errors).toStrictEqual([]);
    expect(mode).toStrictEqual({
      checksBoundaries: true,
      checksReports: false,
      writes: true,
    });
  });

  it("asks which mode was meant when the command line names none", async () => {
    vi.mocked(inputService.promptForSelect).mockResolvedValue("reports");

    const { mode } = await service.selectMode({});

    expect(inputService.promptForSelect).toHaveBeenCalledWith({
      choices: RUN_MODE_CHOICES,
      message:
        "Check declared boundaries, check every configured export is current, or write them?",
      subject: RUN_MODE_SUBJECT,
    });
    expect(mode.checksReports).toBe(true);
  });

  it.each([
    ["boundaries", { checksBoundaries: true }],
    ["reports", { checksReports: true }],
    ["write", { writes: true }],
  ])("turns the answer %s into that mode alone", async (choice, expected) => {
    vi.mocked(inputService.promptForSelect).mockResolvedValue(choice);

    const { mode } = await service.selectMode({});

    expect(mode).toStrictEqual({
      checksBoundaries: false,
      checksReports: false,
      writes: false,
      ...expected,
    });
  });

  it("lets an unanswerable prompt refuse the run", async () => {
    vi.mocked(inputService.promptForSelect).mockRejectedValue(
      missingInputError(RUN_MODE_SUBJECT),
    );

    await expect(service.selectMode({})).rejects.toThrow(RUN_MODE_SUBJECT);
  });

  it.each([
    [{ checksBoundaries: true }, false],
    [{ checksReports: true }, true],
    [{ writes: true }, true],
  ])("decides from %o whether the run touches files", (overrides, expected) => {
    const mode: RunMode = {
      checksBoundaries: false,
      checksReports: false,
      writes: false,
      ...overrides,
    };

    expect(service.touchesFiles(mode)).toBe(expected);
  });
});
