#!/usr/bin/env node
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
import { withDefaultCommand } from "./main.utilities";

/**
 * Bootstraps the codometer CLI command application.
 *
 * Standard output belongs to the result: `codometer --format json` writes a
 * document meant to be piped into something that parses it, and `--format
 * markdown` one meant to be redirected into a file. Every diagnostic therefore
 * goes to standard error, chosen here — before anything logs — because the
 * pino instance is built on first use.
 */
async function main(): Promise<void> {
  LoggerService.logToStandardError();

  const logger = new LoggerService();
  logger.setContext("CommandFactory");

  process.argv = [
    ...process.argv.slice(0, 2),
    ...withDefaultCommand(process.argv.slice(2)),
  ];

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
