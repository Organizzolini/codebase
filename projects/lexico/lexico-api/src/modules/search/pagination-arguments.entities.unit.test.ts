import { describe, expect, it } from "vitest";

import { PaginationArguments } from "./pagination-arguments.entities";
import { SearchEnglishArguments } from "./search-english-arguments.entities";
import { SearchLatinArguments } from "./search-latin-arguments.entities";

describe("search pagination arguments entities suite", () => {
  it("constructs pagination and search argument entities", () => {
    expect.hasAssertions();

    const pagination = new PaginationArguments();
    pagination.after = "c1";
    pagination.before = "c0";
    pagination.first = 10;
    pagination.last = 5;

    expect(pagination.after).toBe("c1");
    expect(pagination.before).toBe("c0");
    expect(pagination.first).toBe(10);
    expect(pagination.last).toBe(5);

    const searchLatin = new SearchLatinArguments();
    searchLatin.query = "amo";
    searchLatin.first = 5;

    expect(searchLatin.query).toBe("amo");
    expect(searchLatin.first).toBe(5);

    const searchEnglish = new SearchEnglishArguments();
    searchEnglish.query = "love";
    searchEnglish.first = 5;

    expect(searchEnglish.query).toBe("love");
    expect(searchEnglish.first).toBe(5);
  });
});
