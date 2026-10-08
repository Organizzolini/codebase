import { Module } from "@nestjs/common";

import { LoggerModule } from "@codebase/logging";

import { PublishablePackagesCommand } from "./publishable-packages.command";
import { PublishablePackagesService } from "./publishable-packages.service";

/**
 * NestJS module for publishable packages tarball verification.
 */
@Module({
  controllers: [],
  exports: [PublishablePackagesCommand, PublishablePackagesService],
  imports: [LoggerModule],
  providers: [PublishablePackagesCommand, PublishablePackagesService],
})
export class PublishablePackagesModule {}
