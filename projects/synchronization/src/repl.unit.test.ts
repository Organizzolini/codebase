import { createMock } from "@golevelup/ts-vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SynchronizationModule } from "./modules/synchronization/synchronization.module";

const repl = vi
  .fn<(module: unknown) => Promise<void>>()
  .mockResolvedValue(undefined);
const synchronizationModuleMock = createMock<SynchronizationModule>();

vi.mock("@nestjs/core", () => ({
  DiscoveryModule: function DiscoveryModule() {
    return undefined;
  },
  repl,
}));

vi.mock("./modules/synchronization/synchronization.module", () => ({
  SynchronizationModule: function SynchronizationModule() {
    return synchronizationModuleMock;
  },
}));

describe("repl bootstrap", () => {
  beforeEach(() => {
    repl.mockClear();
    vi.resetModules();
  });

  it("starts the nest repl for the synchronization module", async () => {
    await import("./repl");

    expect(repl).toHaveBeenCalledTimes(1);
  });
});
