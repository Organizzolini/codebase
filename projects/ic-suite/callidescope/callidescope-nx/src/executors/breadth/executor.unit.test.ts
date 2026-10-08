import { beforeEach, describe, expect, it, vi } from "vitest";

import { runAddressExecutor } from "../../modules/address/address.utilities";

import breadthExecutor from "./executor";

import type { ExecutorContext } from "@nx/devkit";

vi.mock("../../modules/address/address.utilities", () => ({
  runAddressExecutor: vi.fn<() => Promise<{ success: boolean }>>(
    async () => await Promise.resolve({ success: true }),
  ),
}));

/** A minimal executor context, built literally so nothing is cast. */
function buildContext(): ExecutorContext {
  return {
    cwd: "/workspace",
    isVerbose: false,
    nxJsonConfiguration: {},
    projectGraph: { dependencies: {}, nodes: {} },
    projectName: "alpha",
    projectsConfigurations: { projects: {}, version: 2 },
    root: "/workspace",
  };
}

describe(breadthExecutor, () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("delegates to the shared runner, asking for the breadth lookup", async () => {
    expect.hasAssertions();

    const context = buildContext();
    const options = { addresses: ["src/foo.service.ts#FooService.bar"] };

    await expect(breadthExecutor(options, context)).resolves.toStrictEqual({
      success: true,
    });
    // The literal is the whole of this executor: passing the other one would
    // silently answer a different question.
    expect(runAddressExecutor).toHaveBeenCalledWith({
      context,
      kind: "breadth",
      options,
    });
  });
});
