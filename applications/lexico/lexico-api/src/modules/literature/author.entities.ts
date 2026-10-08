import { Field, ObjectType } from "@nestjs/graphql";

import { DeletableType } from "../../deletable.entities";

import type { GraphQLObjectOf } from "../../lexico-api.types";
import type {
  AuthorDatabaseOnlyField,
  AuthorResolvedField,
} from "./literature.types";
import type { Author } from "@codebase/lexico-entities";

/** An author of Latin literature. */
@ObjectType("Author")
export class AuthorType
  extends DeletableType
  implements
    GraphQLObjectOf<
      Author,
      AuthorType,
      AuthorDatabaseOnlyField,
      never,
      AuthorResolvedField
    >
{
  @Field()
  public name!: string;

  @Field()
  public slug!: string;
}
