import { Test } from "@nestjs/testing";
import { describe, expect, it } from "vitest";

import { CommentsModule } from "./comments.module";
import { CommentsService } from "./comments.service";
import { CssCommentsService } from "./css-comments.service";
import { HashCommentsService } from "./hash-comments.service";
import { HclCommentsService } from "./hcl-comments.service";
import { LanguageCommentsService } from "./language-comments.service";
import { SqlCommentsService } from "./sql-comments.service";
import { TypescriptCommentsService } from "./typescript-comments.service";
import { YamlCommentsService } from "./yaml-comments.service";

describe(CommentsModule, () => {
  it("provides every comment reader and the service that measures them", async () => {
    const module = await Test.createTestingModule({
      imports: [CommentsModule],
    }).compile();

    await expect(module.resolve(CommentsService)).resolves.toBeDefined();
    await expect(module.resolve(CssCommentsService)).resolves.toBeDefined();
    await expect(module.resolve(HashCommentsService)).resolves.toBeDefined();
    await expect(module.resolve(HclCommentsService)).resolves.toBeDefined();
    await expect(
      module.resolve(LanguageCommentsService),
    ).resolves.toBeDefined();
    await expect(module.resolve(SqlCommentsService)).resolves.toBeDefined();
    await expect(
      module.resolve(TypescriptCommentsService),
    ).resolves.toBeDefined();
    await expect(module.resolve(YamlCommentsService)).resolves.toBeDefined();
  });
});
