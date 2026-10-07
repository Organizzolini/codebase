import { Field, ObjectType } from "@nestjs/graphql";
import { ChildEntity, Column } from "typeorm";

import {
  type FormMood,
  formMoodValues,
  type FormNumber,
  formNumberValues,
  type FormPerson,
  formPersonValues,
  type FormTense,
  formTenseValues,
  type FormVoice,
  formVoiceValues,
} from "../../../lexico-database/lexico-database.constants";

import { Form } from "./Form.entity";

/** A finite verb form (indicative, subjunctive, or imperative). */
@ChildEntity("finite-verb")
@ObjectType({ implements: Form })
export class FiniteVerbForm extends Form {
  @Column({
    comment: "Grammatical mood (indicative, subjunctive, imperative)",
    enum: formMoodValues,
    type: "enum",
  })
  @Field(() => String)
  mood!: FormMood;

  @Column({
    comment: "Grammatical number (singular or plural)",
    enum: formNumberValues,
    type: "enum",
  })
  @Field(() => String)
  number!: FormNumber;

  @Column({
    comment: "Grammatical person (first, second, third)",
    enum: formPersonValues,
    type: "enum",
  })
  @Field(() => String)
  person!: FormPerson;

  @Column({
    comment: "Grammatical tense",
    enum: formTenseValues,
    type: "enum",
  })
  @Field(() => String)
  tense!: FormTense;

  @Column({
    comment: "Grammatical voice (active or passive)",
    enum: formVoiceValues,
    type: "enum",
  })
  @Field(() => String)
  voice!: FormVoice;
}
