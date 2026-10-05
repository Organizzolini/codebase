import { Module } from "@nestjs/common";

import { CodeModule } from "../code/code.module";
import { GeometryModule } from "../geometry/geometry.module";
import { SvgModule } from "../svg/svg.module";

import { DrawingService } from "./drawing.service";

/**
 * Wires up everything that concerns a meander as a **drawing**:
 * {@link DrawingService}, which goes from a Code to an SVG document.
 *
 * **It goes one way only, now that the historical corpus has been read.**
 * A reader ran the other way — reducing a finished document back to the
 * lattice points and one-pitch steps its ink paints, naming which window of
 * such a reading held one repeat, and measuring a reading's channel widths
 * and junctions. It existed for one job: turning the drawings this project
 * started from into the Codes that name them. That extraction has happened,
 * against a commit that cannot change, and its output is committed as
 * `HISTORICAL_CORPUS`. A meander is a Code, every row is built by reading
 * one, and nothing reads a drawing again — so the reader is gone rather than
 * carried, and this module is the shape that leaves.
 */
@Module({
  controllers: [],
  exports: [DrawingService],
  imports: [CodeModule, GeometryModule, SvgModule],
  providers: [DrawingService],
})
export class DrawingModule {}
