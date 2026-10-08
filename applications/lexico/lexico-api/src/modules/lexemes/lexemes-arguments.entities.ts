import { ArgsType as ArgumentsType, Field, ID } from "@nestjs/graphql";

/**
 * GraphQL arguments for batch lexemes lookup by IDs.
 */
@ArgumentsType()
export class LexemesArguments {
  @Field(() => [ID], {
    description: "List of lexeme IDs to retrieve.",
  })
  public ids!: string[];
}
