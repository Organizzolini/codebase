import { Field, ID, InterfaceType } from "@nestjs/graphql";

import type { GraphQLObjectOf } from "../../../lexico-api.types";
import type { FormDatabaseOnlyField } from "./forms.types";
import type { Form } from "@codebase/lexico-entities";

/**
 * One inflected form of a lexeme. Each kind of form is its own object type
 * implementing this interface, resolved by which class a form is mapped to.
 */
@InterfaceType("Form")
export abstract class FormType implements GraphQLObjectOf<
  Form,
  FormType,
  FormDatabaseOnlyField
> {
  @Field(() => ID)
  public id!: string;
}
