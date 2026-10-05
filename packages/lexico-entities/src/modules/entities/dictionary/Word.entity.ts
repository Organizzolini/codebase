import { Field, ObjectType } from "@nestjs/graphql";
import { Column, Entity, OneToMany } from "typeorm";

import { DeletableEntity } from "../base/Deletable.entity";

import { WordForm } from "./WordForm.entity";
import { WordLexeme } from "./WordLexeme.entity";

/**
 * A distinct written Latin word linked to forms and lexemes.
 */
@Entity({
  comment: "A Latin word string that maps to one or more dictionary entries",
  name: "words",
})
@ObjectType()
export class Word extends DeletableEntity {
  @Column({
    comment: "The Latin word as written",
    unique: true,
  })
  @Field()
  data!: string;

  /** Junction rows linking this word to every morphological form it can surface as. */
  @Field(() => [WordForm])
  @OneToMany(() => WordForm, (wf) => wf.word)
  wordForms!: WordForm[];

  /** Junction rows linking this word to every lexeme it can represent. */
  @Field(() => [WordLexeme])
  @OneToMany(() => WordLexeme, (wl) => wl.word)
  wordLexemes!: WordLexeme[];
}
