import { Field, ID, ObjectType } from "@nestjs/graphql";

import { DeletableEntity as DatabaseDeletableEntity } from "@codebase/database";

/**
 * Exposes the shared base columns over GraphQL. Every column, its type, and
 * its default come from `@codebase/database`; this layer adds only the
 * `@Field` decorators, so lexico's API schema is unchanged.
 */
@ObjectType({ isAbstract: true })
export abstract class DeletableEntity extends DatabaseDeletableEntity {
  @Field(() => Date)
  declare createdAt: Date;

  @Field(() => ID, { nullable: true })
  declare createdBy?: null | string;

  @Field(() => Date, { nullable: true })
  declare deletedAt?: Date | null;

  @Field(() => ID, { nullable: true })
  declare deletedBy?: null | string;

  @Field(() => ID)
  declare id: string;

  @Field(() => Date)
  declare updatedAt: Date;

  @Field(() => ID, { nullable: true })
  declare updatedBy?: null | string;
}
