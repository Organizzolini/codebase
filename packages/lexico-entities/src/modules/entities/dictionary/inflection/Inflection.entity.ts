import { Field, ID, InterfaceType } from "@nestjs/graphql";
import {
  BaseEntity,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
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
@InterfaceType()
@TableInheritance({ column: { name: "type", type: "text" } })
export class Inflection extends BaseEntity {
  @Field(() => ID)
  @PrimaryGeneratedColumn("uuid", {
    comment:
      "Auto-generated UUID; discriminator column 'type' selects the child entity",
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
