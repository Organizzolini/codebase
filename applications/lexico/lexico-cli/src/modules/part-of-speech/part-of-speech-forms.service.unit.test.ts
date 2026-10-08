import { Test } from "@nestjs/testing";
import * as cheerio from "cheerio";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { loadCheerioElement } from "../../../testing/mocks";

import { PartOfSpeechFormsService } from "./part-of-speech-forms.service";

import type { Lexeme } from "@codebase/lexico-entities";
import type { CheerioAPI } from "cheerio";
import type { AnyNode } from "domhandler";

describe(PartOfSpeechFormsService, () => {
  let service: PartOfSpeechFormsService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [PartOfSpeechFormsService],
    }).compile();

    service = await module.resolve(PartOfSpeechFormsService);
  });

  // Re-resolved per test: the parser accumulates state across a parse, so a
  // shared instance would let one case's forms leak into the next.
  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [PartOfSpeechFormsService],
    }).compile();

    service = await module.resolve(PartOfSpeechFormsService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("should initialize the service instance", () => {
    expect(service).toBeDefined();
  });

  describe("parseGenericForms", () => {
    it("returns null when no form table exists", () => {
      const { $, element } = loadCheerioElement(
        '<p id="entry">word</p>',
        "#entry",
      );

      const forms = service.parseGenericForms({
        $,
        elt: element,
        lexeme: { partOfSpeech: "noun" } as Lexeme,
      });

      expect(forms).toBeNull();
    });

    it("builds nested identifier structure for adjective forms", () => {
      const parserWithPrivates = service as unknown as {
        parseFormTable: ($: CheerioAPI, elt: AnyNode) => null | string[][];
      };

      vi.spyOn(parserWithPrivates, "parseFormTable").mockReturnValue([
        ["Singular", "Plural"],
        ["Nominative", '<span class="Latn" lang="la">bonus</span>'],
        ["Accusative", '<span class="Latn" lang="la">bonum</span>'],
      ]);

      const { $, element } = loadCheerioElement("<p />", "p");

      const forms = service.parseGenericForms({
        $,
        elt: element,
        lexeme: { partOfSpeech: "adjective" } as Lexeme,
      });

      expect(forms).toStrictEqual({
        neuter: {
          accusative: { plural: ["bonum"] },
          nominative: { plural: ["bonus"] },
        },
      });
    });

    it("skips non-latin content cells", () => {
      const parserWithPrivates = service as unknown as {
        parseFormTable: (
          $: cheerio.CheerioAPI,
          elt: AnyNode,
        ) => null | string[][];
      };

      vi.spyOn(parserWithPrivates, "parseFormTable").mockReturnValue([
        ["Singular", "Plural"],
        ["Nominative", '<span class="Latn" lang="la">123</span>'],
      ]);

      const forms = service.parseGenericForms({
        $: cheerio.load("<p />"),
        elt: cheerio.load("<p />")("p").get(0) as AnyNode,
        lexeme: { partOfSpeech: "noun" } as Lexeme,
      });

      expect(forms).toStrictEqual({});
    });

    it("handles sparse generic form tables without row entries", () => {
      const parserWithPrivates = service as unknown as {
        parseFormTable: (
          $: cheerio.CheerioAPI,
          elt: AnyNode,
        ) => null | string[][];
      };

      const sparseTable: string[][] = [];
      sparseTable[1] = [
        "Nominative",
        '<span class="Latn" lang="la">bonus</span>',
      ];

      vi.spyOn(parserWithPrivates, "parseFormTable").mockReturnValue(
        sparseTable,
      );

      const forms = service.parseGenericForms({
        $: cheerio.load("<p />"),
        elt: cheerio.load("<p />")("p").get(0) as AnyNode,
        lexeme: { partOfSpeech: "noun" } as Lexeme,
      });

      expect(forms).toStrictEqual({
        nominative: ["bonus"],
      });
    });
  });

  describe("parseVerbForms", () => {
    it("returns null when no form table exists", () => {
      const $ = cheerio.load('<p id="entry">verb entry</p>');
      const entryNode = $("#entry").get(0);

      expect(entryNode).toBeDefined();

      const forms = service.parseVerbForms({
        $,
        elt: entryNode as AnyNode,
      });

      expect(forms).toBeNull();
    });

    it("sorts processed verb inflections into nested objects", () => {
      const parserWithPrivates = service as unknown as {
        parseFormTable: (
          $: cheerio.CheerioAPI,
          elt: AnyNode,
        ) => null | string[][];
        processVerbFormRow: (args: {
          cell: string;
          disorganizedForms: { identifiers: string[]; word: string[] }[];
          index: number;
          index_: number;
          table: string[][];
        }) => void;
      };

      vi.spyOn(parserWithPrivates, "parseFormTable").mockReturnValue([
        ["ignore", "target-one"],
        ["ignore", "target-two"],
      ]);

      vi.spyOn(parserWithPrivates, "processVerbFormRow").mockImplementation(
        ({ cell, disorganizedForms }) => {
          if (cell === "target-one") {
            disorganizedForms.push({
              identifiers: ["present", "indicative"],
              word: ["present-form"],
            });
          }
          if (cell === "target-two") {
            disorganizedForms.push({
              identifiers: ["future", "indicative"],
              word: ["future-form"],
            });
          }
        },
      );

      const forms = service.parseVerbForms({
        $: cheerio.load("<p />"),
        elt: cheerio.load("<p />")("p").get(0) as AnyNode,
      });

      expect(forms).toStrictEqual({
        indicative: {
          future: ["future-form"],
          present: ["present-form"],
        },
      });
    });

    it("handles sparse verb form tables without row entries", () => {
      const parserWithPrivates = service as unknown as {
        parseFormTable: (
          $: cheerio.CheerioAPI,
          elt: AnyNode,
        ) => null | string[][];
      };

      const sparseTable: string[][] = [];
      sparseTable[1] = ["", '<span class="Latn" lang="la">amo</span>'];

      vi.spyOn(parserWithPrivates, "parseFormTable").mockReturnValue(
        sparseTable,
      );

      const forms = service.parseVerbForms({
        $: cheerio.load("<p />"),
        elt: cheerio.load("<p />")("p").get(0) as AnyNode,
      });

      expect(forms).toStrictEqual({});
    });
  });

  describe("resolveVerbSumEntry", () => {
    it("expands known sum/esse/fui lookup entries", () => {
      const parserWithPrivates = service as unknown as {
        resolveVerbSumEntry: (
          cleaned: string,
          number: string,
          person: string,
        ) => string[];
      };

      const words = parserWithPrivates.resolveVerbSumEntry(
        "sample indicative active present",
        "singular",
        "first",
      );

      expect(words).toStrictEqual(["sample sum"]);
    });

    it("returns original input when lookup does not exist", () => {
      const parserWithPrivates = service as unknown as {
        resolveVerbSumEntry: (
          cleaned: string,
          number: string,
          person: string,
        ) => string[];
      };

      const words = parserWithPrivates.resolveVerbSumEntry(
        "sample unknown voice tense",
        "singular",
        "first",
      );

      expect(words).toStrictEqual(["sample unknown voice tense"]);
    });
  });

  describe("private helpers", () => {
    it("parses verb word cell variants", () => {
      const parserWithPrivates = service as unknown as {
        parseVerbWordCell: (
          cell: string,
          number: string,
          person: string,
        ) => string[];
      };

      expect(
        parserWithPrivates.parseVerbWordCell("amo, amas", "singular", "first"),
      ).toStrictEqual(["amo", "amas"]);

      expect(
        parserWithPrivates.parseVerbWordCell("sample +", "singular", "first"),
      ).toStrictEqual(expect.arrayContaining([expect.any(String)]));

      expect(
        parserWithPrivates.parseVerbWordCell("amo", "plural", "first"),
      ).toStrictEqual(["amo"]);
    });

    it("finds generic identifiers for adjective and noun", () => {
      const parserWithPrivates = service as unknown as {
        findGenericIdentifiers: (args: {
          index: number;
          index_: number;
          lexeme: Lexeme;
          table_: string[][];
        }) => string[];
      };

      const table = [
        ["", "singular", "plural"],
        ["nominative", '<span class="Latn">bonus</span>', ""],
        ["accusative", '<span class="Latn">bonum</span>', ""],
      ];

      const adjectiveIdentifiers = parserWithPrivates.findGenericIdentifiers({
        index: 1,
        index_: 1,
        lexeme: { partOfSpeech: "adjective" } as Lexeme,
        table_: table,
      });
      const nounIdentifiers = parserWithPrivates.findGenericIdentifiers({
        index: 1,
        index_: 1,
        lexeme: { partOfSpeech: "noun" } as Lexeme,
        table_: table,
      });

      expect(adjectiveIdentifiers).toStrictEqual(
        expect.arrayContaining(["nominative", "neuter"]),
      );
      expect(["plural", "singular"]).toContain(adjectiveIdentifiers[0]);
      expect(nounIdentifiers.length).toBeGreaterThan(0);
    });

    it("uses empty defaults for missing adjective number and case identifiers", () => {
      const parserWithPrivates = service as unknown as {
        collectTableIdentifiers: (
          index: number,
          index_: number,
          table_: string[][],
        ) => Set<string>;
        findGenericIdentifiers: (args: {
          index: number;
          index_: number;
          lexeme: Lexeme;
          table_: string[][];
        }) => string[];
      };

      vi.spyOn(parserWithPrivates, "collectTableIdentifiers").mockReturnValue(
        new Set(["masculine"]),
      );

      const identifiers = parserWithPrivates.findGenericIdentifiers({
        index: 0,
        index_: 0,
        lexeme: { partOfSpeech: "adjective" } as Lexeme,
        table_: [[""]],
      });

      expect(identifiers).toStrictEqual(["masculine"]);
    });

    it("finds and normalizes verb identifiers", () => {
      const parserWithPrivates = service as unknown as {
        findVerbIdentifiers: (
          index: number,
          index_: number,
          table_: string[][],
        ) => string[];
      };

      const table = [
        ["indicative", "first"],
        ["future perfect", '<span class="Latn">x</span>'],
      ];

      const identifiers = parserWithPrivates.findVerbIdentifiers(1, 1, table);

      expect(identifiers).toStrictEqual(
        expect.arrayContaining(["futurePerfect", "first", "indicative"]),
      );
    });

    it("finds verb identifiers when row lookup falls back to empty cells", () => {
      const parserWithPrivates = service as unknown as {
        findVerbIdentifiers: (
          index: number,
          index_: number,
          table_: string[][],
        ) => string[];
      };

      const identifiers = parserWithPrivates.findVerbIdentifiers(1, 0, [
        ["indicative", "present"],
      ]);

      expect(identifiers).toStrictEqual(["indicative"]);
    });

    it("normalizes non-finite and verbal nouns verb identifiers", () => {
      const parserWithPrivates = service as unknown as {
        findVerbIdentifiers: (
          index: number,
          index_: number,
          table_: string[][],
        ) => string[];
      };

      const table = [
        ["verbal nouns", "first"],
        ["non-finite forms", '<span class="Latn">x</span>'],
      ];

      const identifiers = parserWithPrivates.findVerbIdentifiers(1, 1, table);

      expect(identifiers).toStrictEqual(
        expect.arrayContaining(["nonFinite", "verbalNoun", "first"]),
      );
    });

    it("processes verb row only when valid verb form cell exists", () => {
      const parserWithPrivates = service as unknown as {
        processVerbFormRow: (args: {
          cell: string;
          disorganizedForms: { identifiers: string[]; word: string[] }[];
          index: number;
          index_: number;
          table: string[][];
        }) => void;
      };

      const disorganizedForms: { identifiers: string[]; word: string[] }[] = [];
      const table = [
        ["", "indicative"],
        ["first", '<span class="Latn">amo</span>'],
      ];

      parserWithPrivates.processVerbFormRow({
        cell: "plain text",
        disorganizedForms,
        index: 0,
        index_: 0,
        table,
      });
      parserWithPrivates.processVerbFormRow({
        cell: '<span class="Latn">amo</span>',
        disorganizedForms,
        index: 1,
        index_: 1,
        table,
      });

      expect(disorganizedForms).toHaveLength(1);
    });

    it("processes plus-sign verb rows without span markup", () => {
      const parserWithPrivates = service as unknown as {
        processVerbFormRow: (args: {
          cell: string;
          disorganizedForms: { identifiers: string[]; word: string[] }[];
          index: number;
          index_: number;
          table: string[][];
        }) => void;
      };

      const disorganizedForms: { identifiers: string[]; word: string[] }[] = [];
      const table = [["indicative active present", "sum + esse"]];

      parserWithPrivates.processVerbFormRow({
        cell: "sum + esse",
        disorganizedForms,
        index: 0,
        index_: 1,
        table,
      });

      expect(disorganizedForms).toHaveLength(1);
      expect(disorganizedForms[0]?.word.length).toBeGreaterThan(0);
    });

    it("skips verb row when span text is not latin letters", () => {
      const parserWithPrivates = service as unknown as {
        processVerbFormRow: (args: {
          cell: string;
          disorganizedForms: { identifiers: string[]; word: string[] }[];
          index: number;
          index_: number;
          table: string[][];
        }) => void;
      };

      const disorganizedForms: { identifiers: string[]; word: string[] }[] = [];
      const table = [
        ["", "indicative"],
        ["first", '<span class="Latn">123</span>'],
      ];

      parserWithPrivates.processVerbFormRow({
        cell: '<span class="Latn">123</span>',
        disorganizedForms,
        index: 1,
        index_: 1,
        table,
      });

      expect(disorganizedForms).toStrictEqual([]);
    });

    it("scans table axis and verb headers", () => {
      const parserWithPrivates = service as unknown as {
        scanTableAxis: (
          startIndex: number,
          cellGetter: (index: number) => string,
        ) => { finalIndex: number; identifiers: Set<string> };
        scanVerbHeader: (
          startIndex: number,
          getCell: (index: number) => string,
        ) => { finalIndex: number; identifiers: Set<string> };
      };

      const axis = parserWithPrivates.scanTableAxis(2, (index) => {
        const values = ["", "nominative", '<span class="Latn">amo</span>'];
        return values[index] ?? "";
      });

      const header = parserWithPrivates.scanVerbHeader(1, (index) => {
        const values = ["indicative", '<span class="Latn">amo</span>'];
        return values[index] ?? "";
      });

      expect(axis.identifiers.size).toBeGreaterThanOrEqual(1);
      expect(header.identifiers.has("indicative")).toBe(true);
    });

    it("includes previous verb header cell when start cell is not a form cell", () => {
      const parserWithPrivates = service as unknown as {
        scanVerbHeader: (
          startIndex: number,
          getCell: (index: number) => string,
        ) => { finalIndex: number; identifiers: Set<string> };
      };

      const header = parserWithPrivates.scanVerbHeader(1, (index) => {
        const values = ["indicative", "present"];
        return values[index] ?? "";
      });

      expect(header.identifiers.has("present")).toBe(true);
      expect(header.identifiers.has("indicative")).toBe(true);
    });

    it("returns only current verb header cell when scanning from index zero", () => {
      const parserWithPrivates = service as unknown as {
        scanVerbHeader: (
          startIndex: number,
          getCell: (index: number) => string,
        ) => { finalIndex: number; identifiers: Set<string> };
      };

      const header = parserWithPrivates.scanVerbHeader(0, (index) => {
        const values = ["indicative"];
        return values[index] ?? "";
      });

      expect(header.finalIndex).toBe(0);
      expect(header.identifiers).toStrictEqual(new Set(["indicative"]));
    });

    it("sorts identifiers into nested object", () => {
      const parserWithPrivates = service as unknown as {
        sortIdentifiers: (
          inflection: { identifiers: string[]; word: string[] },
          object: Record<string, unknown>,
        ) => Record<string, unknown>;
      };

      const sorted = parserWithPrivates.sortIdentifiers(
        {
          identifiers: ["indicative", "present"],
          word: ["amo"],
        },
        {},
      );

      expect(sorted).toStrictEqual({
        present: {
          indicative: ["amo"],
        },
      });
    });

    it("returns object unchanged when sortIdentifiers receives no identifiers", () => {
      const parserWithPrivates = service as unknown as {
        sortIdentifiers: (
          inflection: { identifiers: string[]; word: string[] },
          object: Record<string, unknown>,
        ) => Record<string, unknown>;
      };

      const base = { keep: "value" };
      const sorted = parserWithPrivates.sortIdentifiers(
        {
          identifiers: [],
          word: ["amo"],
        },
        base,
      );

      expect(sorted).toBe(base);
      expect(sorted).toStrictEqual({ keep: "value" });
    });

    it("replaces non-record intermediate values while sorting identifiers", () => {
      const parserWithPrivates = service as unknown as {
        sortIdentifiers: (
          inflection: { identifiers: string[]; word: string[] },
          object: Record<string, unknown>,
        ) => Record<string, unknown>;
      };

      const sorted = parserWithPrivates.sortIdentifiers(
        {
          identifiers: ["indicative", "present"],
          word: ["amo"],
        },
        { present: "invalid-branch" },
      );

      expect(sorted).toStrictEqual({
        present: {
          indicative: ["amo"],
        },
      });
    });

    it("parses form table from nearby html table", () => {
      const parserWithPrivates = service as unknown as {
        parseFormTable: (
          $: cheerio.CheerioAPI,
          elt: AnyNode,
        ) => null | string[][];
      };

      const $ = cheerio.load(
        '<p id="entry">entry</p><div><table><tr><th></th><th>Singular</th></tr><tr><th>Nominative</th><td><span class="Latn">bonus</span></td></tr></table></div>',
      );
      const entryNode = $("#entry").get(0);
      if (!entryNode) {
        throw new Error("Expected entry node");
      }

      const table = parserWithPrivates.parseFormTable($, entryNode);

      expect(table).not.toBeNull();
      expect(table?.length).toBeGreaterThan(0);
    });

    it("parses empty html tables into an empty matrix", () => {
      const parserWithPrivates = service as unknown as {
        parseFormTable: (
          $: cheerio.CheerioAPI,
          elt: AnyNode,
        ) => null | string[][];
      };

      const $ = cheerio.load(
        '<p id="entry">entry</p><div><table></table></div>',
      );
      const entryNode = $("#entry").get(0);
      if (!entryNode) {
        throw new Error("Expected entry node");
      }

      const table = parserWithPrivates.parseFormTable($, entryNode);

      expect(table).toStrictEqual([]);
    });

    it("fills sparse transposed table cells with empty strings", () => {
      const parserWithPrivates = service as unknown as {
        parseFormTable: (
          $: cheerio.CheerioAPI,
          elt: AnyNode,
        ) => null | string[][];
      };

      const $ = cheerio.load(
        '<p id="entry">entry</p><div><table><tr><th>A</th><th>B</th></tr><tr><td>x</td></tr></table></div>',
      );
      const entryNode = $("#entry").get(0);
      if (!entryNode) {
        throw new Error("Expected entry node");
      }

      const table = parserWithPrivates.parseFormTable($, entryNode);

      expect(table).toStrictEqual([
        ["A", "B"],
        ["x", ""],
      ]);
    });

    it("collects table identifiers when row lookup falls back to empty strings", () => {
      const parserWithPrivates = service as unknown as {
        collectTableIdentifiers: (
          index: number,
          index_: number,
          table_: string[][],
        ) => Set<string>;
      };

      const identifiers = parserWithPrivates.collectTableIdentifiers(1, 0, [
        ["nominative", "plural"],
      ]);

      expect([...identifiers]).toStrictEqual(
        expect.arrayContaining(["nominative"]),
      );
    });
  });
});
