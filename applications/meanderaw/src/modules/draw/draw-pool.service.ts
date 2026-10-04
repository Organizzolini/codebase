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
import type {
  DrawWorkerReply,
  DrawWorkerTask,
  KeyedMeanderRecord,
} from "./draw.types";

/**
 * Draws a shape's meanders across worker threads, and hands back its rows in
 * the one order a single thread would have drawn them in.
 *
 * Walking a shape's symmetry classes is cheap — `orbitMinima` is a few
 * nanoseconds an assignment, on this thread — but drawing each class's row
 * is about half a millisecond of decoding, rendering, and measuring, with
 * no meander depending on another. So the minima are cut into batches and
 * dealt to `DRAW_WORKERS` threads, each running {@link DrawWorkerService}
 * in its own context booted from `src/worker.ts`, while this thread only
 * deals batches and sorts what comes back. With no workers configured the
 * same service runs in-process, which is what the suites pin.
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
    this.workerCount = configService.get<number>("DRAW_WORKERS") ?? 0;
  }

  // 🔐 Private Fields

  /** How many threads draw a shape, read once from `DRAW_WORKERS`; zero draws in-process. */
  private readonly workerCount: number;

  /** The live threads, spawned by the first shape that needs them. */
  private workers: undefined | Worker[];

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Deals a shape's minima to every thread in batches, each thread taking
   * the next batch as soon as it finishes one, and answers with every row
   * in batch order.
   */
  private async distribute(
    shape: MeanderShape,
    masks: readonly number[],
  ): Promise<KeyedMeanderRecord[]> {
    const batches: number[][] = [];

    for (let start = 0; start < masks.length; start += DRAW_POOL_BATCH_SIZE) {
      batches.push(masks.slice(start, start + DRAW_POOL_BATCH_SIZE));
    }

    const drawn: (readonly KeyedMeanderRecord[])[] = [];
    let next = 0;

    await Promise.all(
      this.spawn().map(async (worker) => {
        for (let index = next; index < batches.length; index = next) {
          next += 1;
          drawn[index] = await this.draw(worker, {
            masks: batches[index] ?? [],
            shape,
          });
        }
      }),
    );

    return drawn.flat();
  }

  /** Sends one batch to one thread and resolves with the rows it posts back. */
  private async draw(
    worker: Worker,
    task: DrawWorkerTask,
  ): Promise<readonly KeyedMeanderRecord[]> {
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

  // 🌎 Public Methods

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

  /**
   * Every meander of one shape as the row the database holds for it, one
   * per symmetry class, ordered by representative edge key — the order
   * `TileEnumerationService.enumerate` names them in.
   */
  async records(shape: MeanderShape): Promise<MeanderRecord[]> {
    const masks = this.tileEnumerationService.orbitMinima(
      shape.rows,
      shape.columns,
    );
    const keyed =
      this.workerCount === 0
        ? this.drawWorkerService.records(shape, masks)
        : await this.distribute(shape, masks);

    return keyed
      .toSorted((first, second) =>
        first.key < second.key ? -1 : first.key > second.key ? 1 : 0,
      )
      .map(({ record }) => record);
  }
}
