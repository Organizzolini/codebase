import { Injectable } from "@nestjs/common";
import * as cheerio from "cheerio";
import cheerioTableParser from "cheerio-tableparser";

import { sumEsseFui } from "./part-of-speech.constants";

import type { Lexeme } from "@codebase/lexico-entities";
import type { AnyNode } from "domhandler";

/**
 * Service that parses Wiktionary inflection tables into nested form objects.
 */
@Injectable()
export class PartOfSpeechFormsService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Checks whether unknown values can be treated as indexed records.
   */
  private static isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }

  /**
   * Collects table identifiers required by part-of-speech parsing.
   */
  private collectTableIdentifiers(
    index: number,
    index_: number,
    table_: string[][],
  ): Set<string> {
    const { finalIndex: finalM, identifiers: columnIds } = this.scanTableAxis(
      index,
      (m) => table_[m]?.[index_] ?? "",
    );
    const { finalIndex: finalN, identifiers: rowIds } = this.scanTableAxis(
      index_,
      (n) => table_[index]?.[n] ?? "",
    );
    const corner = table_[finalM + 1]?.[finalN + 1] ?? "";
    const cornerEntries: string[] = ["Plural", "Singular"].includes(corner)
      ? [corner.toLowerCase().trim()]
      : [];
    return new Set([...columnIds, ...rowIds, ...cornerEntries]);
  }

  /**
   * Finds generic identifiers for part-of-speech parsing workflows.
   */
  private findGenericIdentifiers(args: {
    index: number;
    index_: number;
    lexeme: Lexeme;
    table_: string[][];
  }): string[] {
    const { index, index_, lexeme, table_ } = args;
    const identifiers = this.collectTableIdentifiers(index, index_, table_);
    if (
      ["adjective", "numeral", "participle", "suffix"].includes(
        lexeme.partOfSpeech,
      )
    ) {
      return [
        [...identifiers].find((id) => this.isNumber(id)) ?? "",
        [...identifiers].find((id) => this.isCase(id)) ?? "",
        [...identifiers].find((id) => this.isGender(id)) ?? "neuter",
      ].filter(Boolean);
    }
    return [...identifiers];
  }

  /**
   * Finds verb identifiers for part-of-speech parsing workflows.
   */
  private findVerbIdentifiers(
    index: number,
    index_: number,
    table_: string[][],
  ): string[] {
    const { finalIndex: finalM, identifiers: columnIds } = this.scanVerbHeader(
      index,
      (m) => table_[m]?.[index_] ?? "",
    );
    const { finalIndex: finalN, identifiers: rowIds } = this.scanVerbHeader(
      index_,
      (n) => table_[index]?.[n] ?? "",
    );
    const cornerEntry = (table_[finalM]?.[finalN] ?? "").toLowerCase().trim();
    return [...new Set([...columnIds, ...rowIds, cornerEntry])]
      .map((id) =>
        id
          .replace(/future\s?perfect/i, "futurePerfect")
          .replace("non-finite forms", "nonFinite")
          .replace("verbal nouns", "verbalNouns")
          .replace(/s$/, ""),
      )
      .filter(Boolean);
  }

  /**
   * Checks whether case in part-of-speech parsing logic.
   */
  private isCase(str: string): boolean {
    return /^((nominative)|(genitive)|(dative)|(accusative)|(ablative)|(vocative)|(locative))$/i.test(
      str,
    );
  }

  /**
   * Checks whether gender in part-of-speech parsing logic.
   */
  private isGender(str: string): boolean {
    return /^((masculine)|(feminine)|(neuter))$/i.test(str);
  }

  /**
   * Checks whether generic form cell in part-of-speech parsing logic.
   */
  private isGenericFormCell(cell: string): boolean {
    return (
      cell.includes("<span ") ||
      cell.includes("\u2014") ||
      cell.includes(" + ") ||
      cell.length === 0
    );
  }

  /**
   * Checks whether number in part-of-speech parsing logic.
   */
  private isNumber(str: string): boolean {
    return /^((singular)|(plural))$/i.test(str);
  }

  /**
   * Checks whether verb form cell in part-of-speech parsing logic.
   */
  private isVerbFormCell(cell: string): boolean {
    return (
      cell.includes("<span ") || cell.includes("\u2014") || cell.includes(" + ")
    );
  }

  /**
   * Looks up sum esse fui entry used by part-of-speech parsing.
   */
  private lookupSumEsseFuiEntry(args: {
    mood: string;
    number: string;
    person: string;
    tense: string;
    voice: string;
  }): string[] | undefined {
    const { mood, number, person, tense, voice } = args;
    return sumEsseFui[mood]?.[voice]?.[tense]?.[number]?.[person];
  }

  /**
   * Parses form table during part-of-speech parsing.
   */
  private parseFormTable(
    $: cheerio.CheerioAPI,
    elt: AnyNode,
  ): null | string[][] {
    const tableHtml = $(elt)
      .nextAll("div")
      .filter(
        (_: number, element: AnyNode) => $(element).find("table").length > 0,
      )
      .first()
      .find("table")
      .first();
    if (tableHtml.length <= 0) return null;

    const $table = cheerio.load($.html(tableHtml));
    cheerioTableParser($table);

    let table: string[][] = $table("table").parsetable(true, true, false);

    // Transpose: table[column][row] -> table[row][column]
    table = (table[0] ?? []).map((_: unknown, index: number) =>
      table.map((column: string[]) => column[index] ?? ""),
    );

    table = table.map((tr: string[]) =>
      tr.map((tc: string) => {
        const c = cheerio.load(tc);
        if (c("span").length <= 0) return c.text().trim();
        return c("body").html() ?? "";
      }),
    );

    return table;
  }

  /**
   * Parses verb word cell during part-of-speech parsing.
   */
  private parseVerbWordCell(
    cell: string,
    number: string,
    person: string,
  ): string[] {
    const cleaned = cell
      .trim()
      .replaceAll(/[\d*]+/g, "")
      .toLowerCase();
    if (cleaned.includes(", ")) return cleaned.split(", ");
    if (cleaned.includes(" + "))
      return this.resolveVerbSumEntry(cleaned, number, person);
    return [cleaned];
  }

  /**
   * Processes verb form row during part-of-speech parsing.
   */
  private processVerbFormRow(args: {
    cell: string;
    disorganizedForms: { identifiers: string[]; word: string[] }[];
    index: number;
    index_: number;
    table: string[][];
  }): void {
    const { cell, disorganizedForms, index, index_, table } = args;
    if (!cell.includes("<span ") && !cell.includes(" + ")) return;
    const c = cheerio.load(cell);
    const identifiers = this.findVerbIdentifiers(index, index_, table);
    const text = c.text();
    if (!/[A-Za-za\u0113\u012B\u014D\u016B\u0233\-\s]+/.test(text)) return;
    disorganizedForms.push({
      identifiers,
      word: this.parseVerbWordCell(
        text,
        identifiers[1] ?? "",
        identifiers[0] ?? "",
      ),
    });
  }

  /**
   * Resolves verb sum entry for part-of-speech parsing.
   */
  private resolveVerbSumEntry(
    cleaned: string,
    number: string,
    person: string,
  ): string[] {
    const moodValues = new Set([
      "imperative",
      "indicative",
      "non-finite",
      "subjunctive",
      "verbal nouns",
    ]);
    const voiceValues = new Set(["active", "passive"]);
    const tenseValues = new Set([
      "future",
      "future perfect",
      "imperfect",
      "perfect",
      "pluperfect",
      "present",
    ]);
    const identifiers = cleaned.split(" ");
    let mood = "";
    let voice = "";
    let tense = "";
    for (const identifier of identifiers) {
      if (moodValues.has(identifier)) mood = identifier;
      else if (voiceValues.has(identifier)) voice = identifier;
      else if (tenseValues.has(identifier)) tense = identifier;
    }
    const sumEntry = this.lookupSumEsseFuiEntry({
      mood,
      number,
      person,
      tense,
      voice,
    });
    if (sumEntry) {
      return sumEntry.map(
        (extension) => `${identifiers[0] ?? ""} ${extension}`,
      );
    }
    return [cleaned];
  }

  /**
   * Scans table axis for part-of-speech parsing context.
   */
  private scanTableAxis(
    startIndex: number,
    cellGetter: (index: number) => string,
  ): { finalIndex: number; identifiers: Set<string> } {
    let index = startIndex;
    const identifiers = new Set<string>();
    while (index >= 0 && this.isGenericFormCell(cellGetter(index))) index--;
    while (index >= 0 && !this.isGenericFormCell(cellGetter(index))) {
      identifiers.add(
        cellGetter(index--).replaceAll(/[./]/g, "").toLowerCase().trim(),
      );
    }
    return { finalIndex: index, identifiers };
  }

  /**
   * Scans verb header for part-of-speech parsing context.
   */
  private scanVerbHeader(
    startIndex: number,
    getCell: (index: number) => string,
  ): { finalIndex: number; identifiers: Set<string> } {
    let index = startIndex;
    while (index > 0 && this.isVerbFormCell(getCell(index))) index--;
    const cells = [getCell(index).toLowerCase().trim()];
    if (index - 1 >= 0)
      cells.push(
        getCell(index - 1)
          .toLowerCase()
          .trim(),
      );
    return { finalIndex: index, identifiers: new Set(cells) };
  }

  /**
   * Sorts identifiers into nested part-of-speech parsing structures.
   */
  private sortIdentifiers(
    inflection: { identifiers: string[]; word: string[] },
    object: Record<string, unknown>,
  ): Record<string, unknown> {
    const identifier = inflection.identifiers.pop();
    if (!identifier) return object;
    if (inflection.identifiers.length === 0) {
      object[identifier] = inflection.word;
      return object;
    }
    if (!object[identifier]) object[identifier] = {};
    const current = object[identifier];
    object[identifier] = this.sortIdentifiers(
      inflection,
      PartOfSpeechFormsService.isRecord(current) ? current : {},
    );
    return object;
  }

  // 🌎 Public Methods

  /** Parses non-verb inflection table forms into nested identifiers. */
  public parseGenericForms(args: {
    $: cheerio.CheerioAPI;
    elt: AnyNode;
    lexeme: Lexeme;
  }): unknown {
    const { $, elt, lexeme } = args;
    const table = this.parseFormTable($, elt);
    if (!table) return null;

    const disorganizedForms: { identifiers: string[]; word: string[] }[] = [];

    for (let index = 0; index < table.length; index++) {
      const row = table[index] ?? [];
      for (const [index_, element] of row.entries()) {
        if (element.includes("<span ")) {
          const c = cheerio.load(element);
          const words = c("span")
            .toArray()
            .map((s: AnyNode) => c(s).text())
            .join(", ");
          if (!/[A-Za-zāēīōūȳ\-\s]+/.test(words)) continue;
          disorganizedForms.push({
            identifiers: this.findGenericIdentifiers({
              index,
              index_,
              lexeme,
              table_: table,
            }),
            word: words
              .trim()
              .replaceAll(/[\d*]/g, "")
              .toLowerCase()
              .split(", "),
          });
        }
      }
    }

    const forms: Record<string, unknown> = {};
    for (const inflection of structuredClone(disorganizedForms)) {
      this.sortIdentifiers(inflection, forms);
    }
    return forms;
  }

  /** Parses verb inflection table forms into nested identifiers. */
  public parseVerbForms(args: {
    $: cheerio.CheerioAPI;
    elt: AnyNode;
  }): unknown {
    const { $, elt } = args;
    const table = this.parseFormTable($, elt);
    if (!table) return null;

    const disorganizedForms: { identifiers: string[]; word: string[] }[] = [];

    for (let index = 0; index < table.length; index++) {
      const row = table[index] ?? [];
      for (const [index_, element] of row.entries()) {
        this.processVerbFormRow({
          cell: element,
          disorganizedForms,
          index,
          index_,
          table,
        });
      }
    }

    const forms: Record<string, unknown> = {};
    for (const inflection of structuredClone(disorganizedForms)) {
      this.sortIdentifiers(inflection, forms);
    }
    return forms;
  }
}
