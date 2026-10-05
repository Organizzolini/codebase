import { Field, ObjectType } from "@nestjs/graphql";
import { ChildEntity, Column } from "typeorm";

import {
  type FormCase,
  formCaseValues,
  type FormGender,
  formGenderValues,
  type FormNumber,
  formNumberValues,
} from "../../../lexico-database/lexico-database.constants";

import { Form } from "./Form.entity";

/** A declined form for an adjective (gender + case + number). */
@ChildEntity("adjectival")
@ObjectType({ implements: Form })
export class AdjectivalForm extends Form {
  @Column({
    comment: "Grammatical case of this form",
    enum: formCaseValues,
    name: "form_case",
    type: "enum",
  })
  @Field(() => String)
  case!: FormCase;

  @Column({
    comment: "Grammatical gender of this adjectival form",
    enum: formGenderValues,
    type: "enum",
  })
  @Field(() => String)
  gender!: FormGender;

  @Column({
    comment: "Grammatical number (singular or plural)",
    enum: formNumberValues,
    type: "enum",
  })
  @Field(() => String)
  number!: FormNumber;
}
