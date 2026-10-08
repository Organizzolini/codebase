import { Field, ObjectType } from "@nestjs/graphql";

import { InflectionType } from "./inflection.entities";

import type { GraphQLObjectOf } from "../../../lexico-api.types";
import type { InflectionDatabaseOnlyField } from "./inflections.types";
import type {
  AdverbDegree,
  AdverbFunctionType,
  AdverbInflection,
} from "@codebase/lexico-entities";

/** How an adverb inflects: its function and degree. */
@ObjectType("AdverbInflection", { implements: InflectionType })
export class AdverbInflectionType
  extends InflectionType
  implements
    GraphQLObjectOf<
      AdverbInflection,
      AdverbInflectionType,
      InflectionDatabaseOnlyField
    >
{
  @Field(() => String)
  public adverbType!: AdverbFunctionType;

  @Field(() => String)
  public degree!: AdverbDegree;
}
