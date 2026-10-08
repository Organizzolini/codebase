import { Field, ObjectType } from "@nestjs/graphql";

import { FormType } from "./form.entities";

import type { GraphQLObjectOf } from "../../../lexico-api.types";
import type { FormDatabaseOnlyField } from "./forms.types";
import type {
  AdjectivalForm,
  FormCase,
  FormGender,
  FormNumber,
} from "@codebase/lexico-entities";

/** A declined form of an adjective: gender, case, and number. */
@ObjectType("AdjectivalForm", { implements: FormType })
export class AdjectivalFormType
  extends FormType
  implements
    GraphQLObjectOf<AdjectivalForm, AdjectivalFormType, FormDatabaseOnlyField>
{
  @Field(() => String)
  public case!: FormCase;

  @Field(() => String)
  public gender!: FormGender;

  @Field(() => String)
  public number!: FormNumber;
}
