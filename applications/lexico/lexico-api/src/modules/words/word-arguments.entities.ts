import { ArgsType as ArgumentsType, Field } from "@nestjs/graphql";

/**
 * GraphQL arguments for word lookup queries.
 */
@ArgumentsType()
export class WordArguments {
  @Field(() => String, {
    description: "Surface word data to look up.",
  })
  public data!: string;
}
