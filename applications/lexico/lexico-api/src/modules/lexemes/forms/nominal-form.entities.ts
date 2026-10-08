import { Field, ObjectType } from "@nestjs/graphql";

import { FormType } from "./form.entities";

import type { GraphQLObjectOf } from "../../../lexico-api.types";
import type { FormDatabaseOnlyField } from "./forms.types";
import type {
  FormCase,
  FormNumber,
  NominalForm,
} from "@codebase/lexico-entities";

/** A declined form of a noun, pronoun, or determiner: case and number. */
@ObjectType("NominalForm", { implements: FormType })
export class NominalFormType
  extends FormType
  implements
    GraphQLObjectOf<NominalForm, NominalFormType, FormDatabaseOnlyField>
{
  @Field(() => String)
  public case!: FormCase;

  @Field(() => String)
  public number!: FormNumber;
}
