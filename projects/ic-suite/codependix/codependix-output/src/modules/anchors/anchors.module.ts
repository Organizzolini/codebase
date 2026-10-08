import { Module } from "@nestjs/common";

import { AnchorsService } from "./anchors.service";

/** Provides codependix's own Markdown anchor read/write mechanism. */
@Module({
  controllers: [],
  exports: [AnchorsService],
  imports: [],
  providers: [AnchorsService],
})
export class AnchorsModule {}
