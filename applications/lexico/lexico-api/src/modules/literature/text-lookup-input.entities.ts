import { Field, ID, InputType } from "@nestjs/graphql";

/** GraphQL lookup input for a literature text by ID or slug. */
@InputType()
export class TextLookupInput {
  @Field(() => ID, { nullable: true })
  public id?: string;

  @Field(() => String, { nullable: true })
  public slug?: string;
}
