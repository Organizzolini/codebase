import {
  GraphQLSchemaBuilderModule,
  GraphQLSchemaFactory,
  Query,
  Resolver,
} from "@nestjs/graphql";
import { Test } from "@nestjs/testing";
import { describe, expect, it } from "vitest";

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

import {
  LexemeSearchConnection,
  LexemeSearchResult,
  SearchMatchSource,
} from "./search.entities";

@Resolver()
class DummyResolver {
  @Query(() => LexemeSearchResult)
  public testResult(): LexemeSearchResult {
    const result = new LexemeSearchResult();
    result.enclitic = "que";
    result.identifiers = ["nominative singular"];
    result.lexeme = new Lexeme();
    result.score = 1;
    result.source = SearchMatchSource.LEMMA_EXACT;
    return result;
  }
}

describe("search entities suite", () => {
  it("builds GraphQL schema for LexemeSearchResult", async () => {
    expect.hasAssertions();

    const module = await Test.createTestingModule({
      imports: [GraphQLSchemaBuilderModule],
      providers: [DummyResolver],
    }).compile();

    const schemaFactory = module.get(GraphQLSchemaFactory);
    const schema = await schemaFactory.create([DummyResolver], {
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
  });

  it("instantiates LexemeSearchResult with default fields", () => {
    expect.hasAssertions();

    const result = new LexemeSearchResult();
    result.enclitic = "que";
    result.identifiers = ["nominative singular"];
    result.lexeme = new Lexeme();
    result.score = 1;
    result.source = SearchMatchSource.LEMMA_EXACT;

    expect(result.enclitic).toBe("que");
    expect(result.identifiers).toStrictEqual(["nominative singular"]);
    expect(result.score).toBe(1);
    expect(result.source).toBe(SearchMatchSource.LEMMA_EXACT);
    expect(LexemeSearchConnection).toBeDefined();
  });
});
