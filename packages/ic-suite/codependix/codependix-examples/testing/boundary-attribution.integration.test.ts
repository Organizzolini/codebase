import { describe, expect, it } from "vitest";

import * as attribution from "./render/boundary-attribution";
import * as bootFailures from "./render/boundary-boot-failures";
import { boundaryOutcomeReportService } from "./render/builders";

import type { BoundaryRun } from "./render/boundary-run";

/** The charged projects of a run's violations, finding by finding. */
function chargedProjects(run: BoundaryRun): (readonly string[])[] {
  return run.outcome.violations.map((violation) => violation.projects);
}

describe("boundary attribution examples", () => {
  describe("a cycle", () => {
    it("fails every project on a cross-project cycle", async () => {
      expect.hasAssertions();

      const run = await attribution.runCycleCheck({
        judged: ["shop-checkout", "shop-pricing", "shop-web"],
      });

      expect(chargedProjects(run)).toStrictEqual([
        ["shop-checkout", "shop-pricing"],
      ]);
      expect(run.outcome.violations[0]?.verdict).toBe("fail");
      expect(run.exitCode).toBe(1);
    });

    it("fails a project judged alone when it sits on the cycle", async () => {
      expect.hasAssertions();

      const run = await attribution.runCycleCheck({ judged: ["shop-pricing"] });

      expect(chargedProjects(run)).toStrictEqual([
        ["shop-checkout", "shop-pricing"],
      ]);
      expect(run.outcome.violations[0]?.verdict).toBe("fail");
    });

    it("charges a longer cycle to all of its projects and to nothing off it", async () => {
      expect.hasAssertions();

      const run = await attribution.runRingCheck({
        judged: ["shop-admin", "shop-ledger"],
      });

      expect(chargedProjects(run)).toStrictEqual([
        ["shop-invoices", "shop-ledger", "shop-payments"],
      ]);
      expect(run.exitCode).toBe(1);
    });
  });

  describe("the selection", () => {
    // The run context is the real one, so a glob selects exactly what
    // `--projects` would: this is what pins the guides to the command.
    it("judges what a --projects glob selects, and builds its closure", async () => {
      expect.hasAssertions();

      const run = await attribution.runCycleCheck({ judged: ["shop-p*"] });

      expect(run.judged).toStrictEqual(["shop-pricing"]);
      expect(run.builtProjects).toStrictEqual([
        "shop-checkout",
        "shop-pricing",
      ]);
      expect(chargedProjects(run)).toStrictEqual([
        ["shop-checkout", "shop-pricing"],
      ]);
      expect(run.exitCode).toBe(1);
    });
  });

  describe("a dependent", () => {
    it("is only noted when the cycle lives in its dependencies", async () => {
      expect.hasAssertions();

      const run = await attribution.runCycleCheck({ judged: ["shop-web"] });

      expect(run.builtProjects).toStrictEqual([
        "shop-checkout",
        "shop-pricing",
        "shop-web",
      ]);
      expect(run.outcome.violations).toHaveLength(1);
      expect(run.outcome.violations[0]?.verdict).toBe("note");
      expect(run.exitCode).toBe(0);
    });

    it("fails once a project on the cycle is judged as well", async () => {
      expect.hasAssertions();

      const run = await attribution.runCycleCheck({
        judged: ["shop-pricing", "shop-web"],
      });

      expect(run.outcome.violations[0]?.verdict).toBe("fail");
      expect(run.exitCode).toBe(1);
    });

    it("never builds the dependencies under --no-dependencies", async () => {
      expect.hasAssertions();

      const run = await attribution.runCycleCheck({
        dependencies: false,
        judged: ["shop-web"],
      });

      expect(run.builtProjects).toStrictEqual(["shop-web"]);
      expect(run.outcome.violations).toStrictEqual([]);
      expect(run.exitCode).toBe(0);
    });
  });

  describe("a forbidden edge", () => {
    it("is charged to the project that owns its source", async () => {
      expect.hasAssertions();

      const run = await attribution.runAccessCheck({
        judged: ["shop-web"],
        kind: "forbid",
      });

      expect(chargedProjects(run)).toStrictEqual([["shop-web"]]);
      expect(run.outcome.violations[0]?.verdict).toBe("fail");
    });

    it("is not charged to its target, which reports nothing", async () => {
      expect.hasAssertions();

      const run = await attribution.runAccessCheck({
        judged: ["shop-database"],
        kind: "forbid",
      });

      expect(run.outcome.violations).toStrictEqual([]);
      expect(run.exitCode).toBe(0);
    });

    it("is a note against the source for a project depending on it", async () => {
      expect.hasAssertions();

      const run = await attribution.runAccessCheck({
        judged: ["shop-e2e"],
        kind: "forbid",
      });

      expect(chargedProjects(run)).toStrictEqual([["shop-web"]]);
      expect(run.outcome.violations[0]?.verdict).toBe("note");
      expect(run.exitCode).toBe(0);
    });

    it("charges an edge no allow rule covers to its source", async () => {
      expect.hasAssertions();

      const run = await attribution.runAccessCheck({
        judged: ["shop-api"],
        kind: "allow",
      });

      expect(chargedProjects(run)).toStrictEqual([["shop-api"]]);
      expect(run.outcome.violations[0]?.rule).toBe("api-reaches-database-only");
    });
  });

  describe("a container that cannot boot", () => {
    it("fails its own project and names the owner of the failing class", async () => {
      expect.hasAssertions();

      const run = await bootFailures.runBootCheck({
        judged: ["storefront-api"],
      });
      const failure = run.outcome.failures.find((candidate) =>
        candidate.projects.includes("storefront-api"),
      );

      expect(failure?.verdict).toBe("fail");
      expect(failure?.ownerProject).toBe("storefront-catalog");
      expect(run.exitCode).toBe(1);
    });

    it("notes the dependency's own container failure without failing", async () => {
      expect.hasAssertions();

      const run = await bootFailures.runBootCheck({
        judged: ["storefront-api"],
      });
      const failure = run.outcome.failures.find((candidate) =>
        candidate.projects.includes("storefront-catalog"),
      );

      expect(failure?.verdict).toBe("note");
      expect(failure?.ownerProject).toBeUndefined();
    });

    it("names no owner when the failing code is the project's own", async () => {
      expect.hasAssertions();

      const run = await bootFailures.runBootCheck({
        judged: ["storefront-catalog"],
      });

      expect(run.outcome.failures).toHaveLength(1);
      expect(run.outcome.failures[0]?.verdict).toBe("fail");
      expect(run.outcome.failures[0]?.ownerProject).toBeUndefined();
    });
  });

  describe("the report", () => {
    it("words a note as living in a dependency and not failing", async () => {
      expect.hasAssertions();

      const run = await attribution.runCycleCheck({ judged: ["shop-web"] });

      expect(boundaryOutcomeReportService.renderMarkdown(run.report)).toContain(
        "in dependency shop-checkout, shop-pricing, not failing",
      );
    });
  });
});
