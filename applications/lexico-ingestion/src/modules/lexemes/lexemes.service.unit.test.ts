import { createMock, type DeepMocked } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import * as cheerio from "cheerio";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import {
  type Form,
  Lexeme,
  type PrincipalPart,
  type Pronunciation,
  Translation,
} from "@codebase/lexico-entities";
import { LoggerService } from "@codebase/logging";

import { createRepositoryMock } from "../../../testing/mocks";
import { EtymologyService } from "../etymology/etymology.service";
import { FormsBuilderService } from "../forms/forms-builder.service";
import { FormsService } from "../forms/forms.service";
import { PartOfSpeechService } from "../part-of-speech/part-of-speech.service";
import { PrincipalPartsService } from "../principal-parts/principal-parts.service";
import { PronunciationService } from "../pronunciation/pronunciation.service";
import { TranslationsService } from "../translations/translations.service";
import { WordsService } from "../words/words.service";

import { LexemesService } from "./lexemes.service";

import type { WiktionaryPage } from "../lexico-ingestion/lexico-ingestion.types";
import type { Repository } from "typeorm";

describe(LexemesService, () => {
  let service: LexemesService;
  let logger: DeepMocked<LoggerService>;
  let etymologyService: DeepMocked<EtymologyService>;
  let formsBuilderService: DeepMocked<FormsBuilderService>;
  let formsService: DeepMocked<FormsService>;
  let partOfSpeechService: DeepMocked<PartOfSpeechService>;
  let principalPartsService: DeepMocked<PrincipalPartsService>;
  let pronunciationService: DeepMocked<PronunciationService>;
  let translationsService: DeepMocked<TranslationsService>;
  let wordsService: DeepMocked<WordsService>;
  let queryBuilder: DeepMocked<
    ReturnType<Repository<Lexeme>["createQueryBuilder"]>
  >;
  let lexemeRepository: DeepMocked<Repository<Lexeme>>;
  let findOneLexeme: ReturnType<
    typeof vi.mocked<Repository<Lexeme>["findOne"]>
  >;

  beforeAll(async () => {
    lexemeRepository = createRepositoryMock<Lexeme>() as DeepMocked<
      Repository<Lexeme>
    >;
    queryBuilder = lexemeRepository.createQueryBuilder() as DeepMocked<
      ReturnType<Repository<Lexeme>["createQueryBuilder"]>
    >;
    findOneLexeme = vi.mocked(lexemeRepository.findOne);

    const module = await Test.createTestingModule({
      providers: [
        LexemesService,
        { provide: getRepositoryToken(Lexeme), useValue: lexemeRepository },
        { provide: EtymologyService, useValue: createMock<EtymologyService>() },
        {
          provide: FormsBuilderService,
          useValue: createMock<FormsBuilderService>({
            buildFormsForPartOfSpeech: vi
              .fn<() => Form[]>()
              .mockReturnValue([]),
          }),
        },
        {
          provide: FormsService,
          useValue: createMock<FormsService>({
            ingestLexemeForms: vi
              .fn<() => Promise<void>>()
              .mockResolvedValue(undefined),
          }),
        },
        {
          provide: PartOfSpeechService,
          useValue: createMock<PartOfSpeechService>({
            getFirstPrincipalPartName: vi
              .fn<() => string>()
              .mockReturnValue("first"),
            getPartOfSpeech: vi
              .fn<PartOfSpeechService["getPartOfSpeech"]>()
              .mockReturnValue("noun"),
            ingestInflection: vi
              .fn<PartOfSpeechService["ingestInflection"]>()
              .mockReturnValue(
                null as unknown as ReturnType<
                  PartOfSpeechService["ingestInflection"]
                >,
              ),
            parseForms: vi.fn<() => Promise<unknown>>().mockResolvedValue({}),
          }),
        },
        {
          provide: PrincipalPartsService,
          useValue: createMock<PrincipalPartsService>({
            ingestLexemePrincipalParts: vi
              .fn<() => Promise<void>>()
              .mockResolvedValue(undefined),
            parsePrincipalParts: vi
              .fn<
                () => {
                  macronizedWord: string;
                  principalParts: PrincipalPart[];
                }
              >()
              .mockReturnValue({
                macronizedWord: "amo",
                principalParts: [] as PrincipalPart[],
              }),
          }),
        },
        {
          provide: PronunciationService,
          useValue: createMock<PronunciationService>({
            ingestLexemePronunciations: vi
              .fn<() => Promise<void>>()
              .mockResolvedValue(undefined),
            parse: vi.fn<() => Pronunciation[]>().mockReturnValue([]),
          }),
        },
        {
          provide: TranslationsService,
          useValue: createMock<TranslationsService>({
            parseTranslations: vi.fn<() => Translation[]>().mockReturnValue([]),
            prepareTranslationsForSave: vi.fn<
              (
                savedLexeme: Lexeme,
                translations: Translation[],
              ) => Translation[]
            >((_savedLexeme, translations) => translations),
          }),
        },
        {
          provide: WordsService,
          useValue: createMock<WordsService>({
            ingestLexemeWords: vi
              .fn<() => Promise<void>>()
              .mockResolvedValue(undefined),
          }),
        },
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
      ],
    }).compile();

    service = await module.resolve(LexemesService);
    logger = await module.resolve(LoggerService);
    etymologyService = module.get(EtymologyService);
    formsBuilderService = module.get(FormsBuilderService);
    formsService = module.get(FormsService);
    partOfSpeechService = module.get(PartOfSpeechService);
    principalPartsService = module.get(PrincipalPartsService);
    pronunciationService = module.get(PronunciationService);
    translationsService = module.get(TranslationsService);
    wordsService = module.get(WordsService);
  });

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();

    partOfSpeechService.getFirstPrincipalPartName.mockReturnValue("first");
    partOfSpeechService.getPartOfSpeech.mockReturnValue("noun");
    partOfSpeechService.ingestInflection.mockReturnValue(
      null as unknown as ReturnType<PartOfSpeechService["ingestInflection"]>,
    );
    partOfSpeechService.parseForms.mockResolvedValue({});

    principalPartsService.parsePrincipalParts.mockReturnValue({
      macronizedWord: "amo",
      principalParts: [],
    });
    principalPartsService.ingestLexemePrincipalParts.mockResolvedValue(
      undefined,
    );

    formsBuilderService.buildFormsForPartOfSpeech.mockReturnValue([]);
    formsService.ingestLexemeForms.mockResolvedValue(undefined);

    pronunciationService.parse.mockReturnValue([]);
    pronunciationService.ingestLexemePronunciations.mockResolvedValue(
      undefined,
    );

    translationsService.parseTranslations.mockReturnValue([]);
    translationsService.prepareTranslationsForSave.mockImplementation(
      (_savedLexeme, translations) => translations,
    );

    etymologyService.parse.mockReturnValue({
      etymology: "",
    });

    wordsService.ingestLexemeWords.mockResolvedValue(undefined);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("should return true from existsByLemma when count is positive", async () => {
    vi.mocked(queryBuilder.getCount).mockResolvedValue(1);

    const exists = await service.existsByLemma("amo");

    expect(exists).toBe(true);
  });

  it("should return false from existsByLemma when count is zero", async () => {
    vi.mocked(queryBuilder.getCount).mockResolvedValue(0);

    const exists = await service.existsByLemma("amo");

    expect(exists).toBe(false);
  });

  it("should fetch saved lexeme by lemma and disambiguator", async () => {
    const lexeme = new Lexeme();
    findOneLexeme.mockResolvedValue(lexeme);

    const result = await service.fetchSavedLexeme("amo", 0);

    expect(result).toBe(lexeme);
    expect(findOneLexeme).toHaveBeenCalledTimes(1);
  });

  it("should find lexemes with translations by lemma", async () => {
    const lexeme = new Lexeme();
    vi.mocked(queryBuilder.getMany).mockResolvedValue([lexeme]);

    const result = await service.findLexemesByLemmaWithTranslations("amo");

    expect(result).toStrictEqual([lexeme]);
    expect(queryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
      "lexeme.translations",
      "translations",
    );
  });

  it("should return empty parse result when html is missing", async () => {
    const result = await service.parseLexemes({
      category: "lemma",
      href: "x",
      word: "amo",
    });

    expect(result).toStrictEqual([]);
  });

  it("should return empty parse result when no headwords are present", async () => {
    const page: WiktionaryPage = {
      category: "lemma",
      href: "x",
      html: "<div><p>no headword</p></div>",
      word: "amo",
    };

    const result = await service.parseLexemes(page);

    expect(result).toStrictEqual([]);
    expect(logger.warn).toHaveBeenCalledWith(
      "🔤 Missing headwords for word",
      undefined,
      { word: "amo" },
    );
  });

  it("should parse lexemes from headword elements", async () => {
    const page: WiktionaryPage = {
      category: "lemma",
      href: "x",
      html: "<p><strong class='Latn headword'>amo</strong></p>",
      word: "amo",
    };

    const parsedLexeme = new Lexeme();
    const parseLexemeFromElementSpy = vi
      .spyOn(
        service as unknown as {
          parseLexemeFromElement: (args: {
            $: cheerio.CheerioAPI;
            elt: unknown;
            index: number;
            word: string;
          }) => Promise<Lexeme | null>;
        },
        "parseLexemeFromElement",
      )
      .mockResolvedValue(parsedLexeme);

    const result = await service.parseLexemes(page);

    expect(result).toStrictEqual([parsedLexeme]);
    expect(parseLexemeFromElementSpy).toHaveBeenCalledTimes(1);
  });

  it("should skip null lexemes from parseLexemeFromElement", async () => {
    const page: WiktionaryPage = {
      category: "lemma",
      href: "x",
      html: "<p><strong class='Latn headword'>amo</strong></p>",
      word: "amo",
    };

    vi.spyOn(
      service as unknown as {
        parseLexemeFromElement: (args: {
          $: cheerio.CheerioAPI;
          elt: unknown;
          index: number;
          word: string;
        }) => Promise<Lexeme | null>;
      },
      "parseLexemeFromElement",
    ).mockResolvedValue(null);

    const result = await service.parseLexemes(page);

    expect(result).toStrictEqual([]);
  });

  it("should upsert lexeme with ingestion metadata", async () => {
    const lexeme = new Lexeme();
    lexeme.lemma = "amo";
    lexeme.disambiguator = 0;

    await service.upsertLexeme(lexeme);

    expect(lexeme.createdBy).toBeDefined();
    expect(lexeme.updatedBy).toBeDefined();
    expect(lexemeRepository.upsert).toHaveBeenCalledTimes(1);
  });

  it("should return null from saveParsedLexeme when reload fails", async () => {
    const lexeme = new Lexeme();
    lexeme.lemma = "amo";
    lexeme.disambiguator = 0;

    vi.spyOn(service, "upsertLexeme").mockResolvedValue(undefined);
    vi.spyOn(service, "fetchSavedLexeme").mockResolvedValue(null);

    const result = await service.saveParsedLexeme(lexeme);

    expect(result).toBeNull();
  });

  it("should save relations and return saved lexeme when reload succeeds", async () => {
    const lexeme = new Lexeme();
    lexeme.lemma = "amo";
    lexeme.disambiguator = 0;
    lexeme.forms = [];
    lexeme.principalParts = [];
    lexeme.translations = [];
    lexeme.pronunciations = [];

    const savedLexeme = new Lexeme();
    savedLexeme.lemma = "amo";
    savedLexeme.disambiguator = 0;

    vi.spyOn(service, "upsertLexeme").mockResolvedValue(undefined);
    vi.spyOn(service, "fetchSavedLexeme").mockResolvedValue(savedLexeme);

    const saveLexemeRelationsSpy = vi
      .spyOn(
        service as unknown as {
          saveLexemeRelations: (
            lexemeToSave: Lexeme,
            saved: Lexeme,
          ) => Promise<void>;
        },
        "saveLexemeRelations",
      )
      .mockResolvedValue(undefined);

    const result = await service.saveParsedLexeme(lexeme);

    expect(result).toBe(savedLexeme);
    expect(saveLexemeRelationsSpy).toHaveBeenCalledWith(lexeme, savedLexeme);
    expect(logger.debug).toHaveBeenCalledWith("🔑 Upserted lexeme", undefined, {
      disambiguator: 0,
      lemma: "amo",
    });
  });

  it("should parse lexeme element and return null for invalid part of speech", async () => {
    partOfSpeechService.getPartOfSpeech.mockReturnValue(
      "invalid-pos" as unknown as ReturnType<
        PartOfSpeechService["getPartOfSpeech"]
      >,
    );

    const $ = cheerio.load("<p><strong class='Latn headword'>amo</strong></p>");
    const element = $("p").toArray()[0];
    if (!element) {
      throw new Error("Missing element for invalid-pos test");
    }

    const result = await (
      service as unknown as {
        parseLexemeFromElement: (args: {
          $: cheerio.CheerioAPI;
          elt: unknown;
          index: number;
          word: string;
        }) => Promise<Lexeme | null>;
      }
    ).parseLexemeFromElement({
      $,
      elt: element,
      index: 0,
      word: "amo",
    });

    expect(result).toBeNull();
    expect(logger.debug).toHaveBeenCalledWith(
      "🏷️ Skipping unsupported part of speech",
      undefined,
      { partOfSpeech: "invalid-pos", word: "amo" },
    );
  });

  it("should parse lexeme element and skip known skip POS without debug log", async () => {
    partOfSpeechService.getPartOfSpeech.mockReturnValue(
      "letter" as unknown as ReturnType<PartOfSpeechService["getPartOfSpeech"]>,
    );

    const $ = cheerio.load("<p><strong class='Latn headword'>amo</strong></p>");
    const element = $("p").toArray()[0];
    if (!element) {
      throw new Error("Missing element for skip-pos test");
    }

    const result = await (
      service as unknown as {
        parseLexemeFromElement: (args: {
          $: cheerio.CheerioAPI;
          elt: unknown;
          index: number;
          word: string;
        }) => Promise<Lexeme | null>;
      }
    ).parseLexemeFromElement({
      $,
      elt: element,
      index: 0,
      word: "amo",
    });

    expect(result).toBeNull();
    expect(logger.debug).not.toHaveBeenCalledWith(
      expect.stringContaining("Skipping POS"),
    );
  });

  it("should parse lexeme element when principal part name is empty", async () => {
    partOfSpeechService.getPartOfSpeech.mockReturnValue("noun");
    partOfSpeechService.getFirstPrincipalPartName.mockReturnValue("");

    const $ = cheerio.load("<p><strong class='Latn headword'>amo</strong></p>");
    const element = $("p").toArray()[0];
    if (!element) {
      throw new Error("Missing element for principal-part test");
    }

    const result = await (
      service as unknown as {
        parseLexemeFromElement: (args: {
          $: cheerio.CheerioAPI;
          elt: unknown;
          index: number;
          word: string;
        }) => Promise<Lexeme | null>;
      }
    ).parseLexemeFromElement({
      $,
      elt: element,
      index: 0,
      word: "amo",
    });

    expect(result).not.toBeNull();
  });

  it("should skip and debug-log when principal part name is undefined", async () => {
    partOfSpeechService.getPartOfSpeech.mockReturnValue("noun");
    partOfSpeechService.getFirstPrincipalPartName.mockReturnValue(undefined);

    const $ = cheerio.load("<p><strong class='Latn headword'>amo</strong></p>");
    const element = $("p").toArray()[0];
    if (!element) {
      throw new Error("Missing element for undefined principal-part test");
    }

    const result = await (
      service as unknown as {
        parseLexemeFromElement: (args: {
          $: cheerio.CheerioAPI;
          elt: unknown;
          index: number;
          word: string;
        }) => Promise<Lexeme | null>;
      }
    ).parseLexemeFromElement({
      $,
      elt: element,
      index: 0,
      word: "amo",
    });

    expect(result).toBeNull();
    expect(logger.debug).toHaveBeenCalledWith(
      "🏷️ Skipping word without a principal-part name",
      undefined,
      { partOfSpeech: "noun", word: "amo" },
    );
  });

  it("should parse lexeme element and return null when enrichment throws", async () => {
    partOfSpeechService.getPartOfSpeech.mockReturnValue("noun");
    partOfSpeechService.getFirstPrincipalPartName.mockReturnValue("first");

    vi.spyOn(
      service as unknown as {
        enrichLexeme: (args: {
          $: cheerio.CheerioAPI;
          elt: unknown;
          firstPrincipalPartName: string;
          lexeme: Lexeme;
          partOfSpeech: "noun";
        }) => Promise<void>;
      },
      "enrichLexeme",
    ).mockRejectedValue(new Error("parse failure"));

    const $ = cheerio.load("<p><strong class='Latn headword'>amo</strong></p>");
    const element = $("p").toArray()[0];
    if (!element) {
      throw new Error("Missing element for enrichment failure test");
    }

    const result = await (
      service as unknown as {
        parseLexemeFromElement: (args: {
          $: cheerio.CheerioAPI;
          elt: unknown;
          index: number;
          word: string;
        }) => Promise<Lexeme | null>;
      }
    ).parseLexemeFromElement({
      $,
      elt: element,
      index: 0,
      word: "amo",
    });

    expect(result).toBeNull();
    expect(logger.warn).toHaveBeenCalledWith(
      "🧩 Failed parsing lexeme",
      undefined,
      {
        disambiguator: 0,
        lemma: "amo",
        reason: "Error: parse failure",
      },
    );
  });

  it("should save inflection relation when inflection exists", async () => {
    const lexeme = new Lexeme();
    const savedLexeme = new Lexeme();
    const saveInflectionMock = vi
      .fn<() => Promise<void>>()
      .mockResolvedValue(undefined);

    const inflection = {
      id: "",
      lexeme: undefined,
      save: saveInflectionMock,
    } as unknown as NonNullable<Lexeme["inflection"]>;

    const savedInflection = {
      id: "existing-id",
    } as NonNullable<Lexeme["inflection"]>;

    lexeme.inflection = inflection;
    savedLexeme.inflection = savedInflection;

    await (
      service as unknown as {
        saveInflection: (
          inputLexeme: Lexeme,
          inputSavedLexeme: Lexeme,
        ) => Promise<void>;
      }
    ).saveInflection(lexeme, savedLexeme);

    expect(inflection.id).toBe("existing-id");
    expect(saveInflectionMock).toHaveBeenCalledTimes(1);
  });

  it("should return early from saveInflection when no inflection exists", async () => {
    const lexeme = new Lexeme();
    lexeme.inflection = null;

    const savedLexeme = new Lexeme();

    await (
      service as unknown as {
        saveInflection: (
          inputLexeme: Lexeme,
          inputSavedLexeme: Lexeme,
        ) => Promise<void>;
      }
    ).saveInflection(lexeme, savedLexeme);

    expect(savedLexeme.inflection).toBeUndefined();
  });

  it("should save prepared translations when translations are available", async () => {
    const lexeme = new Lexeme();
    const savedLexeme = new Lexeme();
    lexeme.translations = [];

    const prepareTranslationsForSaveSpy = vi
      .spyOn(translationsService, "prepareTranslationsForSave")
      .mockReturnValue([]);

    await (
      service as unknown as {
        saveTranslations: (
          inputLexeme: Lexeme,
          inputSavedLexeme: Lexeme,
        ) => Promise<void>;
      }
    ).saveTranslations(lexeme, savedLexeme);

    expect(prepareTranslationsForSaveSpy).toHaveBeenCalledWith(savedLexeme, []);
    expect(lexemeRepository.save).toHaveBeenCalledWith(savedLexeme);
  });

  it("should skip saving translations when translations are null", async () => {
    const lexeme = new Lexeme();
    const savedLexeme = new Lexeme();
    lexeme.translations = null;

    await (
      service as unknown as {
        saveTranslations: (
          inputLexeme: Lexeme,
          inputSavedLexeme: Lexeme,
        ) => Promise<void>;
      }
    ).saveTranslations(lexeme, savedLexeme);

    expect(
      translationsService.prepareTranslationsForSave,
    ).not.toHaveBeenCalled();
    expect(lexemeRepository.save).not.toHaveBeenCalled();
  });

  it("should ingest forms and words when saving lexeme relations", async () => {
    const lexeme = new Lexeme();
    lexeme.forms = [
      {
        form: "amo",
      },
    ] as unknown as Lexeme["forms"];
    lexeme.principalParts = [];
    lexeme.translations = [];
    lexeme.pronunciations = null;
    lexeme.inflection = null;

    const savedLexeme = new Lexeme();
    savedLexeme.lemma = "amo";
    savedLexeme.disambiguator = 0;

    await (
      service as unknown as {
        saveLexemeRelations: (
          inputLexeme: Lexeme,
          inputSavedLexeme: Lexeme,
        ) => Promise<void>;
      }
    ).saveLexemeRelations(lexeme, savedLexeme);

    expect(
      principalPartsService.ingestLexemePrincipalParts,
    ).toHaveBeenCalledWith(savedLexeme, lexeme.principalParts);
    expect(formsService.ingestLexemeForms).toHaveBeenCalledWith(
      lexeme.forms,
      savedLexeme,
    );
    expect(wordsService.ingestLexemeWords).toHaveBeenCalledWith(savedLexeme);
  });

  it("should ingest pronunciations and skip forms ingestion when no forms exist", async () => {
    const lexeme = new Lexeme();
    lexeme.forms = [];
    lexeme.principalParts = [];
    lexeme.translations = [];
    lexeme.pronunciations = [];
    lexeme.inflection = null;

    const savedLexeme = new Lexeme();
    savedLexeme.lemma = "amo";
    savedLexeme.disambiguator = 0;

    await (
      service as unknown as {
        saveLexemeRelations: (
          inputLexeme: Lexeme,
          inputSavedLexeme: Lexeme,
        ) => Promise<void>;
      }
    ).saveLexemeRelations(lexeme, savedLexeme);

    expect(
      pronunciationService.ingestLexemePronunciations,
    ).toHaveBeenCalledWith(savedLexeme, []);
    expect(formsService.ingestLexemeForms).not.toHaveBeenCalled();
  });

  it("should merge participle translation into parsed translations during enrichment", async () => {
    const lexeme = new Lexeme();
    lexeme.lemma = "amo";
    lexeme.disambiguator = 0;

    const primaryTranslation = new Translation("To love");
    const participleTranslation = new Translation("Loving");

    principalPartsService.parsePrincipalParts.mockReturnValue({
      macronizedWord: "amō",
      principalParts: [],
    });
    partOfSpeechService.ingestInflection.mockReturnValue(
      null as unknown as ReturnType<PartOfSpeechService["ingestInflection"]>,
    );
    translationsService.parseTranslations.mockReturnValue([primaryTranslation]);
    etymologyService.parse.mockReturnValue({
      etymology: "",
      participleTranslation,
    });
    pronunciationService.parse.mockReturnValue([]);
    partOfSpeechService.parseForms.mockResolvedValue({});
    formsBuilderService.buildFormsForPartOfSpeech.mockReturnValue([]);

    const $ = cheerio.load("<p><strong class='Latn headword'>amo</strong></p>");
    const element = $("p").toArray()[0];
    if (!element) {
      throw new Error("Missing element for enrich merge test");
    }

    await (
      service as unknown as {
        enrichLexeme: (args: {
          $: cheerio.CheerioAPI;
          elt: unknown;
          firstPrincipalPartName: string;
          lexeme: Lexeme;
          partOfSpeech: "verb";
        }) => Promise<void>;
      }
    ).enrichLexeme({
      $,
      elt: element,
      firstPrincipalPartName: "amo",
      lexeme,
      partOfSpeech: "verb",
    });

    expect(lexeme.translations).toStrictEqual([
      primaryTranslation,
      participleTranslation,
    ]);
  });

  it("should parse lexeme element successfully when enrichment succeeds", async () => {
    partOfSpeechService.getPartOfSpeech.mockReturnValue("noun");
    partOfSpeechService.getFirstPrincipalPartName.mockReturnValue("first");

    vi.spyOn(
      service as unknown as {
        enrichLexeme: (args: {
          $: cheerio.CheerioAPI;
          elt: unknown;
          firstPrincipalPartName: string;
          lexeme: Lexeme;
          partOfSpeech: "noun";
        }) => Promise<void>;
      },
      "enrichLexeme",
    ).mockResolvedValue(undefined);

    const $ = cheerio.load("<p><strong class='Latn headword'>amo</strong></p>");
    const element = $("p").toArray()[0];
    if (!element) {
      throw new Error("Missing element for lexeme parse test");
    }

    const result = await (
      service as unknown as {
        parseLexemeFromElement: (args: {
          $: cheerio.CheerioAPI;
          elt: unknown;
          index: number;
          word: string;
        }) => Promise<Lexeme | null>;
      }
    ).parseLexemeFromElement({
      $,
      elt: element,
      index: 2,
      word: "Amō",
    });

    expect(result?.lemma).toBe("amo");
    expect(result?.disambiguator).toBe(2);
    expect(result?.partOfSpeech).toBe("noun");
  });
});
