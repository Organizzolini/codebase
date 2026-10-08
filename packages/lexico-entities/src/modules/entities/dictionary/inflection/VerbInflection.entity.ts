import { ChildEntity, Column } from "typeorm";

import {
  type VerbConjugation,
  verbConjugationValues,
} from "../../../lexico-database/lexico-database.constants";

import { Inflection } from "./Inflection.entity";

/**
 * Inflection metadata for verb lexemes.
 */
@ChildEntity("verb")
export class VerbInflection extends Inflection {
  @Column({
    comment: "Verb conjugation class (first through fourth)",
    default: "",
    enum: verbConjugationValues,
    type: "enum",
  })
  conjugation!: VerbConjugation;

  @Column("text", {
    comment: "Additional inflection notes",
    nullable: true,
  })
  other?: string;
}
