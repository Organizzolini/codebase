import { describe, expect, it } from "vitest";

import { CreateWidgets1767225600000 } from "../../../testing/fixtures/migrations/1767225600000-create-widgets";

import { POSTGRES_CONTAINER_IMAGES } from "./postgres-container.constants";
import { startPostgresContainer } from "./postgres-container.utilities";

import type { MigrationInterface } from "typeorm";

// 🧪 Tests

/** A migration that always fails, standing in for a broken one. */
class FailingMigration1767225600001 implements MigrationInterface {
  /** Undoes nothing. */
  async down(): Promise<void> {
    await Promise.resolve();
  }

  /** Fails, as a migration with a mistake in its SQL would. */
  async up(): Promise<void> {
    await Promise.reject(new Error("The migration failed."));
  }
}

/** An image no registry serves, standing in for a rate-limited Docker Hub. */
const UNAVAILABLE_IMAGE = "codebase.invalid/postgres:unavailable";

describe(startPostgresContainer, () => {
  it("falls back to the next image when one cannot be pulled", async () => {
    const container = await startPostgresContainer({
      images: [UNAVAILABLE_IMAGE, ...POSTGRES_CONTAINER_IMAGES],
      migrations: [CreateWidgets1767225600000],
      project: "fixture",
    });

    try {
      expect(container.environment).toStrictEqual({
        FIXTURE_POSTGRES_DATABASE: "fixture_testing",
        FIXTURE_POSTGRES_HOST: container.connection.host,
        FIXTURE_POSTGRES_PASSWORD: "fixture_password",
        FIXTURE_POSTGRES_PORT: String(container.connection.port),
        FIXTURE_POSTGRES_SCHEMA: "fixture",
        FIXTURE_POSTGRES_USERNAME: "fixture_username",
      });
    } finally {
      await container.stop();
    }
  });

  it("names every image it tried when none can be pulled", async () => {
    await expect(
      startPostgresContainer({
        images: [UNAVAILABLE_IMAGE],
        migrations: [],
        project: "fixture",
      }),
    ).rejects.toThrow(/codebase\.invalid\/postgres:unavailable/);
  });

  it("rejects with the migration's own error when one fails", async () => {
    await expect(
      startPostgresContainer({
        migrations: [FailingMigration1767225600001],
        project: "fixture",
      }),
    ).rejects.toThrow("The migration failed.");
  });
});
