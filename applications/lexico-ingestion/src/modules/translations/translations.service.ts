import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import * as cheerio from "cheerio";
import _ from "lodash";
import { Like, Repository } from "typeorm";

import { Translation } from "@codebase/lexico-entities";
import { LoggerService } from "@codebase/logging";

import { translationSkipRegex } from "./translations.constants";

import type { Lexeme } from "@codebase/lexico-entities";
import type { AnyNode } from "domhandler";

/**
 * Persists Translation entities for a Lexeme and resolves cross-reference
 * markers embedded in translation text.
 */
@Injectable()
export class TranslationsService {
  // 🏗 Dependency Injection

  constructor(
    @InjectRepository(Translation)
    private readonly translationsRepository: Repository<Translation>,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(TranslationsService.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Capitalize first letter for translation parsing.
   */
  private capitalizeFirstLetter(str: string): string {
    return _.upperFirst(str);
  }

  /**
   * Normalizes input values used by translation parsing.
   */
  private normalize(str: string): string {
    return str
      .normalize("NFD")
      .replaceAll(/[\u0300-\u036F]/gu, "")
      .toLowerCase()
      .trim();
  }

  // 🌎 Public Methods

  /** Scans translation strings for `{*word*}` cross-reference patterns and
   * returns the unique set of referenced word strings. */
  extractTranslationReferences(translations: Translation[]): string[] {
    const references: string[] = [];
    for (const t of translations) {
      for (const match of t.data.matchAll(/\{\*(.+?)\*\}/g)) {
        let reference = match[1] ?? "";
        if (/\(.*\)/.test(reference))
          reference = reference.replace(/ ?\(.*\)/, "");
        if (reference) references.push(reference);
      }
    }
    return [...new Set(references)];
  }

  /** Finds all `Translation` rows whose text contains `{*...*}` reference markers. */
  async findAllTranslationsWithReferences(take = 100): Promise<Translation[]> {
    return this.translationsRepository.find({
      order: { data: "ASC" as const },
      relations: { lexeme: true },
      take,
      where: { data: Like("%{*%*}%") },
    });
  }

  /** Finds all `Translation` rows for a single lexeme whose text contains
   * `{*...*}` reference markers. */
  async findTranslationsWithReferences(
    lexemeId: string,
  ): Promise<Translation[]> {
    return this.translationsRepository.find({
      relations: { lexeme: true },
      where: { data: Like("%{*%*}%"), lexeme: { id: lexemeId } },
    });
  }

  /**
   * Parses translations from the Wiktionary HTML element context.
   */
  parseTranslations(
    $: cheerio.CheerioAPI,
    elt: AnyNode,
    lexeme: Lexeme,
  ): Translation[] {
    const translationsHeader = $(elt).nextAll("ol").first();
    if (translationsHeader.length <= 0) return [];

    let translations: Translation[] = [];

    for (const li of translationsHeader.children("li")) {
      if ($(li).find("span.form-of-definition-link .selflink").length > 0)
        continue;
      if ($(li).text().length === 0) continue;

      $(li).children("ol, ul, dl").remove();
      let translation = $(li).text();
      if (translation.includes("This term needs a translation to English"))
        continue;
      translation = this.capitalizeFirstLetter(
        translation.trim().replace(/\.$/, ""),
      );

      if ($(li).find("span.form-of-definition-link").length > 0) {
        if (!translationSkipRegex.test(translation)) continue;
        translation = `${translation} ${$(li)
          .find("span.form-of-definition-link")
          .toArray()
          .map(
            (reference: AnyNode) =>
              `{*${this.normalize($(reference).text())}*}`,
          )
          .join(" ")}`;
      }

      translations.push(new Translation(translation, lexeme));
    }

    translations = translations.filter((t) => !!t.data);
    return translations;
  }

  /** Prepares translations to be saved onto the lexeme (preserves IDs of existing ones).
   * Returns the array of translations to be set on the lexeme parent. */
  prepareTranslationsForSave(
    savedLexeme: Lexeme,
    translations: Translation[],
  ): Translation[] {
    // Preserve IDs of existing translations to prevent orphan removal churn
    const existingTranslations = savedLexeme.translations ?? [];
    for (const translation of translations) {
      const existing = existingTranslations.find(
        (t) => t.data === translation.data,
      );
      if (existing) {
        translation.id = existing.id;
        translation.createdAt = existing.createdAt;
        translation.updatedAt = existing.updatedAt;
      }
    }

    return translations;
  }

  /** Saves an array of translations */
  async saveTranslations(translations: Translation[]): Promise<Translation[]> {
    return this.translationsRepository.save(translations);
  }
}
