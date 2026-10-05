import { Module } from "@nestjs/common";

import { LoggerModule } from "@codebase/logging";

import { SynchronizationService } from "../synchronization/synchronization.service";

import { PackageManifestsCommand } from "./package-manifests.command";
import { PackageManifestsService } from "./package-manifests.service";

/** Provides the package-manifests synchronization command. */
@Module({
  controllers: [],
  exports: [PackageManifestsCommand, PackageManifestsService],
  imports: [LoggerModule],
  providers: [
    PackageManifestsCommand,
    PackageManifestsService,
    SynchronizationService,
  ],
})
export class PackageManifestsModule {}
