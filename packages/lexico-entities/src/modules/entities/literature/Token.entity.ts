import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";

import { DeletableEntity } from "@codebase/database";

import type { Word } from "../dictionary/Word.entity";
import type { Author } from "./Author.entity";
import type { Line } from "./Line.entity";
import type { Text } from "./Text.entity";
import type { Relation } from "typeorm";

/**
 * Represents a single token (word or punctuation) parsed from a line of text.
 */
@Entity({
  comment:
    "A single parsed token (word or punctuation) from a line of literature",
  name: "tokens",
})
@Index(["line", "index"], { unique: true })
@Index(["text", "index"])
export class Token extends DeletableEntity {
  @Index()
  @ManyToOne("Author", { eager: false, onDelete: "CASCADE" })
  author!: Relation<Author>;

  @Column("varchar", { comment: "The raw string value of the token" })
  @Index()
  data!: string;

  @Column("bigint", {
    comment: "The 0-based index of this token within its parent line",
  })
  index!: number;

  @Column("boolean", {
    comment:
      "True if the token represents punctuation or whitespace, false if it is a word",
  })
  isPunctuation!: boolean;

  @ManyToOne("Line", "tokens", { eager: false, onDelete: "CASCADE" })
  line!: Relation<Line>;

  @ManyToOne("Text", { eager: false, onDelete: "CASCADE" })
  text!: Relation<Text>;

  @Index()
  @JoinColumn()
  @ManyToOne("Word", { eager: false, nullable: true })
  word?: null | Relation<Word>;
}
