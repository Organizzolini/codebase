/**
 * Test utilities and mocks for lexico-cli.
 * Includes mocks for TypeORM repositories and helpers for Cheerio setup.
 */

import { createMock } from "@golevelup/ts-vitest";
import * as cheerio from "cheerio";
import { afterEach, beforeEach, onTestFinished, vi } from "vitest";

import type { AnyNode } from "domhandler";
import type { ObjectLiteral, QueryBuilder, Repository } from "typeorm";

/**
 * Default test date used across time-sensitive tests.
 */
export const DEFAULT_TEST_DATE = new Date("2025-03-20T14:46:00Z");

// 🧪 Prompts Helpers

/**
 * A typed mock function for the `prompts` default export.
 * Use this type annotation in `vi.hoisted` declarations in test files.
 */
export type PromptsMock<Response extends Record<string, unknown>> = ReturnType<
  typeof vi.fn<() => Promise<Response>>
>;

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
 * Lets a test decide whether `process.stdin` reads as a terminal. The setter
 * may be called from a test or its `beforeEach`; the real value captured here
 * is restored when that test finishes.
 *
 * Usage in test files:
 * ```ts
 * const setStandardInputTerminal = mockStandardInputTerminal()
 *
 * it('prompts', () => { setStandardInputTerminal(true) })
 * ```
 */
export function mockStandardInputTerminal(): (isTerminal: boolean) => void {
  const original = Object.getOwnPropertyDescriptor(process.stdin, "isTTY");

  return (isTerminal) => {
    Object.defineProperty(process.stdin, "isTTY", {
      configurable: true,
      value: isTerminal,
      writable: true,
    });

    onTestFinished(() => {
      if (original) {
        Object.defineProperty(process.stdin, "isTTY", original);
      } else {
        Reflect.deleteProperty(process.stdin, "isTTY");
      }
    });
  };
}

/**
 * Sets a default resolved value for a `prompts` mock function.
 */
export function setPromptsMockResponse<
  Response extends Record<string, unknown>,
>(promptsMock: PromptsMock<Response>, response: Awaited<Response>): void {
  promptsMock.mockResolvedValue(response);
}

/**
 * Queues a one-time resolved value for a `prompts` mock function.
 */
export function setPromptsMockResponseOnce<
  Response extends Record<string, unknown>,
>(promptsMock: PromptsMock<Response>, response: Awaited<Response>): void {
  promptsMock.mockResolvedValueOnce(response);
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
>(
  repository?: Repository<Entity>,
): Repository<Entity> => {
  return createMock<Repository<Entity>>(
    Object.assign(repository ?? {}, {
      createQueryBuilder: vi
        .fn<Repository<Entity>["createQueryBuilder"]>()
        .mockReturnValue(
          createMock<ReturnType<Repository<Entity>["createQueryBuilder"]>>({
            andWhere: vi.fn<() => QueryBuilder<Entity>>().mockReturnThis(),
            execute: vi.fn<never>(),
            from: vi.fn<() => QueryBuilder<Entity>>().mockReturnThis(),
            getCount: vi.fn<() => Promise<number>>(),
            getMany: vi.fn<() => Promise<Entity[]>>(),
            getManyAndCount: vi.fn<() => Promise<[Entity[], number]>>(),
            getOne: vi.fn<() => Promise<Entity | null>>(),
            getRawMany: vi.fn<() => Promise<Entity[]>>(),
            getRawOne: vi.fn<() => Promise<Entity>>(),
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
    }),
  );
};

// 🧭 Cheerio Helpers

/**
 * Load HTML and select a specific element by CSS selector.
 * Returns the CheerioAPI and the first matched element.
 * Throws if no element matches or the element cannot be extracted.
 *
 * Usage:
 * ```ts
 * const { $, element } = loadCheerioElement("<div><p id='entry'>text</p></div>", "p#entry");
 * service.process($, element);
 * ```
 */
export function loadCheerioElement(
  html: string,
  selector: string,
): { $: cheerio.CheerioAPI; element: AnyNode } {
  const $ = cheerio.load(html);
  const element = $(selector).get(0);

  if (!element) {
    throw new Error(
      `No element matching selector "${selector}" found in HTML document`,
    );
  }

  return { $, element };
}

/**
 * Load HTML and return both the CheerioAPI and the root element.
 * Throws if the root element cannot be extracted.
 *
 * Usage:
 * ```ts
 * const { $, rootElement } = loadCheerioWithRoot("<div>content</div>");
 * service.parse($, rootElement, "argument");
 * ```
 */
export function loadCheerioWithRoot(html: string): {
  $: cheerio.CheerioAPI;
  rootElement: AnyNode;
} {
  const $ = cheerio.load(html);
  const rootElement = $.root().get(0);

  if (!rootElement) {
    throw new Error("Failed to extract root element from Cheerio document");
  }

  return { $, rootElement };
}

/**
 * Load XML and select a specific element by CSS selector.
 * Returns the CheerioAPI and the first matched element.
 * Throws if no element matches or the element cannot be extracted.
 *
 * Usage:
 * ```ts
 * const { $, element } = loadCheerioXmlElement("<TEI><div>text</div></TEI>", "div");
 * provider.process($, element);
 * ```
 */
export function loadCheerioXmlElement(
  xml: string,
  selector: string,
): { $: cheerio.CheerioAPI; element: AnyNode } {
  const $ = cheerio.load(xml, { xml: true });
  const element = $(selector).get(0);

  if (!element) {
    throw new Error(
      `No element matching selector "${selector}" found in XML document`,
    );
  }

  return { $, element };
}

/**
 * Load XML and return both the CheerioAPI and the root element.
 * Throws if the root element cannot be extracted.
 *
 * Usage:
 * ```ts
 * const { $, rootElement } = loadCheerioXmlWithRoot("<TEI></TEI>");
 * provider.parse($, rootElement);
 * ```
 */
export function loadCheerioXmlWithRoot(xml: string): {
  $: cheerio.CheerioAPI;
  rootElement: AnyNode;
} {
  const $ = cheerio.load(xml, { xml: true });
  const rootElement = $.root().get(0);

  if (!rootElement) {
    throw new Error("Failed to extract root element from Cheerio XML document");
  }

  return { $, rootElement };
}
