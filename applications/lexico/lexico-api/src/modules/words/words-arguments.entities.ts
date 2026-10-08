import { ArgsType as ArgumentsType, Field } from "@nestjs/graphql";

/**
 * GraphQL arguments for multiple words lookup queries.
 */
@ArgumentsType()
export class WordsArguments {
  @Field(() => [String], {
    description: "List of surface word data to look up.",
  })
  public data!: string[];
}
