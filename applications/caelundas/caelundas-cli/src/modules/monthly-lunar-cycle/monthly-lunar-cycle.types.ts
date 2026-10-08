// 🏷️ Types

import type {
  CoordinateEphemeris,
  IlluminationEphemeris,
} from "../ephemeris/ephemeris.types";
import type { Moment } from "moment-timezone";

/** Arguments required to detect the lunar phases that begin at a minute. */
export interface DetectMonthlyLunarCycleArguments {
  minute: Moment;
  moonCoordinateEphemeris: CoordinateEphemeris;
  moonIlluminationEphemeris: IlluminationEphemeris;
  sunCoordinateEphemeris: CoordinateEphemeris;
}

/** The Moon's elongation from the Sun one minute either side of a minute. */
export interface ElongationWindow {
  current: number;
  next: number;
  previous: number;
}
