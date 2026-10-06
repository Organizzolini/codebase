import { MessageChannel } from "node:worker_threads";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type {
  DrawWorkerReply,
  DrawWorkerTask,
} from "./modules/draw/draw.types";
import type { MeanderRecord } from "./modules/meanderaw-database/meanderaw-database.types";
import type * as NestCore from "@nestjs/core";
import type * as WorkerThreads from "node:worker_threads";

const { records, threads } = vi.hoisted(() => {
  const state: { port: null | WorkerThreads.MessagePort } = { port: null };

  return {
    records:
      vi.fn<
        (
          shape: DrawWorkerTask["shape"],
          masks: readonly number[],
        ) => MeanderRecord[]
      >(),
    threads: state,
  };
});

vi.mock("node:worker_threads", async (importOriginal) => {
  const actual = await importOriginal<typeof WorkerThreads>();

  return {
    ...actual,
    get parentPort(): null | WorkerThreads.MessagePort {
      return threads.port;
    },
  };
});

vi.mock("@nestjs/core", async (importOriginal) => ({
  ...(await importOriginal<typeof NestCore>()),
  NestFactory: {
    createApplicationContext: vi
      .fn<() => Promise<{ get: () => { records: typeof records } }>>()
      .mockResolvedValue({ get: () => ({ records }) }),
  },
}));

/**
 * `src/worker.ts` only ever runs inside a thread the pool spawns, where
 * coverage cannot follow it, so it is imported in-process here, with one
 * end of a real `MessageChannel` as its `parentPort` and its Nest context
 * faked, and the test plays the pool on the channel's other end.
 */
describe("worker", () => {
  const task: DrawWorkerTask = {
    masks: [1, 2],
    shape: { columns: 2, rows: 3 },
  };
  let channel: MessageChannel;

  /** Boots the entry point, hands it `task`, and resolves with its reply. */
  const send = async (): Promise<DrawWorkerReply> => {
    threads.port = channel.port1;
    await import("./worker");

    const reply = new Promise<DrawWorkerReply>((resolve) => {
      channel.port2.once("message", resolve);
    });

    channel.port2.postMessage(task);

    return reply;
  };

  beforeEach(() => {
    vi.resetModules();
    records.mockReset();
    channel = new MessageChannel();
  });

  afterEach(() => {
    channel.port1.close();
    channel.port2.close();
  });

  it("draws each batch it is sent and posts the rows back", async () => {
    records.mockReturnValue([]);

    await expect(send()).resolves.toStrictEqual({ records: [] });
    expect(records).toHaveBeenCalledWith(task.shape, task.masks);
  });

  it("posts a failed batch's error message rather than throwing it", async () => {
    records.mockImplementation(() => {
      throw new Error("💥 the drawing broke");
    });

    await expect(send()).resolves.toStrictEqual({
      error: "💥 the drawing broke",
    });
  });

  it("posts anything else a batch throws as text", async () => {
    const thrown: unknown = "a bare string";

    records.mockImplementation(() => {
      throw thrown;
    });

    await expect(send()).resolves.toStrictEqual({ error: "a bare string" });
  });

  it("refuses to run outside a worker thread", async () => {
    threads.port = null;

    await expect(import("./worker")).rejects.toThrow(
      "src/worker.ts runs only as a worker thread",
    );
  });
});
