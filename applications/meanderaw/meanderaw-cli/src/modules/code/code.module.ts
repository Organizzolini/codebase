import { Module } from "@nestjs/common";

import { SymmetryModule } from "../symmetry/symmetry.module";

import { CodeService } from "./code.service";

/**
 * Wires up the module that owns a meander's Code, in both directions.
 *
 * {@link SymmetryModule} is the one import, and the direction it runs in is
 * the whole of the arrangement: spelling a canonical Code needs to know
 * which member of a symmetry class to spell, while the enumeration folds its
 * own walk on the symmetry service's edge key rather than on a Code.
 * Depending the other way as well would put the two in a cycle.
 */
@Module({
  controllers: [],
  exports: [CodeService],
  imports: [SymmetryModule],
  providers: [CodeService],
})
export class CodeModule {}
