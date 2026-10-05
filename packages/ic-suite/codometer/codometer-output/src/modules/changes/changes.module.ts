import { Module } from "@nestjs/common";

import { LoggerModule } from "@codebase/logging";

import { ChangesService } from "./changes.service";

/**
 * Diffs codometer reports and joins them to a baseline.
 *
 * Imports `LoggerModule` itself rather than relying on a consuming
 * application to import it globally, since this package is a library with no
 * root module of its own — `LoggerModule` is `@Global()`, so importing it
 * here is enough for `LoggerService` to resolve wherever this module is used.
 */
@Module({
  controllers: [],
  exports: [ChangesService],
  imports: [LoggerModule],
  providers: [ChangesService],
})
export class ChangesModule {}
