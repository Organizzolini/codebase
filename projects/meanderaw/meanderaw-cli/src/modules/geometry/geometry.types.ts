// 🏷️ Types

/** The derived grid unit, offset, and stroke width every motif is drawn against. */
export interface Geometry {
  readonly height: number;
  readonly offset: number;
  readonly strokeWidth: number;
  readonly unit: number;
}
