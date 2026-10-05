import { Module } from "@nestjs/common";

import { LoggerModule } from "@codebase/logging";

import { DocumentsService } from "./documents.service";

/**
 * Wraps a report body in markers and writes it wherever it was asked for.
 *
 * Imports `LoggerModule` itself rather than relying on a consuming
 * application to import it globally, since this package is a library with no
 * root module of its own — `LoggerModule` is `@Global()`, so importing it
 * here is enough for `LoggerService` to resolve wherever this module is used.
 */
@Module({
  controllers: [],
  exports: [DocumentsService],
  imports: [LoggerModule],
  providers: [DocumentsService],
})
export class DocumentsModule {}
