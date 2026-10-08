// 🏷️ Types
/**
 * Previous/current/next longitude snapshots for two bodies at one minute step.
 */
export interface LongitudesWindow {
  currentLongitudeBody1: number;
  currentLongitudeBody2: number;
  nextLongitudeBody1: number;
  nextLongitudeBody2: number;
  previousLongitudeBody1: number;
  previousLongitudeBody2: number;
}
