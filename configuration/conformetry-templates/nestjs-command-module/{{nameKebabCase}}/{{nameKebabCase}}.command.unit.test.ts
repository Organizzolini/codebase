import {createMock} from '@golevelup/ts-vitest';
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { LoggerService } from '@codebase/logging';

import { {{namePascalCase}}Command } from "./{{nameKebabCase}}.command";

describe({{namePascalCase}}Command, () => {
  let command: {{namePascalCase}}Command;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        {{namePascalCase}}Command,
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
      ],
    }).compile();

    command = await module.resolve({{namePascalCase}}Command);
  });

  it("is defined", () => {
    expect(command).toBeDefined();
  });

  it("sets logger context", async () => {
    const module = await Test.createTestingModule({
      providers: [
        {{namePascalCase}}Command,
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
      ],
    }).compile();

    const logger = await module.resolve(LoggerService);

    expect(logger.setContext).toHaveBeenCalledWith("{{namePascalCase}}Command");
  });
});
