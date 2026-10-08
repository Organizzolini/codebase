import { createMock } from "@golevelup/ts-vitest";
import {
  GraphQLSchemaBuilderModule,
  GraphQLSchemaFactory,
} from "@nestjs/graphql";
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it, vi } from "vitest";

import {
  AdjectivalForm,
  AdjectiveInflection,
  AdverbForm,
  AdverbInflection,
  FiniteVerbForm,
  GerundForm,
  InfinitiveForm,
  Lexeme,
  NominalForm,
  NounInflection,
  ParticipleForm,
  PrepositionInflection,
  SupineForm,
  UninflectedInflection,
  VerbInflection,
} from "@codebase/lexico-entities";

import { LexemesResolver } from "./lexemes.resolver";
import { LexemesService } from "./lexemes.service";

describe(LexemesResolver, () => {
  let resolver: LexemesResolver;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        LexemesResolver,
        { provide: LexemesService, useValue: createMock<LexemesService>() },
      ],
    }).compile();

    resolver = await module.resolve(LexemesResolver);
  });

  it("is defined", () => {
    expect(resolver).toBeDefined();
  });

  it("resolves single lexeme by id using lexemes service", async () => {
    expect.hasAssertions();

    const mockLexeme = new Lexeme();
    mockLexeme.id = "lex-1";
    mockLexeme.lemma = "amō";

    const mockService = createMock<LexemesService>({
      findById: vi
        .fn<LexemesService["findById"]>()
        .mockResolvedValue(mockLexeme),
    });

    const resolver = new LexemesResolver(mockService);
    const result = await resolver.lexeme({ id: "lex-1" });

    expect(mockService.findById).toHaveBeenCalledWith("lex-1");
    expect(result).toBe(mockLexeme);
  });

  it("resolves multiple lexemes by ids using lexemes service", async () => {
    expect.hasAssertions();

    const mockLexeme1 = new Lexeme();
    mockLexeme1.id = "lex-1";
    const mockLexeme2 = new Lexeme();
    mockLexeme2.id = "lex-2";

    const mockService = createMock<LexemesService>({
      findByIds: vi
        .fn<LexemesService["findByIds"]>()
        .mockResolvedValue([mockLexeme1, mockLexeme2]),
    });

    const resolver = new LexemesResolver(mockService);
    const result = await resolver.lexemes({ ids: ["lex-1", "lex-2"] });

    expect(mockService.findByIds).toHaveBeenCalledWith(["lex-1", "lex-2"]);
    expect(result).toStrictEqual([mockLexeme1, mockLexeme2]);
  });

  it("generates schema including lexeme and lexemes queries", async () => {
    expect.hasAssertions();

    const module = await Test.createTestingModule({
      imports: [GraphQLSchemaBuilderModule],
      providers: [
        LexemesResolver,
        {
          provide: LexemesService,
          useValue: createMock<LexemesService>(),
        },
      ],
    }).compile();

    const schemaFactory = module.get(GraphQLSchemaFactory);
    const schema = await schemaFactory.create([LexemesResolver], {
      orphanedTypes: [
        NominalForm,
        FiniteVerbForm,
        ParticipleForm,
        AdverbForm,
        InfinitiveForm,
        GerundForm,
        SupineForm,
        AdjectivalForm,
        NounInflection,
        VerbInflection,
        AdjectiveInflection,
        AdverbInflection,
        PrepositionInflection,
        UninflectedInflection,
      ],
    });

    expect(schema).toBeDefined();
    expect(schema.getQueryType()?.getFields()["lexeme"]).toBeDefined();
    expect(schema.getQueryType()?.getFields()["lexemes"]).toBeDefined();
  });
});
