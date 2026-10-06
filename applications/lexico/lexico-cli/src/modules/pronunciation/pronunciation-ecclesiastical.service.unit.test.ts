import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { PronunciationEcclesiasticalService } from "./pronunciation-ecclesiastical.service";
import { PronunciationPhonemesService } from "./pronunciation-phonemes.service";

import type { PronunciationPhoneme } from "./pronunciation.types";

describe(PronunciationEcclesiasticalService, () => {
  let service: PronunciationEcclesiasticalService;
  const vowels = new Set(["a", "e", "i", "o", "u"]);
  const getStringPhoneme = vi.fn<(_map: unknown, key: string) => string>(
    (_map: unknown, key: string) => key,
  );

  const isLatinVowel = (letter: string): boolean => vowels.has(letter);

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        PronunciationEcclesiasticalService,
        {
          provide: PronunciationPhonemesService,
          useValue: { getStringPhoneme },
        },
      ],
    }).compile();

    service = await module.resolve(PronunciationEcclesiasticalService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("should classify c before e as ch", () => {
    const phonemes: PronunciationPhoneme[] = [];

    const nextIndex = service.processEcclesiasticalCharacter({
      ch: "c",
      index: 0,
      isVowel: isLatinVowel,
      phonemes,
      word: ["c", "e", "n", "a"],
      wordString: "cena",
    });

    expect(nextIndex).toBe(0);
    expect(phonemes).toContain("ch");
  });

  it("should classify default character with a phoneme", () => {
    const phonemes: PronunciationPhoneme[] = [];

    const nextIndex = service.processEcclesiasticalCharacter({
      ch: "a",
      index: 0,
      isVowel: isLatinVowel,
      phonemes,
      word: ["a"],
      wordString: "a",
    });

    expect(nextIndex).toBe(0);
    expect(phonemes.length).toBeGreaterThan(0);
  });

  it("should classify c followed by c and increment index", () => {
    const phonemes: PronunciationPhoneme[] = [];

    const nextIndex = service.processEcclesiasticalCharacter({
      ch: "c",
      index: 0,
      isVowel: () => false,
      phonemes,
      word: ["c", "c", "a"],
      wordString: "cca",
    });

    expect(nextIndex).toBe(1);
    expect(phonemes).toContain("ch");
  });

  it("should classify c as k when not palatalized", () => {
    const phonemes: PronunciationPhoneme[] = [];

    const nextIndex = service.processEcclesiasticalCharacter({
      ch: "c",
      index: 0,
      isVowel: () => false,
      phonemes,
      word: ["c", "a"],
      wordString: "ca",
    });

    expect(nextIndex).toBe(0);
    expect(phonemes).toContain("k");
  });

  it("should classify terminal c as k with missing lookahead", () => {
    const phonemes: PronunciationPhoneme[] = [];

    const nextIndex = service.processEcclesiasticalCharacter({
      ch: "c",
      index: 0,
      isVowel: () => false,
      phonemes,
      word: ["c"],
      wordString: "c",
    });

    expect(nextIndex).toBe(0);
    expect(phonemes).toContain("k");
  });

  it("should classify g before e as dg", () => {
    const phonemes: PronunciationPhoneme[] = [];

    const nextIndex = service.processEcclesiasticalCharacter({
      ch: "g",
      index: 0,
      isVowel: () => false,
      phonemes,
      word: ["g", "e"],
      wordString: "ge",
    });

    expect(nextIndex).toBe(0);
    expect(phonemes).toContain("dg");
  });

  it("should classify g as plain g when not palatalized", () => {
    const phonemes: PronunciationPhoneme[] = [];

    const nextIndex = service.processEcclesiasticalCharacter({
      ch: "g",
      index: 0,
      isVowel: () => false,
      phonemes,
      word: ["g", "a"],
      wordString: "ga",
    });

    expect(nextIndex).toBe(0);
    expect(phonemes).toContain("g");
  });

  it("should classify terminal g as plain g with missing lookahead", () => {
    const phonemes: PronunciationPhoneme[] = [];

    const nextIndex = service.processEcclesiasticalCharacter({
      ch: "g",
      index: 0,
      isVowel: () => false,
      phonemes,
      word: ["g"],
      wordString: "g",
    });

    expect(nextIndex).toBe(0);
    expect(phonemes).toContain("g");
  });

  it("should classify gg as dg and increment index", () => {
    const phonemes: PronunciationPhoneme[] = [];

    const nextIndex = service.processEcclesiasticalCharacter({
      ch: "g",
      index: 0,
      isVowel: () => false,
      phonemes,
      word: ["g", "g", "a"],
      wordString: "gga",
    });

    expect(nextIndex).toBe(1);
    expect(phonemes).toContain("dg");
  });

  it("should classify initial i before vowel as j", () => {
    const phonemes: PronunciationPhoneme[] = [];

    service.processEcclesiasticalCharacter({
      ch: "i",
      index: 0,
      isVowel: isLatinVowel,
      phonemes,
      word: ["i", "a"],
      wordString: "ia",
    });

    expect(phonemes).toContain("j");
    expect(getStringPhoneme).not.toHaveBeenCalled();
  });

  it("should classify non-vocalic i using phoneme service", () => {
    const phonemes: PronunciationPhoneme[] = [];

    service.processEcclesiasticalCharacter({
      ch: "i",
      index: 1,
      isVowel: () => false,
      phonemes,
      word: ["m", "i", "x"],
      wordString: "mix",
    });

    expect(getStringPhoneme).toHaveBeenCalledWith(expect.anything(), "i");
  });

  it("should classify single-letter i using phoneme service", () => {
    const phonemes: PronunciationPhoneme[] = [];

    service.processEcclesiasticalCharacter({
      ch: "i",
      index: 0,
      isVowel: () => false,
      phonemes,
      word: ["i"],
      wordString: "i",
    });

    expect(getStringPhoneme).toHaveBeenCalledWith(expect.anything(), "i");
  });

  it("should classify s between vowels as z", () => {
    const phonemes: PronunciationPhoneme[] = [];

    const nextIndex = service.processEcclesiasticalCharacter({
      ch: "s",
      index: 1,
      isVowel: isLatinVowel,
      phonemes,
      word: ["a", "s", "a"],
      wordString: "asa",
    });

    expect(nextIndex).toBe(1);
    expect(phonemes).toContain("z");
  });

  it("should classify s before ce as sh and skip one character", () => {
    const phonemes: PronunciationPhoneme[] = [];

    const nextIndex = service.processEcclesiasticalCharacter({
      ch: "s",
      index: 0,
      isVowel: isLatinVowel,
      phonemes,
      word: ["s", "c", "e", "n"],
      wordString: "scen",
    });

    expect(nextIndex).toBe(1);
    expect(phonemes).toContain("sh");
  });

  it("should classify terminal s as plain s", () => {
    const phonemes: PronunciationPhoneme[] = [];

    const nextIndex = service.processEcclesiasticalCharacter({
      ch: "s",
      index: 0,
      isVowel: () => false,
      phonemes,
      word: ["s"],
      wordString: "s",
    });

    expect(nextIndex).toBe(0);
    expect(phonemes).toContain("s");
  });

  it("should classify ss and advance index", () => {
    const phonemes: PronunciationPhoneme[] = [];

    const nextIndex = service.processEcclesiasticalCharacter({
      ch: "s",
      index: 0,
      isVowel: () => false,
      phonemes,
      word: ["s", "s", "a"],
      wordString: "ssa",
    });

    expect(nextIndex).toBe(1);
    expect(phonemes).toContain("s");
  });

  it("should classify t before i as ts", () => {
    const phonemes: PronunciationPhoneme[] = [];

    const nextIndex = service.processEcclesiasticalCharacter({
      ch: "t",
      index: 0,
      isVowel: () => false,
      phonemes,
      word: ["t", "i", "o"],
      wordString: "tio",
    });

    expect(nextIndex).toBe(0);
    expect(phonemes).toContain("ts");
  });

  it("should classify x between vowels as gz", () => {
    const phonemes: PronunciationPhoneme[] = [];

    const nextIndex = service.processEcclesiasticalCharacter({
      ch: "x",
      index: 1,
      isVowel: isLatinVowel,
      phonemes,
      word: ["a", "x", "a"],
      wordString: "axa",
    });

    expect(nextIndex).toBe(1);
    expect(phonemes).toContain("gz");
  });

  it("should classify h in mihi as k", () => {
    const phonemes: PronunciationPhoneme[] = [];

    const nextIndex = service.processEcclesiasticalCharacter({
      ch: "h",
      index: 2,
      isVowel: () => false,
      phonemes,
      word: ["m", "i", "h", "i"],
      wordString: "mihi",
    });

    expect(nextIndex).toBe(2);
    expect(phonemes).toContain("k");
  });

  it("should classify h in nihil as k", () => {
    const phonemes: PronunciationPhoneme[] = [];

    const nextIndex = service.processEcclesiasticalCharacter({
      ch: "h",
      index: 2,
      isVowel: () => false,
      phonemes,
      word: ["n", "i", "h", "i", "l"],
      wordString: "nihil",
    });

    expect(nextIndex).toBe(2);
    expect(phonemes).toContain("k");
  });

  it("should classify t as plain t when not before i", () => {
    const phonemes: PronunciationPhoneme[] = [];

    const nextIndex = service.processEcclesiasticalCharacter({
      ch: "t",
      index: 0,
      isVowel: () => false,
      phonemes,
      word: ["t", "a"],
      wordString: "ta",
    });

    expect(nextIndex).toBe(0);
    expect(phonemes).toContain("t");
  });

  it("should classify x before ce as ksh and skip one character", () => {
    const phonemes: PronunciationPhoneme[] = [];

    const nextIndex = service.processEcclesiasticalCharacter({
      ch: "x",
      index: 0,
      isVowel: () => false,
      phonemes,
      word: ["x", "c", "e"],
      wordString: "xce",
    });

    expect(nextIndex).toBe(1);
    expect(phonemes).toContain("ksh");
  });

  it("should classify x as ks when not between vowels or sc", () => {
    const phonemes: PronunciationPhoneme[] = [];

    const nextIndex = service.processEcclesiasticalCharacter({
      ch: "x",
      index: 0,
      isVowel: () => false,
      phonemes,
      word: ["x", "t", "a"],
      wordString: "xta",
    });

    expect(nextIndex).toBe(0);
    expect(phonemes).toContain("ks");
  });

  it("should leave phonemes unchanged for h outside mihi and nihil", () => {
    const phonemes: PronunciationPhoneme[] = [];

    const nextIndex = service.processEcclesiasticalCharacter({
      ch: "h",
      index: 1,
      isVowel: () => false,
      phonemes,
      word: ["a", "h", "o"],
      wordString: "aho",
    });

    expect(nextIndex).toBe(1);
    expect(phonemes).toStrictEqual([]);
  });

  it("should lookup one-character ecclesiastical phoneme and advance index", () => {
    const phonemes: PronunciationPhoneme[] = [];

    const nextIndex = service.processEcclesiasticalCharacter({
      ch: "a",
      index: 0,
      isVowel: () => true,
      phonemes,
      word: ["a", "e", "m"],
      wordString: "aem",
    });

    expect(nextIndex).toBe(1);
    expect(getStringPhoneme).toHaveBeenCalledWith(expect.anything(), "ae");
  });

  it("should lookup nc phoneme and advance by one", () => {
    const phonemes: PronunciationPhoneme[] = [];

    const nextIndex = service.processEcclesiasticalCharacter({
      ch: "n",
      index: 0,
      isVowel: () => false,
      phonemes,
      word: ["n", "c", "a"],
      wordString: "nca",
    });

    expect(nextIndex).toBe(1);
    expect(getStringPhoneme).toHaveBeenCalledWith(expect.anything(), "nc");
  });

  it("should evaluate between-vowels fallback when trailing letter is missing", () => {
    const phonemes: PronunciationPhoneme[] = [];

    const nextIndex = service.processEcclesiasticalCharacter({
      ch: "s",
      index: 1,
      isVowel: (letter) => letter === "a",
      phonemes,
      word: ["a", "s"],
      wordString: "as",
    });

    expect(nextIndex).toBe(1);
    expect(phonemes).toContain("s");
  });

  it("should classify vocal i fallback when next slot exists but is empty", () => {
    const phonemes: PronunciationPhoneme[] = [];
    const sparseWord = ["i", ""];

    service.classifyEcclesiasticalI({
      index: 0,
      isVowel: isLatinVowel,
      phonemes,
      word: sparseWord,
    });

    expect(getStringPhoneme).toHaveBeenCalledWith(expect.anything(), "i");
  });

  it("should classify inter-vocalic i using sparse-array fallback branches", () => {
    const phonemes: PronunciationPhoneme[] = [];
    const sparseWord = ["a", "", "i", ""];

    service.classifyEcclesiasticalI({
      index: 2,
      isVowel: (letter) => letter === "a",
      phonemes,
      word: sparseWord,
    });

    expect(phonemes).toContain("i");
    expect(getStringPhoneme).toHaveBeenCalledWith(expect.anything(), "i");
  });

  it("should classify c and g as non-palatal when lookahead slots are sparse", () => {
    const cPhonemes: PronunciationPhoneme[] = [];
    const gPhonemes: PronunciationPhoneme[] = [];
    const sparseWord = ["c", "", ""];
    const sparseWordForG = ["g", "", ""];

    const cNextIndex = service.classifyEcclesiasticalC(
      0,
      sparseWord,
      cPhonemes,
    );
    const gNextIndex = service.classifyEcclesiasticalG(
      0,
      sparseWordForG,
      gPhonemes,
    );

    expect(cNextIndex).toBe(0);
    expect(gNextIndex).toBe(0);
    expect(cPhonemes).toContain("k");
    expect(gPhonemes).toContain("g");
  });

  it("should classify s with sparse sc lookahead as plain s", () => {
    const phonemes: PronunciationPhoneme[] = [];

    const nextIndex = service.classifyEcclesiasticalS({
      index: 0,
      isVowel: () => false,
      phonemes,
      word: ["s", "c", ""],
    });

    expect(nextIndex).toBe(0);
    expect(phonemes).toContain("s");
  });

  it("should use two-character lookup branch for malformed empty leading character", () => {
    const phonemes: PronunciationPhoneme[] = [];

    const nextIndex = service.lookupMultiCharacterPhoneme({
      ch: "",
      index: 0,
      phonemes,
      word: ["", "n", "c"],
    });

    expect(nextIndex).toBe(2);
    expect(getStringPhoneme).toHaveBeenCalledWith(expect.anything(), "nc");
  });

  it("should evaluate initial vocal i with sparse undefined next letter", () => {
    const serviceWithPrivateInitialI = service as unknown as {
      isInitialVocalI: (
        index: number,
        word: string[],
        isVowel: (letter: string) => boolean,
      ) => boolean;
    };

    const sparseWord = ["", ""];

    const result = serviceWithPrivateInitialI.isInitialVocalI(
      0,
      sparseWord,
      (letter) => letter.length === 0,
    );

    expect(result).toBe(true);
  });

  it("should classify inter-vocalic i when both surrounding vowels are present", () => {
    const phonemes: PronunciationPhoneme[] = [];

    service.classifyEcclesiasticalI({
      index: 2,
      isVowel: isLatinVowel,
      phonemes,
      word: ["x", "a", "i", "a"],
    });

    expect(phonemes).toContain("j");
  });

  it("should evaluate inter-vocalic i fallback when trailing slot is undefined", () => {
    const serviceWithPrivateInterVocalicI = service as unknown as {
      isInterVocalicI: (
        index: number,
        word: string[],
        isVowel: (letter: string) => boolean,
      ) => boolean;
    };

    const sparseWord = ["x", "a", "i", ""] as string[];
    sparseWord[3] = undefined as unknown as string;

    const result = serviceWithPrivateInterVocalicI.isInterVocalicI(
      2,
      sparseWord,
      isLatinVowel,
    );

    expect(result).toBe(false);
  });

  it("should classify c as palatalized using ae two-character lookahead", () => {
    const phonemes: PronunciationPhoneme[] = [];

    const nextIndex = service.classifyEcclesiasticalC(
      0,
      ["c", "a", "e"],
      phonemes,
    );

    expect(nextIndex).toBe(0);
    expect(phonemes).toContain("ch");
  });

  it("should classify g as palatalized using ae two-character lookahead", () => {
    const phonemes: PronunciationPhoneme[] = [];

    const nextIndex = service.classifyEcclesiasticalG(
      0,
      ["g", "a", "e"],
      phonemes,
    );

    expect(nextIndex).toBe(0);
    expect(phonemes).toContain("dg");
  });

  it("should evaluate sc consonant with sparse third slot fallback", () => {
    const serviceWithPrivateScConsonant = service as unknown as {
      isScConsonant: (index: number, word: string[]) => boolean;
    };

    const sparseWord = ["s", "c", ""] as string[];
    sparseWord[2] = undefined as unknown as string;

    const result = serviceWithPrivateScConsonant.isScConsonant(0, sparseWord);

    expect(result).toBe(false);
  });

  it("should evaluate palatalized c fallback when next character is undefined", () => {
    const serviceWithPrivatePalatalizedCConsonant = service as unknown as {
      isPalatalizedCConsonant: (index: number, word: string[]) => boolean;
    };

    const result =
      serviceWithPrivatePalatalizedCConsonant.isPalatalizedCConsonant(0, ["c"]);

    expect(result).toBe(false);
  });

  it("should evaluate palatalized g fallback when next character is undefined", () => {
    const serviceWithPrivatePalatalizedGConsonant = service as unknown as {
      isPalatalizedGConsonant: (index: number, word: string[]) => boolean;
    };

    const result =
      serviceWithPrivatePalatalizedGConsonant.isPalatalizedGConsonant(0, ["g"]);

    expect(result).toBe(false);
  });

  it("should evaluate sc consonant with sparse missing second character", () => {
    const serviceWithPrivateScConsonant = service as unknown as {
      isScConsonant: (index: number, word: string[]) => boolean;
    };

    const sparseWord = ["s", "", "e"];

    const result = serviceWithPrivateScConsonant.isScConsonant(0, sparseWord);

    expect(result).toBe(false);
  });
});
