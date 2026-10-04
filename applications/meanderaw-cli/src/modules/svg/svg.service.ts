import { Injectable } from "@nestjs/common";

import { STROKE_COLOR, STROKE_LINECAP } from "./svg.constants";

import type { RenderOptions } from "./svg.types";

/**
 * Assembles a complete SVG document from already-computed path data. Holds
 * no drawing logic of its own — every coordinate is decided upstream by a
 * type-specific motif service.
 */
@Injectable()
export class SvgService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Wraps pre-formatted path data in an SVG document with the given dimensions. */
  render(options: RenderOptions): string {
    const { height, paths, strokeWidth, width } = options;
    const pathElements = paths
      .map(
        (pathData) =>
          `<path d="${pathData}" stroke="${STROKE_COLOR}" stroke-width="${strokeWidth}" stroke-linecap="${STROKE_LINECAP}"/>\n`,
      )
      .join("");

    return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg">\n${
      pathElements
    }</svg>\n`;
  }
}
