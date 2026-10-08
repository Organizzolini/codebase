import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";

import { DeletableEntity } from "@codebase/database";

import type { Lexeme } from "./Lexeme.entity";

/**
 * A single English translation linked to a lexeme.
 */
@Entity({
  comment: "An English translation of a Latin dictionary entry",
  name: "translations",
})
export class Translation extends DeletableEntity {
  constructor(data: string, lexeme?: Lexeme) {
    super();
    this.data = data;
    if (lexeme) this.lexeme = lexeme;
  }

  @Column("text", { comment: "English translation text" })
  @Index()
  data!: string;

  @Index()
  @JoinColumn()
  @ManyToOne("Lexeme", "translations", {
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  })
  lexeme!: Lexeme;

  @Column({
    asExpression: "to_tsvector('english', data)",
    generatedType: "STORED",
    nullable: true,
    select: false,
    type: "tsvector",
  })
  @Index({ type: "gin" })
  translationFullTextSearch!: string;
}
