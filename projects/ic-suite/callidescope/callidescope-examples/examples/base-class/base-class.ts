import { Injectable } from "@nestjs/common";

import { BaseTaskService } from "./base-task.js";

/**
 * Calls up into its base class.
 *
 * `super.run()` is resolved to the base declaration the checker names, so the
 * frame recorded is `BaseTaskService.run` rather than the override calling it.
 */
@Injectable()
export class BaseClassService extends BaseTaskService {
  // 🌎 Public Methods

  /** Extends the base result rather than replacing it. */
  public override run(): string {
    return `${super.run()}+override`;
  }
}
