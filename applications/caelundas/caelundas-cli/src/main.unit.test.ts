import { beforeEach, describe, expect, it, vi } from "vitest";

import { MainModule } from "./main.module";

import type * as NestCommanderModule from "nest-commander";

interface CommandFactoryModule {
  readonly name?: string;
}

interface CommandFactoryOptions {
  readonly bufferLogs?: boolean;
  readonly logger?: unknown;
}

const { mockCommandFactoryRun } = vi.hoisted(() => ({
  mockCommandFactoryRun: vi
    .fn<
      (
        rootModule: CommandFactoryModule,
        options: CommandFactoryOptions,
      ) => Promise<void>
    >()
    .mockResolvedValue(undefined),
}));

vi.mock("nest-commander", async (importOriginal) => {
  const actual = await importOriginal<typeof NestCommanderModule>();
  return {
    ...actual,
    CommandFactory: {
      run: mockCommandFactoryRun,
    },
  };
});

describe("main", () => {
  beforeEach(() => {
    vi.resetModules();
    mockCommandFactoryRun.mockClear();
  });

  it("bootstraps the command factory with the root module", async () => {
    await import("./main");

    expect(mockCommandFactoryRun).toHaveBeenCalledTimes(1);

    const firstCall = mockCommandFactoryRun.mock.calls[0];

    if (firstCall === undefined) throw new Error("firstCall is undefined");

    const module = firstCall[0];

    expect(module.name).toBe(MainModule.name);

    const options = firstCall[1];

    expect(options.bufferLogs).toBe(true);
    expect(options.logger).toBeDefined();
  });
});
