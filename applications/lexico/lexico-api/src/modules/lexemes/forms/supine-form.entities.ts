import { Field, ObjectType } from "@nestjs/graphql";

import { FormType } from "./form.entities";

import type { GraphQLObjectOf } from "../../../lexico-api.types";
import type { FormDatabaseOnlyField } from "./forms.types";
import type { FormSupineCase, SupineForm } from "@codebase/lexico-entities";

/** A supine, the verbal noun, in the accusative or ablative. */
@ObjectType("SupineForm", { implements: FormType })
export class SupineFormType
  extends FormType
  implements GraphQLObjectOf<SupineForm, SupineFormType, FormDatabaseOnlyField>
{
  @Field(() => String)
  public case!: FormSupineCase;
}
