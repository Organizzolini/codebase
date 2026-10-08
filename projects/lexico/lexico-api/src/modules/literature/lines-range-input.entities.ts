import { Field, InputType, Int } from "@nestjs/graphql";

/** GraphQL range input for literature line queries. */
@InputType()
export class LinesRangeInput {
  @Field(() => Int, { nullable: true })
  public endIndex?: null | number;

  @Field(() => Int, { nullable: true })
  public startIndex?: null | number;
}
