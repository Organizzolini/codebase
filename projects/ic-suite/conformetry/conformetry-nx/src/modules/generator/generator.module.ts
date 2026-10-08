import { ConfigurationModule } from "@conformetry/configuration";
import { Module } from "@nestjs/common";

import { ScopeModule } from "../scope/scope.module";

import { GeneratorService } from "./generator.service";

/**
 * Provides derivation of the consumer's Nx generator plugin.
 *
 * Depends on the configuration for what to emit and on the scope for which
 * projects a generator's schema may offer; every emitted file is named after a
 * generator declared in the configuration, so no name-case rendering is
 * involved.
 */
@Module({
  controllers: [],
  exports: [ConfigurationModule, GeneratorService, ScopeModule],
  imports: [ConfigurationModule, ScopeModule],
  providers: [GeneratorService],
})
export class GeneratorModule {}
