import { Column, Entity } from "typeorm";

import { IdentifiableEntity } from "../../src/modules/database/entities/identifiable.entity";

/**
 * A table no migration creates, with one generated column: what the
 * integration suite has `migration:generate`'s schema builder plan, to see
 * where TypeORM records the column's expression.
 */
@Entity({ name: "gadgets" })
export class Gadget extends IdentifiableEntity {
  @Column({ type: "text" })
  displayName!: string;

  @Column({
    asExpression: "lower(display_name)",
    generatedType: "STORED",
    nullable: true,
    type: "text",
  })
  searchName!: string;
}
