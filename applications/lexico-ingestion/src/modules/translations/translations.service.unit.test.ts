import { createMock, type DeepMocked } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import * as cheerio from "cheerio";
import { Like, type Repository } from "typeorm";
import { beforeAll, describe, expect, it } from "vitest";

import { Lexeme, Translation } from "@codebase/lexico-entities";
import { LoggerService } from "@codebase/logging";

import { createRepositoryMock } from "../../../testing/mocks";

import { TranslationsService } from "./translations.service";

describe(TranslationsService, () => {
  let service: TranslationsService;
  let translationsRepository: DeepMocked<Repository<Translation>>;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        TranslationsService,
        {
          provide: getRepositoryToken(Translation),
          useValue: createRepositoryMock<Translation>(),
        },
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
      ],
    }).compile();

    service = await module.resolve(TranslationsService);
    translationsRepository = module.get(getRepositoryToken(Translation));
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("extractTranslationReferences", () => {
    it("should extract unique reference strings from translation text", () => {
      const lexeme = new Lexeme();
      const references = service.extractTranslationReferences([
        new Translation("{*amo*}", lexeme),
        new Translation("{*amicus*}", lexeme),
        new Translation("{*amo*}", lexeme),
      ]);

      expect(references).toStrictEqual(["amo", "amicus"]);
    });

    it("should strip parenthetical qualifiers from references", () => {
      const lexeme = new Lexeme();
      const references = service.extractTranslationReferences([
        new Translation("{*amor (noun)*}", lexeme),
      ]);

      expect(references).toStrictEqual(["amor"]);
    });

    it("should handle multiple references in a single translation", () => {
      const lexeme = new Lexeme();
      const references = service.extractTranslationReferences([
        new Translation("{*amo*} {*amicus*}", lexeme),
      ]);

      expect(references).toStrictEqual(["amo", "amicus"]);
    });

    it("should handle references with spaces and parentheses", () => {
      const lexeme = new Lexeme();
      const references = service.extractTranslationReferences([
        new Translation("{*amor (gen. -oris)*}", lexeme),
      ]);

      expect(references).toStrictEqual(["amor"]);
    });

    it("should return empty array when no references exist", () => {
      const lexeme = new Lexeme();
      const references = service.extractTranslationReferences([
        new Translation("a plain translation", lexeme),
      ]);

      expect(references).toStrictEqual([]);
    });

    it("should ignore empty reference after removing parenthetical qualifier", () => {
      const lexeme = new Lexeme();
      const references = service.extractTranslationReferences([
        new Translation("{*(noun)*}", lexeme),
      ]);

      expect(references).toStrictEqual([]);
    });
  });

  describe("prepareTranslationsForSave", () => {
    it("should preserve IDs of existing translations", () => {
      const lexeme = new Lexeme();
      lexeme.lemma = "amō";
      lexeme.disambiguator = 0;

      const existingTranslation = new Translation("to love");
      existingTranslation.id = "1";
      existingTranslation.createdAt = new Date("2024-01-01");
      existingTranslation.updatedAt = new Date("2024-01-02");
      lexeme.translations = [existingTranslation];

      const translation = new Translation("to love");

      const prepared = service.prepareTranslationsForSave(lexeme, [
        translation,
      ]);

      expect(prepared[0]?.id).toBe("1");
      expect(prepared[0]?.createdAt).toStrictEqual(new Date("2024-01-01"));
      expect(prepared[0]?.updatedAt).toStrictEqual(new Date("2024-01-02"));
    });

    it("should allow empty translation array", () => {
      const lexeme = new Lexeme();
      lexeme.lemma = "est";
      lexeme.disambiguator = 0;
      lexeme.translations = [new Translation("old translation")];

      const prepared = service.prepareTranslationsForSave(lexeme, []);

      expect(prepared).toStrictEqual([]);
    });

    it("should not modify translations with no existing match", () => {
      const lexeme = new Lexeme();
      lexeme.lemma = "rosa";
      lexeme.disambiguator = 0;
      lexeme.translations = [new Translation("old translation")];

      const newTranslation = new Translation("new translation");
      const prepared = service.prepareTranslationsForSave(lexeme, [
        newTranslation,
      ]);

      expect(prepared[0]?.id).toBeUndefined();
    });

    it("should handle lexeme with no translations array", () => {
      const lexeme = new Lexeme();
      lexeme.lemma = "amō";
      lexeme.disambiguator = 0;
      lexeme.translations = null;

      const translation = new Translation("to love");
      const prepared = service.prepareTranslationsForSave(lexeme, [
        translation,
      ]);

      expect(prepared).toHaveLength(1);
    });
  });

  describe("findTranslationsWithReferences", () => {
    it("should query translations only for the given lexeme id", async () => {
      translationsRepository.find.mockResolvedValue([]);

      await service.findTranslationsWithReferences("amor:1");

      const findByLexemeCall = translationsRepository.find.mock.calls[0]?.[0];

      expect(findByLexemeCall).toStrictEqual({
        relations: { lexeme: true },
        where: { data: Like("%{*%*}%"), lexeme: { id: "amor:1" } },
      });
    });

    it("should return matching translations", async () => {
      const lexeme = new Lexeme();
      lexeme.id = "amor:1";
      lexeme.partOfSpeech = "noun";

      const t1 = new Translation("{*amo*}", lexeme);
      const t2 = new Translation("{*amicus*}", lexeme);
      translationsRepository.find.mockResolvedValue([t1, t2]);

      const result = await service.findTranslationsWithReferences("amor:1");

      expect(result).toStrictEqual([t1, t2]);
    });
  });

  describe("findAllTranslationsWithReferences", () => {
    it("should find all translations with references with default take", async () => {
      const translations: Translation[] = [];
      translationsRepository.find.mockResolvedValue(translations);

      await service.findAllTranslationsWithReferences();

      const defaultFindCall = translationsRepository.find.mock.calls[0]?.[0];

      expect(defaultFindCall).toStrictEqual({
        order: { data: "ASC" },
        relations: { lexeme: true },
        take: 100,
        where: { data: Like("%{*%*}%") },
      });
    });

    it("should respect custom take parameter", async () => {
      const translations: Translation[] = [];
      translationsRepository.find.mockResolvedValue(translations);

      await service.findAllTranslationsWithReferences(50);

      const customTakeFindCall = translationsRepository.find.mock.calls[0]?.[0];

      expect(customTakeFindCall).toStrictEqual({
        order: { data: "ASC" },
        relations: { lexeme: true },
        take: 50,
        where: { data: Like("%{*%*}%") },
      });
    });
  });

  describe("saveTranslations", () => {
    it("should save translations to repository", async () => {
      const lexeme = new Lexeme();
      const translations = [
        new Translation("love", lexeme),
        new Translation("beloved", lexeme),
      ];

      translationsRepository.save.mockResolvedValue(translations as never);

      const result = await service.saveTranslations(translations);

      const saveCall = translationsRepository.save.mock.calls[0]?.[0];

      expect(saveCall).toBe(translations);
      expect(result).toStrictEqual(translations);
    });

    it("should handle empty array", async () => {
      translationsRepository.save.mockResolvedValue([] as never);

      const result = await service.saveTranslations([]);

      const emptySaveCall = translationsRepository.save.mock.calls[0]?.[0];

      expect(emptySaveCall).toStrictEqual([]);
      expect(result).toStrictEqual([]);
    });
  });

  describe("parseTranslations", () => {
    it("should return empty array when no translation list exists", () => {
      const $ = cheerio.load("<div><p>Some content</p></div>");
      const elt = $("p")[0];
      if (!elt) throw new Error("Element not found");
      const lexeme = new Lexeme();

      const result = service.parseTranslations($, elt, lexeme);

      expect(result).toStrictEqual([]);
    });

    it("should parse translations from list elements", () => {
      const html = `
        <div>
          <p>Translations</p>
          <ol>
            <li>to love</li>
            <li>to cherish</li>
          </ol>
        </div>
      `;
      const $ = cheerio.load(html);
      const elt = $("p")[0];
      if (!elt) throw new Error("Element not found");
      const lexeme = new Lexeme();

      const result = service.parseTranslations($, elt, lexeme);

      expect(result).toHaveLength(2);
      expect(result[0]?.data).toBe("To love");
      expect(result[1]?.data).toBe("To cherish");
    });

    it("should capitalize first letter of translations", () => {
      const html = `
        <div>
          <p>Translations</p>
          <ol>
            <li>small word</li>
          </ol>
        </div>
      `;
      const $ = cheerio.load(html);
      const elt = $("p")[0];
      if (!elt) throw new Error("Element not found");
      const lexeme = new Lexeme();

      const result = service.parseTranslations($, elt, lexeme);

      expect(result[0]?.data).toBe("Small word");
    });

    it("should remove trailing periods", () => {
      const html = `
        <div>
          <p>Translations</p>
          <ol>
            <li>to love.</li>
          </ol>
        </div>
      `;
      const $ = cheerio.load(html);
      const elt = $("p")[0];
      if (!elt) throw new Error("Element not found");
      const lexeme = new Lexeme();

      const result = service.parseTranslations($, elt, lexeme);

      expect(result[0]?.data).toBe("To love");
    });

    it("should skip entries marked as needing translation", () => {
      const html = `
        <div>
          <p>Translations</p>
          <ol>
            <li>This term needs a translation to English</li>
            <li>to love</li>
          </ol>
        </div>
      `;
      const $ = cheerio.load(html);
      const elt = $("p")[0];
      if (!elt) throw new Error("Element not found");
      const lexeme = new Lexeme();

      const result = service.parseTranslations($, elt, lexeme);

      expect(result).toHaveLength(1);
      expect(result[0]?.data).toBe("To love");
    });

    it("should filter out empty translations", () => {
      const html = `
        <div>
          <p>Translations</p>
          <ol>
            <li> </li>
            <li>to love</li>
          </ol>
        </div>
      `;
      const $ = cheerio.load(html);
      const elt = $("p")[0];
      if (!elt) throw new Error("Element not found");
      const lexeme = new Lexeme();

      const result = service.parseTranslations($, elt, lexeme);

      expect(result).toHaveLength(1);
    });

    it("should skip list item containing self link marker", () => {
      const html = `
        <div>
          <p>Translations</p>
          <ol>
            <li>
              skipped
              <span class="form-of-definition-link">
                <a class="selflink" href="#">amo</a>
              </span>
            </li>
            <li>to cherish</li>
          </ol>
        </div>
      `;
      const $ = cheerio.load(html);
      const elt = $("p")[0];
      if (!elt) throw new Error("Element not found");
      const lexeme = new Lexeme();

      const result = service.parseTranslations($, elt, lexeme);

      expect(result).toHaveLength(1);
      expect(result[0]?.data).toBe("To cherish");
    });

    it("should skip form-of links when translation does not match skip regex", () => {
      const html = `
        <div>
          <p>Translations</p>
          <ol>
            <li>
              not a form reference
              <span class="form-of-definition-link">amō</span>
            </li>
          </ol>
        </div>
      `;
      const $ = cheerio.load(html);
      const elt = $("p")[0];
      if (!elt) throw new Error("Element not found");
      const lexeme = new Lexeme();

      const result = service.parseTranslations($, elt, lexeme);

      expect(result).toStrictEqual([]);
    });

    it("should append normalized references for form-of translations", () => {
      const html = `
        <div>
          <p>Translations</p>
          <ol>
            <li>
              alternative spelling of
              <span class="form-of-definition-link">Amō</span>
              <span class="form-of-definition-link">Amīcus</span>
            </li>
          </ol>
        </div>
      `;
      const $ = cheerio.load(html);
      const elt = $("p")[0];
      if (!elt) throw new Error("Element not found");
      const lexeme = new Lexeme();

      const result = service.parseTranslations($, elt, lexeme);

      expect(result).toHaveLength(1);
      expect(result[0]?.data).toContain("{*amo*}");
      expect(result[0]?.data).toContain("{*amicus*}");
    });

    it("should remove nested child lists before reading translation text", () => {
      const html = `
        <div>
          <p>Translations</p>
          <ol>
            <li>
              to love
              <ul><li>nested note</li></ul>
            </li>
          </ol>
        </div>
      `;
      const $ = cheerio.load(html);
      const elt = $("p")[0];
      if (!elt) throw new Error("Element not found");
      const lexeme = new Lexeme();

      const result = service.parseTranslations($, elt, lexeme);

      expect(result[0]?.data).toBe("To love");
    });
  });
});
