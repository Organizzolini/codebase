import { ArgsType as ArgumentsType, Field, ID } from "@nestjs/graphql";

/**
 * GraphQL arguments for a single lexeme lookup by ID.
 */
@ArgumentsType()
export class LexemeArguments {
  @Field(() => ID, {
    description: "ID of the lexeme to retrieve.",
  })
  public id!: string;
}
