import { Field, ObjectType } from "@nestjs/graphql";

import { Author, Line, Text } from "@codebase/lexico-entities";

/** Aggregated result set for a literature search across authors, texts, and lines. */
@ObjectType()
export class LiteratureSearchResult {
  @Field(() => [Author])
  public authors!: Author[];

  @Field(() => [Line])
  public lines!: Line[];

  @Field(() => [Text])
  public texts!: Text[];
}
