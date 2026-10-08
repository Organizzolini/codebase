import { createMock, type DeepMocked } from "@golevelup/ts-vitest";
import { Module } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import { CommandFactory, CommandRunnerService } from "nest-commander";
import { vi } from "vitest";

import { LoggerService } from "@codebase/logging";

import type { Provider, Type } from "@nestjs/common";

/**
 * Resolved command test module artifacts.
 */
export interface CommandTestHarness<CommandType> {
  command: CommandType;
  logger: DeepMocked<LoggerService>;
  testingModule: TestingModule;
}

/**
 * Options to build a command testing module.
 */
interface CreateCommandTestHarnessOptions<CommandType> {
  additionalProviders?: Provider[];
  commandType: Type<CommandType>;
}

/**
 * Options for resetting shared vitest state in command tests.
 */
interface ResetCommandTestHarnessOptions {
  unstubGlobals?: boolean;
  useRealTimers?: boolean;
}

/**
 * Options to run a command line through a real nest-commander runner.
 */
interface RunCommandLineOptions {
  argv: string[];
  providers: Provider[];
}

/**
 * Empty host module whose providers `runCommandLine` supplies per call.
 */
@Module({})
class CommandLineTestModule {}

/**
 * Creates a Nest testing module for command tests with a mocked logger.
 */
export async function createCommandTestHarness<CommandType>({
  additionalProviders = [],
  commandType,
}: CreateCommandTestHarnessOptions<CommandType>): Promise<
  CommandTestHarness<CommandType>
> {
  const testingModule = await Test.createTestingModule({
    providers: [
      commandType,
      {
        provide: LoggerService,
        useValue: createMock<LoggerService>(),
      },
      ...additionalProviders,
    ],
  }).compile();

  const command = await testingModule.resolve(commandType);
  const logger: DeepMocked<LoggerService> = testingModule.get(LoggerService);

  return {
    command,
    logger,
    testingModule,
  };
}

/**
 * Applies the common mock reset sequence used by command unit tests.
 */
export function resetCommandTestHarness({
  unstubGlobals = true,
  useRealTimers = false,
}: ResetCommandTestHarnessOptions = {}): void {
  vi.restoreAllMocks();
  vi.clearAllMocks();

  if (unstubGlobals) {
    vi.unstubAllGlobals();
  }

  if (useRealTimers) {
    vi.useRealTimers();
  }
}

/**
 * Runs `argv` (e.g. `["dictionary", "--startLemma=amo"]`) through a real
 * nest-commander runner whose container holds only `providers`, so option
 * flags are parsed exactly as the CLI parses them before `run` receives them.
 *
 * @throws Whatever the command's option parsers or `run` threw.
 */
export async function runCommandLine({
  argv,
  providers,
}: RunCommandLineOptions): Promise<void> {
  const failures: Error[] = [];
  const application = await CommandFactory.createWithoutRunning(
    { module: CommandLineTestModule, providers },
    {
      logger: false,
      serviceErrorHandler: (error) => {
        failures.push(error);
      },
    },
  );

  try {
    await application.get(CommandRunnerService).run(["node", "main", ...argv]);
  } finally {
    await application.close();
  }

  const [failure] = failures;
  if (failure) throw failure;
}
