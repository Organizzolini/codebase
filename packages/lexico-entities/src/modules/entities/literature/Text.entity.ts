import { Field, ObjectType } from "@nestjs/graphql";
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from "typeorm";

import { DeletableEntity } from "../base/Deletable.entity";

import { Author } from "./Author.entity";
import { Line } from "./Line.entity";

import type { Relation } from "typeorm";

/**
 * Represents a text or a collection of texts (like a book or corpus).
 */
@Entity({
  comment: "A hierarchical literary work (corpus, book, text, poem, etc.)",
  name: "texts",
})
@ObjectType()
export class Text extends DeletableEntity {
  @Field(() => Author)
  @Index()
  @JoinColumn({ name: "author_id" })
  @ManyToOne("Author", "texts", { eager: true, onDelete: "CASCADE" })
  author!: Relation<Author>;

  @Field(() => [Text])
  @OneToMany("Text", "parentText", { cascade: true })
  childTexts!: Text[];

  @Field(() => [Line])
  @OneToMany("Line", "text", { cascade: true })
  lines!: Line[];

  @Column("jsonb", { comment: "Unstructured metadata", nullable: true })
  metadata?: null | Record<string, unknown>;

  @Field(() => Text, { nullable: true })
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
  @Field()
  slug!: string;

  @Column("varchar", { comment: "The title of the text", length: 128 })
  @Field()
  title!: string;

  @Column("varchar", {
    comment:
      "The structural type of the text (e.g. 'book', 'text', 'collection')",
    default: "text",
    length: 32,
  })
  @Field()
  type!: string;
}
