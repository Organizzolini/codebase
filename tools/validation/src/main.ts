import "reflect-metadata";
import { CommandFactory } from "nest-commander";

import { LoggerService } from "@codebase/logging";

import { MainModule } from "./main.module";

/** Bootstraps the validation CLI application. */
async function main(): Promise<void> {
  const logger = new LoggerService();
  logger.setContext("CommandFactory");

  await CommandFactory.run(MainModule, {
    bufferLogs: true,
    logger,
    // nest-commander's default `serviceErrorHandler` only writes the error to
    // stderr, leaving the process to exit `0` on a thrown command error. Set
    // a non-zero exit code explicitly so CI and the pre-commit hook can fail.
    serviceErrorHandler: (error: Error) => {
      logger.error(error.message, error.stack);
      process.exitCode = 1;
    },
  });
}

void main();
