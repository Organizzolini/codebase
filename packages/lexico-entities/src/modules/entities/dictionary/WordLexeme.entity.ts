import { Entity, Index, ManyToOne } from "typeorm";

import { DeletableEntity } from "@codebase/database";

import type { Lexeme } from "./Lexeme.entity";
import type { Word } from "./Word.entity";
import type { Relation } from "typeorm";

/**
 * Explicit junction entity linking a normalized Latin word string to the
 * lexeme (dictionary entry) it can represent. Replaces an implicit TypeORM
 * join table so the relationship row carries audit columns and a stable UUID.
 */
@Entity({
  comment:
    "Junction table linking a normalized Latin word string to the lexemes (dictionary entries) it can represent",
  name: "word_lexemes",
})
@Index(["word", "lexeme"], { unique: true })
export class WordLexeme extends DeletableEntity {
  /** The dictionary entry side of the junction. */
  @Index()
  @ManyToOne("Lexeme", "wordLexemes", {
    nullable: false,
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  })
  lexeme!: Relation<Lexeme>;

  /** The word string side of the junction. */
  @Index()
  @ManyToOne("Word", "wordLexemes", {
    nullable: false,
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  })
  word!: Relation<Word>;
}
