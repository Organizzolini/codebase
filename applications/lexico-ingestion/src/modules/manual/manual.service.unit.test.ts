import { createMock, type DeepMocked } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { Lexeme, Word, WordForm, WordLexeme } from "@codebase/lexico-entities";
import { LoggerService } from "@codebase/logging";

import { createRepositoryMock } from "../../../testing/mocks";
import { NumeralsService } from "../numerals/numerals.service";
import { WordsService } from "../words/words.service";

import { MANUAL_LEXEMES_TO_DELETE } from "./manual.constants";
import { ManualService } from "./manual.service";
import * as manualUtilities from "./manual.utilities";

import type { ManualDeletionLexeme } from "./manual.types";
import type { Repository } from "typeorm";
import type { Mocked } from "vitest";

describe(ManualService, () => {
  let service: ManualService;

  let lexemesRepository: DeepMocked<Repository<Lexeme>>;
  let wordsService: Mocked<WordsService>;
  let numeralsService: Mocked<NumeralsService>;
  let logger: DeepMocked<LoggerService>;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ManualService,
        {
          provide: getRepositoryToken(Lexeme),
          useValue: createRepositoryMock<Lexeme>(),
        },
        {
          provide: WordsService,
          useValue: createMock<WordsService>({
            ingestLexemeWords: vi
              .fn<(lexeme?: Lexeme) => Promise<void>>()
              .mockResolvedValue(undefined),
          }),
        },
        {
          provide: NumeralsService,
          useValue: createMock<NumeralsService>({
            toRoman: vi.fn<(numberValue: number) => string>((numberValue) => {
              const romanNumerals: Record<number, string> = {
                1: "I",
                2: "II",
                3: "III",
                4: "IV",
                5: "V",
                10: "X",
              };
              return romanNumerals[numberValue] ?? "X";
            }),
          }),
        },
        {
          provide: getRepositoryToken(Word),
          useValue: createRepositoryMock<Word>(),
        },
        {
          provide: getRepositoryToken(WordLexeme),
          useValue: createRepositoryMock<WordLexeme>(),
        },
        {
          provide: getRepositoryToken(WordForm),
          useValue: createRepositoryMock<WordForm>(),
        },
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
      ],
    }).compile();

    service = await module.resolve(ManualService);
    lexemesRepository = module.get(getRepositoryToken(Lexeme));
    wordsService = module.get(WordsService);
    numeralsService = module.get(NumeralsService);
    logger = await module.resolve(LoggerService);

    lexemesRepository.delete.mockResolvedValue({ affected: 1, raw: [] });
  });

  describe("edge branches", () => {
    interface ManualServiceInstance {
      buildPraenomenLexeme: (
        abbreviation: string,
        praenomen: { feminine?: string; masculine?: string },
      ) => Lexeme;
      ingestRomanNumerals: () => Promise<void>;
    }

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("handles templates without principal parts and inflection in praenomen builder", () => {
      vi.spyOn(
        manualUtilities,
        "buildPraenomenAbbreviationTemplate",
      ).mockImplementation(() => {
        const lexeme = new Lexeme();
        lexeme.partOfSpeech = "noun";
        lexeme.principalParts = [];
        return lexeme;
      });

      const result = (
        service as unknown as ManualServiceInstance
      ).buildPraenomenLexeme("abbr", {
        masculine: "abbr-name",
      });

      expect(result.lemma).toBe("abbr");
      expect(result.principalParts).toStrictEqual([]);
    });

    it("handles templates with inflection object that has no gender field", () => {
      vi.spyOn(
        manualUtilities,
        "buildPraenomenAbbreviationTemplate",
      ).mockImplementation(() => {
        const lexeme = new Lexeme();
        lexeme.partOfSpeech = "noun";
        lexeme.principalParts = [];
        lexeme.inflection = {} as never;
        return lexeme;
      });

      const result = (
        service as unknown as ManualServiceInstance
      ).buildPraenomenLexeme("abbr", {
        feminine: "abbr-name",
      });

      expect(result.lemma).toBe("abbr");
      expect(result.inflection).toStrictEqual({});
    });

    it("skips principal-part assignment when roman template has no primary part", async () => {
      vi.spyOn(manualUtilities, "buildRomanNumeralTemplate").mockImplementation(
        () => {
          const lexeme = new Lexeme();
          lexeme.partOfSpeech = "numeral";
          lexeme.principalParts = [];
          return lexeme;
        },
      );

      await expect(
        (service as unknown as ManualServiceInstance).ingestRomanNumerals(),
      ).resolves.toBeUndefined();
    });
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("sets logger context", async () => {
    const module = await Test.createTestingModule({
      providers: [
        ManualService,
        {
          provide: getRepositoryToken(Lexeme),
          useValue: createRepositoryMock<Lexeme>(),
        },
        {
          provide: WordsService,
          useValue: createMock<WordsService>(),
        },
        {
          provide: NumeralsService,
          useValue: createMock<NumeralsService>(),
        },
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
      ],
    }).compile();

    await module.resolve(ManualService);
    const scopedLogger = await module.resolve(LoggerService);

    expect(scopedLogger.setContext).toHaveBeenCalledWith("ManualService");
  });

  describe("createManual", () => {
    it("should delete existing lexeme before saving", async () => {
      const lexeme = new Lexeme();
      lexeme.lemma = "amō";
      lexeme.disambiguator = 0;

      lexemesRepository.save.mockResolvedValue(lexeme);

      await service.createManual(lexeme);

      expect(lexemesRepository.delete).toHaveBeenCalledWith({
        disambiguator: 0,
        lemma: "amō",
      });
      expect(logger.info).toHaveBeenCalledWith(
        "✏️ Creating lemma:disambiguator",
        undefined,
        { disambiguator: 0, lemma: "amō" },
      );
      expect(logger.info).toHaveBeenCalledWith(
        "✏️ Created lemma:disambiguator",
        undefined,
        { disambiguator: 0, lemma: "amō" },
      );
    });

    it("should save the lexeme with reloading left on so cascaded forms receive its generated id", async () => {
      const lexeme = new Lexeme();
      lexeme.lemma = "rosa";
      lexeme.disambiguator = 0;

      lexemesRepository.save.mockResolvedValue(lexeme);

      await service.createManual(lexeme);

      expect(lexemesRepository.save).toHaveBeenCalledTimes(1);
      expect(lexemesRepository.save.mock.calls[0]).toStrictEqual([lexeme]);
    });

    it("should ingest words for the created lexeme", async () => {
      const lexeme = new Lexeme();
      lexeme.lemma = "amor";
      lexeme.disambiguator = 1;

      lexemesRepository.save.mockResolvedValue(lexeme);

      await service.createManual(lexeme);

      const ingestLexemeWordsCall =
        wordsService.ingestLexemeWords.mock.calls[0]?.[0];

      expect(ingestLexemeWordsCall).toBe(lexeme);
    });
  });

  describe("deleteManual", () => {
    it("should delete lexeme by lemma and disambiguator", async () => {
      await service.deleteManual("vir", 2);

      expect(lexemesRepository.delete).toHaveBeenCalledWith({
        disambiguator: 2,
        lemma: "vir",
      });
      expect(logger.info).toHaveBeenCalledWith(
        "🗑️ Deleting lemma:disambiguator",
        undefined,
        { disambiguator: 2, lemma: "vir" },
      );
      expect(logger.info).toHaveBeenCalledWith(
        "🗑️ Deleted lemma:disambiguator",
        undefined,
        { disambiguator: 2, lemma: "vir" },
      );
    });
  });

  describe("ingestManual", () => {
    it("should delete all stale lexemes from MANUAL_LEXEMES_TO_DELETE", async () => {
      lexemesRepository.save.mockResolvedValue(new Lexeme());

      const manualLexemesToDelete: readonly ManualDeletionLexeme[] =
        MANUAL_LEXEMES_TO_DELETE;

      await service.ingestManual();

      for (const { disambiguator, lemma } of manualLexemesToDelete) {
        expect(lexemesRepository.delete).toHaveBeenCalledWith({
          disambiguator,
          lemma,
        });
      }
    });

    it("should save lexemes multiple times for all manual entries", async () => {
      lexemesRepository.save.mockResolvedValue(new Lexeme());

      await service.ingestManual();

      // Verify save was called many times
      expect(lexemesRepository.save.mock.calls.length).toBeGreaterThan(3);
    });

    it("should ingest words for all created lexemes", async () => {
      lexemesRepository.save.mockResolvedValue(new Lexeme());

      await service.ingestManual();

      const ingestLexemeWordsCalls = wordsService.ingestLexemeWords.mock.calls;

      expect(ingestLexemeWordsCalls.length).toBeGreaterThan(0);
    });

    it("should generate Roman numerals", async () => {
      lexemesRepository.save.mockResolvedValue(new Lexeme());

      await service.ingestManual();

      // Verify that toRoman was called for Roman numeral generation
      const toRomanCalls = numeralsService.toRoman.mock.calls;

      expect(toRomanCalls.length).toBeGreaterThan(0);
    });

    it("should log a milestone every 500 Roman numerals ingested", async () => {
      lexemesRepository.save.mockResolvedValue(new Lexeme());

      await service.ingestManual();

      expect(logger.debug).toHaveBeenCalledWith(
        "🔢 Ingesting Roman numerals",
        undefined,
        { current: 500, total: 3999 },
      );
    });
  });

  describe("buildAdjectivalForms", () => {
    it("returns empty array when values are empty", () => {
      const forms = manualUtilities.buildAdjectivalForms({
        masculine: {
          nominative: {
            singular: [],
          },
        },
      });

      expect(forms).toHaveLength(0);
    });
  });

  describe("resolvePraenomenGender", () => {
    it("returns masculine when only masculine value is present", () => {
      const gender = (
        service as unknown as {
          resolvePraenomenGender: (praenomen: {
            feminine?: string;
            masculine?: string;
          }) => string;
        }
      ).resolvePraenomenGender({ masculine: "Marcus" });

      expect(gender).toBe("masculine");
    });

    it("returns feminine when only feminine value is present", () => {
      const gender = (
        service as unknown as {
          resolvePraenomenGender: (praenomen: {
            feminine?: string;
            masculine?: string;
          }) => string;
        }
      ).resolvePraenomenGender({ feminine: "Marcia" });

      expect(gender).toBe("feminine");
    });
  });
});
