import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { Injectable } from "@nestjs/common";

import {
  CODEOWNERS_FILE_PATHS,
  CODEOWNERS_HANDLE_PATTERN,
  MAX_WORKFLOW_TIMEOUT_MINUTES,
  WORKFLOWS_DIRECTORY,
} from "./audit-governance.constants";

import type {
  AuditGovernanceVerdict,
  CodeownersVerdict,
  CodeownersViolation,
  WorkflowJobDeclaration,
  WorkflowVerdict,
  WorkflowViolation,
} from "./audit-governance.types";

/**
 * Service for auditing repository governance including CODEOWNERS and workflow security.
 */
@Injectable()
export class AuditGovernanceService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Updates current job declaration based on a workflow line. */
  private applyJobLine(job: WorkflowJobDeclaration, rawLine: string): void {
    if (/^ {4}permissions:/u.test(rawLine)) {
      job.hasPermissions = true;
    }

    const timeoutMatch = /^ {4}timeout-minutes:\s*(\d+|\$\{\{[^}]+\}\})/u.exec(
      rawLine,
    );
    if (timeoutMatch) {
      job.hasTimeout = true;
      const rawTimeout = timeoutMatch[1];
      job.timeoutValue =
        rawTimeout && /^\d+$/u.test(rawTimeout)
          ? Number.parseInt(rawTimeout, 10)
          : rawTimeout;
    }
  }

  /** Inspects workflow content lines for name, top-level permissions, and job timeouts. */
  private auditWorkflowContent(
    file: string,
    content: string,
    violations: WorkflowViolation[],
  ): void {
    const lines = content.split("\n");
    const hasTopLevelName = lines.some((line) => /^name:\s*\S+/u.test(line));
    const hasTopLevelPermissions = lines.some((line) =>
      line.startsWith("permissions:"),
    );

    if (!hasTopLevelName) {
      violations.push({
        file,
        reason: "Workflow is missing a top-level 'name:' declaration",
      });
    }

    this.collectWorkflowJobViolations({
      file,
      hasTopLevelPermissions,
      lines,
      violations,
    });
  }

  /** Scans workflow lines inside jobs section and verifies declarations. */
  private collectWorkflowJobViolations(options: {
    file: string;
    hasTopLevelPermissions: boolean;
    lines: string[];
    violations: WorkflowViolation[];
  }): void {
    const jobBlocks = this.extractJobBlocks(options.lines);

    for (const jobBlock of jobBlocks) {
      this.evaluateJob({
        file: options.file,
        hasJobPermissions: jobBlock.hasPermissions,
        hasTimeout: jobBlock.hasTimeout,
        hasTopLevelPermissions: options.hasTopLevelPermissions,
        jobName: jobBlock.name,
        timeoutValue: jobBlock.timeoutValue,
        violations: options.violations,
      });
    }
  }

  /** Validates an individual job's permissions and timeout declarations. */
  private evaluateJob(options: {
    file: string;
    hasJobPermissions: boolean;
    hasTimeout: boolean;
    hasTopLevelPermissions: boolean;
    jobName: string;
    timeoutValue: number | string | undefined;
    violations: WorkflowViolation[];
  }): void {
    if (!options.hasTopLevelPermissions && !options.hasJobPermissions) {
      options.violations.push({
        file: options.file,
        job: options.jobName,
        reason: `Job '${options.jobName}' lacks explicit 'permissions:' declaration (no top-level permissions defined)`,
      });
    }

    if (!options.hasTimeout) {
      options.violations.push({
        file: options.file,
        job: options.jobName,
        reason: `Job '${options.jobName}' lacks explicit 'timeout-minutes:' declaration`,
      });
    } else if (
      typeof options.timeoutValue === "number" &&
      options.timeoutValue > MAX_WORKFLOW_TIMEOUT_MINUTES
    ) {
      options.violations.push({
        file: options.file,
        job: options.jobName,
        reason: `Job '${options.jobName}' timeout (${String(options.timeoutValue)}m) exceeds maximum permitted (${String(MAX_WORKFLOW_TIMEOUT_MINUTES)}m)`,
      });
    }
  }

  /** Extracts job declaration blocks from workflow lines. */
  private extractJobBlocks(lines: string[]): WorkflowJobDeclaration[] {
    const jobBlocks: WorkflowJobDeclaration[] = [];
    const jobsLines = this.sliceJobsSection(lines);
    let currentJob: undefined | WorkflowJobDeclaration;

    for (const rawLine of jobsLines) {
      const jobName = /^ {2}([a-zA-Z0-9_-]+):\s*$/u.exec(rawLine)?.[1];

      if (jobName) {
        if (currentJob) {
          jobBlocks.push(currentJob);
        }
        currentJob = {
          hasPermissions: false,
          hasTimeout: false,
          name: jobName,
        };
      } else if (currentJob) {
        this.applyJobLine(currentJob, rawLine);
      }
    }

    if (currentJob) {
      jobBlocks.push(currentJob);
    }

    return jobBlocks;
  }

  /** Parses CODEOWNERS lines and returns collected rules and violations. */
  private parseCodeownersLines(lines: string[]): {
    ruleCount: number;
    violations: CodeownersViolation[];
  } {
    const violations: CodeownersViolation[] = [];
    let ruleCount = 0;

    for (const [index, rawLine] of lines.entries()) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) {
        continue;
      }

      ruleCount += 1;
      violations.push(...this.parseCodeownersRule(line, index + 1));
    }

    return { ruleCount, violations };
  }

  /** Parses a single active CODEOWNERS line. */
  private parseCodeownersRule(
    line: string,
    lineNumber: number,
  ): CodeownersViolation[] {
    const parts = line.split(/\s+/u);
    const pattern = parts[0];
    const owners = parts.slice(1);

    if (!pattern || owners.length === 0) {
      return [
        {
          line: lineNumber,
          reason: "Rule pattern has no owners specified",
          rule: line,
        },
      ];
    }

    return owners
      .filter((owner) => !CODEOWNERS_HANDLE_PATTERN.test(owner))
      .map((owner) => ({
        line: lineNumber,
        reason: `Invalid owner handle: "${owner}" (must be @user, @org/team, or email)`,
        rule: line,
      }));
  }

  /** Slices lines starting after the 'jobs:' section header. */
  private sliceJobsSection(lines: string[]): string[] {
    const jobsIndex = lines.findIndex((line) => line.startsWith("jobs:"));

    return jobsIndex === -1 ? [] : lines.slice(jobsIndex + 1);
  }

  // 🌎 Public Methods

  /** Audits CODEOWNERS file presence, rules, and owner handles. */
  public checkCodeowners(
    workspaceRoot: string = process.cwd(),
  ): CodeownersVerdict {
    const filePath = CODEOWNERS_FILE_PATHS.find((relPath) =>
      existsSync(path.join(workspaceRoot, relPath)),
    );

    if (!filePath) {
      return {
        ruleCount: 0,
        valid: false,
        violations: [
          {
            line: 0,
            reason:
              "CODEOWNERS file not found in repository (.github/CODEOWNERS, CODEOWNERS, or docs/CODEOWNERS)",
            rule: "",
          },
        ],
      };
    }

    const content = readFileSync(path.join(workspaceRoot, filePath), "utf8");
    const parsed = this.parseCodeownersLines(content.split("\n"));

    if (parsed.ruleCount === 0) {
      parsed.violations.push({
        line: 0,
        reason: "CODEOWNERS file contains no active rules",
        rule: "",
      });
    }

    return {
      filePath,
      ruleCount: parsed.ruleCount,
      valid: parsed.violations.length === 0,
      violations: parsed.violations,
    };
  }

  /** Runs the complete repository governance audit. */
  public checkGovernance(
    workspaceRoot: string = process.cwd(),
  ): AuditGovernanceVerdict {
    const codeowners = this.checkCodeowners(workspaceRoot);
    const workflows = this.checkWorkflows(workspaceRoot);

    return {
      codeowners,
      valid: codeowners.valid && workflows.valid,
      workflows,
    };
  }

  /** Audits GitHub Actions workflow files for explicit permissions, timeouts, and naming. */
  public checkWorkflows(
    workspaceRoot: string = process.cwd(),
  ): WorkflowVerdict {
    const workflowsDirectory = path.join(workspaceRoot, WORKFLOWS_DIRECTORY);

    if (!existsSync(workflowsDirectory)) {
      return {
        valid: false,
        violations: [
          {
            file: WORKFLOWS_DIRECTORY,
            reason: `Workflows directory not found at ${WORKFLOWS_DIRECTORY}`,
          },
        ],
        workflowsAudited: 0,
      };
    }

    const files = readdirSync(workflowsDirectory).filter(
      (file) => file.endsWith(".yml") || file.endsWith(".yaml"),
    );

    const violations: WorkflowViolation[] = [];

    for (const file of files) {
      const filePath = path.join(workflowsDirectory, file);
      const content = readFileSync(filePath, "utf8");
      const relativeFile = `${WORKFLOWS_DIRECTORY}/${file}`;

      this.auditWorkflowContent(relativeFile, content, violations);
    }

    return {
      valid: violations.length === 0,
      violations,
      workflowsAudited: files.length,
    };
  }
}
