import { createMock } from "@golevelup/ts-vitest";
import { afterEach, beforeEach, vi } from "vitest";

import type { ObjectLiteral, QueryBuilder, Repository } from "typeorm";

/**
 * Default test date used across time-sensitive tests.
 */
export const DEFAULT_TEST_DATE = new Date("2025-03-20T14:46:00Z");

/**
 * Sets up fake timers with a fixed system time before each test
 * and restores real timers after each test.
 *
 * Usage in test files:
 * ```ts
 * import { mockDates } from '../testing/mocks'
 *
 * describe('my suite', () => {
 *   mockDates()
 *   // your tests here
 * })
 * ```
 */
export function mockDates(date: Date = DEFAULT_TEST_DATE): void {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(date);
  });

  afterEach(() => {
    vi.useRealTimers();
  });
}

/**
 * Creates a vitest mock for TypeORM's `Repository` with a fully configured
 * `createQueryBuilder` mock. Suitable for use as a provider value in NestJS tests.
 *
 * The `createQueryBuilder` mock includes all chainable methods that call
 * `.mockReturnThis()` so the full method chain stays on the same mock instance.
 * Terminal methods are typed via `Entity` and left unimplemented — configure
 * them per-test with `.mockResolvedValue`.
 */
export const createRepositoryMock = <
  Entity extends ObjectLiteral = ObjectLiteral,
>(): Repository<Entity> => {
  return createMock<Repository<Entity>>({
    createQueryBuilder: vi
      .fn<Repository<Entity>["createQueryBuilder"]>()
      .mockReturnValue(
        createMock<ReturnType<Repository<Entity>["createQueryBuilder"]>>({
          addOrderBy: vi.fn<() => QueryBuilder<Entity>>().mockReturnThis(),
          addSelect: vi.fn<() => QueryBuilder<Entity>>().mockReturnThis(),
          andWhere: vi.fn<() => QueryBuilder<Entity>>().mockReturnThis(),
          execute: vi.fn<never>(),
          from: vi.fn<() => QueryBuilder<Entity>>().mockReturnThis(),
          getCount: vi.fn<() => Promise<number>>().mockResolvedValue(0),
          getMany: vi.fn<() => Promise<Entity[]>>().mockResolvedValue([]),
          getManyAndCount: vi
            .fn<() => Promise<[Entity[], number]>>()
            .mockResolvedValue([[], 0]),
          getOne: vi.fn<() => Promise<Entity | null>>().mockResolvedValue(null),
          getRawMany: vi.fn<() => Promise<Entity[]>>().mockResolvedValue([]),
          getRawOne: vi
            .fn<() => Promise<Entity | null>>()
            .mockResolvedValue(null),
          groupBy: vi.fn<() => QueryBuilder<Entity>>().mockReturnThis(),
          innerJoin: vi.fn<() => QueryBuilder<Entity>>().mockReturnThis(),
          innerJoinAndSelect: vi
            .fn<() => QueryBuilder<Entity>>()
            .mockReturnThis(),
          insert: vi.fn<() => QueryBuilder<Entity>>().mockReturnThis(),
          leftJoin: vi.fn<() => QueryBuilder<Entity>>().mockReturnThis(),
          leftJoinAndSelect: vi
            .fn<() => QueryBuilder<Entity>>()
            .mockReturnThis(),
          limit: vi.fn<() => QueryBuilder<Entity>>().mockReturnThis(),
          offset: vi.fn<() => QueryBuilder<Entity>>().mockReturnThis(),
          orderBy: vi.fn<() => QueryBuilder<Entity>>().mockReturnThis(),
          orWhere: vi.fn<() => QueryBuilder<Entity>>().mockReturnThis(),
          select: vi.fn<() => QueryBuilder<Entity>>().mockReturnThis(),
          setParameter: vi.fn<() => QueryBuilder<Entity>>().mockReturnThis(),
          setParameters: vi.fn<() => QueryBuilder<Entity>>().mockReturnThis(),
          skip: vi.fn<() => QueryBuilder<Entity>>().mockReturnThis(),
          take: vi.fn<() => QueryBuilder<Entity>>().mockReturnThis(),
          update: vi.fn<() => QueryBuilder<Entity>>().mockReturnThis(),
          where: vi.fn<() => QueryBuilder<Entity>>().mockReturnThis(),
        }),
      ),
    find: vi.fn<Repository<Entity>["find"]>(),
    findBy: vi.fn<Repository<Entity>["findBy"]>(),
    findOne: vi.fn<Repository<Entity>["findOne"]>(),
    findOneBy: vi.fn<Repository<Entity>["findOneBy"]>(),
  });
};
