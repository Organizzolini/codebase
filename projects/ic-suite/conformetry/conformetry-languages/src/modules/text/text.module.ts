import { Module } from "@nestjs/common";

import { TextService } from "./text.service";

/**
 * Provides the text validator service.
 */
@Module({
  controllers: [],
  exports: [TextService],
  imports: [],
  providers: [TextService],
})
export class TextModule {}
