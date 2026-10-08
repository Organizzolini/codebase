import { NestFactory } from "@nestjs/core";

import { inputSchema } from "../src/modules/input/input.constants";
import { PerfectiveService } from "../src/modules/perfective/perfective.service";
import { ProgressiveService } from "../src/modules/progressive/progressive.service";

import { PipelineWindowModule } from "./pipeline-window.module";

import type {
  PipelineWindow,
  PipelineWindowRequest,
} from "./pipeline-window.types";

/** Sweeps already started in this process, so tests sharing a window pay for it once. */
const sweeps = new Map<string, Promise<PipelineWindow>>();

/**
 * Runs the real perfective pass, then the real progressive pass, over a short
 * window of Swiss Ephemeris data, and returns what they detected.
 *
 * It stops where `CaelundasCommand` stores events: no Postgres, no calendar
 * file, and no network. The ephemeris files must already be on disk, which
 * `nx run caelundas-cli:download-ephemeris` puts there.
 *
 * Results are cached per request for the life of the process, so a test file
 * can assert many reference cases against one sweep.
 */
export async function runPipelineWindow(
  request: PipelineWindowRequest,
): Promise<PipelineWindow> {
  const key = JSON.stringify([
    request.latitude,
    request.longitude,
    request.startDate,
    request.endDate,
  ]);
  const cached = sweeps.get(key);
  if (cached) {
    return cached;
  }

  const pending = sweep(request);
  sweeps.set(key, pending);
  // A failed sweep must not poison later tests that share its window.
  pending.catch(() => sweeps.delete(key));
  return pending;
}

/** Boots the detection application, runs both passes over the request, and shuts it down. */
async function sweep(request: PipelineWindowRequest): Promise<PipelineWindow> {
  const input = inputSchema.parse(request);
  const context = await NestFactory.createApplicationContext(
    PipelineWindowModule,
    { abortOnError: false, logger: false },
  );

  try {
    const perfective = context.get(PerfectiveService).detect(input);
    const progressive = context.get(ProgressiveService).detect(perfective);

    return {
      events: [...perfective, ...progressive].toSorted(
        (a, b) => a.start.valueOf() - b.start.valueOf(),
      ),
      input,
      perfective,
      progressive,
    };
  } finally {
    await context.close();
  }
}
