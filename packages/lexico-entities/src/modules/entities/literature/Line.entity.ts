import { Field, ObjectType } from "@nestjs/graphql";
import { Column, Entity, Index, ManyToOne, OneToMany } from "typeorm";

import { DeletableEntity } from "../base/Deletable.entity";

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
@ObjectType()
export class Line extends DeletableEntity {
  @Field(() => Author)
  @Index()
  @ManyToOne("Author", { eager: false, onDelete: "CASCADE" })
  author!: Relation<Author>;

  @Column("varchar", { comment: "The raw text data content of the line" })
  @Field()
  data!: string;

  @Column("bigint", {
    comment: "The sequential 0-based index of the line within its text",
  })
  @Field()
  index!: number;

  @Column("varchar", {
    comment:
      "The display label for the line (e.g. section number or roman numeral)",
    length: 32,
  })
  @Field()
  label!: string;

  @Field(() => Text)
  @ManyToOne("Text", "lines", { eager: true, onDelete: "CASCADE" })
  text!: Relation<Text>;

  @Field(() => [Token])
  @OneToMany("Token", "line", { cascade: true })
  tokens!: Token[];
}
