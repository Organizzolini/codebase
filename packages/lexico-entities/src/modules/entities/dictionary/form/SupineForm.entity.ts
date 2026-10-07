import { Field, ObjectType } from "@nestjs/graphql";
import { ChildEntity, Column } from "typeorm";

import {
  type FormSupineCase,
  formSupineCaseValues,
} from "../../../lexico-database/lexico-database.constants";

import { Form } from "./Form.entity";

/** A verbal noun supine form (accusative or ablative case). */
@ChildEntity("supine")
@ObjectType({ implements: Form })
export class SupineForm extends Form {
  @Column({
    comment: "Grammatical case of the supine (accusative or ablative)",
    enum: formSupineCaseValues,
    name: "form_case",
    type: "enum",
  })
  @Field(() => String)
  case!: FormSupineCase;
}
