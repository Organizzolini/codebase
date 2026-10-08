import { describe, expect, it } from "vitest";

import { GateService } from "../gate/gate.service";

import {
  resolveGateService,
  resolvePluginService,
} from "./plugin-context.utilities";
import { PluginService } from "./plugin.service";

describe("plugin context", () => {
  it("resolves every service the plugin entry points reach for", async () => {
    expect.hasAssertions();

    await expect(resolveGateService()).resolves.toBeInstanceOf(GateService);
    await expect(resolvePluginService()).resolves.toBeInstanceOf(PluginService);
  });

  it("builds the application context once per process", async () => {
    expect.hasAssertions();

    // The Nx daemon is long-lived, so a context per invocation would make
    // this plugin pay for a NestJS bootstrap on every graph computation.
    await expect(resolvePluginService()).resolves.toBe(
      await resolvePluginService(),
    );
  });
});
