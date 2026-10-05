import { Injectable } from "@nestjs/common";
import { Command, CommandRunner } from "nest-commander";

import { LoggerService } from "@codebase/logging";

import { AuditGovernanceService } from "./audit-governance.service";

import type {
  CodeownersVerdict,
  WorkflowVerdict,
} from "./audit-governance.types";

/**
 * CLI command that audits repository governance including CODEOWNERS and workflow security.
 */
@Command({
  description:
    "Check repository governance including CODEOWNERS and workflow security",
  name: "audit-governance",
})
@Injectable()
export class AuditGovernanceCommand extends CommandRunner {
  // 🏗 Dependency Injection

  constructor(
    private readonly auditGovernanceService: AuditGovernanceService,
    private readonly logger: LoggerService,
  ) {
    super();
    this.logger.setContext(AuditGovernanceCommand.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Reports findings from CODEOWNERS audit. */
  private reportCodeownersVerdict(verdict: CodeownersVerdict): void {
    if (verdict.valid) {
      this.logger.log(
        `✅ Verified CODEOWNERS file (${verdict.filePath ?? "valid"}) with ${String(verdict.ruleCount)} rules.`,
      );
      return;
    }

    this.logger.error("❌ Discovered CODEOWNERS governance violations.");
    for (const violation of verdict.violations) {
      console.error(
        `   - Line ${String(violation.line)}: ${violation.reason} (rule: "${violation.rule}")`,
      );
    }
  }

  /** Reports findings from GitHub Actions workflow audit. */
  private reportWorkflowsVerdict(verdict: WorkflowVerdict): void {
    if (verdict.valid) {
      this.logger.log(
        `✅ Verified ${String(verdict.workflowsAudited)} GitHub Actions workflows complying with security policies.`,
      );
      return;
    }

    this.logger.error("❌ Discovered workflow governance violations.");
    for (const violation of verdict.violations) {
      const target = violation.job
        ? `${violation.file} (job: ${violation.job})`
        : violation.file;
      console.error(`   - ${target}: ${violation.reason}`);
    }
  }

  // 🌎 Public Methods

  /** Runs repository governance checks and reports findings. */
  public async run(): Promise<void> {
    // Base class method signature requires returning a Promise.
    await Promise.resolve();

    this.logger.log("👮 Auditing repository governance.");

    const verdict = this.auditGovernanceService.checkGovernance();

    this.reportCodeownersVerdict(verdict.codeowners);
    this.reportWorkflowsVerdict(verdict.workflows);

    if (!verdict.valid) {
      this.logger.error("❌ Failed repository governance audit.");
      process.exit(1);
    }

    this.logger.log("✨ Completed repository governance audit.");
  }
}
