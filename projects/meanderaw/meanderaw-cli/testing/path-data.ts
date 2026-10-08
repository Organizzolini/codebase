/**
 * Assertions about generated SVG path data, shared by the motif services'
 * own unit tests. Each reads the rendered path back rather than recomputing
 * the geometry that produced it, so a test cannot drift with the code it is
 * checking.
 */

// 🔧 Configuration

/**
 * How far two coordinates may differ before the difference counts as real.
 * `GridGeometryService.formatCoordinate` rounds every coordinate to five
 * decimal places, so at a row count whose grid unit doesn't divide the
 * canvas evenly (7, 9, 11) two rounded values that should be equal can land
 * a few millionths of a pixel apart.
 */
export const COORDINATE_ROUNDING_TOLERANCE = 0.0001;

// 🌎 Utilities

/**
 * Whether a rendered document lays ink back over ink it has already drawn.
 *
 * Every motif emits only `M`, `H`, and `V`, and a well-formed run
 * alternates axis: a horizontal run ends where a vertical one begins. Two
 * consecutive commands along the *same* axis mean the subpath reversed
 * direction without turning, retracing the segment it just drew. That is a
 * charter violation rather than a cosmetic one — the duplicate ink is a
 * second stroke over the first — and it is what issue #507 reports for
 * `chain` and `snake` above eight rows.
 *
 * Coordinates are stripped rather than parsed: the axis alternation is a
 * property of the command letters alone.
 */
export const retracesItself = (document: string): boolean =>
  [...document.matchAll(/\sd="([^"]*)"/gu)].some((match) =>
    /HH|VV/u.test((match[1] ?? "").replaceAll(/[^HMV]/gu, "")),
  );

/** The rightmost x-coordinate a stretch of path data draws. */
export const rightmostX = (pathData: string): number =>
  Math.max(
    ...[...pathData.matchAll(/[MH]([\d.]+)/g)].map((match) => Number(match[1])),
  );

/**
 * Splits one unit's path into the motif trace and the border segment
 * appended after it, by trimming exactly the border the service would draw
 * for those same options.
 */
export const splitTrace = (
  fullPath: string,
  borderSegment: string,
): { border: string; trace: string } => ({
  border: borderSegment,
  trace: fullPath.slice(0, fullPath.length - borderSegment.length),
});
