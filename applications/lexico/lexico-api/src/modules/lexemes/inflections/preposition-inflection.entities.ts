import { Field, ObjectType } from "@nestjs/graphql";

import { InflectionType } from "./inflection.entities";

import type { GraphQLObjectOf } from "../../../lexico-api.types";
import type { InflectionDatabaseOnlyField } from "./inflections.types";
import type {
  PrepositionCase,
  PrepositionInflection,
} from "@codebase/lexico-entities";

/** The case a preposition governs. */
@ObjectType("PrepositionInflection", { implements: InflectionType })
export class PrepositionInflectionType
  extends InflectionType
  implements
    GraphQLObjectOf<
      PrepositionInflection,
      PrepositionInflectionType,
      InflectionDatabaseOnlyField
    >
{
  @Field(() => String)
  public case!: PrepositionCase;

  @Field(() => String, { nullable: true })
  public other!: string | undefined;
}
