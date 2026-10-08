import { Injectable } from "@nestjs/common";
import _ from "lodash";

import { Lexeme, Translation } from "@codebase/lexico-entities";

import type * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";

/**
 * Extracts etymology text near a headword section and derives participle-origin
 * translations when that pattern appears in the prose.
 */
@Injectable()
export class EtymologyService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /**
   * Reads the nearest "Etymology" paragraph and returns its text plus an optional
   * synthetic translation for "... Participle of ..." descriptions.
   */
  public parse(
    $: cheerio.CheerioAPI,
    elt: AnyNode,
    lexeme: Lexeme,
    /**
     * Reserved for future parser options.
     */
  ): { etymology: string; participleTranslation?: Translation } {
    const etymologyHeadingElement = $(elt)
      .prevAll("div.mw-heading")
      .filter((_index: number, element: AnyNode) =>
        /etymology/i.test($(element).text()),
      )
      .first();

    if (etymologyHeadingElement.length <= 0) return { etymology: "" };

    const etymologyParagraph = etymologyHeadingElement.nextAll("p").first();
    if (
      etymologyParagraph.length <= 0 ||
      etymologyParagraph.text().trim().length === 0
    ) {
      return { etymology: "" };
    }

    const etymology = etymologyParagraph.text().trim();

    const participleTranslationMatch =
      /((present)|(perfect)|(future)) ((active)|(passive) )?participle (\(gerundive\) )?of [A-Za-z\u00C0-\u017F]+/i.exec(
        etymology,
      );
    if (participleTranslationMatch) {
      const text = _.upperFirst(participleTranslationMatch[0].trim());
      return {
        etymology,
        participleTranslation: new Translation(text, lexeme),
      };
    }

    return { etymology };
  }
}
