import { Field, ObjectType } from "@nestjs/graphql";

import { InflectionType } from "./inflection.entities";

import type { GraphQLObjectOf } from "../../../lexico-api.types";
import type { InflectionDatabaseOnlyField } from "./inflections.types";
import type {
  VerbConjugation,
  VerbInflection,
} from "@codebase/lexico-entities";

/** How a verb inflects: its conjugation. */
@ObjectType("VerbInflection", { implements: InflectionType })
export class VerbInflectionType
  extends InflectionType
  implements
    GraphQLObjectOf<
      VerbInflection,
      VerbInflectionType,
      InflectionDatabaseOnlyField
    >
{
  @Field(() => String)
  public conjugation!: VerbConjugation;

  @Field(() => String, { nullable: true })
  public other!: string | undefined;
}
