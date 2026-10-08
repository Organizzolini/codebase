// 🛠️ Utilities

import "reflect-metadata";
import { NestFactory } from "@nestjs/core";

import { MainModule } from "../../main.module";
import { GeneratorService } from "../generator/generator.service";
import { OptionsService } from "../options/options.service";
import { ProjectsService } from "../projects/projects.service";

import { PLUGIN_CONTEXT_GLOBAL_KEY } from "./plugin.constants";
import { PluginService } from "./plugin.service";

import type { PluginContextGlobal } from "./plugin.types";
import type { INestApplicationContext } from "@nestjs/common";

/** Resolves the service that derives the consumer's generator plugin. */
export async function resolveGeneratorService(): Promise<GeneratorService> {
  const context = await resolvePluginContext();

  return context.get(GeneratorService);
}

/** Resolves the service that reads this plugin's registration in `nx.json`. */
export async function resolveOptionsService(): Promise<OptionsService> {
  const context = await resolvePluginContext();

  return context.get(OptionsService);
}

/** Resolves the service backing target inference, generation, and validation. */
export async function resolvePluginService(): Promise<PluginService> {
  const context = await resolvePluginContext();

  return context.get(PluginService);
}

/** Resolves the service that lists the workspace's projects. */
export async function resolveProjectsService(): Promise<ProjectsService> {
  const context = await resolvePluginContext();

  return context.get(ProjectsService);
}

/**
 * Builds, or returns, this process's application context.
 *
 * Nx calls plugins from module-level functions with no injection of their own,
 * so bare functions are the only possible entry points. They build nothing
 * themselves: they bootstrap the NestJS context and hand back a service, which
 * is where all the logic lives.
 *
 * The context is cached on `globalThis` rather than in a module variable
 * because the Nx daemon is long-lived and may load this module more than once
 * — under plugin isolation, per worker — and one NestJS context per process is
 * the point. The pending promise is stored, not the resolved context, so
 * concurrent callers share a single bootstrap instead of racing to build two.
 * No signal handlers or file watches are registered, so the context never
 * keeps the daemon alive on its own.
 */
async function resolvePluginContext(): Promise<INestApplicationContext> {
  const globalScope: PluginContextGlobal = globalThis;

  globalScope[PLUGIN_CONTEXT_GLOBAL_KEY] ??=
    NestFactory.createApplicationContext(MainModule, {
      abortOnError: false,
      logger: false,
    });

  return await globalScope[PLUGIN_CONTEXT_GLOBAL_KEY];
}
