import { Field, ID, InterfaceType } from "@nestjs/graphql";
import { Entity, Index, ManyToOne, OneToMany, TableInheritance } from "typeorm";

import { DeletableEntity } from "../../base/Deletable.entity";

import type { Lexeme } from "../Lexeme.entity";
import type { WordForm } from "../WordForm.entity";

/**
 * Base single-table-inheritance entity for all lexical forms.
 */
@Entity({
  comment:
    "Abstract base table for normalized inflected forms using single-table inheritance",
  name: "forms",
})
@InterfaceType()
@TableInheritance({ column: { name: "type", type: "text" } })
export class Form extends DeletableEntity {
  @Field(() => ID)
  declare id: string;

  @Index()
  @ManyToOne("Lexeme", "forms", {
    nullable: false,
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  })
  lexeme!: Lexeme;

  // Inverse side of WordForm.form
  @OneToMany("WordForm", "form")
  wordForms!: WordForm[];
}
