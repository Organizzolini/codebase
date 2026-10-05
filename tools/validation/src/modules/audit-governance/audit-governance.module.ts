import { Module } from "@nestjs/common";

import { LoggerModule } from "@codebase/logging";

import { AuditGovernanceCommand } from "./audit-governance.command";
import { AuditGovernanceService } from "./audit-governance.service";

/**
 * NestJS module providing repository governance validation.
 */
@Module({
  controllers: [],
  exports: [AuditGovernanceCommand, AuditGovernanceService],
  imports: [LoggerModule],
  providers: [AuditGovernanceCommand, AuditGovernanceService],
})
export class AuditGovernanceModule {}
