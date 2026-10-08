import { Module } from "@nestjs/common";

import { CodeModule } from "../code/code.module";

import { MatrixService } from "./matrix.service";

/**
 * Wires up 2D matrix transformations, coordinate lookup with column wrapping,
 * cyclic column rotation, and sliding window kernel extraction.
 */
@Module({
  controllers: [],
  exports: [MatrixService],
  imports: [CodeModule],
  providers: [MatrixService],
})
export class MatrixModule {}
