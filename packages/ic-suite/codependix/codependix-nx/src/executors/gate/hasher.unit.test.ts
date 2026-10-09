import { createMock } from "@golevelup/ts-vitest";
import { describe, expect, it, vi } from "vitest";

import gateHasher from "./hasher";

import type { GateService } from "../../modules/gate/gate.service";
import type { GateHasherContext } from "../../modules/gate/gate.types";
import type { Task } from "@nx/devkit";

const gateService = createMock<GateService>();

vi.mock("../../modules/plugin/plugin-context.utilities", () => ({
  resolveGateService: async (): Promise<GateService> =>
    await Promise.resolve(gateService),
}));

describe(gateHasher, () => {
  it("hands the task and the hashing context to the gate", async () => {
    expect.hasAssertions();

    const context = createMock<GateHasherContext>();
    const task = createMock<Task>();
    const hash = { details: { command: "c", nodes: {} }, value: "v" };

    gateService.hashTask.mockResolvedValue(hash);

    await expect(gateHasher(task, context)).resolves.toBe(hash);
    expect(gateService.hashTask).toHaveBeenCalledWith({ context, task });
  });
});
