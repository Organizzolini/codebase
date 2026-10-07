import { Field, Float, ObjectType } from "@nestjs/graphql";
import { Column, Entity, Index, OneToMany, OneToOne, Unique } from "typeorm";

import { DeletableEntity } from "../base/Deletable.entity";

import { Form } from "./form/Form.entity";
import { Inflection } from "./inflection/Inflection.entity";
import { type PartOfSpeech, partsOfSpeech } from "./PartOfSpeech.entity";
import { PrincipalPart } from "./PrincipalPart.entity";
import { Pronunciation } from "./Pronunciation.entity";
import { Translation } from "./Translation.entity";
import { WordLexeme } from "./WordLexeme.entity";

/**
 * A normalized Latin dictionary entry and its related linguistic data.
 */
@Entity({
  comment:
    "A dictionary entry representing a Latin word form with its translations, principal parts, pronunciation, and inflection data",
  name: "lexemes",
})
@ObjectType()
@Unique(["lemma", "disambiguator"])
export class Lexeme extends DeletableEntity {
  @Column("bigint", {
    comment:
      "Disambiguation index when multiple entries share the same lemma (0-based)",
    default: 0,
  })
  @Field(() => Float)
  disambiguator!: number;

  @Column("text", {
    comment: "Etymology of the word (Latin or Greek origin)",
    nullable: true,
  })
  @Field(() => String, { nullable: true })
  etymology?: string;

  @Field(() => [Form])
  @OneToMany(() => Form, (form) => form.lexeme, {
    cascade: true,
    onDelete: "CASCADE",
  })
  forms!: Form[];

  @Field(() => Inflection, { nullable: true })
  @OneToOne(() => Inflection, (inflection) => inflection.lexeme, {
    cascade: true,
    nullable: true,
  })
  inflection?: Inflection | null;

  @Column("text", {
    comment: "Dictionary headword (lemma), e.g. 'amō'",
  })
  @Field()
  @Index()
  lemma!: string;

  @Column({
    comment: "Grammatical part of speech",
    enum: partsOfSpeech,
    type: "enum",
  })
  @Field(() => String)
  @Index()
  partOfSpeech!: PartOfSpeech;

  @Field(() => [PrincipalPart])
  @OneToMany(() => PrincipalPart, "lexeme", {
    cascade: true,
    onDelete: "CASCADE",
  })
  principalParts!: PrincipalPart[];

  @Field(() => [Pronunciation], { nullable: true })
  @OneToMany(() => Pronunciation, "lexeme", {
    cascade: true,
    onDelete: "CASCADE",
    orphanedRowAction: "delete",
  })
  pronunciations?: null | Pronunciation[];

  @Field(() => [Translation], { nullable: true })
  @OneToMany(() => Translation, (translation) => translation.lexeme, {
    cascade: true,
    nullable: true,
    onDelete: "CASCADE",
  })
  translations?: null | Translation[];

  /** Junction rows linking this lexeme to every word string that can represent it. */
  @OneToMany("WordLexeme", "lexeme", { onDelete: "CASCADE" })
  wordLexemes?: WordLexeme[];
}
