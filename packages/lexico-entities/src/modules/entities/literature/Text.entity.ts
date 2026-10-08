import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from "typeorm";

import { DeletableEntity } from "@codebase/database";

import type { Author } from "./Author.entity";
import type { Line } from "./Line.entity";
import type { Relation } from "typeorm";

/**
 * Represents a text or a collection of texts (like a book or corpus).
 */
@Entity({
  comment: "A hierarchical literary work (corpus, book, text, poem, etc.)",
  name: "texts",
})
export class Text extends DeletableEntity {
  @Index()
  @JoinColumn({ name: "author_id" })
  @ManyToOne("Author", "texts", { eager: true, onDelete: "CASCADE" })
  author!: Relation<Author>;

  @OneToMany("Text", "parentText", { cascade: true })
  childTexts!: Text[];

  @OneToMany("Line", "text", { cascade: true })
  lines!: Line[];

  @Column("jsonb", { comment: "Unstructured metadata", nullable: true })
  metadata?: null | Record<string, unknown>;

  @Index()
  @JoinColumn({ name: "parent_text_id" })
  @ManyToOne("Text", "childTexts", {
    eager: false,
    nullable: true,
    onDelete: "CASCADE",
  })
  parentText?: null | Relation<Text>;

  @Column("varchar", {
    comment: "Unique slug identifier (e.g. 'caesar/de bello gallico')",
    length: 128,
    unique: true,
  })
  slug!: string;

  @Column("varchar", { comment: "The title of the text", length: 128 })
  title!: string;

  @Column("varchar", {
    comment:
      "The structural type of the text (e.g. 'book', 'text', 'collection')",
    default: "text",
    length: 32,
  })
  type!: string;
}
