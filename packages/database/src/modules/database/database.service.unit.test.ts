import { ConfigModule } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import { DefaultNamingStrategy } from "typeorm";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { DATABASE_OPTIONS } from "./database.constants";
import { DatabaseService } from "./database.service";

describe(DatabaseService, () => {
  let service: DatabaseService;
  const namingStrategy = new DefaultNamingStrategy();

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ ignoreEnvFile: true, isGlobal: true })],
      providers: [
        DatabaseService,
        {
          provide: DATABASE_OPTIONS,
          useValue: {
            entities: [],
            namingStrategy,
            project: "fixture",
          },
        },
      ],
    }).compile();

    service = await module.resolve(DatabaseService);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("connects with the project's defaults while the root's unprefixed variables are set", () => {
    vi.stubEnv("POSTGRES_DB", "postgres");
    vi.stubEnv("POSTGRES_USER", "postgres");

    expect(service.connection()).toStrictEqual({
      database: "fixture_development",
      host: "localhost",
      password: "fixture_password",
      port: 5432,
      schema: "fixture",
      username: "fixture_username",
    });
  });

  it("reads the project's prefixed variables through configuration", () => {
    vi.stubEnv("FIXTURE_POSTGRES_DATABASE", "fixture_testing");
    vi.stubEnv("FIXTURE_POSTGRES_PORT", "15432");

    expect(service.connection()).toMatchObject({
      database: "fixture_testing",
      port: 15_432,
    });
  });

  it("builds TypeORM's options with the naming strategy it was given and no migrations", () => {
    expect(service.createTypeOrmOptions()).toMatchObject({
      migrations: [],
      migrationsRun: false,
      namingStrategy,
      synchronize: false,
    });
  });

  it("refuses to connect when its module was imported without forRoot", async () => {
    const module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ ignoreEnvFile: true, isGlobal: true })],
      providers: [DatabaseService],
    }).compile();

    expect(() => module.get(DatabaseService).connection()).toThrow(
      /DatabaseModule\.forRoot/,
    );
  });
});
