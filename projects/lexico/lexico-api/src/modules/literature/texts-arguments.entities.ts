import { ArgsType as ArgumentsType, Field, ID, Int } from "@nestjs/graphql";

/** Arguments for querying literature texts. */
@ArgumentsType()
export class TextsArguments {
  @Field(() => String, {
    description: "Returns edges after the given cursor.",
    nullable: true,
  })
  public after?: null | string;

  @Field(() => ID, { nullable: true })
  public authorId?: null | string;

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

  @Field(() => ID, { nullable: true })
  public parentTextId?: null | string;
}
