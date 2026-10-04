import { Module } from "@nestjs/common";

import { LoggerModule } from "@codebase/logger";

import { ConformetryGeneratorsModule } from "../conformetry-generators/conformetry-generators.module";
import { ConventionalConfigModule } from "../conventional-config/conventional-config.module";
import { DevcontainerConfigurationModule } from "../devcontainer-configuration/devcontainer-configuration.module";
import { PackageManifestsModule } from "../package-manifests/package-manifests.module";
import { PullRequestLabelsModule } from "../pull-request-labels/pull-request-labels.module";
import { PullRequestTemplateModule } from "../pull-request-template/pull-request-template.module";
import { SkillExclusionsModule } from "../skill-exclusions/skill-exclusions.module";

import { SynchronizationCommand } from "./synchronization.command";
import { SynchronizationService } from "./synchronization.service";

/**
 * Root NestJS application module.
 *
 * Every synchronization command is also its own Nx target and its own CLI
 * subcommand, run on its own rather than through `SynchronizationCommand`.
 * This module exists so `MainModule` discovers every one of them, plus
 * `SynchronizationCommand` itself, which drives them together, in a single
 * import.
 */
@Module({
  controllers: [],
  exports: [SynchronizationCommand, SynchronizationService],
  imports: [
    LoggerModule,
    ConformetryGeneratorsModule,
    ConventionalConfigModule,
    DevcontainerConfigurationModule,
    PackageManifestsModule,
    PullRequestLabelsModule,
    PullRequestTemplateModule,
    SkillExclusionsModule,
  ],
  providers: [SynchronizationCommand, SynchronizationService],
})
export class SynchronizationModule {}
