import type { MatrixPoint } from "./matrix.types";

// ♟️ Constants

/** The bare matrix point that carries no ink connections in any direction. */
export const BARE_MATRIX_POINT: MatrixPoint = {
  east: false,
  north: false,
  south: false,
  west: false,
};
