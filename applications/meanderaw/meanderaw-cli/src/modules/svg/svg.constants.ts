// ♟️ Constants

/** Stroke color every generated meander is drawn in. */
export const STROKE_COLOR = "black";

/** Stroke line cap every generated meander is drawn with. */
export const STROKE_LINECAP = "square";

// 🌱 The filename scheme this file used to carry — the address suffix
// pattern, the per-family full-address/shape-only convention, and the
// unmodified variant's name — is retired with the `output/<family>/*.svg`
// tree it named. A meander is a database row now, and a row has no
// 255-byte path component for a Code to outgrow, which is the whole reason
// spec #813 moved storage in the first place.
