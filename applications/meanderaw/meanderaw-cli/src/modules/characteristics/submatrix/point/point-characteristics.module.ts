import { Module } from "@nestjs/common";

import { SubmatrixUtilitiesModule } from "../submatrix-utilities.module";

import { DensityCharacteristicService } from "./density-characteristic.service";
import { DotCountCharacteristicService } from "./dot-count-characteristic.service";
import { DoubleHorizontalEdgeCountCharacteristicService } from "./double-horizontal-edge-count-characteristic.service";
import { DoubleVerticalEdgeCountCharacteristicService } from "./double-vertical-edge-count-characteristic.service";
import { EastEdgeCountCharacteristicService } from "./east-edge-count-characteristic.service";
import { EdgeCountCharacteristicService } from "./edge-count-characteristic.service";
import { InkPointCountCharacteristicService } from "./ink-point-count-characteristic.service";
import { NorthEdgeCountCharacteristicService } from "./north-edge-count-characteristic.service";
import { PointUtilitiesService } from "./point-utilities.service";
import { SouthEdgeCountCharacteristicService } from "./south-edge-count-characteristic.service";
import { WestEdgeCountCharacteristicService } from "./west-edge-count-characteristic.service";

/**
 * Provides and exports every 1×1 point characteristic evaluator — bare
 * points, straight and directional edges, and the grid-wide edge, ink, and
 * density tallies read from the same points — as one group
 * `CharacteristicsModule` imports and re-exports.
 */
@Module({
  controllers: [],
  exports: [
    DensityCharacteristicService,
    DotCountCharacteristicService,
    DoubleHorizontalEdgeCountCharacteristicService,
    DoubleVerticalEdgeCountCharacteristicService,
    EastEdgeCountCharacteristicService,
    EdgeCountCharacteristicService,
    InkPointCountCharacteristicService,
    NorthEdgeCountCharacteristicService,
    PointUtilitiesService,
    SouthEdgeCountCharacteristicService,
    WestEdgeCountCharacteristicService,
  ],
  imports: [SubmatrixUtilitiesModule],
  providers: [
    DensityCharacteristicService,
    DotCountCharacteristicService,
    DoubleHorizontalEdgeCountCharacteristicService,
    DoubleVerticalEdgeCountCharacteristicService,
    EastEdgeCountCharacteristicService,
    EdgeCountCharacteristicService,
    InkPointCountCharacteristicService,
    NorthEdgeCountCharacteristicService,
    PointUtilitiesService,
    SouthEdgeCountCharacteristicService,
    WestEdgeCountCharacteristicService,
  ],
})
export class PointCharacteristicsModule {}
