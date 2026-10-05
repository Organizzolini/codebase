import { Injectable, Optional } from "@nestjs/common";

import { EphemerisService } from "../ephemeris/ephemeris.service";

import { AspectCalculationSupportService } from "./aspect-calculation-support.service";

/**
 * TODO: Document the aspectEphemeris service.
 */
@Injectable()
export class AspectEphemerisService extends AspectCalculationSupportService {
  // 🏗 Dependency Injection

  constructor(@Optional() ephemerisService?: EphemerisService) {
    super(ephemerisService);
  }
  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods
}
