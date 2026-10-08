import { Module } from "@nestjs/common";

import { ProjectsService } from "./projects.service";

/** Provides the Nx project-name to directory resolution. */
@Module({
  controllers: [],
  exports: [ProjectsService],
  imports: [],
  providers: [ProjectsService],
})
export class ProjectsModule {}
