import { describe, expect, it } from "vitest";

import { LexemesModule } from "./lexemes.module";

describe("lexemes module suite", () => {
  it("instantiates LexemesModule", () => {
    expect.hasAssertions();

    const module = new LexemesModule();

    expect(module).toBeDefined();
  });
});
