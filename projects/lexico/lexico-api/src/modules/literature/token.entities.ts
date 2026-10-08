import { Field, ObjectType } from "@nestjs/graphql";

import { DeletableType } from "../../deletable.entities";
import { WordType } from "../words/word.entities";

import { AuthorType } from "./author.entities";
import { LineType } from "./line.entities";
import { TextType } from "./text.entities";

import type { GraphQLObjectOf, Related } from "../../lexico-api.types";
import type { TokenRelationField } from "./literature.types";
import type { Token } from "@codebase/lexico-entities";

/** One word or punctuation mark parsed from a line. */
@ObjectType("Token")
export class TokenType
  extends DeletableType
  implements GraphQLObjectOf<Token, TokenType, never, TokenRelationField>
{
  @Field(() => AuthorType)
  public author!: Related<AuthorType>;

  @Field()
  public data!: string;

  @Field()
  public index!: number;

  @Field()
  public isPunctuation!: boolean;

  @Field(() => LineType)
  public line!: Related<LineType>;

  @Field(() => TextType)
  public text!: Related<TextType>;

  @Field(() => WordType, { nullable: true })
  public word!: null | Related<WordType> | undefined;
}
