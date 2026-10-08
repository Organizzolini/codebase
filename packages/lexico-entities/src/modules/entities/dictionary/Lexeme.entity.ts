import { Column, Entity, Index, OneToMany, OneToOne, Unique } from "typeorm";

import { DeletableEntity } from "@codebase/database";

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
@Unique(["lemma", "disambiguator"])
export class Lexeme extends DeletableEntity {
  @Column("bigint", {
    comment:
      "Disambiguation index when multiple entries share the same lemma (0-based)",
    default: 0,
  })
  disambiguator!: number;

  @Column("text", {
    comment: "Etymology of the word (Latin or Greek origin)",
    nullable: true,
  })
  etymology?: string;

  @OneToMany(() => Form, (form) => form.lexeme, {
    cascade: true,
    onDelete: "CASCADE",
  })
  forms!: Form[];

  @OneToOne(() => Inflection, (inflection) => inflection.lexeme, {
    cascade: true,
    nullable: true,
  })
  inflection?: Inflection | null;

  @Column("text", {
    comment: "Dictionary headword (lemma), e.g. 'amō'",
  })
  @Index()
  lemma!: string;

  @Column({
    comment: "Grammatical part of speech",
    enum: partsOfSpeech,
    type: "enum",
  })
  @Index()
  partOfSpeech!: PartOfSpeech;

  @OneToMany(() => PrincipalPart, "lexeme", {
    cascade: true,
    onDelete: "CASCADE",
  })
  principalParts!: PrincipalPart[];

  @OneToMany(() => Pronunciation, "lexeme", {
    cascade: true,
    onDelete: "CASCADE",
    orphanedRowAction: "delete",
  })
  pronunciations?: null | Pronunciation[];

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
