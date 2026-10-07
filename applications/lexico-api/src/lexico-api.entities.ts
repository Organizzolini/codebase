import { Field, ObjectType } from "@nestjs/graphql";

import {
  AdjectivalForm,
  AdjectiveInflection,
  AdverbForm,
  AdverbInflection,
  FiniteVerbForm,
  GerundForm,
  InfinitiveForm,
  NominalForm,
  NounInflection,
  ParticipleForm,
  PrepositionInflection,
  SupineForm,
  UninflectedInflection,
  VerbInflection,
} from "@codebase/lexico-entities";

/**
 * Relay PageInfo containing pagination state.
 */
@ObjectType({ description: "Information about pagination in a connection." })
export class PageInfo {
  @Field(() => String, {
    description: "When paginating forwards, the cursor to continue.",
    nullable: true,
  })
  public endCursor?: string | undefined;

  @Field(() => Boolean, {
    description: "When paginating forwards, are there more items?",
  })
  public hasNextPage!: boolean;

  @Field(() => Boolean, {
    description: "When paginating backwards, are there more items?",
  })
  public hasPreviousPage!: boolean;

  @Field(() => String, {
    description: "When paginating backwards, the cursor to continue.",
    nullable: true,
  })
  public startCursor?: string | undefined;
}

/**
 * Every concrete form and inflection, which no resolver names, so the schema
 * can resolve the `Form` and `Inflection` interfaces a lexeme returns.
 */
export const ORPHANED_GRAPHQL_TYPES = [
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
] as const;
