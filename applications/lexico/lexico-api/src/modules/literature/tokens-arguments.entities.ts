import { ArgsType as ArgumentsType, Field, ID, Int } from "@nestjs/graphql";

/** Arguments for querying tokens in a line. */
@ArgumentsType()
export class TokensArguments {
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

  @Field(() => ID)
  public lineId!: string;
}
