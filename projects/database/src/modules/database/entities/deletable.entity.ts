import { Column, DeleteDateColumn } from "typeorm";

import { UpdatableEntity } from "./updatable.entity";

/**
 * Adds soft deletion: when a row was deleted and, optionally, who deleted
 * it. A table without soft deletion extends {@link UpdatableEntity} instead
 * and carries no `deletedAt`.
 */
export abstract class DeletableEntity extends UpdatableEntity {
  @DeleteDateColumn({
    comment: "Timestamp when the record was soft-deleted",
    nullable: true,
    type: "timestamptz",
  })
  deletedAt?: Date | null;

  @Column("uuid", {
    comment: "Identifier of the user or process that soft-deleted the record",
    nullable: true,
  })
  deletedBy?: null | string;
}
