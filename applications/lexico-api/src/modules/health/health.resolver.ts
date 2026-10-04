import { Inject } from "@nestjs/common";
import { Query, Resolver } from "@nestjs/graphql";

import { HealthService } from "./health.service";

/**
 * Health check query resolver.
 */
@Resolver()
export class HealthResolver {
  // 🏗 Dependency Injection

  public constructor(
    @Inject(HealthService) private readonly healthService: HealthService,
  ) {}

  // 🔎 Queries

  /**
   * Health check query.
   */
  @Query(() => Boolean, {
    description:
      "Returns true if the GraphQL API service is running and healthy.",
    name: "health",
  })
  public health(): boolean {
    return this.healthService.isHealthy();
  }

  // 🖋️ Mutations

  // 🔗 Relations
}
