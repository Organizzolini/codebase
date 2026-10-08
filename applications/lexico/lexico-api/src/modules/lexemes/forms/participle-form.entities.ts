import { Field, ObjectType } from "@nestjs/graphql";

import { FormType } from "./form.entities";

import type { GraphQLObjectOf } from "../../../lexico-api.types";
import type { FormDatabaseOnlyField } from "./forms.types";
import type {
  FormNonFiniteTense,
  FormVoice,
  ParticipleForm,
} from "@codebase/lexico-entities";

/** A participle in one voice and tense. */
@ObjectType("ParticipleForm", { implements: FormType })
export class ParticipleFormType
  extends FormType
  implements
    GraphQLObjectOf<ParticipleForm, ParticipleFormType, FormDatabaseOnlyField>
{
  @Field(() => String)
  public tense!: FormNonFiniteTense;

  @Field(() => String)
  public voice!: FormVoice;
}
