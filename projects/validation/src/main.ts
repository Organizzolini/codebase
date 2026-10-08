import "reflect-metadata";
import { CommandFactory } from "nest-commander";

import { LoggerService } from "@codebase/logging";

import { MainModule } from "./main.module";

/** Bootstraps the validation CLI application. */
async function main(): Promise<void> {
  const logger = new LoggerService();
  logger.setContext("CommandFactory");

  await CommandFactory.run(MainModule, { bufferLogs: true, logger });
}

void main();
