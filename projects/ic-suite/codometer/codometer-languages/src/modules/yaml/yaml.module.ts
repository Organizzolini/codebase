import { Module } from "@nestjs/common";

import { LoggerModule } from "@codebase/logging";

import { YamlService } from "./yaml.service";

/**
 * NestJS module that provides YAML document analysis.
 */
@Module({
  controllers: [],
  exports: [YamlService],
  imports: [LoggerModule],
  providers: [YamlService],
})
export class YamlModule {}
