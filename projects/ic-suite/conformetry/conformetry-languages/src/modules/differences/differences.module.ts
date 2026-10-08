import { Module } from "@nestjs/common";

import { DifferencesService } from "./differences.service";

/**
 * Owns construction and narrowing of structured conformance differences.
 *
 * Imported by every validator package so error shapes stay identical across
 * languages, and by the file-existence pass for the file and directory
 * categories.
 */
@Module({
  controllers: [],
  exports: [DifferencesService],
  imports: [],
  providers: [DifferencesService],
})
export class DifferencesModule {}
