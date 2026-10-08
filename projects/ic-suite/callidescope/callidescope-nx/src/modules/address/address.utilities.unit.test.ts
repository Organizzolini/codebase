import { createMock } from "@golevelup/ts-vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { OptionsService } from "../options/options.service";

import { runAddressExecutor } from "./address.utilities";

import type { PluginService } from "../plugin/plugin.service";
import type { ResolvedTraceScope } from "../plugin/plugin.types";
import type { AddressService } from "./address.service";
import type { ExecutorContext } from "@nx/devkit";

const addressService = createMock<AddressService>();
const pluginService = createMock<PluginService>();

vi.mock("../plugin/plugin-context.utilities", () => ({
  resolveAddressService: async (): Promise<AddressService> =>
    await Promise.resolve(addressService),
  resolveOptionsService: async (): Promise<OptionsService> =>
    await Promise.resolve(new OptionsService()),
  resolvePluginService: async (): Promise<PluginService> =>
    await Promise.resolve(pluginService),
}));

/** The address every test looks up. */
const ADDRESS = "src/foo.service.ts#FooService.bar";

/** An executor context for a run against one project, or against none. */
function buildContext(projectName?: string): ExecutorContext {
  return {
    cwd: "/workspace",
    isVerbose: false,
    nxJsonConfiguration: {},
    projectGraph: { dependencies: {}, nodes: {} },
    projectsConfigurations: { projects: {}, version: 2 },
    root: "/workspace",
    ...(projectName === undefined ? {} : { projectName }),
  };
}

/** A resolved scope with nothing refused. */
function buildScope(
  overrides: Partial<ResolvedTraceScope> = {},
): ResolvedTraceScope {
  return {
    directories: ["packages/alpha"],
    knownNames: ["alpha"],
    knownTags: ["type:package"],
    projectNames: ["alpha"],
    selectedDirectories: ["packages/alpha"],
    unknownNames: [],
    unmatchedTags: [],
    ...overrides,
  };
}

describe(runAddressExecutor, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pluginService.resolveTraceScope.mockResolvedValue(buildScope());
    pluginService.describeRefusedScope.mockReturnValue("Unknown Nx projects.");
    addressService.runDepth.mockResolvedValue({ ok: true, report: "# Depth" });
    addressService.runBreadth.mockResolvedValue({
      ok: true,
      report: "# Breadth",
    });
    vi.spyOn(process.stdout, "write").mockReturnValue(true);
  });

  it.each([
    ["depth", "# Depth"],
    ["breadth", "# Breadth"],
  ] as const)(
    "runs the %s lookup and prints its report",
    async (kind, report) => {
      expect.hasAssertions();

      await expect(
        runAddressExecutor({
          context: buildContext("alpha"),
          kind,
          options: { addresses: [ADDRESS] },
        }),
      ).resolves.toStrictEqual({ success: true });
      expect(process.stdout.write).toHaveBeenCalledWith(`${report}\n`);
    },
  );

  it("resolves the addresses against the project and its dependencies", async () => {
    expect.hasAssertions();

    await runAddressExecutor({
      context: buildContext("alpha"),
      kind: "depth",
      options: { addresses: [ADDRESS] },
    });

    expect(pluginService.resolveTraceScope).toHaveBeenCalledWith({
      projectNames: ["alpha"],
      tags: [],
      withDependencies: true,
    });
    expect(addressService.runDepth).toHaveBeenCalledWith(
      expect.objectContaining({
        addresses: [ADDRESS],
        directories: ["packages/alpha"],
      }),
    );
  });

  it("prefers a named selection over the target's own project", async () => {
    expect.hasAssertions();

    await runAddressExecutor({
      context: buildContext("alpha"),
      kind: "breadth",
      options: { addresses: [ADDRESS], tags: ["type:package"] },
    });

    expect(pluginService.resolveTraceScope).toHaveBeenCalledWith(
      expect.objectContaining({ projectNames: [], tags: ["type:package"] }),
    );
  });

  it("passes a configuration path and a narrowed format through", async () => {
    expect.hasAssertions();

    await runAddressExecutor({
      context: buildContext("alpha"),
      kind: "depth",
      options: {
        addresses: [ADDRESS],
        configurationPath: "elsewhere.ts",
        // Narrowed rather than trusted: a hand-written target bypasses the
        // executor's schema enum.
        format: "not-a-format",
      },
    });

    expect(addressService.runDepth).toHaveBeenCalledWith(
      expect.objectContaining({
        configurationPath: "elsewhere.ts",
        format: undefined,
      }),
    );
  });

  it.each([
    ["no addresses", {}],
    ["an empty address list", { addresses: [] }],
    ["nothing but a blank address", { addresses: [""] }],
  ])("refuses a run with %s", async (_description, options) => {
    expect.hasAssertions();

    await expect(
      runAddressExecutor({
        context: buildContext("alpha"),
        kind: "depth",
        options,
      }),
    ).rejects.toThrow("needs --addresses");
    expect(pluginService.resolveTraceScope).not.toHaveBeenCalled();
  });

  it("refuses a run with no project and no selection", async () => {
    expect.hasAssertions();

    await expect(
      runAddressExecutor({
        context: buildContext(),
        kind: "depth",
        options: { addresses: [ADDRESS] },
      }),
    ).rejects.toThrow("must be run against a project");
  });

  it("fails the task when the selection named something the workspace lacks", async () => {
    expect.hasAssertions();

    pluginService.resolveTraceScope.mockResolvedValue(
      buildScope({ unknownNames: ["absent"] }),
    );

    await expect(
      runAddressExecutor({
        context: buildContext("alpha"),
        kind: "depth",
        options: { addresses: [ADDRESS], projects: ["absent"] },
      }),
    ).rejects.toThrow("Unknown Nx projects.");
    expect(addressService.runDepth).not.toHaveBeenCalled();
  });

  it("prints the reason an address resolved to nothing, and fails", async () => {
    expect.hasAssertions();

    addressService.runDepth.mockResolvedValue({
      ok: false,
      report: "No callable matches it.",
    });

    await expect(
      runAddressExecutor({
        context: buildContext("alpha"),
        kind: "depth",
        options: { addresses: [ADDRESS] },
      }),
    ).resolves.toStrictEqual({ success: false });
    expect(process.stdout.write).toHaveBeenCalledWith(
      "No callable matches it.\n",
    );
  });
});
