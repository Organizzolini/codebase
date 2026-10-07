import { createMock } from "@golevelup/ts-vitest";
import { ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { TileEnumerationService } from "../enumeration/tile-enumeration.service";

import { DrawPoolService } from "./draw-pool.service";
import { DrawWorkerService } from "./draw-worker.service";
import { DRAW_POOL_BATCH_SIZE, DrawWorkerError } from "./draw.constants";

import type { MeanderRecord } from "../meanderaw-database/meanderaw-database.types";
import type { DrawWorkerTask } from "./draw.types";
import type { EventEmitter } from "node:events";
import type * as NodeUrl from "node:url";

/** How a faked thread answers one batch, and every thread spawned so far. */
const { threads } = vi.hoisted(() => {
  const state: {
    compiled: boolean;
    reply: (worker: EventEmitter, task: DrawWorkerTask) => void;
    spawned: {
      readonly options: { readonly execArgv: readonly string[] };
      readonly terminate: () => Promise<number>;
    }[];
  } = { compiled: false, reply: () => undefined, spawned: [] };

  return { threads: state };
});

vi.mock("node:worker_threads", async () => {
  const { EventEmitter: Emitter } = await import("node:events");

  /** A thread that answers each batch as `threads.reply` scripts, a tick later. */
  class FakeWorker extends Emitter {
    constructor(
      _entry: URL,
      readonly options: { readonly execArgv: readonly string[] },
    ) {
      super();
      threads.spawned.push(this);
    }

    readonly terminate = vi.fn<() => Promise<number>>().mockResolvedValue(0);

    postMessage(task: DrawWorkerTask): void {
      setImmediate(() => {
        threads.reply(this, task);
      });
    }
  }

  return { Worker: FakeWorker };
});

vi.mock("node:url", async (importOriginal) => {
  const actual = await importOriginal<typeof NodeUrl>();

  return {
    ...actual,
    fileURLToPath: (url: string | URL) =>
      threads.compiled
        ? "/dist/modules/draw/draw-pool.service.js"
        : actual.fileURLToPath(url),
  };
});

describe(DrawPoolService, () => {
  let service: DrawPoolService;
  let drawWorkerService: DrawWorkerService;
  let tileEnumerationService: TileEnumerationService;

  const shape = { columns: 2, rows: 3 };
  const first = createMock<MeanderRecord>({ code: "first" });
  const second = createMock<MeanderRecord>({ code: "second" });

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        DrawPoolService,
        { provide: ConfigService, useValue: { get: () => 0 } },
        {
          provide: DrawWorkerService,
          useValue: createMock<DrawWorkerService>(),
        },
        {
          provide: TileEnumerationService,
          useValue: createMock<TileEnumerationService>(),
        },
      ],
    }).compile();

    service = await module.resolve(DrawPoolService);
    drawWorkerService = await module.resolve(DrawWorkerService);
    tileEnumerationService = await module.resolve(TileEnumerationService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("batches", () => {
    /** Reads every batch a shape's draw hands back. */
    const drawn = async (): Promise<(readonly MeanderRecord[])[]> => {
      const batches: (readonly MeanderRecord[])[] = [];

      for await (const batch of service.batches(shape)) {
        batches.push(batch);
      }

      return batches;
    };

    it("draws a shape's orbit minima in-process when configured with no workers", async () => {
      vi.mocked(tileEnumerationService.orbitMinima).mockReturnValue([1, 2]);
      vi.mocked(drawWorkerService.records).mockReturnValue([first]);

      await expect(drawn()).resolves.toStrictEqual([[first]]);
      expect(tileEnumerationService.orbitMinima).toHaveBeenCalledWith(3, 2);
      expect(drawWorkerService.records).toHaveBeenCalledWith(shape, [1, 2]);
    });

    it("hands a shape back a batch at a time, never more than one batch's worth of minima per draw", async () => {
      vi.mocked(tileEnumerationService.orbitMinima).mockReturnValue(
        Array.from(
          { length: DRAW_POOL_BATCH_SIZE + 1 },
          (_mask, index) => index,
        ),
      );
      vi.mocked(drawWorkerService.records)
        .mockReturnValueOnce([first])
        .mockReturnValueOnce([second]);

      await expect(drawn()).resolves.toStrictEqual([[first], [second]]);
      expect(drawWorkerService.records).toHaveBeenLastCalledWith(shape, [
        DRAW_POOL_BATCH_SIZE,
      ]);
    });
  });

  describe("across worker threads", () => {
    let threaded: DrawPoolService;

    /** Reads every batch the threaded pool hands back for one shape. */
    const drawn = async (): Promise<(readonly MeanderRecord[])[]> => {
      const batches: (readonly MeanderRecord[])[] = [];

      for await (const batch of threaded.batches(shape)) {
        batches.push(batch);
      }

      return batches;
    };

    beforeAll(async () => {
      const module = await Test.createTestingModule({
        providers: [
          DrawPoolService,
          { provide: ConfigService, useValue: { get: () => 2 } },
          {
            provide: DrawWorkerService,
            useValue: createMock<DrawWorkerService>(),
          },
          { provide: TileEnumerationService, useValue: tileEnumerationService },
        ],
      }).compile();

      threaded = await module.resolve(DrawPoolService);
    });

    afterEach(async () => {
      await threaded.close();
      threads.compiled = false;
      threads.spawned.length = 0;
    });

    it("hands back each wave of batches in batch order, one batch per thread", async () => {
      vi.mocked(tileEnumerationService.orbitMinima).mockReturnValue(
        Array.from(
          { length: DRAW_POOL_BATCH_SIZE * 2 + 1 },
          (_mask, index) => index,
        ),
      );
      threads.reply = (worker, task) => {
        worker.emit("message", {
          records: [createMock<MeanderRecord>({ code: `${task.masks[0]}` })],
        });
      };

      const batches = await drawn();
      const codes = batches.map((batch) => batch.map(({ code }) => code));

      expect(codes).toStrictEqual([
        ["0"],
        [`${DRAW_POOL_BATCH_SIZE}`],
        [`${DRAW_POOL_BATCH_SIZE * 2}`],
      ]);
      expect(
        threads.spawned.map(({ options }) => options.execArgv),
      ).toStrictEqual([
        ["--import", "@swc-node/register/esm-register"],
        ["--import", "@swc-node/register/esm-register"],
      ]);
    });

    it("spawns compiled threads as plain JavaScript, without the SWC loader", async () => {
      vi.mocked(tileEnumerationService.orbitMinima).mockReturnValue([1]);
      threads.compiled = true;
      threads.reply = (worker) => {
        worker.emit("message", { records: [] });
      };
      await drawn();

      expect(
        threads.spawned.map(({ options }) => options.execArgv),
      ).toStrictEqual([[], []]);
    });

    it("fails the draw run with the worker's own message when a thread cannot draw its batch", async () => {
      vi.mocked(tileEnumerationService.orbitMinima).mockReturnValue([1]);
      threads.reply = (worker) => {
        worker.emit("message", { error: "💥 the drawing broke" });
      };

      await expect(drawn()).rejects.toThrow(
        new DrawWorkerError("💥 the drawing broke"),
      );
    });

    it("fails the draw run with the thread's error when a thread dies", async () => {
      vi.mocked(tileEnumerationService.orbitMinima).mockReturnValue([1]);
      threads.reply = (worker) => {
        worker.emit("error", new Error("💥 the thread died"));
      };

      await expect(drawn()).rejects.toThrow("💥 the thread died");
    });

    it("ends its threads with the application", async () => {
      vi.mocked(tileEnumerationService.orbitMinima).mockReturnValue([1]);
      threads.reply = (worker) => {
        worker.emit("message", { records: [] });
      };
      await drawn();

      const [spawned] = threads.spawned;

      await threaded.onModuleDestroy();

      expect(spawned?.terminate).toHaveBeenCalledTimes(1);
    });
  });
});
