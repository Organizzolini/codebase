import { Module } from "@nestjs/common";

import { TopologyCharacteristicsModule } from "../../path/topology/topology-characteristics.module";
import { CompoundUtilitiesModule } from "../compound-utilities.module";

import { IsClosedLoopCharacteristicService } from "./is-closed-loop-characteristic.service";
import { IsSingleArcCharacteristicService } from "./is-single-arc-characteristic.service";

/**
 * Provides and exports every compound structure characteristic evaluator —
 * whether a repeating unit is one open arc or one closed loop — as one group
 * `CharacteristicsModule` imports and re-exports. It imports the topology
 * group whose evaluators these predicates read, and the shared
 * `CompoundUtilitiesModule` for its junction-free reading.
 */
@Module({
  controllers: [],
  exports: [
    IsClosedLoopCharacteristicService,
    IsSingleArcCharacteristicService,
  ],
  imports: [CompoundUtilitiesModule, TopologyCharacteristicsModule],
  providers: [
    IsClosedLoopCharacteristicService,
    IsSingleArcCharacteristicService,
  ],
})
export class StructureCharacteristicsModule {}
