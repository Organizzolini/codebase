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
export class InfinitiveForm extends Form {
  @Column({
    comment: "Tense of the infinitive (present, perfect, future)",
    enum: formNonFiniteTenseValues,
    type: "enum",
  })
  tense!: FormNonFiniteTense;

  @Column({
    comment: "Grammatical voice (active or passive)",
    enum: formVoiceValues,
    type: "enum",
  })
  voice!: FormVoice;
}
