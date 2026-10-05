import { Module } from "@nestjs/common";

import { ConnectivityModule } from "../../connectivity/connectivity.module";

import { TileCrossingComponentDeltaCountCharacteristicService } from "./tile-crossing-component-delta-count-characteristic.service";
import { TileCrossingCountCharacteristicService } from "./tile-crossing-count-characteristic.service";
import { TileCrossingCycleCountCharacteristicService } from "./tile-crossing-cycle-count-characteristic.service";

/**
 * Provides and exports every tile crossing path characteristic evaluator —
 * what crosses the join between a tile's last column and its first — as one
 * group `CharacteristicsModule` imports and re-exports. It imports
 * `ConnectivityModule` for the one shared `ConnectivityService` rather than
 * providing its own.
 */
@Module({
  controllers: [],
  exports: [
    TileCrossingComponentDeltaCountCharacteristicService,
    TileCrossingCountCharacteristicService,
    TileCrossingCycleCountCharacteristicService,
  ],
  imports: [ConnectivityModule],
  providers: [
    TileCrossingComponentDeltaCountCharacteristicService,
    TileCrossingCountCharacteristicService,
    TileCrossingCycleCountCharacteristicService,
  ],
})
export class TileCrossingCharacteristicsModule {}
