// 🏷️ Types

/** Aggregated repository governance audit verdict. */
export interface AuditGovernanceVerdict {
  readonly codeowners: CodeownersVerdict;
  readonly valid: boolean;
  readonly workflows: WorkflowVerdict;
}

/** Outcome of auditing CODEOWNERS configuration. */
export interface CodeownersVerdict {
  readonly filePath?: string;
  readonly ruleCount: number;
  readonly valid: boolean;
  readonly violations: readonly CodeownersViolation[];
}

/** Violation in a CODEOWNERS rule or file. */
export interface CodeownersViolation {
  readonly line: number;
  readonly reason: string;
  readonly rule: string;
}

/** Intermediate job declaration collected from workflow YAML. */
export interface WorkflowJobDeclaration {
  hasPermissions: boolean;
  hasTimeout: boolean;
  name: string;
  timeoutValue?: number | string | undefined;
}

/** Outcome of auditing GitHub Actions workflow governance. */
export interface WorkflowVerdict {
  readonly valid: boolean;
  readonly violations: readonly WorkflowViolation[];
  readonly workflowsAudited: number;
}

/** Violation in a GitHub Actions workflow security configuration. */
export interface WorkflowViolation {
  readonly file: string;
  readonly job?: string;
  readonly reason: string;
}
