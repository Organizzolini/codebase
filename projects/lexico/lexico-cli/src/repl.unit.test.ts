import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const replMock = vi.fn<() => Promise<void>>(async (): Promise<void> => {});

vi.mock("@nestjs/core", () => ({
  repl: replMock,
}));

vi.mock("./main.module", () => ({
  MainModule: function MainModule() {
    return undefined;
  },
}));

describe("repl bootstrap", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("starts NestJS repl with ingestion module", async () => {
    await import("./repl");

    await vi.waitFor(() => {
      expect(replMock).toHaveBeenCalledTimes(1);
    });

    expect(replMock).toHaveBeenCalledWith(expect.any(Function));
  }, 15_000);
});
