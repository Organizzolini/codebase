import { describe, expect, it } from "vitest";

import { Author, Line, Text } from "@codebase/lexico-entities";

import { AuthorArguments } from "./author-argument.entities";
import { AuthorLookupInput } from "./author-lookup-input.entities";
import { LinesArguments } from "./line-arguments.entities";
import { LinesRangeInput } from "./lines-range-input.entities";
import {
  AuthorConnectionType,
  LineConnectionType,
  TextConnectionType,
  TokenConnectionType,
} from "./literature-connection.entities";
import { LiteratureSearchResult } from "./literature-search-result.entities";
import { SearchAuthorsArguments } from "./search-authors-arguments.entities";
import { SearchLinesArguments } from "./search-lines-arguments.entities";
import { SearchLiteratureArguments } from "./search-literature-arguments.entities";
import { SearchTextsArguments } from "./search-texts-arguments.entities";
import { TextArguments } from "./text-argument.entities";
import { TextLookupInput } from "./text-lookup-input.entities";
import { TextsArguments } from "./texts-arguments.entities";
import { TokensArguments } from "./tokens-arguments.entities";

describe("literature arguments and entities suite", () => {
  it("constructs and instantiates all argument and input classes", () => {
    expect.hasAssertions();

    const authorLookup = new AuthorLookupInput();
    authorLookup.id = "author-1";
    authorLookup.slug = "virgil";

    expect(authorLookup.id).toBe("author-1");
    expect(authorLookup.slug).toBe("virgil");

    const authorArgs = new AuthorArguments();
    authorArgs.id = "author-1";
    authorArgs.slug = "virgil";
    authorArgs.lookup = authorLookup;

    expect(authorArgs.id).toBe("author-1");
    expect(authorArgs.slug).toBe("virgil");
    expect(authorArgs.lookup).toBe(authorLookup);

    const textLookup = new TextLookupInput();
    textLookup.id = "text-1";
    textLookup.slug = "aeneid";

    expect(textLookup.id).toBe("text-1");
    expect(textLookup.slug).toBe("aeneid");

    const textArgs = new TextArguments();
    textArgs.id = "text-1";
    textArgs.slug = "aeneid";
    textArgs.lookup = textLookup;

    expect(textArgs.id).toBe("text-1");
    expect(textArgs.slug).toBe("aeneid");
    expect(textArgs.lookup).toBe(textLookup);

    const textsArgs = new TextsArguments();
    textsArgs.first = 10;
    textsArgs.after = "cursor-1";
    textsArgs.last = 5;
    textsArgs.before = "cursor-0";
    textsArgs.authorId = "author-1";
    textsArgs.parentTextId = "parent-1";

    expect(textsArgs.first).toBe(10);
    expect(textsArgs.after).toBe("cursor-1");
    expect(textsArgs.last).toBe(5);
    expect(textsArgs.before).toBe("cursor-0");
    expect(textsArgs.authorId).toBe("author-1");
    expect(textsArgs.parentTextId).toBe("parent-1");

    const lineRangeInput = new LinesRangeInput();
    lineRangeInput.startIndex = 1;
    lineRangeInput.endIndex = 10;

    expect(lineRangeInput.startIndex).toBe(1);
    expect(lineRangeInput.endIndex).toBe(10);

    const linesArgs = new LinesArguments();
    linesArgs.first = 10;
    linesArgs.after = "cursor-1";
    linesArgs.last = 5;
    linesArgs.before = "cursor-0";
    linesArgs.textId = "text-1";
    linesArgs.range = lineRangeInput;

    expect(linesArgs.first).toBe(10);
    expect(linesArgs.after).toBe("cursor-1");
    expect(linesArgs.last).toBe(5);
    expect(linesArgs.before).toBe("cursor-0");
    expect(linesArgs.textId).toBe("text-1");
    expect(linesArgs.range).toBe(lineRangeInput);

    const tokensArgs = new TokensArguments();
    tokensArgs.first = 10;
    tokensArgs.after = "cursor-1";
    tokensArgs.last = 5;
    tokensArgs.before = "cursor-0";
    tokensArgs.lineId = "line-1";

    expect(tokensArgs.first).toBe(10);
    expect(tokensArgs.after).toBe("cursor-1");
    expect(tokensArgs.last).toBe(5);
    expect(tokensArgs.before).toBe("cursor-0");
    expect(tokensArgs.lineId).toBe("line-1");

    const searchAuthorsArgs = new SearchAuthorsArguments();
    searchAuthorsArgs.first = 10;
    searchAuthorsArgs.after = "cursor-1";
    searchAuthorsArgs.last = 5;
    searchAuthorsArgs.before = "cursor-0";
    searchAuthorsArgs.query = "virgil";

    expect(searchAuthorsArgs.first).toBe(10);
    expect(searchAuthorsArgs.after).toBe("cursor-1");
    expect(searchAuthorsArgs.last).toBe(5);
    expect(searchAuthorsArgs.before).toBe("cursor-0");
    expect(searchAuthorsArgs.query).toBe("virgil");

    const searchTextsArgs = new SearchTextsArguments();
    searchTextsArgs.first = 10;
    searchTextsArgs.after = "cursor-1";
    searchTextsArgs.last = 5;
    searchTextsArgs.before = "cursor-0";
    searchTextsArgs.query = "aeneid";
    searchTextsArgs.authorId = "author-1";

    expect(searchTextsArgs.first).toBe(10);
    expect(searchTextsArgs.after).toBe("cursor-1");
    expect(searchTextsArgs.last).toBe(5);
    expect(searchTextsArgs.before).toBe("cursor-0");
    expect(searchTextsArgs.query).toBe("aeneid");
    expect(searchTextsArgs.authorId).toBe("author-1");

    const searchLinesArgs = new SearchLinesArguments();
    searchLinesArgs.first = 10;
    searchLinesArgs.after = "cursor-1";
    searchLinesArgs.last = 5;
    searchLinesArgs.before = "cursor-0";
    searchLinesArgs.query = "arma";
    searchLinesArgs.textId = "text-1";

    expect(searchLinesArgs.first).toBe(10);
    expect(searchLinesArgs.after).toBe("cursor-1");
    expect(searchLinesArgs.last).toBe(5);
    expect(searchLinesArgs.before).toBe("cursor-0");
    expect(searchLinesArgs.query).toBe("arma");
    expect(searchLinesArgs.textId).toBe("text-1");

    const searchLitArgs = new SearchLiteratureArguments();
    searchLitArgs.query = "virgil";
    searchLitArgs.authorId = "author-1";

    expect(searchLitArgs.query).toBe("virgil");
    expect(searchLitArgs.authorId).toBe("author-1");
  });

  it("instantiates LiteratureSearchResult and connection types", () => {
    expect.hasAssertions();

    const searchResult = new LiteratureSearchResult();
    searchResult.authors = [new Author()];
    searchResult.texts = [new Text()];
    searchResult.lines = [new Line()];

    expect(searchResult.authors).toHaveLength(1);
    expect(searchResult.texts).toHaveLength(1);
    expect(searchResult.lines).toHaveLength(1);

    expect(AuthorConnectionType).toBeDefined();
    expect(LineConnectionType).toBeDefined();
    expect(TextConnectionType).toBeDefined();
    expect(TokenConnectionType).toBeDefined();
  });
});
