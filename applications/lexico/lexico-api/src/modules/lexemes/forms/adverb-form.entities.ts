import { Field, ObjectType } from "@nestjs/graphql";

import { FormType } from "./form.entities";

import type { GraphQLObjectOf } from "../../../lexico-api.types";
import type { FormDatabaseOnlyField } from "./forms.types";
import type { AdverbForm, FormDegree } from "@codebase/lexico-entities";

/** An adverb form at one degree of comparison. */
@ObjectType("AdverbForm", { implements: FormType })
export class AdverbFormType
  extends FormType
  implements GraphQLObjectOf<AdverbForm, AdverbFormType, FormDatabaseOnlyField>
{
  @Field(() => String)
  public degree!: FormDegree;
}
