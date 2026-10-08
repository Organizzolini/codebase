import { Injectable } from "@nestjs/common";

/** The base declaration a `super.run()` call resolves to. */
@Injectable()
export class BaseTaskService {
  // 🌎 Public Methods

  /** Reports the work the base class claims to have done. */
  public run(): string {
    return "base";
  }
}
