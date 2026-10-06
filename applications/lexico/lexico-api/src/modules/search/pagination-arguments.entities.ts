import { ArgsType as ArgumentsType, Field, Int } from "@nestjs/graphql";

/**
 * GraphQL arguments for Relay forward and backward keyset pagination.
 */
@ArgumentsType()
export class PaginationArguments {
  @Field(() => String, {
    description: "Returns edges after the given cursor.",
    nullable: true,
  })
  public after?: null | string;

  @Field(() => String, {
    description: "Returns edges before the given cursor.",
    nullable: true,
  })
  public before?: null | string;

  @Field(() => Int, {
    description: "Number of edges to return from the start.",
    nullable: true,
  })
  public first?: null | number;

  @Field(() => Int, {
    description: "Number of edges to return from the end.",
    nullable: true,
  })
  public last?: null | number;
}
