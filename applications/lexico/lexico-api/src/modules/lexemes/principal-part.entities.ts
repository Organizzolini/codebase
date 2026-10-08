import { Field, ObjectType } from "@nestjs/graphql";

import { DeletableType } from "../../deletable.entities";

import type { GraphQLObjectOf } from "../../lexico-api.types";
import type { PrincipalPartDatabaseOnlyField } from "./lexemes.types";
import type { PrincipalPart } from "@codebase/lexico-entities";

/** A named principal part a lexeme is cited by, such as its infinitive. */
@ObjectType("PrincipalPart")
export class PrincipalPartType
  extends DeletableType
  implements
    GraphQLObjectOf<
      PrincipalPart,
      PrincipalPartType,
      PrincipalPartDatabaseOnlyField
    >
{
  @Field()
  public name!: string;

  @Field(() => [String])
  public text!: string[];
}
