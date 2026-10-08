import { LoggerService } from "@codebase/logging";

import { AspectEphemerisService } from "../src/modules/aspects/aspect-ephemeris.service";
import { AspectsUtilitiesService } from "../src/modules/aspects/aspects-utilities.service";
import { MajorAspectEventService } from "../src/modules/major-aspects/major-aspect-event.service";
import { MajorAspectProgressiveService } from "../src/modules/major-aspects/major-aspect-progressive.service";
import { MajorAspectsService } from "../src/modules/major-aspects/major-aspects.service";
import { MathService } from "../src/modules/math/math.service";
import { ProgressiveAspectService } from "../src/modules/progressive/progressive-aspect.service";
import { ProgressiveUtilitiesService } from "../src/modules/progressive/progressive-utilities.service";

import type { EphemerisService } from "../src/modules/ephemeris/ephemeris.service";

/**
 * A `MajorAspectsService` wired by hand from its real collaborators, over
 * the given `EphemerisService` (a mock, in a test), so angular-separation
 * logic can be checked without booting Nest or reading ephemeris files.
 */
export function createMajorAspectsService(
  ephemerisService: EphemerisService,
): MajorAspectsService {
  const mathService = new MathService();
  const aspectsUtilitiesService = new AspectsUtilitiesService(mathService);

  return new MajorAspectsService(
    new LoggerService(),
    new AspectEphemerisService(ephemerisService),
    aspectsUtilitiesService,
    new MajorAspectEventService(new LoggerService(), aspectsUtilitiesService),
    new MajorAspectProgressiveService(
      new ProgressiveAspectService(new LoggerService()),
      new ProgressiveUtilitiesService(new LoggerService()),
    ),
  );
}
