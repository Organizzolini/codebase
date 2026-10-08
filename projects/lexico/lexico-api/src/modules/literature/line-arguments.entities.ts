import { ArgsType as ArgumentsType, Field, ID, Int } from "@nestjs/graphql";

import { LinesRangeInput } from "./lines-range-input.entities";

/** Arguments for querying literature lines. */
@ArgumentsType()
export class LinesArguments {
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

  @Field(() => LinesRangeInput, { nullable: true })
  public range?: LinesRangeInput;

  @Field(() => ID, { nullable: true })
  public textId?: null | string;
}
