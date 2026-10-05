import { Field, ObjectType } from "@nestjs/graphql";
import { ChildEntity, Column } from "typeorm";

import {
  type FormCase,
  formCaseValues,
  type FormNumber,
  formNumberValues,
} from "../../../lexico-database/lexico-database.constants";

import { Form } from "./Form.entity";

/** A declined form for a noun, pronoun, or determiner (case + number). */
@ChildEntity("nominal")
@ObjectType({ implements: Form })
export class NominalForm extends Form {
  @Column({
    comment: "Grammatical case of this form",
    enum: formCaseValues,
    name: "form_case",
    type: "enum",
  })
  @Field(() => String)
  case!: FormCase;

  @Column({
    comment: "Grammatical number (singular or plural)",
    enum: formNumberValues,
    type: "enum",
  })
  @Field(() => String)
  number!: FormNumber;
}
