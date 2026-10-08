import { Module } from "@nestjs/common";

import { LatinLibraryCommand } from "./latin-library.command";

/**
 * TODO: Document the latinLibrary module.
 */
@Module({
  controllers: [],
  exports: [LatinLibraryCommand],
  imports: [],
  providers: [LatinLibraryCommand],
})
export class LatinLibraryModule {}
