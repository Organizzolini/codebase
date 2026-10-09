// 🛠️ Utilities

import "reflect-metadata";
import { NestFactory } from "@nestjs/core";

import { MainModule } from "../../main.module";
import { GateService } from "../gate/gate.service";

import { PLUGIN_CONTEXT_GLOBAL_KEY } from "./plugin.constants";
import { PluginService } from "./plugin.service";

import type { PluginContextGlobal } from "./plugin.types";
import type { INestApplicationContext } from "@nestjs/common";

/** Resolves the service behind the gate executor. */
export async function resolveGateService(): Promise<GateService> {
  const context = await resolvePluginContext();

  return context.get(GateService);
}

/** Resolves the service behind target inference. */
export async function resolvePluginService(): Promise<PluginService> {
  const context = await resolvePluginContext();

  return context.get(PluginService);
}

/**
 * Builds, or returns, this process's application context.
 *
 * Nx calls plugins from module-level functions with no injection of their own,
 * so bare functions are the only possible entry points; they bootstrap the
 * NestJS context and hand back a service, which is where the logic lives.
 *
 * Cached on `globalThis` rather than in a module variable because the Nx
 * daemon is long-lived and may load this module more than once. The pending
 * promise is stored, not the context, so concurrent callers share one
 * bootstrap instead of racing to build two.
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
