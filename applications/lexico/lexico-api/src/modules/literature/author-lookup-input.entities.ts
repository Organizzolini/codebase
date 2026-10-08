import { Field, ID, InputType } from "@nestjs/graphql";

/** GraphQL lookup input for a literature author by ID or slug. */
@InputType()
export class AuthorLookupInput {
  @Field(() => ID, { nullable: true })
  public id?: string;

  @Field(() => String, { nullable: true })
  public slug?: string;
}
