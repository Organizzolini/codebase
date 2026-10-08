import { Field, ObjectType } from "@nestjs/graphql";

import { DeletableType } from "../../deletable.entities";

import { AuthorType } from "./author.entities";
import { TextType } from "./text.entities";

import type { GraphQLObjectOf, Related } from "../../lexico-api.types";
import type { LineRelationField, LineResolvedField } from "./literature.types";
import type { Line } from "@codebase/lexico-entities";

/** One line of a classical Latin text. */
@ObjectType("Line")
export class LineType
  extends DeletableType
  implements
    GraphQLObjectOf<
      Line,
      LineType,
      never,
      LineRelationField,
      LineResolvedField
    >
{
  @Field(() => AuthorType)
  public author!: Related<AuthorType>;

  @Field()
  public data!: string;

  @Field()
  public index!: number;

  @Field()
  public label!: string;

  @Field(() => TextType)
  public text!: Related<TextType>;
}
