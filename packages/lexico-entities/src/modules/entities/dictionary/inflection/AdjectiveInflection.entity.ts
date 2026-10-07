import { Field, ObjectType } from "@nestjs/graphql";
import { ChildEntity, Column } from "typeorm";

import {
  type AdjectiveDeclension,
  type AdjectiveDegree,
  adjectiveDegreeValues,
  inflectionDeclensionValues,
} from "../../../lexico-database/lexico-database.constants";

import { Inflection } from "./Inflection.entity";

/**
 * Inflection metadata for adjective lexemes.
 */
@ChildEntity("adjective")
@ObjectType({ implements: Inflection })
export class AdjectiveInflection extends Inflection {
  @Column({
    comment: "Adjective declension class (first/second or third)",
    default: "",
    enum: inflectionDeclensionValues,
    type: "enum",
  })
  @Field(() => String)
  declension!: AdjectiveDeclension;

  @Column({
    comment: "Degree of comparison (positive, comparative, superlative)",
    default: "positive",
    enum: adjectiveDegreeValues,
    type: "enum",
  })
  @Field(() => String)
  degree!: AdjectiveDegree;
}
