import { Field, Float, ObjectType } from "@nestjs/graphql";

import { DeletableType } from "../../deletable.entities";

import { FormType } from "./forms/form.entities";
import { InflectionType } from "./inflections/inflection.entities";
import { PrincipalPartType } from "./principal-part.entities";
import { PronunciationType } from "./pronunciation.entities";
import { TranslationType } from "./translation.entities";

import type { GraphQLObjectOf } from "../../lexico-api.types";
import type {
  LexemeDatabaseOnlyField,
  LexemeRelationField,
} from "./lexemes.types";
import type { Lexeme, PartOfSpeech } from "@codebase/lexico-entities";

/** A Latin dictionary entry with its forms, inflection, and translations. */
@ObjectType("Lexeme")
export class LexemeType
  extends DeletableType
  implements
    GraphQLObjectOf<
      Lexeme,
      LexemeType,
      LexemeDatabaseOnlyField,
      LexemeRelationField
    >
{
  @Field(() => Float)
  public disambiguator!: number;

  @Field(() => String, { nullable: true })
  public etymology!: string | undefined;

  @Field(() => [FormType])
  public forms!: FormType[];

  @Field(() => InflectionType, { nullable: true })
  public inflection!: InflectionType | null | undefined;

  @Field()
  public lemma!: string;

  @Field(() => String)
  public partOfSpeech!: PartOfSpeech;

  @Field(() => [PrincipalPartType])
  public principalParts!: PrincipalPartType[];

  @Field(() => [PronunciationType], { nullable: true })
  public pronunciations!: null | PronunciationType[] | undefined;

  @Field(() => [TranslationType], { nullable: true })
  public translations!: null | TranslationType[] | undefined;
}
