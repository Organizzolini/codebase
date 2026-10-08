import { NestFactory } from "@nestjs/core";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GeneratorService } from "../generator/generator.service";
import { OptionsService } from "../options/options.service";
import { ProjectsService } from "../projects/projects.service";

import {
  resolveGeneratorService,
  resolveOptionsService,
  resolvePluginService,
  resolveProjectsService,
} from "./plugin-context.utilities";
import { PLUGIN_CONTEXT_GLOBAL_KEY } from "./plugin.constants";
import { PluginService } from "./plugin.service";

import type * as nestCore from "@nestjs/core";

// Compiling the real graph is the integration test's job; what these
// functions own is bootstrapping once and handing back the right service.
vi.mock("@nestjs/core", async (importOriginal) => {
  const actual = await importOriginal<typeof nestCore>();

  return {
    ...actual,
    NestFactory: { createApplicationContext: vi.fn() },
  };
});

const GENERATOR_SERVICE = { emitPlugin: vi.fn() };
const OPTIONS_SERVICE = { resolveConfigurationPath: vi.fn() };
const PLUGIN_SERVICE = { runValidation: vi.fn() };
const PROJECTS_SERVICE = { listWorkspaceProjects: vi.fn() };

const SERVICES_BY_TOKEN = new Map<unknown, unknown>([
  [GeneratorService, GENERATOR_SERVICE],
  [OptionsService, OPTIONS_SERVICE],
  [PluginService, PLUGIN_SERVICE],
  [ProjectsService, PROJECTS_SERVICE],
]);

const createApplicationContext = vi.mocked(
  NestFactory.createApplicationContext,
);

describe("plugin context", () => {
  beforeEach(() => {
    const globalScope: Record<string, unknown> = globalThis;

    // The context is cached for the life of the process, so each test starts
    // by forgetting the one its predecessor built. `??=` in the source treats
    // undefined as absent, so clearing it is enough.
    globalScope[PLUGIN_CONTEXT_GLOBAL_KEY] = undefined;
    createApplicationContext.mockReset();
    // type-coverage:ignore-next-line -- a deliberate stand-in for the context
    createApplicationContext.mockResolvedValue({
      get: (token: unknown) => SERVICES_BY_TOKEN.get(token),
    } as unknown as Awaited<
      ReturnType<typeof NestFactory.createApplicationContext>
    >);
  });

  it("resolves the generator service", async () => {
    await expect(resolveGeneratorService()).resolves.toBe(GENERATOR_SERVICE);
  });

  it("resolves the plugin service", async () => {
    await expect(resolvePluginService()).resolves.toBe(PLUGIN_SERVICE);
  });

  it("resolves the options service", async () => {
    await expect(resolveOptionsService()).resolves.toBe(OPTIONS_SERVICE);
  });

  it("resolves the projects service", async () => {
    await expect(resolveProjectsService()).resolves.toBe(PROJECTS_SERVICE);
  });

  it("builds one context however many services are asked for", async () => {
    await resolvePluginService();
    await resolveGeneratorService();

    expect(createApplicationContext).toHaveBeenCalledTimes(1);
  });

  it("shares one bootstrap between concurrent callers", async () => {
    await Promise.all([resolvePluginService(), resolveGeneratorService()]);

    expect(createApplicationContext).toHaveBeenCalledTimes(1);
  });

  it("keeps the daemon quiet and lets differences surface", async () => {
    await resolvePluginService();

    expect(createApplicationContext).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ abortOnError: false, logger: false }),
    );
  });

  it("returns the service the token names", async () => {
    await expect(resolvePluginService()).resolves.not.toBe(GENERATOR_SERVICE);
    expect(PluginService).toBeDefined();
  });
});
