import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from "typeorm";

import { DeletableEntity } from "@codebase/database";

import type { Lexeme } from "./Lexeme.entity";

export const pronunciationVariant = {
  classical: "classical",
  ecclesiastical: "ecclesiastical",
  vulgar: "vulgar",
} as const;

/**
 * Union of pronunciation variant values.
 */
export type PronunciationVariant =
  (typeof pronunciationVariant)[keyof typeof pronunciationVariant];

export const pronunciationVariants = Object.values(
  pronunciationVariant,
) as PronunciationVariant[];

/**
 * A pronunciation record for a lexeme and pronunciation tradition.
 */
@Entity({
  comment:
    "A pronunciation variant (classical, ecclesiastical, or vulgar) for a Latin lexeme",
  name: "pronunciations",
})
@Unique(["lexeme", "variant"])
export class Pronunciation extends DeletableEntity {
  @Index()
  @JoinColumn()
  @ManyToOne("Lexeme", "pronunciations", {
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  })
  lexeme!: Lexeme;

  @Column("text", {
    comment: "Phonemic segmentation (e.g. a.moː)",
    nullable: true,
  })
  @Index()
  phonemes?: null | string;

  @Column("text", {
    comment: "Phonemic IPA transcription (e.g. /ˈaː.moː/)",
    nullable: true,
  })
  @Index()
  phonemic?: null | string;

  @Column("text", {
    comment: "Phonetic IPA transcription (e.g. [ˈäː.moː])",
    nullable: true,
  })
  phonetic?: null | string;

  @Column({
    comment: "Pronunciation tradition (classical, ecclesiastical, or vulgar)",
    enum: pronunciationVariants,
    type: "enum",
  })
  @Index()
  variant!: PronunciationVariant;
}
