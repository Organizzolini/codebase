import { Injectable } from "@nestjs/common";

import { ParserService } from "./parser.js";

/**
 * Constructs a class and so calls its constructor.
 *
 * `new ParserService(…)` records `ParserService.constructor` as a frame,
 * because that constructor has a body. A constructor with no body is not a
 * frame — there is nothing to descend into.
 */
@Injectable()
export class ConstructedClassService {
  // 🌎 Public Methods

  /** Counts the tokens the constructed parser produced. */
  public count(source: string): number {
    return new ParserService(source).tokens.length;
  }
}
