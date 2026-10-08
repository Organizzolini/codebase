import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logging";

import { mockProcessExit } from "../../../testing/mocks";

import { AuditGovernanceCommand } from "./audit-governance.command";
import { AuditGovernanceService } from "./audit-governance.service";

describe(AuditGovernanceCommand, () => {
  let command: AuditGovernanceCommand;
  let service: AuditGovernanceService;
  let logger: LoggerService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuditGovernanceCommand,
        {
          provide: AuditGovernanceService,
          useValue: createMock<AuditGovernanceService>(),
        },
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
      ],
    }).compile();

    command = await module.resolve(AuditGovernanceCommand);
    service = await module.resolve(AuditGovernanceService);
    logger = await module.resolve(LoggerService);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("is defined", () => {
    expect.hasAssertions();

    expect(command).toBeDefined();
  });

  it("sets logger context", async () => {
    expect.hasAssertions();

    const module = await Test.createTestingModule({
      providers: [
        AuditGovernanceCommand,
        {
          provide: AuditGovernanceService,
          useValue: createMock<AuditGovernanceService>(),
        },
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
      ],
    }).compile();

    const logger = await module.resolve(LoggerService);

    expect(logger.setContext).toHaveBeenCalledWith("AuditGovernanceCommand");
  });

  it("logs success and does not exit when governance is valid", async () => {
    expect.hasAssertions();

    const exitSpy = mockProcessExit();

    vi.mocked(service.checkGovernance).mockReturnValue({
      codeowners: {
        filePath: ".github/CODEOWNERS",
        ruleCount: 1,
        valid: true,
        violations: [],
      },
      valid: true,
      workflows: {
        valid: true,
        violations: [],
        workflowsAudited: 7,
      },
    });

    await command.run();

    expect(exitSpy).not.toHaveBeenCalled();
    expect(logger.log).toHaveBeenCalledWith(
      expect.stringContaining("Completed repository governance audit."),
    );
  });

  it("logs violations and exits with 1 when codeowners is invalid", async () => {
    expect.hasAssertions();

    const exitSpy = mockProcessExit();

    vi.mocked(service.checkGovernance).mockReturnValue({
      codeowners: {
        ruleCount: 0,
        valid: false,
        violations: [
          {
            line: 1,
            reason: "Invalid handle",
            rule: "* invalid",
          },
        ],
      },
      valid: false,
      workflows: {
        valid: true,
        violations: [],
        workflowsAudited: 7,
      },
    });

    await expect(command.run()).rejects.toThrow("process.exit:1");
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining("Discovered CODEOWNERS governance violations."),
    );
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("logs violations and exits with 1 when workflows have security issues", async () => {
    expect.hasAssertions();

    const exitSpy = mockProcessExit();

    vi.mocked(service.checkGovernance).mockReturnValue({
      codeowners: {
        filePath: ".github/CODEOWNERS",
        ruleCount: 1,
        valid: true,
        violations: [],
      },
      valid: false,
      workflows: {
        valid: false,
        violations: [
          {
            file: ".github/workflows/ci.yml",
            job: "build",
            reason: "Missing timeout",
          },
        ],
        workflowsAudited: 7,
      },
    });

    await expect(command.run()).rejects.toThrow("process.exit:1");
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining("Discovered workflow governance violations."),
    );
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("handles valid codeowners without explicit filePath and workflow violation without job", async () => {
    expect.hasAssertions();

    const exitSpy = mockProcessExit();

    vi.mocked(service.checkGovernance).mockReturnValue({
      codeowners: {
        ruleCount: 2,
        valid: true,
        violations: [],
      },
      valid: false,
      workflows: {
        valid: false,
        violations: [
          {
            file: ".github/workflows/ci.yml",
            reason: "Workflow file syntax error",
          },
        ],
        workflowsAudited: 1,
      },
    });

    await expect(command.run()).rejects.toThrow("process.exit:1");
    expect(logger.log).toHaveBeenCalledWith(
      expect.stringContaining("Verified CODEOWNERS file (valid) with 2 rules."),
    );
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
