import { Module } from "@nestjs/common";

import { RenderService } from "./render.service";

/** Renders a codometer change collection as the body of a report. */
@Module({
  controllers: [],
  exports: [RenderService],
  imports: [],
  providers: [RenderService],
})
export class RenderModule {}
