import { Module } from "@nestjs/common";

import { LoggerModule } from "@codebase/logging";

import { OutputMarkdownService } from "./output-markdown.service";

/**
 * Provides the anchored markdown block destination.
 */
@Module({
  controllers: [],
  exports: [OutputMarkdownService],
  imports: [LoggerModule],
  providers: [OutputMarkdownService],
})
export class OutputMarkdownModule {}
