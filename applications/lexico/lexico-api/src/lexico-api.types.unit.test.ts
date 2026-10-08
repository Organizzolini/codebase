import { describe, expectTypeOf, it } from "vitest";

import type {
  GraphQLFields,
  GraphQLObjectOf,
  GraphQLObjectViolations,
  RelationKey,
} from "./lexico-api.types";
import type { FormType } from "./modules/lexemes/forms/form.entities";
import type { InflectionType } from "./modules/lexemes/inflections/inflection.entities";
import type { LexemeType } from "./modules/lexemes/lexeme.entities";
import type {
  LexemeDatabaseOnlyField,
  LexemeRelationField,
  TranslationDatabaseOnlyField,
} from "./modules/lexemes/lexemes.types";
import type { PronunciationType } from "./modules/lexemes/pronunciation.entities";
import type { TranslationType } from "./modules/lexemes/translation.entities";
import type { AuthorType } from "./modules/literature/author.entities";
import type {
  AuthorDatabaseOnlyField,
  AuthorResolvedField,
} from "./modules/literature/literature.types";
import type {
  Author,
  Inflection,
  Lexeme,
  PrincipalPart,
  Pronunciation,
  Translation,
} from "@codebase/lexico-entities";

/** `LexemeType` with its `forms` and `inflection` retyped as one non-null row. */
type LexemeTypeWithSingleRelations = Omit<
  LexemeType,
  "forms" | "inflection"
> & { forms: FormType; inflection: InflectionType };

/** `Lexeme` with a column added that no GraphQL type has decided on. */
type LexemeWithNewColumn = Lexeme & { frequency: number };

/** `Lexeme` with its `lemma` column retyped from text to a number. */
type LexemeWithNumericLemma = Omit<Lexeme, "lemma"> & { lemma: number };

/** `Pronunciation` with its required `variant` column made nullable. */
type PronunciationWithNullableVariant = Omit<Pronunciation, "variant"> & {
  variant: null | Pronunciation["variant"];
};

/** `TranslationType` declaring a field `Translation` has no column for. */
type TranslationTypeWithLanguage = TranslationType & { language: string };

/**
 * Each case below is a change that must fail `lexico-api`'s typecheck: the
 * GraphQL class stays as it is, and the shape it implements no longer
 * matches. The assertions are type-level, so the typecheck is the test.
 */
describe("graphql object shape suite", () => {
  it("accepts a GraphQL type exactly as it is declared", () => {
    expectTypeOf<LexemeType>().toExtend<
      GraphQLObjectOf<
        Lexeme,
        LexemeType,
        LexemeDatabaseOnlyField,
        LexemeRelationField
      >
    >();
    expectTypeOf<
      GraphQLObjectViolations<
        Lexeme,
        LexemeType,
        LexemeDatabaseOnlyField,
        LexemeRelationField
      >
    >().toBeNever();
    expectTypeOf<AuthorType>().toExtend<
      GraphQLObjectOf<
        Author,
        AuthorType,
        AuthorDatabaseOnlyField,
        never,
        AuthorResolvedField
      >
    >();
  });

  it("rejects a GraphQL type once a database-only or resolved exclusion is removed", () => {
    expectTypeOf<
      GraphQLObjectViolations<Lexeme, LexemeType, never, LexemeRelationField>
    >().toEqualTypeOf<{ missingFields: "wordLexemes" }>();
    expectTypeOf<LexemeType>().not.toExtend<
      GraphQLObjectOf<Lexeme, LexemeType, never, LexemeRelationField>
    >();

    expectTypeOf<
      GraphQLObjectViolations<Translation, TranslationType, "lexeme">
    >().toEqualTypeOf<{ missingFields: "translationFullTextSearch" }>();
    expectTypeOf<TranslationType>().not.toExtend<
      GraphQLObjectOf<Translation, TranslationType, "lexeme">
    >();

    expectTypeOf<AuthorType>().not.toExtend<
      GraphQLObjectOf<Author, AuthorType, never, never, AuthorResolvedField>
    >();
    expectTypeOf<
      GraphQLObjectViolations<Author, AuthorType, AuthorDatabaseOnlyField>
    >().toEqualTypeOf<{ missingFields: "texts" }>();
  });

  it("rejects a GraphQL type once its entity column is retyped", () => {
    expectTypeOf<LexemeType>().not.toExtend<
      GraphQLObjectOf<
        LexemeWithNumericLemma,
        LexemeType,
        LexemeDatabaseOnlyField,
        LexemeRelationField
      >
    >();
    expectTypeOf<
      GraphQLObjectViolations<
        PronunciationWithNullableVariant,
        PronunciationType,
        "lexeme"
      >
    >().toEqualTypeOf<{ retypedFields: "variant" }>();
    expectTypeOf<PronunciationType>().not.toExtend<
      GraphQLObjectOf<
        PronunciationWithNullableVariant,
        PronunciationType,
        "lexeme"
      >
    >();
  });

  it("rejects a GraphQL type once its entity gains an undecided column", () => {
    expectTypeOf<
      GraphQLObjectViolations<
        LexemeWithNewColumn,
        LexemeType,
        LexemeDatabaseOnlyField,
        LexemeRelationField
      >
    >().toEqualTypeOf<{ missingFields: "frequency" }>();
  });

  it("rejects a relation retyped with a different cardinality or nullability", () => {
    expectTypeOf<
      GraphQLObjectViolations<
        Lexeme,
        LexemeTypeWithSingleRelations,
        LexemeDatabaseOnlyField,
        LexemeRelationField
      >
    >().toEqualTypeOf<{ mismatchedRelations: "forms" | "inflection" }>();
  });

  it("rejects a GraphQL type declaring a field its entity lacks", () => {
    expectTypeOf<
      GraphQLObjectViolations<
        Translation,
        TranslationTypeWithLanguage,
        TranslationDatabaseOnlyField
      >
    >().toEqualTypeOf<{ extraFields: "language" }>();
  });

  it("treats an entity's active-record methods as no fields", () => {
    expectTypeOf<keyof GraphQLFields<Inflection>>().toEqualTypeOf<
      "id" | "lexeme"
    >();
  });

  it("accepts only a field holding related rows as a relation", () => {
    expectTypeOf<LexemeRelationField>().toExtend<
      RelationKey<Lexeme, LexemeDatabaseOnlyField>
    >();
    expectTypeOf<"lemma">().not.toExtend<
      RelationKey<Lexeme, LexemeDatabaseOnlyField>
    >();
    expectTypeOf<"createdAt">().not.toExtend<
      RelationKey<Lexeme, LexemeDatabaseOnlyField>
    >();
    expectTypeOf<"text">().not.toExtend<RelationKey<PrincipalPart, "lexeme">>();
  });
});
