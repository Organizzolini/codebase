import { Column, Entity, Index, ManyToOne } from "typeorm";

import { DeletableEntity } from "@codebase/database";

import type { Lexeme } from "./Lexeme.entity";

/**
 * A named principal part associated with a lexeme.
 */
@Entity({
  comment:
    "A named principal part (e.g. first, infinitive) of a Latin dictionary entry",
  name: "principal_parts",
})
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
  name!: string;

  @Column("jsonb", {
    comment: "One or more textual forms for this principal part",
  })
  text!: string[];
}
