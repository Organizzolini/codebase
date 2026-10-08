import { ChildEntity, Column } from "typeorm";

import {
  inflectionDeclensionValues,
  type NounDeclension,
  type NounGender,
  nounGenders,
} from "../../../lexico-database/lexico-database.constants";

import { Inflection } from "./Inflection.entity";

/**
 * Inflection metadata for noun lexemes.
 */
@ChildEntity("noun")
export class NounInflection extends Inflection {
  @Column({
    comment: "Noun declension class (first through fifth)",
    default: "",
    enum: inflectionDeclensionValues,
    type: "enum",
  })
  declension!: NounDeclension;

  @Column({
    comment: "Grammatical gender (masculine, feminine, neuter)",
    default: "",
    enum: nounGenders,
    type: "enum",
  })
  gender!: NounGender;
}
