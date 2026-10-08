import { COORDINATE_DECIMAL_PLACES } from "./calendar-events.constants";

/**
 * A coordinate rounded to the decimals the column stores, as the string
 * `pg` exchanges a `numeric` as, so what is written and what is looked up
 * compare exactly.
 */
export function formatCoordinate(coordinate: number): string {
  return coordinate.toFixed(COORDINATE_DECIMAL_PLACES);
}
