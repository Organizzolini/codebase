import { Test } from "@nestjs/testing";
import * as cheerio from "cheerio";
import { beforeAll, describe, expect, it } from "vitest";

import { Lexeme, Translation } from "@codebase/lexico-entities";

import { EtymologyService } from "./etymology.service";

import type { AnyNode } from "domhandler";

function getElementByIdentifierOrThrow(
  $: cheerio.CheerioAPI,
  identifier: string,
): AnyNode {
  const element = $(identifier).get(0);
  if (element) {
    return element;
  }

  throw new Error(`Expected element ${identifier} to exist in test markup`);
}

describe(EtymologyService, () => {
  let service: EtymologyService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [EtymologyService],
    }).compile();

    service = await module.resolve(EtymologyService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("parse", () => {
    it("returns empty etymology when no etymology heading is present", () => {
      const $ = cheerio.load(`
        <div class="mw-heading">Latin</div>
        <p id="entry">Main entry paragraph.</p>
      `);
      const element = getElementByIdentifierOrThrow($, "#entry");

      const result = service.parse($, element, new Lexeme());

      expect(result).toStrictEqual({ etymology: "" });
    });

    it("returns empty etymology when etymology heading has no paragraph", () => {
      const $ = cheerio.load(`
        <div class="mw-heading">Etymology</div>
        <div id="entry">Non-paragraph block.</div>
      `);
      const element = getElementByIdentifierOrThrow($, "#entry");

      const result = service.parse($, element, new Lexeme());

      expect(result).toStrictEqual({ etymology: "" });
    });

    it("returns empty etymology when etymology paragraph is blank", () => {
      const $ = cheerio.load(`
        <div class="mw-heading">Etymology</div>
        <p>   </p>
        <p id="entry">Main entry paragraph.</p>
      `);
      const element = getElementByIdentifierOrThrow($, "#entry");

      const result = service.parse($, element, new Lexeme());

      expect(result).toStrictEqual({ etymology: "" });
    });

    it("returns etymology text without synthetic translation when no participle pattern exists", () => {
      const $ = cheerio.load(`
        <div class="mw-heading">Etymology</div>
        <p>Borrowed from an earlier source.</p>
        <p id="entry">Main entry paragraph.</p>
      `);
      const element = getElementByIdentifierOrThrow($, "#entry");

      const result = service.parse($, element, new Lexeme());

      expect(result).toStrictEqual({
        etymology: "Borrowed from an earlier source.",
      });
    });

    it("creates a synthetic translation for participle etymology", () => {
      const $ = cheerio.load(`
        <div class="mw-heading">Etymology</div>
        <p>present participle of amo</p>
        <p id="entry">Main entry paragraph.</p>
      `);
      const element = getElementByIdentifierOrThrow($, "#entry");
      const lexeme = new Lexeme();

      const result = service.parse($, element, lexeme);

      expect(result.etymology).toBe("present participle of amo");
      expect(result.participleTranslation).toBeInstanceOf(Translation);
      expect(result.participleTranslation?.data).toBe(
        "Present participle of amo",
      );
      expect(result.participleTranslation?.lexeme).toBe(lexeme);
    });

    it("matches gerundive participle phrasing", () => {
      const $ = cheerio.load(`
        <div class="mw-heading">Etymology</div>
        <p>future passive participle (gerundive) of amo</p>
        <p id="entry">Main entry paragraph.</p>
      `);
      const element = getElementByIdentifierOrThrow($, "#entry");

      const result = service.parse($, element, new Lexeme());

      expect(result.participleTranslation?.data).toBe(
        "Future passive participle (gerundive) of amo",
      );
    });
  });
});
