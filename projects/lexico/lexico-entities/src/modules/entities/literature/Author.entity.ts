import { Column, Entity, OneToMany } from "typeorm";

import { DeletableEntity } from "@codebase/database";

import { Text } from "./Text.entity";

/**
 * Represents an author of Latin literature.
 */
@Entity({
  comment: "An author of Latin literature",
  name: "authors",
})
export class Author extends DeletableEntity {
  @Column("jsonb", { comment: "Unstructured metadata", nullable: true })
  metadata?: null | Record<string, unknown>;

  @Column("varchar", { comment: "The display name of the author", length: 64 })
  name!: string;

  @Column("varchar", {
    comment: "Unique slug identifier (e.g. 'caesar')",
    length: 64,
    unique: true,
  })
  slug!: string;

  @OneToMany("Text", "author", { cascade: true })
  texts!: Text[];
}
