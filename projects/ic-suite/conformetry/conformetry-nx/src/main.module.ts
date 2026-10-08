import { Module } from "@nestjs/common";

import { LoggerModule } from "@codebase/logging";

import { GeneratorModule } from "./modules/generator/generator.module";
import { PluginModule } from "./modules/plugin/plugin.module";

/**
 * Root module of the plugin's application context.
 *
 * Built once per process and cached — the Nx daemon is long-lived, so paying
 * for a NestJS context on every generator invocation would make the plugin the
 * slowest thing in the graph.
 */
@Module({
  controllers: [],
  exports: [GeneratorModule, PluginModule],
  imports: [GeneratorModule, LoggerModule, PluginModule],
  providers: [],
})
export class MainModule {}
