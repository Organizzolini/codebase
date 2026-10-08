import { ChildEntity, Column } from "typeorm";

import {
  type FormNonFiniteTense,
  formNonFiniteTenseValues,
  type FormVoice,
  formVoiceValues,
} from "../../../lexico-database/lexico-database.constants";

import { Form } from "./Form.entity";

/** A non-finite participial form (voice + tense). */
@ChildEntity("participle")
export class ParticipleForm extends Form {
  @Column({
    comment: "Tense of the participle (present, perfect, future)",
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
