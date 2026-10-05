import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { LoggerService } from "@codebase/logger";

import { inputSchema } from "./input.constants";

import type { Environment, Input } from "./input.types";

/**
 * NestJS service that reads validated environment variables from {@link ConfigService}
 * and parses them into a domain {@link Input} object.
 *
 * Bridges the infrastructure config layer (raw primitives validated at bootstrap by
 * {@link Environment}) and the domain layer (timezone-aware Moment objects, derived timezone).
 */
@Injectable()
export class InputService {
  // 🏗 Dependency Injection

  constructor(
    private readonly configService: ConfigService<Environment>,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(InputService.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /**
   * Parses the current environment into a validated {@link Input} domain object.
   *
   * Reads `LATITUDE`, `LONGITUDE`, `START_DATE`, and `END_DATE` from
   * {@link ConfigService} and delegates to {@link inputSchema} for coercion,
   * timezone derivation, and date range validation.
   *
   * @returns Validated input with coordinates, IANA timezone, and Moment date range.
   */
  parse(): Input {
    const input = inputSchema.parse({
      endDate: this.configService.get<string>("END_DATE"),
      latitude: this.configService.get<number>("LATITUDE"),
      longitude: this.configService.get<number>("LONGITUDE"),
      startDate: this.configService.get<string>("START_DATE"),
    });

    this.logger.debug("📥 Parsed input configuration", undefined, {
      endDate: input.end.toISOString(),
      latitude: input.latitude,
      longitude: input.longitude,
      startDate: input.start.toISOString(),
      timezone: input.timezone,
    });

    return input;
  }
}
