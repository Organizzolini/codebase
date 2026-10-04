import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  type Mock,
  vi,
} from "vitest";

import { LoggerService } from "@codebase/logger";

import { CorpusService } from "../corpus/corpus.service";
import { DatabaseService } from "../database/database.service";

import { DrawCodeService } from "./draw-code.service";
import { DrawEnumerationService } from "./draw-enumeration.service";
import { DrawIndexService } from "./draw-index.service";
import { DrawCommand } from "./draw.command";

import type { Meander } from "../database/entities/Meander.entity";

const { mkdirMock, writeFileMock } = vi.hoisted(() => ({
  mkdirMock: vi.fn<() => Promise<void>>(),
  writeFileMock: vi.fn<() => Promise<void>>(),
}));

vi.mock("node:fs/promises", () => ({
  mkdir: mkdirMock,
  writeFile: writeFileMock,
}));

/**
 * Covers what `DrawCommand` decides rather than what it produces: which of
 * its modes an option set selects — the sweep, or one `--code` drawing —
 * how each flag is parsed, and — since
 * the sweep writes `output/index.html` again — that it does so with
 * `DrawIndexService`'s own built page, once, at the path spec #813's
 * committed artifact lives at.
 *
 * Everything else the command produces is asserted against a real database
 * instead — `draw-sweep.command.integration.test.ts` for the sweep and
 * `draw.command.integration.test.ts` for the `--code` path — per spec #813's
 * Testing Decisions. `node:fs/promises` is mocked here rather than left real,
 * the same way this file used to mock it while the per-family procedural
 * pipeline still wrote a whole tree through it: a unit test has no business
 * touching the committed `output/index.html` a real write would clobber.
 */
describe(DrawCommand, () => {
  let build: Mock<() => Promise<Record<string, string>>>;
  let clear: Mock<() => Promise<void>>;
  let command: DrawCommand;
  let draw: Mock<() => Promise<Meander>>;
  let ingest: Mock<() => Promise<Meander[]>>;
  let sweep: Mock<() => Promise<number>>;

  beforeAll(async () => {
    build = vi.fn<() => Promise<Record<string, string>>>().mockResolvedValue({
      "families/snake.html": "<section></section>",
      "index.html": "<!doctype html>",
    });
    clear = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
    draw = vi
      .fn<() => Promise<Meander>>()
      .mockResolvedValue(
        createMock<Meander>({ id: "01a107d6-cff8-7238-8684-a2a863bc6928" }),
      );
    ingest = vi.fn<() => Promise<Meander[]>>().mockResolvedValue([]);
    sweep = vi.fn<() => Promise<number>>().mockResolvedValue(30_279);

    const module = await Test.createTestingModule({
      providers: [
        DrawCommand,
        {
          provide: DrawCodeService,
          useValue: createMock<DrawCodeService>({ draw }),
        },
        {
          provide: DrawEnumerationService,
          useValue: createMock<DrawEnumerationService>({ sweep }),
        },
        {
          provide: DrawIndexService,
          useValue: createMock<DrawIndexService>({ build }),
        },
        {
          provide: CorpusService,
          useValue: createMock<CorpusService>({ ingest }),
        },
        {
          provide: DatabaseService,
          useValue: createMock<DatabaseService>({ clear }),
        },
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
      ],
    }).compile();

    command = await module.resolve(DrawCommand);
  });

  beforeEach(() => {
    build.mockClear();
    clear.mockClear();
    draw.mockClear();
    ingest.mockClear();
    sweep.mockClear();
    writeFileMock.mockClear();
    mkdirMock.mockClear();
  });

  it("is defined", () => {
    expect(command).toBeDefined();
  });

  it("sets logger context", async () => {
    const module = await Test.createTestingModule({
      providers: [
        DrawCommand,
        {
          provide: DrawCodeService,
          useValue: createMock<DrawCodeService>(),
        },
        {
          provide: DrawEnumerationService,
          useValue: createMock<DrawEnumerationService>(),
        },
        {
          provide: DrawIndexService,
          useValue: createMock<DrawIndexService>(),
        },
        {
          provide: CorpusService,
          useValue: createMock<CorpusService>(),
        },
        {
          provide: DatabaseService,
          useValue: createMock<DatabaseService>(),
        },
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
      ],
    }).compile();

    await module.resolve(DrawCommand);

    const logger = await module.resolve(LoggerService);

    expect(logger.setContext).toHaveBeenCalledWith("DrawCommand");
  });

  it("clears the committed rows before sweeping, so a sweep regenerates rather than colliding with them", async () => {
    await command.run([], {});

    const [cleared] = clear.mock.invocationCallOrder;
    const [enumerated] = sweep.mock.invocationCallOrder;

    expect(clear).toHaveBeenCalledTimes(1);
    expect(cleared ?? Infinity).toBeLessThan(enumerated ?? 0);
  });

  it("sweeps both halves of the corpus when no Code is named", async () => {
    await command.run([], {});

    expect(sweep).toHaveBeenCalledTimes(1);
    expect(ingest).toHaveBeenCalledTimes(1);
    expect(draw).not.toHaveBeenCalled();
  });

  it("enumerates before ingesting, so a hardcoded collision is refused rather than overwriting", async () => {
    await command.run([], {});

    const [enumerated] = sweep.mock.invocationCallOrder;
    const [hardcoded] = ingest.mock.invocationCallOrder;

    expect(enumerated).toBeLessThan(hardcoded ?? 0);
  });

  it("rebuilds the index page from the sweep's own rows, once both halves have committed", async () => {
    await command.run([], {});

    expect(build).toHaveBeenCalledTimes(1);
    expect(writeFileMock).toHaveBeenCalledWith(
      expect.stringMatching(/output\/index\.html$/),
      "<!doctype html>",
    );
    expect(writeFileMock).toHaveBeenCalledWith(
      expect.stringMatching(/output\/families\/snake\.html$/),
      "<section></section>",
    );

    const [hardcoded] = ingest.mock.invocationCallOrder;
    const [written] = writeFileMock.mock.invocationCallOrder;

    expect(hardcoded ?? 0).toBeLessThan(written ?? 0);
  });

  it("draws the one meander a Code names, sweeping nothing and never rebuilding the index page", async () => {
    await command.run([], { code: "3c9a", columns: 2, rows: 3 });

    expect(draw).toHaveBeenCalledWith({ code: "3c9a", columns: 2, rows: 3 });
    expect(clear).not.toHaveBeenCalled();
    expect(sweep).not.toHaveBeenCalled();
    expect(build).not.toHaveBeenCalled();
    expect(writeFileMock).not.toHaveBeenCalled();
  });

  it("draws a self-contained formatted Code without requiring --rows and --columns", async () => {
    await command.run([], { code: "02x03y3c9a" });

    expect(draw).toHaveBeenCalledWith({
      code: "02x03y3c9a",
      columns: undefined,
      rows: undefined,
    });
    expect(sweep).not.toHaveBeenCalled();
  });

  it("refuses a Code given without both --rows and --columns", async () => {
    await expect(command.run([], { code: "0", rows: 2 })).rejects.toThrow(
      /needs both --rows and --columns/,
    );
    await expect(command.run([], { code: "0", columns: 1 })).rejects.toThrow(
      /needs both --rows and --columns/,
    );
    expect(draw).not.toHaveBeenCalled();
  });

  it("parses each option the command still takes", () => {
    expect(command.parseCode("3c9a")).toBe("3c9a");
    expect(command.parseColumns("2")).toBe(2);
    expect(command.parseRows("3")).toBe(3);
  });
});
