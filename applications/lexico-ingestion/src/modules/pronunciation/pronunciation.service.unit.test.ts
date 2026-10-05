import { createMock, type DeepMocked } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { Lexeme, Pronunciation } from "@codebase/lexico-entities";
import { LoggerService } from "@codebase/logging";

import { loadCheerioWithRoot } from "../../../testing/mocks";

import { PronunciationClassicalService } from "./pronunciation-classical.service";
import { PronunciationClassifierService } from "./pronunciation-classifier.service";
import { PronunciationEcclesiasticalService } from "./pronunciation-ecclesiastical.service";
import { PronunciationPhonemesService } from "./pronunciation-phonemes.service";
import { PronunciationService } from "./pronunciation.service";

import type {
  PronunciationClassicalCharacterContext,
  PronunciationEcclesiasticalCharacterContext,
} from "./pronunciation.types";
import type { CheerioAPI } from "cheerio";
import type { AnyNode } from "domhandler";
import type { Repository } from "typeorm";

describe(PronunciationService, () => {
  interface PronunciationServicePrivates {
    buildPronunciations: (phonemes: unknown[]) => string[];
    getClassicalPhonemes: (word: string) => string;
    getEcclesiasticalPhonemes: (word: string) => unknown[];
    getEcclesiasticalPronunciations: (word: string) => string[];
  }

  interface ParseContext {
    $: CheerioAPI;
    elt: AnyNode;
  }

  let service: PronunciationService;
  let lexemeRepository: DeepMocked<Repository<Lexeme>>;
  let pronunciationClassifier: DeepMocked<PronunciationClassifierService>;

  const getPronunciationServicePrivates = (): PronunciationServicePrivates =>
    service as unknown as PronunciationServicePrivates;

  const createParseContext = (): ParseContext => {
    const { $, rootElement } = loadCheerioWithRoot("<div></div>");
    return {
      $,
      elt: rootElement,
    };
  };

  const parseWord = (word: string): Pronunciation[] => {
    const { $, elt } = createParseContext();
    return service.parse($, elt, word);
  };

  const parseWordWithContext = (
    word: string,
  ): ParseContext & { result: Pronunciation[] } => {
    const parseContext = createParseContext();
    return {
      ...parseContext,
      result: service.parse(parseContext.$, parseContext.elt, word),
    };
  };

  beforeAll(async () => {
    lexemeRepository = createMock<Repository<Lexeme>>() satisfies DeepMocked<
      Repository<Lexeme>
    >;
    pronunciationClassifier = createMock<PronunciationClassifierService>();

    const module = await Test.createTestingModule({
      providers: [
        PronunciationService,
        { provide: getRepositoryToken(Lexeme), useValue: lexemeRepository },
        { provide: LoggerService, useValue: createMock<LoggerService>() },
        {
          provide: PronunciationClassicalService,
          useValue: createMock<PronunciationClassicalService>({
            processClassicalCharacter: () => 0,
          }),
        },
        {
          provide: PronunciationPhonemesService,
          useValue: createMock<PronunciationPhonemesService>({
            getStringPhoneme: () => "",
          }),
        },
        {
          provide: PronunciationEcclesiasticalService,
          useValue: createMock<PronunciationEcclesiasticalService>({
            processEcclesiasticalCharacter: () => 0,
          }),
        },
        {
          provide: PronunciationClassifierService,
          useValue: pronunciationClassifier,
        },
      ],
    }).compile();

    service = await module.resolve(PronunciationService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("private helpers", () => {
    it("builds recursive pronunciation combinations", () => {
      const pronunciations =
        getPronunciationServicePrivates().buildPronunciations([
          "a",
          ["b", ["c", "d"]],
          "e",
        ]);

      expect(pronunciations).toStrictEqual(
        expect.arrayContaining(["a b e", "a c d e"]),
      );
    });

    it("returns empty pronunciations when phoneme element is undefined", () => {
      const pronunciations =
        getPronunciationServicePrivates().buildPronunciations([undefined]);

      expect(pronunciations).toStrictEqual([]);
    });

    it("computes classical phonemes with pronunciationClassifier callback", () => {
      pronunciationClassifier.processClassicalCharacter.mockImplementationOnce(
        (context: PronunciationClassicalCharacterContext) => {
          expect(context.isVowel(0)).toBe(true);
          expect(context.isVowel(-1)).toBe(false);

          context.phonemes.push(context.ch);
          return context.index;
        },
      );

      const phonemes =
        getPronunciationServicePrivates().getClassicalPhonemes("ā");

      expect(phonemes).toBe("ā");
      expect(
        pronunciationClassifier.processClassicalCharacter,
      ).toHaveBeenCalledTimes(1);
    });

    it("applies classical substitutions before pronunciationClassifier processing", () => {
      pronunciationClassifier.processClassicalCharacter.mockImplementation(
        (context: PronunciationClassicalCharacterContext) => {
          context.phonemes.push(context.ch);
          return context.index;
        },
      );

      const phonemes =
        getPronunciationServicePrivates().getClassicalPhonemes("ph");

      expect(phonemes).toBe("p");
      expect(
        pronunciationClassifier.processClassicalCharacter,
      ).toHaveBeenCalledTimes(1);
      expect(
        pronunciationClassifier.processClassicalCharacter,
      ).toHaveBeenCalledWith(expect.objectContaining({ ch: "p" }));
    });

    it("supports index jumps in classical processing loop", () => {
      pronunciationClassifier.processClassicalCharacter.mockImplementation(
        (context: PronunciationClassicalCharacterContext) => {
          context.phonemes.push(context.ch);
          return context.index + 1;
        },
      );

      const phonemes =
        getPronunciationServicePrivates().getClassicalPhonemes("abcd");

      expect(phonemes).toBe("a c");
      expect(
        pronunciationClassifier.processClassicalCharacter,
      ).toHaveBeenCalledTimes(2);
    });

    it("computes ecclesiastical phonemes with pronunciationClassifier callback", () => {
      pronunciationClassifier.processEcclesiasticalCharacter.mockImplementationOnce(
        (context: PronunciationEcclesiasticalCharacterContext) => {
          expect(context.isVowel("a")).toBe(true);
          expect(context.isVowel("z")).toBe(false);

          context.phonemes.push(context.ch);
          return context.index;
        },
      );

      const phonemes =
        getPronunciationServicePrivates().getEcclesiasticalPhonemes("a");

      expect(phonemes).toStrictEqual(["a"]);
      expect(
        pronunciationClassifier.processEcclesiasticalCharacter,
      ).toHaveBeenCalledTimes(1);
    });

    it("supports index jumps in ecclesiastical processing loop", () => {
      pronunciationClassifier.processEcclesiasticalCharacter.mockImplementation(
        (context: PronunciationEcclesiasticalCharacterContext) => {
          context.phonemes.push(context.ch);
          return context.index + 1;
        },
      );

      const phonemes =
        getPronunciationServicePrivates().getEcclesiasticalPhonemes("roma");

      expect(phonemes).toStrictEqual(["r", "m"]);
      expect(
        pronunciationClassifier.processEcclesiasticalCharacter,
      ).toHaveBeenCalledTimes(2);
    });
  });

  describe("parse", () => {
    it("should parse pronunciation from macronized word with classical variant", () => {
      const result = parseWord("amō");

      expect(result).toHaveLength(3);
      expect(result[0]?.variant).toBe("classical");
      expect(result[0]?.phonemes).toBeDefined();
      expect(result[1]?.variant).toBe("ecclesiastical");
      expect(result[2]?.variant).toBe("vulgar");
    });

    it("should parse pronunciation with ecclesiastical variant from word", () => {
      const result = parseWord("amāre");

      expect(result[1]?.variant).toBe("ecclesiastical");
      expect(result[1]?.phonemes).toBeDefined();
    });

    it("should set vulgar variant with null phonemes", () => {
      const result = parseWord("amō");

      expect(result[2]?.variant).toBe("vulgar");
      expect(result[2]?.phonemes).toBeNull();
    });

    it("should apply Wiktionary pronunciations after building defaults", () => {
      const { $, elt } = createParseContext();

      service.parse($, elt, "amō");

      const firstCallArguments = pronunciationClassifier
        .applyWiktionaryPronunciations.mock.calls[0]?.[0] as
        | undefined
        | {
            $: unknown;
            classical: unknown;
            ecclesiastical: unknown;
            elt: unknown;
            vulgar: unknown;
          };

      expect(firstCallArguments).toBeDefined();
      expect(firstCallArguments?.$).toBe($);
      expect(firstCallArguments?.elt).toBe(elt);
      expect(firstCallArguments?.classical).toBeDefined();
      expect(firstCallArguments?.ecclesiastical).toBeDefined();
      expect(firstCallArguments?.vulgar).toBeDefined();
    });

    it("should create Pronunciation entities with variant and phonemes", () => {
      const result = parseWord("rosa");

      expect(result).toHaveLength(3);

      result.forEach((pronunciation) => {
        expect(pronunciation).toBeInstanceOf(Pronunciation);
        expect(pronunciation.variant).toMatch(
          /^(classical|ecclesiastical|vulgar)$/,
        );
        expect(pronunciation.phonemic).toBeNull();
        expect(pronunciation.phonetic).toBeNull();
      });
    });

    it("should handle empty word string", () => {
      const result = parseWord("");

      expect(result).toHaveLength(3);

      result.forEach((p) => {
        expect(p.variant).toMatch(/^(classical|ecclesiastical|vulgar)$/);
      });
    });

    it("should handle word with diacritics", () => {
      const result = parseWord("dēlektō");

      expect(result).toHaveLength(3);
      expect(result[0]?.variant).toBe("classical");
    });

    it("should return three pronunciation variants in correct order", () => {
      const result = parseWord("amicus");

      expect(result).toHaveLength(3);
      expect(result[0]?.variant).toBe("classical");
      expect(result[1]?.variant).toBe("ecclesiastical");
      expect(result[2]?.variant).toBe("vulgar");
    });

    it("should not include phonetic or phonemic data in parsed result", () => {
      const result = parseWord("rosa");

      expect(result[0]?.phonetic).toBeNull();
      expect(result[0]?.phonemic).toBeNull();
      expect(result[1]?.phonetic).toBeNull();
      expect(result[1]?.phonemic).toBeNull();
    });

    it("should set ecclesiastical phonemes to null when no pronunciation exists", () => {
      vi.spyOn(
        getPronunciationServicePrivates(),
        "getEcclesiasticalPronunciations",
      ).mockReturnValue([]);

      const { result } = parseWordWithContext("amo");

      expect(result[1]?.variant).toBe("ecclesiastical");
      expect(result[1]?.phonemes).toBeNull();
    });
  });

  describe("ingestLexemePronunciations", () => {
    it("should save pronunciations to lexeme", async () => {
      const lexeme = new Lexeme();
      lexeme.id = "amicus:1";
      lexeme.pronunciations = [];

      const pronunciation1 = new Pronunciation();
      pronunciation1.variant = "classical";
      pronunciation1.phonemes = "a.mi.kus";

      lexemeRepository.save.mockResolvedValue(lexeme);

      await service.ingestLexemePronunciations(lexeme, [pronunciation1]);

      expect(lexemeRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "amicus:1",
          pronunciations: [pronunciation1],
        }),
      );
    });

    it("should preserve existing pronunciation IDs", async () => {
      const pronunciation1 = new Pronunciation();
      pronunciation1.id = "existing-id-1";
      pronunciation1.variant = "classical";

      const lexeme = new Lexeme();
      lexeme.id = "amicus:1";
      lexeme.pronunciations = [pronunciation1];

      const newPronunciation = new Pronunciation();
      newPronunciation.variant = "classical";
      newPronunciation.phonemes = "new-phonemes";

      lexemeRepository.save.mockResolvedValue(lexeme);

      await service.ingestLexemePronunciations(lexeme, [newPronunciation]);

      expect(newPronunciation.id).toBe("existing-id-1");
    });

    it("should handle multiple pronunciation variants", async () => {
      const lexeme = new Lexeme();
      lexeme.id = "amicus:1";
      lexeme.pronunciations = [];

      const classical = new Pronunciation();
      classical.variant = "classical";

      const ecclesiastical = new Pronunciation();
      ecclesiastical.variant = "ecclesiastical";

      lexemeRepository.save.mockResolvedValue(lexeme);

      await service.ingestLexemePronunciations(lexeme, [
        classical,
        ecclesiastical,
      ]);

      expect(lexemeRepository.save).toHaveBeenCalledWith(lexeme);

      const savedCall = lexemeRepository.save.mock.calls[0] as
        | [Lexeme]
        | undefined;
      const savedLexeme = savedCall?.[0];

      expect(savedLexeme?.pronunciations).toHaveLength(2);
    });

    it("should handle lexeme with no existing pronunciations", async () => {
      const lexeme = new Lexeme();
      lexeme.id = "amicus:1";
      lexeme.pronunciations = null;

      const pronunciation = new Pronunciation();
      pronunciation.variant = "classical";

      lexemeRepository.save.mockResolvedValue(lexeme);

      await service.ingestLexemePronunciations(lexeme, [pronunciation]);

      expect(lexemeRepository.save).toHaveBeenCalledWith(lexeme);
    });

    it("should match pronunciations by variant to preserve IDs", async () => {
      const existing1 = new Pronunciation();
      existing1.id = "id-1";
      existing1.variant = "classical";

      const existing2 = new Pronunciation();
      existing2.id = "id-2";
      existing2.variant = "ecclesiastical";

      const lexeme = new Lexeme();
      lexeme.pronunciations = [existing1, existing2];

      const newClassical = new Pronunciation();
      newClassical.variant = "classical";

      const newEcclesiastical = new Pronunciation();
      newEcclesiastical.variant = "ecclesiastical";

      const newVulgar = new Pronunciation();
      newVulgar.variant = "vulgar";

      lexemeRepository.save.mockResolvedValue(lexeme);

      await service.ingestLexemePronunciations(lexeme, [
        newClassical,
        newEcclesiastical,
        newVulgar,
      ]);

      expect(newClassical.id).toBe("id-1");
      expect(newEcclesiastical.id).toBe("id-2");
      expect(newVulgar.id).toBeUndefined();
    });

    it("should throw error if save fails", async () => {
      const lexeme = new Lexeme();
      lexeme.pronunciations = [];

      const pronunciation = new Pronunciation();

      lexemeRepository.save.mockRejectedValue(new Error("Database error"));

      await expect(
        service.ingestLexemePronunciations(lexeme, [pronunciation]),
      ).rejects.toThrow("Database error");
    });
  });
});
