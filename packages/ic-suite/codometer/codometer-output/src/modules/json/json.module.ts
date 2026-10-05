import { Module } from "@nestjs/common";

import { LoggerModule } from "@codebase/logging";

import { JsonService } from "./json.service";

/**
 * NestJS module that provides JSON statistics report writing.
 */
@Module({
  controllers: [],
  exports: [JsonService],
  imports: [LoggerModule],
  providers: [JsonService],
})
export class JsonModule {}
