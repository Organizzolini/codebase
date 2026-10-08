import { Field, ObjectType } from "@nestjs/graphql";

import { DeletableType } from "../../deletable.entities";

import type { GraphQLObjectOf } from "../../lexico-api.types";
import type { PronunciationDatabaseOnlyField } from "./lexemes.types";
import type {
  Pronunciation,
  PronunciationVariant,
} from "@codebase/lexico-entities";

/** How a lexeme is pronounced in one tradition. */
@ObjectType("Pronunciation")
export class PronunciationType
  extends DeletableType
  implements
    GraphQLObjectOf<
      Pronunciation,
      PronunciationType,
      PronunciationDatabaseOnlyField
    >
{
  @Field(() => String, { nullable: true })
  public phonemes!: null | string | undefined;

  @Field(() => String, { nullable: true })
  public phonemic!: null | string | undefined;

  @Field(() => String, { nullable: true })
  public phonetic!: null | string | undefined;

  @Field(() => String)
  public variant!: PronunciationVariant;
}
