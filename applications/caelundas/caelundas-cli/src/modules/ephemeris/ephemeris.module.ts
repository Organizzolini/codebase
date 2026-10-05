import { Module } from "@nestjs/common";

import { MathModule } from "../math/math.module";

import { EphemerisAggregationService } from "./ephemeris-aggregation.service";
import { EphemerisConstantsService } from "./ephemeris-constants.service";
import { EphemerisCoordinateService } from "./ephemeris-coordinate.service";
import { EphemerisHorizonService } from "./ephemeris-horizon.service";
import { EphemerisPhenomenaService } from "./ephemeris-phenomena.service";
import { EphemerisTimeService } from "./ephemeris-time.service";
import { EphemerisService } from "./ephemeris.service";

/**
 * NestJS module providing Swiss Ephemeris astronomical calculations.
 * Exports {@link EphemerisService} for computing planetary positions, illumination, and diameters.
 */
@Module({
  controllers: [],
  exports: [EphemerisService],
  imports: [MathModule],
  providers: [
    EphemerisTimeService,
    EphemerisConstantsService,
    EphemerisCoordinateService,
    EphemerisPhenomenaService,
    EphemerisHorizonService,
    EphemerisAggregationService,
    EphemerisService,
  ],
})
export class EphemerisModule {}
