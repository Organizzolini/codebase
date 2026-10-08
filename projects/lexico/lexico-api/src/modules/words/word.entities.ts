import { Field, ObjectType } from "@nestjs/graphql";

import { DeletableType } from "../../deletable.entities";

import { WordFormType } from "./word-form.entities";
import { WordLexemeType } from "./word-lexeme.entities";

import type { GraphQLObjectOf } from "../../lexico-api.types";
import type { WordRelationField } from "./words.types";
import type { Word } from "@codebase/lexico-entities";

/** A written Latin word, linked to every form and lexeme it can be. */
@ObjectType("Word")
export class WordType
  extends DeletableType
  implements GraphQLObjectOf<Word, WordType, never, WordRelationField>
{
  @Field()
  public data!: string;

  /** Every morphological form this word can surface as. */
  @Field(() => [WordFormType])
  public wordForms!: WordFormType[];

  /** Every lexeme this word can represent. */
  @Field(() => [WordLexemeType])
  public wordLexemes!: WordLexemeType[];
}
