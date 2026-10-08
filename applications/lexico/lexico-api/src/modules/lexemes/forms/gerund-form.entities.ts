import { Field, ObjectType } from "@nestjs/graphql";

import { FormType } from "./form.entities";

import type { GraphQLObjectOf } from "../../../lexico-api.types";
import type { FormDatabaseOnlyField } from "./forms.types";
import type { FormGerundCase, GerundForm } from "@codebase/lexico-entities";

/** A gerund, the verbal noun, in one case. */
@ObjectType("GerundForm", { implements: FormType })
export class GerundFormType
  extends FormType
  implements GraphQLObjectOf<GerundForm, GerundFormType, FormDatabaseOnlyField>
{
  @Field(() => String)
  public case!: FormGerundCase;
}
