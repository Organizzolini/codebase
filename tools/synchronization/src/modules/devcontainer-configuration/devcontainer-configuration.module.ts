import { Module } from "@nestjs/common";

import { LoggerModule } from "@codebase/logging";

import { SynchronizationService } from "../synchronization/synchronization.service";

import { DevcontainerConfigurationCommand } from "./devcontainer-configuration.command";

/**
 * TODO: Document the devcontainerConfiguration module.
 */
@Module({
  controllers: [],
  exports: [DevcontainerConfigurationCommand],
  imports: [LoggerModule],
  providers: [DevcontainerConfigurationCommand, SynchronizationService],
})
export class DevcontainerConfigurationModule {}
