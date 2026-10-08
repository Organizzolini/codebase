import {
  BaseEntity,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  TableInheritance,
} from "typeorm";

import type { Lexeme } from "../Lexeme.entity";

/**
 * Base single-table-inheritance entity for inflection metadata.
 */
@Entity({
  comment:
    "Abstract base table for grammatical inflection metadata using single-table inheritance",
  name: "inflections",
})
@TableInheritance({ column: { name: "type", type: "text" } })
export class Inflection extends BaseEntity {
  @PrimaryColumn({
    comment:
      "Primary key, a uuidv7 the database assigns on insert; discriminator column 'type' selects the child entity",
    default: () => "uuidv7()",
    type: "uuid",
  })
  id!: string;

  /** The lexeme this inflection metadata belongs to. */
  @JoinColumn()
  @OneToOne("Lexeme", "inflection", {
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  })
  lexeme!: Lexeme;
}
