import { Field, ObjectType } from "@nestjs/graphql";
import { Column, Entity, Index, ManyToOne } from "typeorm";

import { DeletableEntity } from "../base/Deletable.entity";

import type { Lexeme } from "./Lexeme.entity";

/**
 * A named principal part associated with a lexeme.
 */
@Entity({
  comment:
    "A named principal part (e.g. first, infinitive) of a Latin dictionary entry",
  name: "principal_parts",
})
@ObjectType()
export class PrincipalPart extends DeletableEntity {
  @Index()
  @ManyToOne("Lexeme", "principalParts", {
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  })
  lexeme!: Lexeme;

  @Column("text", {
    comment: "Label for the principal part (e.g. first, infinitive)",
  })
  @Field()
  name!: string;

  @Column("jsonb", {
    comment: "One or more textual forms for this principal part",
  })
  @Field(() => [String])
  text!: string[];
}
