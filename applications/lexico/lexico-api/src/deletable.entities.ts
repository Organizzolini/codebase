import { Field, ID, ObjectType } from "@nestjs/graphql";

import type { GraphQLObjectOf } from "./lexico-api.types";
import type { DeletableEntity } from "@codebase/database";

/**
 * The shared base columns every soft-deletable entity carries, as GraphQL
 * fields. The entities declare the columns through `@codebase/database`'s
 * `DeletableEntity`; this type only exposes them.
 */
@ObjectType({ isAbstract: true })
export abstract class DeletableType implements GraphQLObjectOf<
  DeletableEntity,
  DeletableType,
  never
> {
  @Field(() => Date)
  public createdAt!: Date;

  @Field(() => ID, { nullable: true })
  public createdBy!: null | string | undefined;

  @Field(() => Date, { nullable: true })
  public deletedAt!: Date | null | undefined;

  @Field(() => ID, { nullable: true })
  public deletedBy!: null | string | undefined;

  @Field(() => ID)
  public id!: string;

  @Field(() => Date)
  public updatedAt!: Date;

  @Field(() => ID, { nullable: true })
  public updatedBy!: null | string | undefined;
}
