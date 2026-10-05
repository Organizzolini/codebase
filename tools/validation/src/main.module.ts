import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { DiscoveryModule } from "@nestjs/core";

import { LoggerModule } from "@codebase/logging";

import { environmentSchema } from "./constants";
import { AuditGovernanceModule } from "./modules/audit-governance/audit-governance.module";
import { CatalogManifestsModule } from "./modules/catalog-manifests/catalog-manifests.module";
import { IssueMetadataModule } from "./modules/issue-metadata/issue-metadata.module";
import { LockfileModule } from "./modules/lockfile/lockfile.module";
import { PublishablePackagesModule } from "./modules/publishable-packages/publishable-packages.module";
import { PullRequestBodyModule } from "./modules/pull-request-body/pull-request-body.module";
import { PullRequestMetadataModule } from "./modules/pull-request-metadata/pull-request-metadata.module";
import { PullRequestReleaseSignificanceModule } from "./modules/pull-request-release-significance/pull-request-release-significance.module";
import { ReadmeProjectsModule } from "./modules/readme-projects/readme-projects.module";

/**
 * Root NestJS application module.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: ".env",
      isGlobal: true,
      validate: (config: Record<string, unknown>) =>
        environmentSchema.parse(config),
    }),
    AuditGovernanceModule,
    CatalogManifestsModule,
    DiscoveryModule,
    IssueMetadataModule,
    LockfileModule,
    LoggerModule,
    PullRequestBodyModule,
    PullRequestMetadataModule,
    PullRequestReleaseSignificanceModule,
    PublishablePackagesModule,
    ReadmeProjectsModule,
  ],
})
export class MainModule {}
