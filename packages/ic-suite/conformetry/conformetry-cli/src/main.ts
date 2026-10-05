#!/usr/bin/env node
// The bin name is deliberately the bare word rather than the package name:
// `node_modules/.bin/conformetry` and `node_modules/conformetry` are different
// places, so this CLI and the emitted Nx generator collection can both be
// addressed as `conformetry` without contending for the same path.
//
// The shebang is what makes the emitted `src/main.js` usable as this package's
// `bin`. TypeScript copies it through to the output verbatim, so the built
// entry runs under a bare `node` with no loader registered — the decorator
// metadata NestJS constructor injection reads is already in that output,
// because `configuration/tsconfig.json` sets `emitDecoratorMetadata`. The
// executable bit is deliberately not managed here: npm and pnpm both set it on
// a `bin` target at install time, even when the file ships mode 644.
import "reflect-metadata";
import { CommandFactory } from "nest-commander";

import { LoggerService } from "@codebase/logging";

import { MainModule } from "./main.module";

/**
 * Bootstraps the NestJS command application.
 */
async function main(): Promise<void> {
  const logger = new LoggerService();
  logger.setContext("CommandFactory");

  await CommandFactory.run(MainModule, {
    bufferLogs: true,
    errorHandler: (error) => {
      process.exitCode = 1;
      logger.error(error);
    },
    logger,
    serviceErrorHandler: (error) => {
      process.exitCode = 1;
      logger.error(error);
    },
  });
}

void main();
