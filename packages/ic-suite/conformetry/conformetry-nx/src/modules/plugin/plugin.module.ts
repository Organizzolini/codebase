import { ConfigurationModule } from "@conformetry/configuration";
import { GenerationModule } from "@conformetry/generation";
import { ReportingModule } from "@conformetry/output";
import { ValidationModule } from "@conformetry/validation";
import { Module } from "@nestjs/common";

import { LoggerModule } from "@codebase/logging";

import { AdapterModule } from "../adapter/adapter.module";
import { GeneratorModule } from "../generator/generator.module";
import { InstancesModule } from "../instances/instances.module";
import { OptionsModule } from "../options/options.module";
import { PathsModule } from "../paths/paths.module";
import { ProjectsModule } from "../projects/projects.module";
import { ScopeModule } from "../scope/scope.module";

import { PluginService } from "./plugin.service";

/**
 * Wires the generic conformetry packages into one Nx-facing service.
 *
 * The plugin owns no generation or validation logic of its own; it supplies
 * the Nx-shaped inputs — project roots, tags, a `Tree` — that the generic
 * packages cannot know about.
 */
@Module({
  controllers: [],
  exports: [
    AdapterModule,
    InstancesModule,
    ConfigurationModule,
    GeneratorModule,
    GenerationModule,
    LoggerModule,
    OptionsModule,
    PathsModule,
    PluginService,
    ProjectsModule,
    ReportingModule,
    ScopeModule,
    ValidationModule,
  ],
  imports: [
    AdapterModule,
    InstancesModule,
    ConfigurationModule,
    GeneratorModule,
    GenerationModule,
    LoggerModule,
    OptionsModule,
    PathsModule,
    ProjectsModule,
    ReportingModule,
    ScopeModule,
    ValidationModule,
  ],
  providers: [PluginService],
})
export class PluginModule {}
