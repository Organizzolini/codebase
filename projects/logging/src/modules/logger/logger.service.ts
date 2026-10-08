import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";

import { ConsoleLogger, Injectable, Scope } from "@nestjs/common";
import pino from "pino";

import {
  FIRST_WORD_PATTERN,
  IRREGULAR_PAST_VERBS,
  LEADING_EMOJI_PATTERN,
  STANDARD_ERROR_DESCRIPTOR,
  STANDARD_OUTPUT_DESCRIPTOR,
  UNVALIDATED_LOG_CONTEXTS,
} from "./logger.constants";

import type { LogData, ParsedLogMessage } from "./logger.types";

/**
 * Transient-scoped logger so each injecting class gets its own instance.
 * Each consumer calls `setContext(ClassName.name)` to tag every log line
 * with the originating class. Backed by pino for structured JSON output in
 * production and human-readable pretty-print in development.
 *
 * Messages follow one grammar: an emoji naming the subject, a verb in present
 * progressive or past tense, then the object. Values that vary per call —
 * counts, percentages, durations — go in the `data` argument rather than the
 * message, so the message stays constant enough for telemetry to group on.
 *
 * ```ts
 * this.logger.info("📥 Downloading CSEL sources", undefined, { total: 428 });
 * this.logger.info("📥 Downloaded CSEL sources", undefined, { count: 412 });
 * ```
 */
@Injectable({ scope: Scope.TRANSIENT })
export class LoggerService extends ConsoleLogger {
  // 🏗 Dependency Injection

  constructor() {
    super();
  }

  // 🔐 Private Fields

  private static readonly isProduction =
    process.env["NODE_ENV"] === "production";

  /**
   * Built on first use, not when this file is evaluated.
   *
   * A destination fixed at import time could only ever be chosen by this
   * package, since every consumer's own code runs after its imports.
   */
  private static rootLogger: pino.Logger | undefined;

  /** Whether lines go to standard error instead of standard output. */
  private static writesToStandardError = false;

  private child: pino.Logger = LoggerService.root;

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Build the pino instance for production or local development output. */
  private static createRootLogger(): pino.Logger {
    const level = process.env["LOG_LEVEL"] ?? "info";

    if (LoggerService.isProduction) {
      return LoggerService.writesToStandardError
        ? pino({ level }, pino.destination(STANDARD_ERROR_DESCRIPTOR))
        : pino({ level });
    }

    return pino({
      level,
      transport: {
        options: {
          colorize: true,
          destination: LoggerService.writesToStandardError
            ? STANDARD_ERROR_DESCRIPTOR
            : STANDARD_OUTPUT_DESCRIPTOR,
          // The emoji is a field, not part of the message, so the console can
          // show it while telemetry stores unadorned prose. `ignore` then keeps
          // it from being printed a second time in the trailing object.
          ignore: "pid,hostname,emoji",
          messageFormat: "{emoji} {msg}",
          singleLine: true,
        },
        target: "pino-pretty",
      },
    });
  }

  /**
   * Sends every subsequent line to standard error instead of standard output.
   *
   * For a command-line application whose standard output *is* its result. A log
   * line sharing that stream is not a diagnostic beside the data, it is a
   * corruption of it. Call it before anything logs — the first statement of the
   * application's bootstrap.
   *
   * A call after the first line warns and changes nothing: the destination is
   * fixed when the pino instance is built, and tearing down a transport
   * somebody is writing through would be worse than refusing. The warning is
   * the point — silently leaving the lines on standard output is how a caller
   * would ship a corrupted pipe without ever being told.
   */
  static logToStandardError(): void {
    if (LoggerService.rootLogger !== undefined) {
      process.emitWarning(
        "LoggerService.logToStandardError() was called after the first log line, so log lines still go to standard output and anything piping that stream will read them as data. Call it as the first statement of the application's bootstrap.",
      );
      return;
    }

    LoggerService.writesToStandardError = true;
  }

  /**
   * Fails a malformed message in development, and never in production.
   *
   * A logger that throws in production turns an observability call into an
   * outage, so the check runs only where a developer is present to fix it.
   */
  private assertConventionalMessage(args: {
    context: string | undefined;
    parsed: ParsedLogMessage;
  }): void {
    if (
      LoggerService.isProduction ||
      this.shouldSkipConventionalMessageValidation(args.context)
    ) {
      return;
    }

    const violation = this.getConventionalMessageViolation(args.parsed);

    if (violation !== undefined) {
      throw new Error(violation);
    }
  }

  /** Assembles the object pino merges into the line. */
  private buildBindings(args: {
    context: string | undefined;
    data: LogData | undefined;
    parsed: ParsedLogMessage;
  }): Record<string, unknown> {
    this.assertConventionalMessage({
      context: args.context,
      parsed: args.parsed,
    });

    return {
      ...args.data,
      context: args.context,
      // Telemetry gets prose; only the console-bound transport reads this.
      ...(LoggerService.isProduction ? {} : { emoji: args.parsed.emoji }),
    };
  }

  /** Returns a human-readable explanation when the message format is invalid. */
  private getConventionalMessageViolation(
    parsed: ParsedLogMessage,
  ): string | undefined {
    const emoji = parsed.emoji;
    const text = parsed.text;

    if (emoji === undefined) {
      return `Log message must start with an emoji naming its subject, then a verb: "${text}"`;
    }

    const firstWord = FIRST_WORD_PATTERN.exec(text)?.[1];

    if (firstWord === undefined || !this.isConventionalVerb(firstWord)) {
      return `Log message must begin with a verb in present progressive or past tense, got "${firstWord ?? ""}": "${emoji} ${text}"`;
    }

    return undefined;
  }

  /**
   * Whether a word is a verb in one of the two tenses the convention allows.
   *
   * Present progressive means the operation is under way; past means it
   * finished. Regular morphology covers both, so a new verb needs no
   * registration anywhere — only irregular pasts are enumerated.
   */
  private isConventionalVerb(word: string): boolean {
    const lowercased = word.toLowerCase();

    return (
      lowercased.endsWith("ing") ||
      lowercased.endsWith("ed") ||
      IRREGULAR_PAST_VERBS.has(lowercased)
    );
  }

  /** Splits a leading emoji off a message, leaving prose behind. */
  private parseMessage(message: unknown): ParsedLogMessage {
    const text = String(message);
    const match = LEADING_EMOJI_PATTERN.exec(text);
    const emoji = match?.[1];

    return emoji === undefined
      ? { emoji: undefined, text }
      : { emoji, text: text.slice(match?.[0].length) };
  }

  /** Whether a context is intentionally exempt from the validation rule. */
  private shouldSkipConventionalMessageValidation(
    context: string | undefined,
  ): boolean {
    return context !== undefined && UNVALIDATED_LOG_CONTEXTS.has(context);
  }

  // 🌎 Public Methods

  /** The pino instance every logger's child is taken from. */
  private static get root(): pino.Logger {
    LoggerService.rootLogger ??= LoggerService.createRootLogger();

    return LoggerService.rootLogger;
  }

  /** Normalizes unknown errors into a stable message and timestamped log line. */
  buildErrorLogEntry(
    context: string,
    error: unknown,
  ): { errorMessage: string; logLine: string } {
    const errorMessage =
      error instanceof Error ? error.stack || error.message : String(error);

    return {
      errorMessage,
      logLine: `[${new Date().toISOString()}] ${context}: ${errorMessage}\n`,
    };
  }

  /** Builds a timestamped output log file path and ensures the output directory exists. */
  createTimestampedOutputLogFilePath(filePrefix: string): string {
    const outputDirectory = path.join(process.cwd(), "output");
    if (!existsSync(outputDirectory)) {
      mkdirSync(outputDirectory, { recursive: true });
    }

    return path.join(
      outputDirectory,
      `${filePrefix}-${new Date().toISOString().replaceAll(/[:.]/g, "-")}.log`,
    );
  }

  /** Logs a debug message at the `debug` level. */
  override debug(message: unknown, context?: string, data?: LogData): void {
    const parsed = this.parseMessage(message);
    this.child.debug(
      this.buildBindings({ context: context ?? this.context, data, parsed }),
      parsed.text,
    );
  }

  /**
   * Logs an error message at the `error` level, optionally including a stack trace.
   *
   * `ConsoleLogger.error` spends a third slot on a context string that the
   * other levels do not have, so this one accepts either: a string keeps
   * NestJS's meaning, an object is structured data like everywhere else.
   */
  override error(
    message: unknown,
    stackOrContext?: string,
    contextOrData?: LogData | string,
  ): void {
    const parsed = this.parseMessage(message);
    const data = typeof contextOrData === "object" ? contextOrData : undefined;
    const context =
      typeof contextOrData === "string" ? contextOrData : this.context;

    this.child.error(
      {
        ...this.buildBindings({ context, data, parsed }),
        stack: stackOrContext,
      },
      parsed.text,
    );
  }

  /** Logs an informational message at the `info` level. */
  info(message: unknown, context?: string, data?: LogData): void {
    const parsed = this.parseMessage(message);
    this.child.info(
      this.buildBindings({ context: context ?? this.context, data, parsed }),
      parsed.text,
    );
  }

  /**
   * Logs an informational message at the `info` level.
   *
   * NestJS and `nest-commander` call this method directly as part of the
   * framework's own `LoggerService` contract, so it must keep working
   * exactly as before. Application code should call `info` instead — the
   * same behavior under a name that says what level it logs at.
   */
  override log(message: unknown, context?: string, data?: LogData): void {
    this.info(message, context, data);
  }

  /** Sets the context label included in every subsequent log line. */
  override setContext(context: string): void {
    super.setContext(context);
    this.child = LoggerService.root.child({ context });
  }

  /** Logs a verbose message at the `trace` level. */
  override verbose(message: unknown, context?: string, data?: LogData): void {
    const parsed = this.parseMessage(message);
    this.child.trace(
      this.buildBindings({ context: context ?? this.context, data, parsed }),
      parsed.text,
    );
  }

  /** Logs a warning message at the `warn` level. */
  override warn(message: unknown, context?: string, data?: LogData): void {
    const parsed = this.parseMessage(message);
    this.child.warn(
      this.buildBindings({ context: context ?? this.context, data, parsed }),
      parsed.text,
    );
  }
}
