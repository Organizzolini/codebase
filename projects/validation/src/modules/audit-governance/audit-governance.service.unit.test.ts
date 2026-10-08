import { existsSync, readdirSync, readFileSync } from "node:fs";

import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { AuditGovernanceService } from "./audit-governance.service";

vi.mock("node:fs", () => ({
  existsSync: vi.fn<(target: string) => boolean>(),
  readdirSync: vi.fn<(target: string) => string[]>(),
  readFileSync: vi.fn<(target: string, encoding?: string) => string>(),
}));

describe(AuditGovernanceService, () => {
  let service: AuditGovernanceService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [AuditGovernanceService],
    }).compile();

    service = await module.resolve(AuditGovernanceService);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("is defined", () => {
    expect.hasAssertions();

    expect(service).toBeDefined();
  });

  describe("checkCodeowners", () => {
    it("returns violation when CODEOWNERS file does not exist", () => {
      expect.hasAssertions();

      vi.mocked(existsSync).mockReturnValue(false);

      const verdict = service.checkCodeowners("/mock/workspace");

      expect(verdict.valid).toBe(false);
      expect(verdict.ruleCount).toBe(0);
      expect(verdict.violations).toHaveLength(1);
      expect(verdict.violations[0]?.reason).toContain(
        "CODEOWNERS file not found",
      );
    });

    it("returns violation when CODEOWNERS contains no active rules", () => {
      expect.hasAssertions();

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(
        "# Only comments\n\n   \n# Another comment",
      );

      const verdict = service.checkCodeowners("/mock/workspace");

      expect(verdict.valid).toBe(false);
      expect(verdict.ruleCount).toBe(0);
      expect(verdict.violations).toHaveLength(1);
      expect(verdict.violations[0]?.reason).toContain("no active rules");
    });

    it("returns violation when rule has no owner specified", () => {
      expect.hasAssertions();

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue("*");

      const verdict = service.checkCodeowners("/mock/workspace");

      expect(verdict.valid).toBe(false);
      expect(verdict.violations).toHaveLength(1);
      expect(verdict.violations[0]?.reason).toContain("no owners specified");
    });

    it("returns violation when owner handle is invalid", () => {
      expect.hasAssertions();

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue("* invalid-handle-without-at");

      const verdict = service.checkCodeowners("/mock/workspace");

      expect(verdict.valid).toBe(false);
      expect(verdict.violations).toHaveLength(1);
      expect(verdict.violations[0]?.reason).toContain("Invalid owner handle");
    });

    it("accepts valid @user, @org/team, and email owners", () => {
      expect.hasAssertions();

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(
        "*\t@JimmyPaolini\n/docs/\t@org/docs-team user@example.com\n",
      );

      const verdict = service.checkCodeowners("/mock/workspace");

      expect(verdict.valid).toBe(true);
      expect(verdict.ruleCount).toBe(2);
      expect(verdict.violations).toHaveLength(0);
    });
  });

  describe("checkWorkflows", () => {
    it("returns violation when workflows directory does not exist", () => {
      expect.hasAssertions();

      vi.mocked(existsSync).mockReturnValue(false);

      const verdict = service.checkWorkflows("/mock/workspace");

      expect(verdict.valid).toBe(false);
      expect(verdict.workflowsAudited).toBe(0);
      expect(verdict.violations[0]?.reason).toContain(
        "Workflows directory not found",
      );
    });

    it("returns violation when workflow is missing a top-level name", () => {
      expect.hasAssertions();

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readdirSync as (target: string) => string[]).mockReturnValue([
        "ci.yml",
      ]);
      vi.mocked(readFileSync).mockReturnValue(`
permissions:
  contents: read
jobs:
  build:
    timeout-minutes: 10
`);

      const verdict = service.checkWorkflows("/mock/workspace");

      expect(verdict.valid).toBe(false);
      expect(
        verdict.violations.some((violation) =>
          violation.reason.includes("missing a top-level 'name:'"),
        ),
      ).toBe(true);
    });

    it("returns valid verdict when workflow file has no jobs section", () => {
      expect.hasAssertions();

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readdirSync as (target: string) => string[]).mockReturnValue([
        "empty.yml",
      ]);
      vi.mocked(readFileSync).mockReturnValue("name: Empty Workflow\n");

      const verdict = service.checkWorkflows("/mock/workspace");

      expect(verdict.valid).toBe(true);
      expect(verdict.violations).toStrictEqual([]);
    });

    it("returns violation when workflow has neither top-level nor job-level permissions", () => {
      expect.hasAssertions();

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readdirSync as (target: string) => string[]).mockReturnValue([
        "ci.yml",
      ]);
      vi.mocked(readFileSync).mockReturnValue(`
name: CI
jobs:
  build:
    timeout-minutes: 10
`);

      const verdict = service.checkWorkflows("/mock/workspace");

      expect(verdict.valid).toBe(false);
      expect(
        verdict.violations.some((violation) =>
          violation.reason.includes("lacks explicit 'permissions:'"),
        ),
      ).toBe(true);
    });

    it("returns violation when job lacks timeout-minutes", () => {
      expect.hasAssertions();

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readdirSync as (target: string) => string[]).mockReturnValue([
        "ci.yml",
      ]);
      vi.mocked(readFileSync).mockReturnValue(`
name: CI
permissions:
  contents: read
jobs:
  build:
    runs-on: ubuntu-latest
`);

      const verdict = service.checkWorkflows("/mock/workspace");

      expect(verdict.valid).toBe(false);
      expect(
        verdict.violations.some((violation) =>
          violation.reason.includes("lacks explicit 'timeout-minutes:'"),
        ),
      ).toBe(true);
    });

    it("returns violation when job timeout exceeds maximum permitted limit", () => {
      expect.hasAssertions();

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readdirSync as (target: string) => string[]).mockReturnValue([
        "ci.yml",
      ]);
      vi.mocked(readFileSync).mockReturnValue(`
name: CI
permissions:
  contents: read
jobs:
  long-build:
    timeout-minutes: 400
`);

      const verdict = service.checkWorkflows("/mock/workspace");

      expect(verdict.valid).toBe(false);
      expect(
        verdict.violations.some((violation) =>
          violation.reason.includes("exceeds maximum permitted"),
        ),
      ).toBe(true);
    });

    it("accepts valid workflow with matrix timeout expression and job permissions", () => {
      expect.hasAssertions();

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readdirSync as (target: string) => string[]).mockReturnValue([
        "compliance.yml",
      ]);
      vi.mocked(readFileSync).mockReturnValue(`
name: Compliance
jobs:
  audit:
    permissions:
      contents: read
    timeout-minutes: \${{ matrix.target.timeout }}
`);

      const verdict = service.checkWorkflows("/mock/workspace");

      expect(verdict.valid).toBe(true);
      expect(verdict.violations).toHaveLength(0);
    });

    it("accepts valid workflow with multiple jobs", () => {
      expect.hasAssertions();

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readdirSync as (target: string) => string[]).mockReturnValue([
        "ci.yml",
      ]);
      vi.mocked(readFileSync).mockReturnValue(`
name: Multi Job CI
permissions:
  contents: read
jobs:
  build:
    permissions:
      contents: read
    timeout-minutes: 10
  test:
    permissions:
      contents: read
    timeout-minutes: 15
`);

      const verdict = service.checkWorkflows("/mock/workspace");

      expect(verdict.valid).toBe(true);
      expect(verdict.violations).toHaveLength(0);
    });

    it("handles non-job lines before the first job declaration in jobs section", () => {
      expect.hasAssertions();

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readdirSync as (target: string) => string[]).mockReturnValue([
        "compliance.yml",
      ]);
      vi.mocked(readFileSync).mockReturnValue(`
name: Compliance
permissions:
  contents: read
jobs:
  # comment before first job
  audit:
    timeout-minutes: 10
`);

      const verdict = service.checkWorkflows("/mock/workspace");

      expect(verdict.valid).toBe(true);
      expect(verdict.violations).toHaveLength(0);
    });
  });

  describe("checkGovernance", () => {
    it("returns aggregated verdict correctly", () => {
      expect.hasAssertions();

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readdirSync as (target: string) => string[]).mockReturnValue([
        "ci.yml",
      ]);
      vi.mocked(readFileSync).mockImplementation((targetPath) => {
        if (String(targetPath).includes("CODEOWNERS")) {
          return "* @JimmyPaolini";
        }
        return `
name: CI
permissions:
  contents: read
jobs:
  build:
    timeout-minutes: 10
`;
      });

      const verdict = service.checkGovernance("/mock/workspace");

      expect(verdict.valid).toBe(true);
      expect(verdict.codeowners.valid).toBe(true);
      expect(verdict.workflows.valid).toBe(true);
    });
  });
});
