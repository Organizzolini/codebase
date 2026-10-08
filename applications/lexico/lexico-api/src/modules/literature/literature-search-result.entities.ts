import { Field, ObjectType } from "@nestjs/graphql";

import { AuthorType } from "./author.entities";
import { LineType } from "./line.entities";
import { TextType } from "./text.entities";

/** Aggregated result set for a literature search across authors, texts, and lines. */
@ObjectType()
export class LiteratureSearchResult {
  @Field(() => [AuthorType])
  public authors!: AuthorType[];

  @Field(() => [LineType])
  public lines!: LineType[];

  @Field(() => [TextType])
  public texts!: TextType[];
}
