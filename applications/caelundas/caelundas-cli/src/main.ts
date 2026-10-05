import "reflect-metadata";
import { CommandFactory } from "nest-commander";

import { LoggerService } from "@codebase/logger";

import { MainModule } from "./main.module";

/** Bootstraps the NestJS CLI application via `nest-commander`, wiring up pino logging before the module initializes. */
async function main(): Promise<void> {
  const logger = new LoggerService();
  logger.setContext("CommandFactory");

  await CommandFactory.run(MainModule, { bufferLogs: true, logger });
}

void main();
