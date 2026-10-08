import { ArgsType as ArgumentsType, Field, ID } from "@nestjs/graphql";

import { TextLookupInput } from "./text-lookup-input.entities";

/** Arguments for finding a single text by lookup input or direct ID/slug. */
@ArgumentsType()
export class TextArguments {
  @Field(() => ID, { nullable: true })
  public id?: string;

  @Field(() => TextLookupInput, { nullable: true })
  public lookup?: TextLookupInput;

  @Field(() => String, { nullable: true })
  public slug?: string;
}
