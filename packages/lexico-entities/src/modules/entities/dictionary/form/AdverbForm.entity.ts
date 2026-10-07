import { Field, ObjectType } from "@nestjs/graphql";
import { ChildEntity, Column } from "typeorm";

import {
  type FormDegree,
  formDegreeValues,
} from "../../../lexico-database/lexico-database.constants";

import { Form } from "./Form.entity";

/** An adverb form at a specific degree (positive, comparative, superlative). */
@ChildEntity("adverb")
@ObjectType({ implements: Form })
export class AdverbForm extends Form {
  @Column({
    comment: "Degree of comparison (positive, comparative, superlative)",
    enum: formDegreeValues,
    type: "enum",
  })
  @Field(() => String)
  degree!: FormDegree;
}
