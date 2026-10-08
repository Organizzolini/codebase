import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { In, Lexeme } from "@codebase/lexico-entities";

import { createRepositoryMock } from "../../../testing/mocks";

import { LexemesService } from "./lexemes.service";

describe(LexemesService, () => {
  let service: LexemesService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        LexemesService,
        {
          provide: getRepositoryToken(Lexeme),
          useValue: createRepositoryMock<Lexeme>(),
        },
      ],
    }).compile();

    service = await module.resolve(LexemesService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("finds a single lexeme by id with relations", async () => {
    expect.hasAssertions();

    const mockLexeme = new Lexeme();
    mockLexeme.id = "lex-1";
    mockLexeme.lemma = "amō";

    const mockRepo = createRepositoryMock<Lexeme>();
    vi.spyOn(mockRepo, "findOne").mockResolvedValue(mockLexeme);

    const lexemesService = new LexemesService(mockRepo);
    const result = await lexemesService.findById("lex-1");

    expect(mockRepo.findOne).toHaveBeenCalledWith({
      relations: {
        forms: true,
        inflection: true,
        principalParts: true,
        pronunciations: true,
        translations: true,
      },
      where: { id: "lex-1" },
    });
    expect(result).toBe(mockLexeme);
  });

  it("returns null when lexeme not found by id", async () => {
    expect.hasAssertions();

    const mockRepo = createRepositoryMock<Lexeme>();
    vi.spyOn(mockRepo, "findOne").mockResolvedValue(null);

    const lexemesService = new LexemesService(mockRepo);
    const result = await lexemesService.findById("missing-id");

    expect(result).toBeNull();
  });

  it("finds multiple lexemes by ids with relations", async () => {
    expect.hasAssertions();

    const mockLexeme1 = new Lexeme();
    mockLexeme1.id = "lex-1";
    const mockLexeme2 = new Lexeme();
    mockLexeme2.id = "lex-2";

    const mockRepo = createRepositoryMock<Lexeme>();
    vi.spyOn(mockRepo, "find").mockResolvedValue([mockLexeme1, mockLexeme2]);

    const lexemesService = new LexemesService(mockRepo);
    const result = await lexemesService.findByIds(["lex-1", "lex-2"]);

    expect(mockRepo.find).toHaveBeenCalledWith({
      relations: {
        forms: true,
        inflection: true,
        principalParts: true,
        pronunciations: true,
        translations: true,
      },
      where: { id: In(["lex-1", "lex-2"]) },
    });
    expect(result).toStrictEqual([mockLexeme1, mockLexeme2]);
  });

  it("returns empty array immediately when ids array is empty", async () => {
    expect.hasAssertions();

    const mockRepo = createRepositoryMock<Lexeme>();
    const findSpy = vi.spyOn(mockRepo, "find");

    const lexemesService = new LexemesService(mockRepo);
    const result = await lexemesService.findByIds([]);

    expect(findSpy).not.toHaveBeenCalled();
    expect(result).toStrictEqual([]);
  });
});
