import { Field, ObjectType } from "@nestjs/graphql";

import { InflectionType } from "./inflection.entities";

import type { GraphQLObjectOf } from "../../../lexico-api.types";
import type { InflectionDatabaseOnlyField } from "./inflections.types";
import type {
  AdjectiveDeclension,
  AdjectiveDegree,
  AdjectiveInflection,
} from "@codebase/lexico-entities";

/** How an adjective inflects: its declension and degree. */
@ObjectType("AdjectiveInflection", { implements: InflectionType })
export class AdjectiveInflectionType
  extends InflectionType
  implements
    GraphQLObjectOf<
      AdjectiveInflection,
      AdjectiveInflectionType,
      InflectionDatabaseOnlyField
    >
{
  @Field(() => String)
  public declension!: AdjectiveDeclension;

  @Field(() => String)
  public degree!: AdjectiveDegree;
}
