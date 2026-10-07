import { Field, ObjectType } from "@nestjs/graphql";
import { ChildEntity, Column } from "typeorm";

import {
  type FormNonFiniteTense,
  formNonFiniteTenseValues,
  type FormVoice,
  formVoiceValues,
} from "../../../lexico-database/lexico-database.constants";

import { Form } from "./Form.entity";

/** A non-finite infinitive form (voice + tense). */
@ChildEntity("infinitive")
@ObjectType({ implements: Form })
export class InfinitiveForm extends Form {
  @Column({
    comment: "Tense of the infinitive (present, perfect, future)",
    enum: formNonFiniteTenseValues,
    type: "enum",
  })
  @Field(() => String)
  tense!: FormNonFiniteTense;

  @Column({
    comment: "Grammatical voice (active or passive)",
    enum: formVoiceValues,
    type: "enum",
  })
  @Field(() => String)
  voice!: FormVoice;
}
