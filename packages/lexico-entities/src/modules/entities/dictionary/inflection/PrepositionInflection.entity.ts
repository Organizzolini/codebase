import { Field, ObjectType } from "@nestjs/graphql";
import { ChildEntity, Column } from "typeorm";

import {
  type PrepositionCase,
  prepositionCases,
} from "../../../lexico-database/lexico-database.constants";

import { Inflection } from "./Inflection.entity";

/**
 * Inflection metadata for preposition lexemes.
 */
@ChildEntity("preposition")
@ObjectType({ implements: Inflection })
export class PrepositionInflection extends Inflection {
  @Column({
    comment:
      "Grammatical case governed by the preposition (accusative or ablative)",
    default: "",
    enum: prepositionCases,
    type: "enum",
  })
  @Field(() => String)
  case!: PrepositionCase;

  @Column("text", {
    comment: "Additional inflection notes",
    nullable: true,
  })
  @Field(() => String, { nullable: true })
  other?: string;
}
