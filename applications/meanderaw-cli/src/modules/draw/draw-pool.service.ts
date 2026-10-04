import path from "node:path";
import { fileURLToPath } from "node:url";
import { Worker } from "node:worker_threads";

import { Inject, Injectable, type OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { TileEnumerationService } from "../enumeration/tile-enumeration.service";

import { DrawWorkerService } from "./draw-worker.service";
import { DRAW_POOL_BATCH_SIZE, DrawWorkerError } from "./draw.constants";

import type { MeanderRecord, MeanderShape } from "../database/database.types";
import type { Environment } from "../enumeration/enumeration.types";
import type { DrawWorkerReply, DrawWorkerTask } from "./draw.types";

/**
 * Draws a shape's meanders across worker threads, and hands its rows back a
 * wave of batches at a time, in the one order a single thread would have
 * drawn them in.
 *
 * Walking a shape's symmetry classes is cheap — `orbitMinima` is a few
 * nanoseconds an assignment, on this thread — but drawing each class's row
 * is about half a millisecond of decoding, rendering, and measuring, with
 * no meander depending on another. So the minima are cut into batches and
 * dealt to `DRAW_WORKERS` threads, each running {@link DrawWorkerService}
 * in its own context booted from `src/worker.ts`, while this thread only
 * deals batches and hands back what returns. With no workers configured the
 * same service runs in-process, which is what the suites pin.
 *
 * Rows are handed back a wave at a time — one batch per thread — rather than
 * a whole shape at a time, and the next wave is already drawing while this
 * one is written. The largest shape at the default budget holds over four
 * million meanders, which as one array of rows would outgrow the machine;
 * as waves, no more than two of them are ever held at once.
 *
 * Threads are spawned on first use and kept for the whole draw run, since
 * booting one costs about a second; {@link close} ends them, and the draw run
 * calls it once its last shape is drawn.
 */
@Injectable()
export class DrawPoolService implements OnModuleDestroy {
  // 🏗 Dependency Injection

  constructor(
    @Inject(DrawWorkerService)
    private readonly drawWorkerService: DrawWorkerService,
    @Inject(TileEnumerationService)
    private readonly tileEnumerationService: TileEnumerationService,
    @Inject(ConfigService)
    configService: ConfigService<Environment>,
  ) {
    this.workerCount = configService.get<number>("DRAW_WORKERS", 0);
  }

  // 🔐 Private Fields

  /** How many threads draw a shape, read once from `DRAW_WORKERS`; zero draws in-process. */
  private readonly workerCount: number;

  /** The live threads, spawned by the first shape that needs them. */
  private workers: undefined | Worker[];

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Cuts a shape's minima into the batches a thread draws at once. */
  private batchesOf(masks: readonly number[]): number[][] {
    const batches: number[][] = [];

    for (let start = 0; start < masks.length; start += DRAW_POOL_BATCH_SIZE) {
      batches.push(masks.slice(start, start + DRAW_POOL_BATCH_SIZE));
    }

    return batches;
  }

  /** Sends one batch to one thread and resolves with the rows it posts back. */
  private async draw(
    worker: Worker,
    task: DrawWorkerTask,
  ): Promise<readonly MeanderRecord[]> {
    return new Promise((resolve, reject) => {
      const onError = (error: Error): void => {
        worker.off("message", onMessage);
        reject(error);
      };
      const onMessage = (reply: DrawWorkerReply): void => {
        worker.off("error", onError);

        if ("error" in reply) {
          reject(new DrawWorkerError(reply.error));
        } else {
          resolve(reply.records);
        }
      };

      worker.once("error", onError);
      worker.once("message", onMessage);
      worker.postMessage(task);
    });
  }

  /**
   * The pool's threads, spawned on first use. Source runs under the SWC
   * loader the `start` target uses, which a thread needs passing again;
   * compiled output runs as plain JavaScript.
   */
  private spawn(): Worker[] {
    if (this.workers === undefined) {
      const extension = path.extname(fileURLToPath(import.meta.url));
      const entry = new URL(`../../worker${extension}`, import.meta.url);
      const execArgv =
        extension === ".ts"
          ? ["--import", "@swc-node/register/esm-register"]
          : [];

      this.workers = Array.from(
        { length: this.workerCount },
        () => new Worker(entry, { execArgv }),
      );
    }

    return this.workers;
  }

  /**
   * Draws a wave of batches, one per thread, starting at batch `start`; a
   * shape's last wave can hold fewer batches than there are threads.
   */
  private async wave(
    shape: MeanderShape,
    batches: readonly (readonly number[])[],
    start: number,
  ): Promise<(readonly MeanderRecord[])[]> {
    return Promise.all(
      this.spawn().flatMap((worker, index) => {
        const masks = batches[start + index];

        return masks === undefined ? [] : [this.draw(worker, { masks, shape })];
      }),
    );
  }

  /**
   * Hands back a shape's batches a wave at a time, the next wave already
   * drawing while this one's rows are written. A wave still drawing when the
   * reader stops — because a write failed — is awaited before returning, so
   * its rejection is never left unobserved.
   */
  private async *waves(
    shape: MeanderShape,
    batches: readonly (readonly number[])[],
  ): AsyncGenerator<readonly MeanderRecord[]> {
    const size = this.spawn().length;
    let pending = this.wave(shape, batches, 0);

    try {
      for (let start = 0; start < batches.length; start += size) {
        const drawn = await pending;

        pending =
          start + size < batches.length
            ? this.wave(shape, batches, start + size)
            : Promise.resolve([]);

        yield* drawn;
      }
    } finally {
      await pending.catch(() => []);
    }
  }

  // 🌎 Public Methods

  /**
   * Every meander of one shape as the rows the database holds for them, a
   * batch at a time, one per symmetry class, in the order the shape's orbit
   * minima ascend.
   *
   * With threads, a wave of batches — one per thread — is drawn at once, and
   * the next wave starts drawing before this one's rows are handed back, so
   * writing a wave overlaps drawing the next and at most two are ever held.
   */
  async *batches(
    shape: MeanderShape,
  ): AsyncGenerator<readonly MeanderRecord[]> {
    const batches = this.batchesOf(
      this.tileEnumerationService.orbitMinima(shape.rows, shape.columns),
    );

    if (this.workerCount === 0) {
      for (const masks of batches) {
        yield this.drawWorkerService.records(shape, masks);
      }

      return;
    }

    yield* this.waves(shape, batches);
  }

  /** Ends every thread the pool spawned; the next shape spawns fresh ones. */
  async close(): Promise<void> {
    const workers = this.workers ?? [];

    this.workers = undefined;
    await Promise.all(workers.map(async (worker) => worker.terminate()));
  }

  /** Ends the pool's threads with the application, so none outlives it. */
  async onModuleDestroy(): Promise<void> {
    await this.close();
  }
}
