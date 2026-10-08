import { Field, ObjectType } from "@nestjs/graphql";

import { FormType } from "./form.entities";

import type { GraphQLObjectOf } from "../../../lexico-api.types";
import type { FormDatabaseOnlyField } from "./forms.types";
import type {
  FormNonFiniteTense,
  FormVoice,
  InfinitiveForm,
} from "@codebase/lexico-entities";

/** An infinitive in one voice and tense. */
@ObjectType("InfinitiveForm", { implements: FormType })
export class InfinitiveFormType
  extends FormType
  implements
    GraphQLObjectOf<InfinitiveForm, InfinitiveFormType, FormDatabaseOnlyField>
{
  @Field(() => String)
  public tense!: FormNonFiniteTense;

  @Field(() => String)
  public voice!: FormVoice;
}
