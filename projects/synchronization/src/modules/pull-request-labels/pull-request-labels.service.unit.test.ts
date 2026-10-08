import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { PullRequestLabelsService } from "./pull-request-labels.service";

import type { ConventionalLabel } from "./pull-request-labels.types";

/** What the mocked `require` hands back, or throws when it is an error. */
let conventionalConfig: unknown = { scopes: [], types: [] };

vi.mock("node:module", () => ({
  createRequire: () => (): unknown => {
    if (conventionalConfig instanceof Error) {
      throw conventionalConfig;
    }

    return conventionalConfig;
  },
}));

describe(PullRequestLabelsService, () => {
  let service: PullRequestLabelsService;

  /** One label, spelled the way both sides of the comparison spell it. */
  const label = (
    name: string,
    color: string,
    description: string,
  ): ConventionalLabel => ({ color, description, name });

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [PullRequestLabelsService],
    }).compile();

    service = await module.resolve(PullRequestLabelsService);
  });

  beforeEach(() => {
    conventionalConfig = {
      scopes: [{ description: "The portfolio", name: "JimmyPaolini" }],
      types: [{ description: "A new feature", name: "feat" }],
    };
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("readExpectedLabels", () => {
    it("derives every type, every scope, and the three static labels", () => {
      expect(service.readExpectedLabels()).toStrictEqual([
        label("type:feat", "d93f0b", "A new feature"),
        label("scope:jimmypaolini", "1d76db", "The portfolio"),
        label("do-not-merge", "b60205", "Do not merge this pull request yet"),
        label("source:agent", "e99695", "Opened by a coding agent"),
        label("source:human", "e99695", "Opened by a human"),
      ]);
    });

    it("throws when the configuration cannot be read", () => {
      conventionalConfig = new Error("Cannot find module");

      expect(() => service.readExpectedLabels()).toThrow("Cannot find module");
    });

    it("throws when the configuration is the wrong shape", () => {
      conventionalConfig = { scopes: [{ name: "lexico" }], types: [] };

      expect(() => service.readExpectedLabels()).toThrow(
        /invalid_type|expected/i,
      );
    });
  });

  describe("parseRepositoryLabels", () => {
    it("reads what gh returned", () => {
      expect(
        service.parseRepositoryLabels(
          '[{"color":"d93f0b","description":"A new feature","name":"type:feat"}]',
        ),
      ).toStrictEqual([label("type:feat", "d93f0b", "A new feature")]);
    });

    it("throws on a document that is not JSON", () => {
      expect(() => service.parseRepositoryLabels("not json")).toThrow(/JSON/i);
    });

    it("throws on a document missing a field the comparison needs", () => {
      expect(() =>
        service.parseRepositoryLabels('[{"name":"type:feat"}]'),
      ).toThrow(/invalid_type|expected/i);
    });
  });

  describe("planReconciliation", () => {
    it("finds nothing to do when both sides agree", () => {
      const labels = [label("type:feat", "d93f0b", "A new feature")];

      expect(
        service.planReconciliation({
          currentLabels: labels,
          expectedLabels: labels,
        }),
      ).toStrictEqual({ creations: [], staleNames: [], updates: [] });
    });

    it("plans a creation for a label that does not exist yet", () => {
      expect(
        service.planReconciliation({
          currentLabels: [],
          expectedLabels: [label("type:feat", "d93f0b", "A new feature")],
        }).creations,
      ).toStrictEqual([label("type:feat", "d93f0b", "A new feature")]);
    });

    it("plans an update when only the description drifted", () => {
      expect(
        service.planReconciliation({
          currentLabels: [label("type:feat", "d93f0b", "Something else")],
          expectedLabels: [label("type:feat", "d93f0b", "A new feature")],
        }).updates,
      ).toStrictEqual([label("type:feat", "d93f0b", "A new feature")]);
    });

    it("plans an update when only the color drifted", () => {
      expect(
        service.planReconciliation({
          currentLabels: [label("type:feat", "ffffff", "A new feature")],
          expectedLabels: [label("type:feat", "d93f0b", "A new feature")],
        }).updates,
      ).toStrictEqual([label("type:feat", "d93f0b", "A new feature")]);
    });

    // Deleting is the one thing a reconciliation must not decide on its own.
    it("reports a tracked label the configuration dropped as stale", () => {
      expect(
        service.planReconciliation({
          currentLabels: [
            label("scope:conformance", "1d76db", "Gone"),
            label("source:superpowers", "e99695", "Gone"),
            label("type:feat", "d93f0b", "A new feature"),
          ],
          expectedLabels: [label("type:feat", "d93f0b", "A new feature")],
        }).staleNames,
      ).toStrictEqual(["scope:conformance", "source:superpowers"]);
    });

    // Anything outside the three tracked prefixes belongs to somebody else.
    it("says nothing about a label outside the tracked prefixes", () => {
      expect(
        service.planReconciliation({
          currentLabels: [label("dependencies", "0e8a16", "Renovate")],
          expectedLabels: [],
        }),
      ).toStrictEqual({ creations: [], staleNames: [], updates: [] });
    });
  });
});
