import { Entity, Index, ManyToOne } from "typeorm";

import { DeletableEntity } from "@codebase/database";

import { Form } from "./form/Form.entity";
import { Word } from "./Word.entity";

import type { Relation } from "typeorm";

/**
 * Explicit junction entity linking a normalized Latin word string to the
 * morphological form it can surface as. Replaces an implicit TypeORM join
 * table so the relationship row carries audit columns and a stable UUID.
 *
 * When a Form row is deleted (e.g., during re-ingestion of a lexeme), the
 * database cascades the delete to its WordForm rows automatically.
 */
@Entity({
  comment:
    "Junction table linking a normalized Latin word string to the morphological forms it can surface as",
  name: "word_forms",
})
@Index(["word", "form"], { unique: true })
export class WordForm extends DeletableEntity {
  /** The morphological form side of the junction. Cascade-deletes with the Form. */
  @Index()
  @ManyToOne("Form", "wordForms", {
    nullable: false,
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  })
  form!: Relation<Form>;

  /** The word string side of the junction. */
  @Index()
  @ManyToOne("Word", "wordForms", {
    nullable: false,
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  })
  word!: Relation<Word>;
}
