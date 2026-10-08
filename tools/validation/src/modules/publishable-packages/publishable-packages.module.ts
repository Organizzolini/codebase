import { Module } from "@nestjs/common";

import { LoggerModule } from "@codebase/logging";

import { PublishablePackagesChecksService } from "./publishable-packages-checks.service";
import { PublishablePackagesConsumerService } from "./publishable-packages-consumer.service";
import { PublishablePackagesProcessService } from "./publishable-packages-process.service";
import { PublishablePackagesCommand } from "./publishable-packages.command";
import { PublishablePackagesService } from "./publishable-packages.service";

/**
 * NestJS module for publishable packages tarball verification.
 */
@Module({
  controllers: [],
  exports: [PublishablePackagesCommand, PublishablePackagesService],
  imports: [LoggerModule],
  providers: [
    PublishablePackagesChecksService,
    PublishablePackagesCommand,
    PublishablePackagesConsumerService,
    PublishablePackagesProcessService,
    PublishablePackagesService,
  ],
})
export class PublishablePackagesModule {}
