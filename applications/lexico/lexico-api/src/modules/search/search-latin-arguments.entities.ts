import { ArgsType as ArgumentsType, Field } from "@nestjs/graphql";

import { PaginationArguments } from "./pagination-arguments.entities";

/**
 * GraphQL arguments for searching Latin lemmas and inflected forms.
 */
@ArgumentsType()
export class SearchLatinArguments extends PaginationArguments {
  @Field(() => String, {
    description: "Latin search query string.",
  })
  public query!: string;
}
