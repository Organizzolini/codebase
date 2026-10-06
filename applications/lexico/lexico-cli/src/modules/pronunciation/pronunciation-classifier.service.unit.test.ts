import { Test } from "@nestjs/testing";
import * as cheerio from "cheerio";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { Pronunciation } from "@codebase/lexico-entities";

import { PronunciationClassicalService } from "./pronunciation-classical.service";
import { PronunciationClassifierService } from "./pronunciation-classifier.service";
import { PronunciationEcclesiasticalService } from "./pronunciation-ecclesiastical.service";

import type {
  PronunciationClassicalCharacterContext,
  PronunciationEcclesiasticalCharacterContext,
} from "./pronunciation.types";
import type { AnyNode } from "domhandler";

describe(PronunciationClassifierService, () => {
  let service: PronunciationClassifierService;
  const processClassicalCharacter =
    vi.fn<(args: PronunciationClassicalCharacterContext) => number>();
  const processEcclesiasticalCharacter =
    vi.fn<(args: PronunciationEcclesiasticalCharacterContext) => number>();

  const createPronunciation = (): Pronunciation => {
    const pronunciation = new Pronunciation();
    pronunciation.phonemic = null;
    pronunciation.phonetic = null;
    pronunciation.variant = "classical";
    return pronunciation;
  };

  const getRequiredElement = (element: AnyNode | undefined): AnyNode => {
    if (!element) {
      throw new Error("Expected element");
    }

    return element;
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        PronunciationClassifierService,
        {
          provide: PronunciationClassicalService,
          useValue: { processClassicalCharacter },
        },
        {
          provide: PronunciationEcclesiasticalService,
          useValue: { processEcclesiasticalCharacter },
        },
      ],
    }).compile();

    service = await module.resolve(PronunciationClassifierService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("should delegate classical processing", () => {
    processClassicalCharacter.mockReturnValueOnce(2);

    const result = service.processClassicalCharacter({
      ch: "a",
      index: 1,
      isVowel: () => true,
      phonemes: [],
      word: ["a"],
    });

    expect(result).toBe(2);
    expect(processClassicalCharacter).toHaveBeenCalledTimes(1);
  });

  it("should delegate ecclesiastical processing", () => {
    processEcclesiasticalCharacter.mockReturnValueOnce(3);

    const result = service.processEcclesiasticalCharacter({
      ch: "c",
      index: 0,
      isVowel: () => true,
      phonemes: [],
      word: ["c", "a"],
      wordString: "ca",
    });

    expect(result).toBe(3);
    expect(processEcclesiasticalCharacter).toHaveBeenCalledTimes(1);
  });

  describe("applyWiktionaryPronunciations", () => {
    it("should do nothing when pronunciation header is missing", () => {
      const $ = cheerio.load("<div><ul><li>IPA(key): /a/</li></ul></div>");
      const element = getRequiredElement($("ul").get(0));

      const classical = createPronunciation();
      const ecclesiastical = createPronunciation();
      const vulgar = createPronunciation();

      service.applyWiktionaryPronunciations({
        $,
        classical,
        ecclesiastical,
        elt: element,
        vulgar,
      });

      expect(classical).toMatchObject({ phonemic: null, phonetic: null });
      expect(ecclesiastical).toMatchObject({ phonemic: null, phonetic: null });
      expect(vulgar).toMatchObject({ phonemic: null, phonetic: null });
    });

    it("should assign classical phonemic and phonetic values", () => {
      const $ = cheerio.load(`
        <div class="mw-heading">Pronunciation</div>
        <ul>
          <li><a>Classical</a> IPA(key): /a.mi.kus/, [äˈmiːkʊs]</li>
        </ul>
        <p id="entry"></p>
      `);
      const element = getRequiredElement($("#entry").get(0));

      const classical = createPronunciation();
      const ecclesiastical = createPronunciation();
      const vulgar = createPronunciation();

      service.applyWiktionaryPronunciations({
        $,
        classical,
        ecclesiastical,
        elt: element,
        vulgar,
      });

      expect(classical).toMatchObject({
        phonemic: "/a.mi.kus/",
        phonetic: "[äˈmiːkʊs]",
      });
      expect(ecclesiastical).toMatchObject({ phonemic: null, phonetic: null });
      expect(vulgar).toMatchObject({ phonemic: null, phonetic: null });
    });

    it("should assign ecclesiastical and vulgar variants based on anchor text", () => {
      const $ = cheerio.load(`
        <div class="mw-heading">Pronunciation</div>
        <ul>
          <li><a>Ecclesiastical</a> IPA(key): /tʃeˈli/</li>
          <li><a>Vulgar</a> IPA(key): [keˈli]</li>
        </ul>
        <p id="entry"></p>
      `);
      const element = getRequiredElement($("#entry").get(0));

      const classical = createPronunciation();
      const ecclesiastical = createPronunciation();
      const vulgar = createPronunciation();

      service.applyWiktionaryPronunciations({
        $,
        classical,
        ecclesiastical,
        elt: element,
        vulgar,
      });

      expect(ecclesiastical).toMatchObject({
        phonemic: "/tʃeˈli/",
        phonetic: null,
      });
      expect(vulgar).toMatchObject({
        phonemic: null,
        phonetic: "[keˈli]",
      });
      expect(classical).toMatchObject({ phonemic: null, phonetic: null });
    });

    it("should skip audio list items and ignore entries without IPA key", () => {
      const $ = cheerio.load(`
        <div class="mw-heading">Pronunciation</div>
        <ul>
          <li>Audio: sample.ogg</li>
          <li><a>Classical</a> Not IPA here</li>
        </ul>
        <p id="entry"></p>
      `);
      const element = getRequiredElement($("#entry").get(0));

      const classical = createPronunciation();
      const ecclesiastical = createPronunciation();
      const vulgar = createPronunciation();

      service.applyWiktionaryPronunciations({
        $,
        classical,
        ecclesiastical,
        elt: element,
        vulgar,
      });

      expect(classical).toMatchObject({ phonemic: null, phonetic: null });
      expect(ecclesiastical).toMatchObject({ phonemic: null, phonetic: null });
      expect(vulgar).toMatchObject({ phonemic: null, phonetic: null });
    });

    it("should ignore IPA entries with unknown anchor labels", () => {
      const $ = cheerio.load(`
        <div class="mw-heading">Pronunciation</div>
        <ul>
          <li><a>Reconstructed</a> IPA(key): /a.mi.kus/, [äˈmiːkʊs]</li>
        </ul>
        <p id="entry"></p>
      `);
      const element = getRequiredElement($("#entry").get(0));

      const classical = createPronunciation();
      const ecclesiastical = createPronunciation();
      const vulgar = createPronunciation();

      service.applyWiktionaryPronunciations({
        $,
        classical,
        ecclesiastical,
        elt: element,
        vulgar,
      });

      expect(classical).toMatchObject({ phonemic: null, phonetic: null });
      expect(ecclesiastical).toMatchObject({ phonemic: null, phonetic: null });
      expect(vulgar).toMatchObject({ phonemic: null, phonetic: null });
    });
  });
});
