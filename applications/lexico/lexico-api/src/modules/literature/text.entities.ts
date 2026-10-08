import { Field, ObjectType } from "@nestjs/graphql";

import { DeletableType } from "../../deletable.entities";

import { AuthorType } from "./author.entities";

import type { GraphQLObjectOf, Related } from "../../lexico-api.types";
import type {
  TextDatabaseOnlyField,
  TextRelationField,
  TextResolvedField,
} from "./literature.types";
import type { Text } from "@codebase/lexico-entities";

/** A literary work, or one part of one, such as a book of a poem. */
@ObjectType("Text")
export class TextType
  extends DeletableType
  implements
    GraphQLObjectOf<
      Text,
      TextType,
      TextDatabaseOnlyField,
      TextRelationField,
      TextResolvedField
    >
{
  @Field(() => AuthorType)
  public author!: Related<AuthorType>;

  @Field(() => [TextType])
  public childTexts!: TextType[];

  @Field(() => TextType, { nullable: true })
  public parentText!: null | Related<TextType> | undefined;

  @Field()
  public slug!: string;

  @Field()
  public title!: string;

  @Field()
  public type!: string;
}
