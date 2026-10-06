import { Injectable } from "@nestjs/common";

/**
 * Health check service returning service health status.
 */
@Injectable()
export class HealthService {
  // 🏗 Dependency Injection

  public constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /**
   * Returns true if the service is operational.
   */
  public isHealthy(): boolean {
    return true;
  }
}
