// ♟️ Constants
import type { PipelineWindow } from "./pipeline-window.types";

/** Sweeps already started in this process, so tests sharing a window pay for it once. */
export const sweeps = new Map<string, Promise<PipelineWindow>>();
