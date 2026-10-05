import { Module } from "@nestjs/common";

import { ConnectivityModule } from "../../connectivity/connectivity.module";

import { BettiNumber0CountCharacteristicService } from "./betti-number-0-count-characteristic.service";
import { BettiNumber1CountCharacteristicService } from "./betti-number-1-count-characteristic.service";
import { FreeEndCountCharacteristicService } from "./free-end-count-characteristic.service";

/**
 * Provides and exports every topological path characteristic evaluator — the
 * two Betti numbers and the free-end count — as one group
 * `CharacteristicsModule` imports and re-exports. It imports
 * `ConnectivityModule` for the one shared `ConnectivityService` rather than
 * providing its own.
 */
@Module({
  controllers: [],
  exports: [
    BettiNumber0CountCharacteristicService,
    BettiNumber1CountCharacteristicService,
    FreeEndCountCharacteristicService,
  ],
  imports: [ConnectivityModule],
  providers: [
    BettiNumber0CountCharacteristicService,
    BettiNumber1CountCharacteristicService,
    FreeEndCountCharacteristicService,
  ],
})
export class TopologyCharacteristicsModule {}
