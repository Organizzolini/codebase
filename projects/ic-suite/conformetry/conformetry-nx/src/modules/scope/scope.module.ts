import { ConfigurationModule } from "@conformetry/configuration";
import { Module } from "@nestjs/common";

import { ScopeService } from "./scope.service";

/**
 * Provides the reading and matching of a generator's project scope.
 *
 * Depends only on the dependency-free `ConfigurationModule`, for the one rule
 * that says whether a group is project-scoped at all: a scope is otherwise
 * answered from the configuration and a list of projects the caller already
 * has, so this stays usable from the graph, from a generator, and from the
 * install-time bootstrap alike.
 */
@Module({
  controllers: [],
  exports: [ScopeService],
  imports: [ConfigurationModule],
  providers: [ScopeService],
})
export class ScopeModule {}
