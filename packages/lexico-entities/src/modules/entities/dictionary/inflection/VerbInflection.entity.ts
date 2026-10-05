import { Field, ObjectType } from "@nestjs/graphql";
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
@ObjectType({ implements: Inflection })
export class VerbInflection extends Inflection {
  @Column({
    comment: "Verb conjugation class (first through fourth)",
    default: "",
    enum: verbConjugationValues,
    type: "enum",
  })
  @Field(() => String)
  conjugation!: VerbConjugation;

  @Column("text", {
    comment: "Additional inflection notes",
    nullable: true,
  })
  @Field(() => String, { nullable: true })
  other?: string;
}
