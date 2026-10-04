import { describe, expect, it, vi } from "vitest";

import { runBootstrapCli } from "./modules/generator/bootstrap.utilities";

// The bootstrap emits a generator plugin into the workspace; what this entry
// point owns is running it for the directory the command was started in.
vi.mock("./modules/generator/bootstrap.utilities", () => ({
  runBootstrapCli: vi.fn<(workspaceRoot: string) => Promise<void>>(),
}));

describe("main", () => {
  it("runs the bootstrap for the current working directory", async () => {
    expect.hasAssertions();

    await import("./main");

    expect(runBootstrapCli).toHaveBeenCalledExactlyOnceWith(process.cwd());
  });
});
