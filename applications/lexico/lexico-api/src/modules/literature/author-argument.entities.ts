import { ArgsType as ArgumentsType, Field, ID } from "@nestjs/graphql";

import { AuthorLookupInput } from "./author-lookup-input.entities";

/** Arguments for finding a single author by lookup input or direct ID/slug. */
@ArgumentsType()
export class AuthorArguments {
  @Field(() => ID, { nullable: true })
  public id?: string;

  @Field(() => AuthorLookupInput, { nullable: true })
  public lookup?: AuthorLookupInput;

  @Field(() => String, { nullable: true })
  public slug?: string;
}
