import { Module } from "@nestjs/common";

import { ProjectsService } from "./projects.service";

/**
 * Provides the workspace's projects, read from disk rather than from Nx.
 *
 * Kept apart from the plugin's own surface because the install-time bootstrap
 * needs the same answer with no Nx running and no project graph to ask.
 */
@Module({
  controllers: [],
  exports: [ProjectsService],
  imports: [],
  providers: [ProjectsService],
})
export class ProjectsModule {}
