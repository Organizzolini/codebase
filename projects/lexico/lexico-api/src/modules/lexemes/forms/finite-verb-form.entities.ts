import { Field, ObjectType } from "@nestjs/graphql";

import { FormType } from "./form.entities";

import type { GraphQLObjectOf } from "../../../lexico-api.types";
import type { FormDatabaseOnlyField } from "./forms.types";
import type {
  FiniteVerbForm,
  FormMood,
  FormNumber,
  FormPerson,
  FormTense,
  FormVoice,
} from "@codebase/lexico-entities";

/** A finite verb form: indicative, subjunctive, or imperative. */
@ObjectType("FiniteVerbForm", { implements: FormType })
export class FiniteVerbFormType
  extends FormType
  implements
    GraphQLObjectOf<FiniteVerbForm, FiniteVerbFormType, FormDatabaseOnlyField>
{
  @Field(() => String)
  public mood!: FormMood;

  @Field(() => String)
  public number!: FormNumber;

  @Field(() => String)
  public person!: FormPerson;

  @Field(() => String)
  public tense!: FormTense;

  @Field(() => String)
  public voice!: FormVoice;
}
