/* cspell:words FULLTEXT */

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

import { createConnection, createEdge } from "../../lexico-api.utilities";

import {
  LexemeSearchConnection,
  type LexemeSearchResult,
  SearchMatchSource,
} from "./search.entities";
import { SearchResolver } from "./search.resolver";
import { SearchService } from "./search.service";

describe(SearchResolver, () => {
  let resolver: SearchResolver;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        SearchResolver,
        { provide: SearchService, useValue: createMock<SearchService>() },
      ],
    }).compile();

    resolver = await module.resolve(SearchResolver);
  });

  it("is defined", () => {
    expect.hasAssertions();

    expect(resolver).toBeDefined();
  });

  it("resolves searchLatin query with pagination parameters", async () => {
    expect.hasAssertions();

    const mockLexeme = new Lexeme();
    mockLexeme.id = "lex-1";
    mockLexeme.lemma = "amō";

    const mockResult: LexemeSearchResult = {
      enclitic: null,
      identifiers: [],
      lexeme: mockLexeme,
      score: 1,
      source: SearchMatchSource.LEMMA_EXACT,
    };

    const mockConnection = createConnection<LexemeSearchResult>({
      edges: [createEdge(mockResult, "c1")],
      hasNextPage: false,
      hasPreviousPage: false,
      totalCount: 1,
    });

    const mockService = createMock<SearchService>({
      searchLatin: vi
        .fn<SearchService["searchLatin"]>()
        .mockResolvedValue(mockConnection),
    });

    const resolver = new SearchResolver(mockService);
    const result = await resolver.searchLatin({
      after: "after-c",
      before: "before-c",
      first: 10,
      last: 5,
      query: "amō",
    });

    expect(mockService.searchLatin).toHaveBeenCalledWith("amō", {
      after: "after-c",
      before: "before-c",
      first: 10,
      last: 5,
      query: "amō",
    });
    expect(result).toBe(mockConnection);
  });

  it("resolves searchEnglish query with pagination parameters", async () => {
    expect.hasAssertions();

    const mockLexeme = new Lexeme();
    mockLexeme.id = "lex-1";
    mockLexeme.lemma = "amō";

    const mockResult: LexemeSearchResult = {
      enclitic: null,
      identifiers: [],
      lexeme: mockLexeme,
      score: 0.8,
      source: SearchMatchSource.TRANSLATION_FULLTEXT,
    };

    const mockConnection = createConnection<LexemeSearchResult>({
      edges: [createEdge(mockResult, "c1")],
      hasNextPage: false,
      hasPreviousPage: false,
      totalCount: 1,
    });

    const mockService = createMock<SearchService>({
      searchEnglish: vi
        .fn<SearchService["searchEnglish"]>()
        .mockResolvedValue(mockConnection),
    });

    const resolver = new SearchResolver(mockService);
    const result = await resolver.searchEnglish({
      after: "cursor-1",
      before: "cursor-2",
      first: 20,
      last: 10,
      query: "love",
    });

    expect(mockService.searchEnglish).toHaveBeenCalledWith("love", {
      after: "cursor-1",
      before: "cursor-2",
      first: 20,
      last: 10,
      query: "love",
    });
    expect(result).toBe(mockConnection);
  });

  it("generates GraphQL schema including searchLatin and searchEnglish queries", async () => {
    expect.hasAssertions();

    const module = await Test.createTestingModule({
      imports: [GraphQLSchemaBuilderModule],
      providers: [
        SearchResolver,
        {
          provide: SearchService,
          useValue: createMock<SearchService>(),
        },
      ],
    }).compile();

    const schemaFactory = module.get(GraphQLSchemaFactory);
    const schema = await schemaFactory.create([SearchResolver], {
      orphanedTypes: [
        LexemeSearchConnection,
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
    expect(schema.getQueryType()?.getFields()["searchLatin"]).toBeDefined();
    expect(schema.getQueryType()?.getFields()["searchEnglish"]).toBeDefined();
  });
});
