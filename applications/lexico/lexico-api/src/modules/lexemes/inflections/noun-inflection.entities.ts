import { Field, ObjectType } from "@nestjs/graphql";

import { InflectionType } from "./inflection.entities";

import type { GraphQLObjectOf } from "../../../lexico-api.types";
import type { InflectionDatabaseOnlyField } from "./inflections.types";
import type {
  NounDeclension,
  NounGender,
  NounInflection,
} from "@codebase/lexico-entities";

/** How a noun inflects: its declension and gender. */
@ObjectType("NounInflection", { implements: InflectionType })
export class NounInflectionType
  extends InflectionType
  implements
    GraphQLObjectOf<
      NounInflection,
      NounInflectionType,
      InflectionDatabaseOnlyField
    >
{
  @Field(() => String)
  public declension!: NounDeclension;

  @Field(() => String)
  public gender!: NounGender;
}
