import { Column, Entity, Index, ManyToOne, OneToMany } from "typeorm";

import { DeletableEntity } from "@codebase/database";

import { BIGINT_NUMBER_TRANSFORMER } from "../entities.constants";

import { Author } from "./Author.entity";
import { Text } from "./Text.entity";
import { Token } from "./Token.entity";

import type { Relation } from "typeorm";

/**
 * Represents a single line of text from a classical Latin work.
 */
@Entity({
  comment: "A single line of classical Latin literature",
  name: "lines",
})
@Index(["text", "index"], { unique: true })
export class Line extends DeletableEntity {
  @Index()
  @ManyToOne("Author", { eager: false, onDelete: "CASCADE" })
  author!: Relation<Author>;

  @Column("varchar", { comment: "The raw text data content of the line" })
  data!: string;

  @Column("bigint", {
    comment: "The sequential 0-based index of the line within its text",
    transformer: BIGINT_NUMBER_TRANSFORMER,
  })
  index!: number;

  @Column("varchar", {
    comment:
      "The display label for the line (e.g. section number or roman numeral)",
    length: 32,
  })
  label!: string;

  @ManyToOne("Text", "lines", { eager: true, onDelete: "CASCADE" })
  text!: Relation<Text>;

  @OneToMany("Token", "line", { cascade: true })
  tokens!: Token[];
}
