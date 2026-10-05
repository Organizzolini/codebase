import { Injectable } from "@nestjs/common";
import { Command, CommandRunner } from "nest-commander";

import { LoggerService } from "@codebase/logging";

/**
 * TODO: Document the {{nameCamelCase}} command, and give its `@Command` a
 * `description` — the template declares none, because a string literal in a
 * template is required verbatim in every instance forever.
 */
@Command({
  name: "{{nameKebabCase}}",
})
@Injectable()
export class {{namePascalCase}}Command extends CommandRunner {
  // 🏗 Dependency Injection

  constructor(private readonly logger: LoggerService) {
    super();
    this.logger.setContext({{namePascalCase}}Command.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  async run(): Promise<void> {
    // TODO: Implement command behavior
  }
}
