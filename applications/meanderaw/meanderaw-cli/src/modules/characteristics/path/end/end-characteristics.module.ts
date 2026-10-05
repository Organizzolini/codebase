import { Module } from "@nestjs/common";

import { ConnectivityModule } from "../../connectivity/connectivity.module";

import { EndUtilitiesService } from "./end-utilities.service";
import { EndsAreLatticeNeighborsCharacteristicService } from "./ends-are-lattice-neighbors-characteristic.service";
import { EndsOnBorderRulesCharacteristicService } from "./ends-on-border-rules-characteristic.service";

/**
 * Provides and exports every free-end characteristic evaluator — how a
 * Code's exactly two free ends sit relative to the lattice and the band's
 * own border rules — as one group `CharacteristicsModule` imports and
 * re-exports. It imports `ConnectivityModule` for the one shared
 * `ConnectivityService` rather than providing its own.
 */
@Module({
  controllers: [],
  exports: [
    EndsAreLatticeNeighborsCharacteristicService,
    EndsOnBorderRulesCharacteristicService,
  ],
  imports: [ConnectivityModule],
  providers: [
    EndsAreLatticeNeighborsCharacteristicService,
    EndsOnBorderRulesCharacteristicService,
    EndUtilitiesService,
  ],
})
export class EndCharacteristicsModule {}
