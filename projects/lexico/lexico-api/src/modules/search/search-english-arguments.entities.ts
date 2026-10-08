import { ArgsType as ArgumentsType, Field } from "@nestjs/graphql";

import { PaginationArguments } from "./pagination-arguments.entities";

/**
 * GraphQL arguments for searching English definitions and translations.
 */
@ArgumentsType()
export class SearchEnglishArguments extends PaginationArguments {
  @Field(() => String, {
    description: "English search query string.",
  })
  public query!: string;
}
