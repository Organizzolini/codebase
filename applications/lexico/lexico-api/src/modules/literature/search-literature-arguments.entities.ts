import { ArgsType as ArgumentsType, Field, ID } from "@nestjs/graphql";

/** Arguments for searching literature across authors, texts, and lines. */
@ArgumentsType()
export class SearchLiteratureArguments {
  @Field(() => ID, { nullable: true })
  public authorId?: string;

  @Field(() => String)
  public query!: string;
}
