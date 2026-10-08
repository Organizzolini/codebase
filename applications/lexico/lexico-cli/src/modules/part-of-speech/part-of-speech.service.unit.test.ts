import { Test } from "@nestjs/testing";
import * as cheerio from "cheerio";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import {
  AdjectiveInflection,
  AdverbInflection,
  NounInflection,
  PrepositionInflection,
  UninflectedInflection,
  VerbInflection,
} from "@codebase/lexico-entities";

import { PartOfSpeechFormsService } from "./part-of-speech-forms.service";
import { PartOfSpeechModule } from "./part-of-speech.module";
import { PartOfSpeechService } from "./part-of-speech.service";

import type { Lexeme, PrincipalPart } from "@codebase/lexico-entities";
import type { AnyNode } from "domhandler";

describe(PartOfSpeechService, () => {
  let service: PartOfSpeechService;

  describe("module initialization", () => {
    afterEach(() => {
      vi.resetModules();
      vi.doUnmock("./part-of-speech.constants");
    });

    it("handles non-array constant values during normalization", async () => {
      vi.doMock("./part-of-speech.constants", async () => {
        const actualModule = await vi.importActual(
          "./part-of-speech.constants",
        );

        return {
          ...actualModule,
          adjectiveDeclensionValues: {},
        };
      });

      const { PartOfSpeechService: PartOfSpeechServiceForBootstrap } =
        await import("./part-of-speech.service");

      const partOfSpeechService = new PartOfSpeechServiceForBootstrap(
        new PartOfSpeechFormsService(),
      );

      expect(partOfSpeechService).toBeDefined();
    });

    it("handles non-array enum exports during module initialization", async () => {
      vi.doMock("@codebase/lexico-entities", async () => {
        const actualModule = await vi.importActual("@codebase/lexico-entities");

        return {
          ...actualModule,
          adjectiveDeclensionValues: {},
        };
      });

      const { PartOfSpeechService: PartOfSpeechServiceForNormalization } =
        await import("./part-of-speech.service");
      const partOfSpeechService = new PartOfSpeechServiceForNormalization(
        new PartOfSpeechFormsService(),
      );

      expect(partOfSpeechService).toBeDefined();
    });

    it("filters non-string enum values during module initialization", async () => {
      vi.doMock("@codebase/lexico-entities", async () => {
        const actualModule = await vi.importActual("@codebase/lexico-entities");

        return {
          ...actualModule,
          partOfSpeechEnumValues: ["noun", 123, "verb"],
        };
      });

      const { PartOfSpeechService: PartOfSpeechServiceForNormalization } =
        await import("./part-of-speech.service");
      const partOfSpeechService = new PartOfSpeechServiceForNormalization(
        new PartOfSpeechFormsService(),
      );

      const $ = cheerio.load(`
        <div class="mw-heading"><h3>Noun[edit]</h3></div>
        <p id="entry">word</p>
      `);

      const entryNode = $("#entry").get(0);

      expect(entryNode).toBeDefined();

      const partOfSpeech = partOfSpeechService.getPartOfSpeech(
        $,
        entryNode as AnyNode,
      );

      expect(partOfSpeech).toBe("noun");
    });

    it("wires the forms service through Nest dependency injection", async () => {
      const module = await Test.createTestingModule({
        imports: [PartOfSpeechModule],
      }).compile();

      const partOfSpeechService = await module.resolve(PartOfSpeechService);
      const partOfSpeechFormsService = await module.resolve(
        PartOfSpeechFormsService,
      );
      const serviceWithDependency = partOfSpeechService as unknown as {
        partOfSpeechFormsService: PartOfSpeechFormsService;
      };

      expect(serviceWithDependency.partOfSpeechFormsService).toBe(
        partOfSpeechFormsService,
      );
    });
  });

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [PartOfSpeechFormsService, PartOfSpeechService],
    }).compile();

    service = await module.resolve(PartOfSpeechService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("getPartOfSpeech", () => {
    it("maps proper noun heading to properNoun", () => {
      const $ = cheerio.load(`
        <div class="mw-heading"><h3>Proper noun[edit]</h3></div>
        <p id="entry">word</p>
      `);
      const entryNode = $("#entry").get(0);

      expect(entryNode).toBeDefined();

      const partOfSpeech = service.getPartOfSpeech($, entryNode as AnyNode);

      expect(partOfSpeech).toBe("properNoun");
    });

    it("falls back to phrase for unsupported heading", () => {
      const $ = cheerio.load(`
        <div class="mw-heading"><h3>Unsupported heading</h3></div>
        <p id="entry">word</p>
      `);
      const entryNode = $("#entry").get(0);

      expect(entryNode).toBeDefined();

      const partOfSpeech = service.getPartOfSpeech($, entryNode as AnyNode);

      expect(partOfSpeech).toBe("phrase");
    });
  });

  describe("ingestInflection", () => {
    it("parses adjective inflection", () => {
      const $ = cheerio.load(`
        <p id="entry">bonus</p>
        <div class="mw-heading">Declension</div>
        <div>third declension adjective</div>
      `);
      const entryNode = $("#entry").get(0);

      expect(entryNode).toBeDefined();

      const inflection = service.ingestInflection({
        $,
        elt: entryNode as AnyNode,
        pos: "adjective",
        principalParts: [],
      });

      expect(inflection).toBeInstanceOf(AdjectiveInflection);
      expect((inflection as AdjectiveInflection).declension).toBe("third");
      expect((inflection as AdjectiveInflection).degree).toBe("positive");
    });

    it("returns uninflected adjective inflection when declension heading is missing", () => {
      const $ = cheerio.load('<p id="entry">bonus</p>');
      const entryNode = $("#entry").get(0);

      expect(entryNode).toBeDefined();

      const inflection = service.ingestInflection({
        $,
        elt: entryNode as AnyNode,
        pos: "adjective",
        principalParts: [],
      });

      expect(inflection).toBeInstanceOf(UninflectedInflection);
    });

    it("returns uninflected adjective inflection when declension text normalizes to empty", () => {
      const $ = cheerio.load(`
        <p id="entry">bonus</p>
        <div class="mw-heading">Declension</div>
        <div>adjective declension</div>
      `);
      const entryNode = $("#entry").get(0);

      expect(entryNode).toBeDefined();

      const inflection = service.ingestInflection({
        $,
        elt: entryNode as AnyNode,
        pos: "adjective",
        principalParts: [],
      });

      expect(inflection).toBeInstanceOf(UninflectedInflection);
    });

    it("parses adjective with unknown degree and declension as empty/positive defaults", () => {
      const $ = cheerio.load(`
        <p id="entry">bonus</p>
        <div class="mw-heading">Declension</div>
        <div>unknown grade adjective</div>
      `);
      const entryNode = $("#entry").get(0);

      expect(entryNode).toBeDefined();

      const inflection = service.ingestInflection({
        $,
        elt: entryNode as AnyNode,
        pos: "adjective",
        principalParts: [],
      });

      expect(inflection).toBeInstanceOf(AdjectiveInflection);
      expect((inflection as AdjectiveInflection).declension).toBe("");
      expect((inflection as AdjectiveInflection).degree).toBe("positive");
    });

    it("parses adjective with recognized degree and declension", () => {
      const $ = cheerio.load(`
        <p id="entry">fortior</p>
        <div class="mw-heading">Declension</div>
        <div>third declension comparative adjective</div>
      `);
      const entryNode = $("#entry").get(0);

      expect(entryNode).toBeDefined();

      const inflection = service.ingestInflection({
        $,
        elt: entryNode as AnyNode,
        pos: "adjective",
        principalParts: [],
      });

      expect(inflection).toBeInstanceOf(AdjectiveInflection);
      expect((inflection as AdjectiveInflection).declension).toBe("third");
      expect((inflection as AdjectiveInflection).degree).toBe("comparative");
    });

    it("parses adverb inflection", () => {
      const $ = cheerio.load('<p id="entry">quickly</p>');
      const entryNode = $("#entry").get(0);

      expect(entryNode).toBeDefined();

      const inflection = service.ingestInflection({
        $,
        elt: entryNode as AnyNode,
        pos: "adverb",
        principalParts: [
          { text: ["quickly"] },
          { text: ["quicker"] },
        ] as PrincipalPart[],
      });

      expect(inflection).toBeInstanceOf(AdverbInflection);
      expect((inflection as AdverbInflection).adverbType).toBe("descriptive");
    });

    it("parses conjunctional adverb inflection when only one principal part exists", () => {
      const $ = cheerio.load('<p id="entry">quickly</p>');
      const entryNode = $("#entry").get(0);

      expect(entryNode).toBeDefined();

      const inflection = service.ingestInflection({
        $,
        elt: entryNode as AnyNode,
        pos: "adverb",
        principalParts: [{ text: ["quickly"] }] as PrincipalPart[],
      });

      expect(inflection).toBeInstanceOf(AdverbInflection);
      expect((inflection as AdverbInflection).adverbType).toBe("conjunctional");
    });

    it("parses noun inflection and gender", () => {
      const $ = cheerio.load(`
        <p id="entry"><span class="gender">m</span></p>
        <div class="mw-heading">Declension</div>
        <div>second declension noun</div>
      `);
      const entryNode = $("#entry").get(0);

      expect(entryNode).toBeDefined();

      const inflection = service.ingestInflection({
        $,
        elt: entryNode as AnyNode,
        pos: "noun",
        principalParts: [],
      });

      expect(inflection).toBeInstanceOf(NounInflection);
      expect((inflection as NounInflection).declension).toBe("second");
      expect((inflection as NounInflection).gender).toBe("masculine");
    });

    it("parses noun inflection when declension exists but gender is missing", () => {
      const $ = cheerio.load(`
        <p id="entry"></p>
        <div class="mw-heading">Declension</div>
        <div>first declension noun</div>
      `);
      const entryNode = $("#entry").get(0);

      expect(entryNode).toBeDefined();

      const inflection = service.ingestInflection({
        $,
        elt: entryNode as AnyNode,
        pos: "noun",
        principalParts: [],
      });

      expect(inflection).toBeInstanceOf(NounInflection);
      expect((inflection as NounInflection).declension).toBe("first");
      expect((inflection as NounInflection).gender).toBe("");
    });

    it("parses noun inflection with unknown declension and known feminine gender", () => {
      const $ = cheerio.load(`
        <p id="entry"><span class="gender">f</span></p>
        <div class="mw-heading">Declension</div>
        <div>unknown declension noun</div>
      `);
      const entryNode = $("#entry").get(0);

      expect(entryNode).toBeDefined();

      const inflection = service.ingestInflection({
        $,
        elt: entryNode as AnyNode,
        pos: "noun",
        principalParts: [],
      });

      expect(inflection).toBeInstanceOf(NounInflection);
      expect((inflection as NounInflection).declension).toBe("");
      expect((inflection as NounInflection).gender).toBe("feminine");
    });

    it("parses noun inflection with known declension and unknown gender", () => {
      const $ = cheerio.load(`
        <p id="entry"><span class="gender">x</span></p>
        <div class="mw-heading">Declension</div>
        <div>third declension noun</div>
      `);
      const entryNode = $("#entry").get(0);

      expect(entryNode).toBeDefined();

      const inflection = service.ingestInflection({
        $,
        elt: entryNode as AnyNode,
        pos: "noun",
        principalParts: [],
      });

      expect(inflection).toBeInstanceOf(NounInflection);
      expect((inflection as NounInflection).declension).toBe("third");
      expect((inflection as NounInflection).gender).toBe("");
    });

    it("defaults preposition case to accusative when not present", () => {
      const $ = cheerio.load('<p id="entry">preposition</p>');
      const entryNode = $("#entry").get(0);

      expect(entryNode).toBeDefined();

      const inflection = service.ingestInflection({
        $,
        elt: entryNode as AnyNode,
        pos: "preposition",
        principalParts: [],
      });

      expect(inflection).toBeInstanceOf(PrepositionInflection);
      expect((inflection as PrepositionInflection).case).toBe("accusative");
    });

    it("parses explicit preposition case", () => {
      const $ = cheerio.load('<p id="entry">(+ ablative)</p>');
      const entryNode = $("#entry").get(0);

      expect(entryNode).toBeDefined();

      const inflection = service.ingestInflection({
        $,
        elt: entryNode as AnyNode,
        pos: "preposition",
        principalParts: [],
      });

      expect(inflection).toBeInstanceOf(PrepositionInflection);
      expect((inflection as PrepositionInflection).case).toBe("ablative");
      expect((inflection as PrepositionInflection).other).toBe("ablative");
    });

    it("parses preposition other text with unmatched case as empty case", () => {
      const $ = cheerio.load('<p id="entry">(+ unknowncase)</p>');
      const entryNode = $("#entry").get(0);

      expect(entryNode).toBeDefined();

      const inflection = service.ingestInflection({
        $,
        elt: entryNode as AnyNode,
        pos: "preposition",
        principalParts: [],
      });

      expect(inflection).toBeInstanceOf(PrepositionInflection);
      expect((inflection as PrepositionInflection).case).toBe("");
      expect((inflection as PrepositionInflection).other).toBe("unknowncase");
    });

    it("keeps preposition case empty for unsupported explicit case labels", () => {
      const $ = cheerio.load('<p id="entry">(+ dative)</p>');
      const entryNode = $("#entry").get(0);

      expect(entryNode).toBeDefined();

      const inflection = service.ingestInflection({
        $,
        elt: entryNode as AnyNode,
        pos: "preposition",
        principalParts: [],
      });

      expect(inflection).toBeInstanceOf(PrepositionInflection);
      expect((inflection as PrepositionInflection).case).toBe("");
      expect((inflection as PrepositionInflection).other).toBe("dative");
    });

    it("parses pronoun declension as adjective inflection", () => {
      const $ = cheerio.load(
        '<p id="entry">entry; third declension pronoun</p>',
      );
      const entryNode = $("#entry").get(0);

      expect(entryNode).toBeDefined();

      const inflection = service.ingestInflection({
        $,
        elt: entryNode as AnyNode,
        pos: "pronoun",
        principalParts: [],
      });

      expect(inflection).toBeInstanceOf(AdjectiveInflection);
      expect((inflection as AdjectiveInflection).declension).toBe("third");
    });

    it("parses verb inflection with third-io normalization", () => {
      const $ = cheerio.load(
        '<p id="entry">entry; third conjugation io-variant</p>',
      );
      const entryNode = $("#entry").get(0);

      expect(entryNode).toBeDefined();

      const inflection = service.ingestInflection({
        $,
        elt: entryNode as AnyNode,
        pos: "verb",
        principalParts: [],
      });

      expect(inflection).toBeInstanceOf(VerbInflection);
      expect((inflection as VerbInflection).conjugation).toBe("third-io");
    });

    it("returns uninflected inflection for conjunction", () => {
      const $ = cheerio.load('<p id="entry">et</p>');
      const entryNode = $("#entry").get(0);

      expect(entryNode).toBeDefined();

      const inflection = service.ingestInflection({
        $,
        elt: entryNode as AnyNode,
        pos: "conjunction",
        principalParts: [],
      });

      expect(inflection).toBeInstanceOf(UninflectedInflection);
    });

    it("returns uninflected inflection for prefix group", () => {
      const $ = cheerio.load('<p id="entry">prefix-</p>');
      const entryNode = $("#entry").get(0);

      expect(entryNode).toBeDefined();

      const inflection = service.ingestInflection({
        $,
        elt: entryNode as AnyNode,
        pos: "prefix",
        principalParts: [],
      });

      expect(inflection).toBeInstanceOf(UninflectedInflection);
    });

    it("returns uninflected pronoun inflection when semicolon is missing", () => {
      const $ = cheerio.load('<p id="entry">pronoun entry</p>');
      const entryNode = $("#entry").get(0);

      expect(entryNode).toBeDefined();

      const inflection = service.ingestInflection({
        $,
        elt: entryNode as AnyNode,
        pos: "pronoun",
        principalParts: [],
      });

      expect(inflection).toBeInstanceOf(UninflectedInflection);
    });

    it("returns uninflected verb inflection when semicolon is missing", () => {
      const $ = cheerio.load('<p id="entry">amo</p>');
      const entryNode = $("#entry").get(0);

      expect(entryNode).toBeDefined();

      const inflection = service.ingestInflection({
        $,
        elt: entryNode as AnyNode,
        pos: "verb",
        principalParts: [],
      });

      expect(inflection).toBeInstanceOf(UninflectedInflection);
    });

    it("returns uninflected noun inflection when declension and gender are empty", () => {
      const $ = cheerio.load(`
        <p id="entry"></p>
        <div class="mw-heading">Declension</div>
        <div>noun declension</div>
      `);
      const entryNode = $("#entry").get(0);

      expect(entryNode).toBeDefined();

      const inflection = service.ingestInflection({
        $,
        elt: entryNode as AnyNode,
        pos: "noun",
        principalParts: [],
      });

      expect(inflection).toBeInstanceOf(UninflectedInflection);
    });

    it("returns uninflected noun inflection when no declension heading exists", () => {
      const $ = cheerio.load('<p id="entry"><span class="gender">m</span></p>');
      const entryNode = $("#entry").get(0);

      expect(entryNode).toBeDefined();

      const inflection = service.ingestInflection({
        $,
        elt: entryNode as AnyNode,
        pos: "noun",
        principalParts: [],
      });

      expect(inflection).toBeInstanceOf(UninflectedInflection);
    });

    it("returns uninflected pronoun inflection when declension text is empty", () => {
      const $ = cheerio.load('<p id="entry">entry; pronoun</p>');
      const entryNode = $("#entry").get(0);

      expect(entryNode).toBeDefined();

      const inflection = service.ingestInflection({
        $,
        elt: entryNode as AnyNode,
        pos: "pronoun",
        principalParts: [],
      });

      expect(inflection).toBeInstanceOf(UninflectedInflection);
    });

    it("parses pronoun with unknown declension into adjective inflection with empty declension", () => {
      const $ = cheerio.load('<p id="entry">entry; unknown pronoun</p>');
      const entryNode = $("#entry").get(0);

      expect(entryNode).toBeDefined();

      const inflection = service.ingestInflection({
        $,
        elt: entryNode as AnyNode,
        pos: "pronoun",
        principalParts: [],
      });

      expect(inflection).toBeInstanceOf(AdjectiveInflection);
      expect((inflection as AdjectiveInflection).declension).toBe("");
      expect((inflection as AdjectiveInflection).degree).toBe("positive");
    });

    it("parses pronoun when semicolon has no trailing space", () => {
      const $ = cheerio.load(
        '<p id="entry">entry;third declension pronoun</p>',
      );
      const entryNode = $("#entry").get(0);

      expect(entryNode).toBeDefined();

      const inflection = service.ingestInflection({
        $,
        elt: entryNode as AnyNode,
        pos: "pronoun",
        principalParts: [],
      });

      expect(inflection).toBeInstanceOf(UninflectedInflection);
    });

    it("parses verb inflection with unmatched conjugation as empty", () => {
      const $ = cheerio.load('<p id="entry">entry; unknown mood pattern</p>');
      const entryNode = $("#entry").get(0);

      expect(entryNode).toBeDefined();

      const inflection = service.ingestInflection({
        $,
        elt: entryNode as AnyNode,
        pos: "verb",
        principalParts: [],
      });

      expect(inflection).toBeInstanceOf(VerbInflection);
      expect((inflection as VerbInflection).conjugation).toBe("");
    });

    it("parses verb inflection with a recognized conjugation", () => {
      const $ = cheerio.load('<p id="entry">entry; first conjugation</p>');
      const entryNode = $("#entry").get(0);

      expect(entryNode).toBeDefined();

      const inflection = service.ingestInflection({
        $,
        elt: entryNode as AnyNode,
        pos: "verb",
        principalParts: [],
      });

      expect(inflection).toBeInstanceOf(VerbInflection);
      expect((inflection as VerbInflection).conjugation).toBe("first");
      expect((inflection as VerbInflection).other).toBe("first");
    });

    it("parses verb inflection with fourth conjugation", () => {
      const $ = cheerio.load('<p id="entry">entry; fourth conjugation</p>');
      const entryNode = $("#entry").get(0);

      expect(entryNode).toBeDefined();

      const inflection = service.ingestInflection({
        $,
        elt: entryNode as AnyNode,
        pos: "verb",
        principalParts: [],
      });

      expect(inflection).toBeInstanceOf(VerbInflection);
      expect((inflection as VerbInflection).conjugation).toBe("fourth");
    });

    it("parses verb inflection when semicolon has no trailing space", () => {
      const $ = cheerio.load('<p id="entry">entry;first conjugation</p>');
      const entryNode = $("#entry").get(0);

      expect(entryNode).toBeDefined();

      const inflection = service.ingestInflection({
        $,
        elt: entryNode as AnyNode,
        pos: "verb",
        principalParts: [],
      });

      expect(inflection).toBeInstanceOf(VerbInflection);
      expect((inflection as VerbInflection).conjugation).toBe("");
      expect((inflection as VerbInflection).other).toBe("");
    });

    it("returns uninflected inflection for unknown inflection group", () => {
      const $ = cheerio.load('<p id="entry">entry</p>');
      const entryNode = $("#entry").get(0);

      expect(entryNode).toBeDefined();

      const inflection = service.ingestInflection({
        $,
        elt: entryNode as AnyNode,
        pos: "invalid" as unknown as Parameters<
          PartOfSpeechService["ingestInflection"]
        >[0]["pos"],
        principalParts: [],
      });

      expect(inflection).toBeInstanceOf(UninflectedInflection);
    });
  });

  describe("getFirstPrincipalPartName", () => {
    it("returns configured first principal part names", () => {
      expect(service.getFirstPrincipalPartName("noun")).toBeDefined();
      expect(service.getFirstPrincipalPartName("verb")).toBeDefined();
    });

    it("returns first principal part names for all supported parts of speech", () => {
      const partsOfSpeech: Parameters<
        PartOfSpeechService["getFirstPrincipalPartName"]
      >[0][] = [
        "abbreviation",
        "adjective",
        "adverb",
        "circumfix",
        "conjunction",
        "determiner",
        "idiom",
        "inflection",
        "interfix",
        "interjection",
        "noun",
        "numeral",
        "participle",
        "particle",
        "phrase",
        "prefix",
        "preposition",
        "pronoun",
        "properNoun",
        "proverb",
        "suffix",
        "verb",
      ];

      for (const partOfSpeech of partsOfSpeech) {
        expect(service.getFirstPrincipalPartName(partOfSpeech)).toBeDefined();
      }
    });
  });

  describe("parseForms", () => {
    it("returns adverb forms from principal parts", () => {
      const $ = cheerio.load('<p id="entry">quickly</p>');
      const entryNode = $("#entry").get(0);

      expect(entryNode).toBeDefined();

      const forms = service.parseForms({
        $,
        elt: entryNode as AnyNode,
        lexeme: { partOfSpeech: "adverb" } as Lexeme,
        pos: "adverb",
        principalParts: [
          { text: ["quickly"] },
          { text: ["quicker"] },
          { text: ["quickest"] },
        ] as PrincipalPart[],
      });

      expect(forms).toStrictEqual({
        comparative: ["quicker"],
        positive: ["quickly"],
        superlative: ["quickest"],
      });
    });

    it("returns adverb forms with only positive degree when other principal parts are absent", () => {
      const $ = cheerio.load('<p id="entry">quickly</p>');
      const entryNode = $("#entry").get(0);

      expect(entryNode).toBeDefined();

      const forms = service.parseForms({
        $,
        elt: entryNode as AnyNode,
        lexeme: { partOfSpeech: "adverb" } as Lexeme,
        pos: "adverb",
        principalParts: [{ text: ["quickly"] }] as PrincipalPart[],
      });

      expect(forms).toStrictEqual({
        positive: ["quickly"],
      });
    });

    it("returns adverb forms with empty positive list when principal parts are missing", () => {
      const $ = cheerio.load('<p id="entry">quickly</p>');
      const entryNode = $("#entry").get(0);

      expect(entryNode).toBeDefined();

      const forms = service.parseForms({
        $,
        elt: entryNode as AnyNode,
        lexeme: { partOfSpeech: "adverb" } as Lexeme,
        pos: "adverb",
        principalParts: [],
      });

      expect(forms).toStrictEqual({
        positive: [],
      });
    });

    it("dispatches generic forms parsing", () => {
      const serviceWithParser = service as unknown as {
        partOfSpeechFormsService: {
          parseGenericForms: (args: {
            $: cheerio.CheerioAPI;
            elt: AnyNode;
            lexeme: Lexeme;
          }) => unknown;
          parseVerbForms: (args: {
            $: cheerio.CheerioAPI;
            elt: AnyNode;
          }) => unknown;
        };
      };
      const parseGenericFormsSpy = vi
        .spyOn(serviceWithParser.partOfSpeechFormsService, "parseGenericForms")
        .mockReturnValue({ noun: ["word"] });

      const $ = cheerio.load('<p id="entry">word</p>');
      const entryNode = $("#entry").get(0);

      expect(entryNode).toBeDefined();

      const forms = service.parseForms({
        $,
        elt: entryNode as AnyNode,
        lexeme: { partOfSpeech: "noun" } as Lexeme,
        pos: "noun",
        principalParts: [],
      });

      expect(parseGenericFormsSpy).toHaveBeenCalledTimes(1);
      expect(forms).toStrictEqual({ noun: ["word"] });
    });

    it("dispatches verb forms parsing", () => {
      const serviceWithParser = service as unknown as {
        partOfSpeechFormsService: {
          parseGenericForms: (args: {
            $: cheerio.CheerioAPI;
            elt: AnyNode;
            lexeme: Lexeme;
          }) => unknown;
          parseVerbForms: (args: {
            $: cheerio.CheerioAPI;
            elt: AnyNode;
          }) => unknown;
        };
      };
      const parseVerbFormsSpy = vi
        .spyOn(serviceWithParser.partOfSpeechFormsService, "parseVerbForms")
        .mockReturnValue({ indicative: ["amō"] });

      const $ = cheerio.load('<p id="entry">amō</p>');
      const entryNode = $("#entry").get(0);

      expect(entryNode).toBeDefined();

      const forms = service.parseForms({
        $,
        elt: entryNode as AnyNode,
        lexeme: { partOfSpeech: "verb" } as Lexeme,
        pos: "verb",
        principalParts: [],
      });

      expect(parseVerbFormsSpy).toHaveBeenCalledTimes(1);
      expect(forms).toStrictEqual({ indicative: ["amō"] });
    });

    it("returns null for unknown forms group", () => {
      const $ = cheerio.load('<p id="entry">word</p>');
      const entryNode = $("#entry").get(0);

      expect(entryNode).toBeDefined();

      const forms = service.parseForms({
        $,
        elt: entryNode as AnyNode,
        lexeme: { partOfSpeech: "noun" } as Lexeme,
        pos: "invalid" as unknown as Parameters<
          PartOfSpeechService["parseForms"]
        >[0]["pos"],
        principalParts: [],
      });

      expect(forms).toBeNull();
    });

    it("dispatches generic forms for all generic parts of speech", () => {
      const serviceWithParser = service as unknown as {
        partOfSpeechFormsService: {
          parseGenericForms: (args: {
            $: cheerio.CheerioAPI;
            elt: AnyNode;
            lexeme: Lexeme;
          }) => unknown;
        };
      };

      const parseGenericFormsSpy = vi
        .spyOn(serviceWithParser.partOfSpeechFormsService, "parseGenericForms")
        .mockReturnValue({ generic: ["word"] });
      const initialCallCount = parseGenericFormsSpy.mock.calls.length;

      const genericPartsOfSpeech: Parameters<
        PartOfSpeechService["parseForms"]
      >[0]["pos"][] = [
        "abbreviation",
        "adjective",
        "circumfix",
        "conjunction",
        "determiner",
        "idiom",
        "inflection",
        "interfix",
        "interjection",
        "noun",
        "numeral",
        "participle",
        "particle",
        "phrase",
        "prefix",
        "preposition",
        "pronoun",
        "properNoun",
        "proverb",
        "suffix",
      ];

      const $ = cheerio.load('<p id="entry">word</p>');
      const entryNode = $("#entry").get(0);

      expect(entryNode).toBeDefined();

      for (const partOfSpeech of genericPartsOfSpeech) {
        const forms = service.parseForms({
          $,
          elt: entryNode as AnyNode,
          lexeme: { partOfSpeech } as Lexeme,
          pos: partOfSpeech,
          principalParts: [],
        });

        expect(forms).toStrictEqual({ generic: ["word"] });
      }

      expect(parseGenericFormsSpy.mock.calls.length - initialCallCount).toBe(
        genericPartsOfSpeech.length,
      );
    });

    it("dispatches inflection handlers for mapped part-of-speech groups", () => {
      const $ = cheerio.load(
        '<p id="entry">entry; third declension pronoun</p>',
      );
      const entryNode = $("#entry").get(0);

      expect(entryNode).toBeDefined();

      const mappedPartsOfSpeech: Parameters<
        PartOfSpeechService["ingestInflection"]
      >[0]["pos"][] = [
        "abbreviation",
        "circumfix",
        "determiner",
        "idiom",
        "inflection",
        "interfix",
        "interjection",
        "numeral",
        "participle",
        "particle",
        "phrase",
        "properNoun",
        "proverb",
        "suffix",
      ];

      for (const partOfSpeech of mappedPartsOfSpeech) {
        const inflection = service.ingestInflection({
          $,
          elt: entryNode as AnyNode,
          pos: partOfSpeech,
          principalParts: [],
        });

        expect(inflection).toBeDefined();
      }
    });
  });
});
