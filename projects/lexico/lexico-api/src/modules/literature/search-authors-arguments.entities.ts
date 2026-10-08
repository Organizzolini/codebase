import { ArgsType as ArgumentsType, Field, Int } from "@nestjs/graphql";

/** Arguments for searching authors. */
@ArgumentsType()
export class SearchAuthorsArguments {
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

  @Field(() => String)
  public query!: string;
}
