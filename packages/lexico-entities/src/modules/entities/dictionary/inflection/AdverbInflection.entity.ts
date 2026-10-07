import { Field, ObjectType } from "@nestjs/graphql";
import { ChildEntity, Column } from "typeorm";

import {
  type AdverbDegree,
  adverbDegrees,
  type AdverbType,
  adverbTypes,
} from "../../../lexico-database/lexico-database.constants";

import { Inflection } from "./Inflection.entity";

/**
 * Inflection metadata for adverb lexemes.
 */
@ChildEntity("adverb")
@ObjectType({ implements: Inflection })
export class AdverbInflection extends Inflection {
  @Column({
    comment: "Functional type of the adverb (descriptive or conjunctional)",
    default: "",
    enum: adverbTypes,
    type: "enum",
  })
  @Field(() => String)
  adverbType!: AdverbType;

  @Column({
    comment: "Degree of comparison (positive, comparative, superlative)",
    default: "positive",
    enum: adverbDegrees,
    type: "enum",
  })
  @Field(() => String)
  degree!: AdverbDegree;
}
