import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { IssueLabelsService } from "./issue-labels.service";

/** A rendered `issue.yml` body naming this Type and Scope. */
const formBody = (type: string, scope: string): string =>
  ["### Type", "", type, "", "### Scope", "", scope, ""].join("\n");

describe(IssueLabelsService, () => {
  let service: IssueLabelsService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [IssueLabelsService],
    }).compile();

    service = await module.resolve(IssueLabelsService);
  });

  it("is defined", () => {
    expect.hasAssertions();
    expect(service).toBeDefined();
  });

  describe("parseFormAnswers", () => {
    it("reads both answers from a rendered submission", () => {
      expect.hasAssertions();
      expect(
        service.parseFormAnswers(formBody("feat", "lexico")),
      ).toStrictEqual({
        scope: "lexico",
        type: "feat",
      });
    });

    it("reads nothing from a body with no form markers", () => {
      expect.hasAssertions();
      expect(
        service.parseFormAnswers("Plain issue, no template."),
      ).toStrictEqual({});
    });

    it("treats an unfilled optional field marker as no answer", () => {
      expect.hasAssertions();

      const body = ["### Type", "", "_No response_", ""].join("\n");

      expect(service.parseFormAnswers(body)).toStrictEqual({});
    });

    it("tolerates CRLF line endings", () => {
      expect.hasAssertions();

      const body = "### Type\r\n\r\nfix\r\n\r\n### Scope\r\n\r\ntools\r\n";

      expect(service.parseFormAnswers(body)).toStrictEqual({
        scope: "tools",
        type: "fix",
      });
    });
  });

  describe("labelsFromAnswers", () => {
    it("builds a label for each answer present", () => {
      expect.hasAssertions();
      expect(
        service.labelsFromAnswers({ scope: "lexico", type: "feat" }),
      ).toStrictEqual(["type:feat", "scope:lexico"]);
    });

    it("builds no labels when neither answer is present", () => {
      expect.hasAssertions();
      expect(service.labelsFromAnswers({})).toStrictEqual([]);
    });

    it("builds only the label the one present answer implies", () => {
      expect.hasAssertions();
      expect(service.labelsFromAnswers({ type: "feat" })).toStrictEqual([
        "type:feat",
      ]);
      expect(service.labelsFromAnswers({ scope: "lexico" })).toStrictEqual([
        "scope:lexico",
      ]);
    });
  });

  describe("missingLabels", () => {
    it("reports labels the issue does not already carry", () => {
      expect.hasAssertions();
      expect(
        service.missingLabels({ scope: "lexico", type: "feat" }, ["type:feat"]),
      ).toStrictEqual(["scope:lexico"]);
    });

    it("reports nothing when every implied label is already present", () => {
      expect.hasAssertions();
      expect(
        service.missingLabels({ scope: "lexico", type: "feat" }, [
          "scope:lexico",
          "type:feat",
        ]),
      ).toStrictEqual([]);
    });
  });
});
