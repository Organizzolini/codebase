import "reflect-metadata";
import { parentPort } from "node:worker_threads";

import { NestFactory } from "@nestjs/core";

import { DrawWorkerModule } from "./modules/draw/draw-worker.module";
import { DrawWorkerService } from "./modules/draw/draw-worker.service";

import type {
  DrawWorkerReply,
  DrawWorkerTask,
} from "./modules/draw/draw.types";

/**
 * The entry point of one draw run worker thread, spawned by
 * `DrawPoolService`: boots `DrawWorkerModule` once, then draws every batch
 * of orbit minima it is sent and posts the rows back.
 *
 * A failure is posted rather than thrown, so the pool rejects the one
 * batch that failed with the worker's own message instead of losing the
 * thread. Messages sent while the context is still booting wait on the
 * port until the listener below is attached.
 */
async function bootstrap(): Promise<void> {
  const port = parentPort;

  if (port === null) {
    throw new Error("src/worker.ts runs only as a worker thread");
  }

  const context = await NestFactory.createApplicationContext(DrawWorkerModule, {
    logger: false,
  });
  const drawWorkerService = context.get(DrawWorkerService);

  port.on("message", (task: DrawWorkerTask) => {
    let reply: DrawWorkerReply;

    try {
      reply = { records: drawWorkerService.records(task.shape, task.masks) };
    } catch (error) {
      reply = { error: error instanceof Error ? error.message : String(error) };
    }

    port.postMessage(reply);
  });
}

await bootstrap();
