import { Injectable, Optional } from "@nestjs/common";

import { EphemerisService } from "../ephemeris/ephemeris.service";

import { AspectCalculationSupportService } from "./aspect-calculation-support.service";

/**
 * TODO: Document the compoundPhase service.
 */
@Injectable()
export class CompoundPhaseService extends AspectCalculationSupportService {
  // 🏗 Dependency Injection

  constructor(@Optional() ephemerisService?: EphemerisService) {
    super(ephemerisService);
  }
  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods
}
