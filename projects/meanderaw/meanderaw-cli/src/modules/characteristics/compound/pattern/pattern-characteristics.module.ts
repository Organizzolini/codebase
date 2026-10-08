import { Module } from "@nestjs/common";

import { EndCharacteristicsModule } from "../../path/end/end-characteristics.module";
import { TileCrossingCharacteristicsModule } from "../../path/tile-crossing/tile-crossing-characteristics.module";
import { TopologyCharacteristicsModule } from "../../path/topology/topology-characteristics.module";
import { TurnCharacteristicsModule } from "../../path/turn/turn-characteristics.module";
import { CornerCharacteristicsModule } from "../../submatrix/corner/corner-characteristics.module";
import { CrossCharacteristicsModule } from "../../submatrix/cross/cross-characteristics.module";
import { EmbeddedCharacteristicsModule } from "../../submatrix/embedded/embedded-characteristics.module";
import { ForkCharacteristicsModule } from "../../submatrix/fork/fork-characteristics.module";
import { PointCharacteristicsModule } from "../../submatrix/point/point-characteristics.module";
import { RunCharacteristicsModule } from "../../submatrix/run/run-characteristics.module";
import { CompoundUtilitiesModule } from "../compound-utilities.module";
import { StructureCharacteristicsModule } from "../structure/structure-characteristics.module";

import { IsArcadeCharacteristicService } from "./is-arcade-characteristic.service";
import { IsBarsCharacteristicService } from "./is-bars-characteristic.service";
import { IsBoxesCharacteristicService } from "./is-boxes-characteristic.service";
import { IsChainCharacteristicService } from "./is-chain-characteristic.service";
import { IsClaspsCharacteristicService } from "./is-clasps-characteristic.service";
import { IsCombCharacteristicService } from "./is-comb-characteristic.service";
import { IsCrossCharacteristicService } from "./is-cross-characteristic.service";
import { IsDotsCharacteristicService } from "./is-dots-characteristic.service";
import { IsDoubleChainCharacteristicService } from "./is-double-chain-characteristic.service";
import { IsForkCharacteristicService } from "./is-fork-characteristic.service";
import { IsLinesCharacteristicService } from "./is-lines-characteristic.service";
import { IsMeshCharacteristicService } from "./is-mesh-characteristic.service";
import { IsParallelCharacteristicService } from "./is-parallel-characteristic.service";
import { IsPureTreeCharacteristicService } from "./is-pure-tree-characteristic.service";
import { IsSnakeCharacteristicService } from "./is-snake-characteristic.service";
import { IsSwirlCharacteristicService } from "./is-swirl-characteristic.service";
import { IsWaterfallsCharacteristicService } from "./is-waterfalls-characteristic.service";
import { IsWhirlCharacteristicService } from "./is-whirl-characteristic.service";
import { StrandUtilitiesService } from "./strand-utilities.service";

/**
 * Provides and exports every compound pattern characteristic evaluator — one
 * boolean per named pattern a meander can be filtered by, each a combination
 * of the characteristics the groups below measure — as one
 * group `CharacteristicsModule` imports and re-exports. It imports the
 * groups whose evaluators these predicates read and the shared
 * `CompoundUtilitiesModule`, and provides its own stateless
 * `StrandUtilitiesService`.
 */
@Module({
  controllers: [],
  exports: [
    IsArcadeCharacteristicService,
    IsBarsCharacteristicService,
    IsBoxesCharacteristicService,
    IsChainCharacteristicService,
    IsClaspsCharacteristicService,
    IsCombCharacteristicService,
    IsCrossCharacteristicService,
    IsDotsCharacteristicService,
    IsDoubleChainCharacteristicService,
    IsForkCharacteristicService,
    IsLinesCharacteristicService,
    IsMeshCharacteristicService,
    IsParallelCharacteristicService,
    IsPureTreeCharacteristicService,
    IsSnakeCharacteristicService,
    IsSwirlCharacteristicService,
    IsWaterfallsCharacteristicService,
    IsWhirlCharacteristicService,
  ],
  imports: [
    CompoundUtilitiesModule,
    CornerCharacteristicsModule,
    CrossCharacteristicsModule,
    EmbeddedCharacteristicsModule,
    EndCharacteristicsModule,
    ForkCharacteristicsModule,
    PointCharacteristicsModule,
    RunCharacteristicsModule,
    StructureCharacteristicsModule,
    TileCrossingCharacteristicsModule,
    TopologyCharacteristicsModule,
    TurnCharacteristicsModule,
  ],
  providers: [
    IsArcadeCharacteristicService,
    IsBarsCharacteristicService,
    IsBoxesCharacteristicService,
    IsChainCharacteristicService,
    IsClaspsCharacteristicService,
    IsCombCharacteristicService,
    IsCrossCharacteristicService,
    IsDotsCharacteristicService,
    IsDoubleChainCharacteristicService,
    IsForkCharacteristicService,
    IsLinesCharacteristicService,
    IsMeshCharacteristicService,
    IsParallelCharacteristicService,
    IsPureTreeCharacteristicService,
    IsSnakeCharacteristicService,
    IsSwirlCharacteristicService,
    IsWaterfallsCharacteristicService,
    IsWhirlCharacteristicService,
    StrandUtilitiesService,
  ],
})
export class PatternCharacteristicsModule {}
