import "reflect-metadata";
import { CommandFactory } from "nest-commander";

import { LoggerService } from "@codebase/logging";

import { MainModule } from "./main.module";

/** Bootstraps the NestJS CLI application via `nest-commander`, wiring up pino logging before the module initializes. */
async function main(): Promise<void> {
  const logger = new LoggerService();
  logger.setContext("CommandFactory");

  await CommandFactory.run(MainModule, {
    bufferLogs: true,
    logger,
    // nest-commander's default `serviceErrorHandler` only writes the error to
    // stderr, leaving the process to exit `0` on a thrown command error. Set
    // a non-zero exit code explicitly so a failed run cannot pass as a success.
    serviceErrorHandler: (error: Error) => {
      logger.error(error.message, error.stack);
      process.exitCode = 1;
    },
  });
}

void main();
