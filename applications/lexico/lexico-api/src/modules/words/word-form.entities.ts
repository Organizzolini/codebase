import { Field, ObjectType } from "@nestjs/graphql";

import { DeletableType } from "../../deletable.entities";
import { FormType } from "../lexemes/forms/form.entities";

import type { GraphQLObjectOf, Related } from "../../lexico-api.types";
import type {
  WordFormRelationField,
  WordFormResolvedField,
} from "./words.types";
import type { WordForm } from "@codebase/lexico-entities";

/** Links a written word to one morphological form it can surface as. */
@ObjectType("WordForm")
export class WordFormType
  extends DeletableType
  implements
    GraphQLObjectOf<
      WordForm,
      WordFormType,
      never,
      WordFormRelationField,
      WordFormResolvedField
    >
{
  /** The morphological form side of the link. */
  @Field(() => FormType)
  public form!: Related<FormType>;
}
