import { createMock } from "@golevelup/ts-vitest";
import { NestFactory } from "@nestjs/core";
import { ExpressAdapter } from "@nestjs/platform-express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { INestApplication } from "@nestjs/common";

const setContextMock = vi.fn<(context: string) => void>();
const logMock = vi.fn<(message: string) => void>();
const loggerConstructorMock = vi.fn<() => void>();

const signalReadyMock = vi.fn<() => void>();
const registerShutdownHandlerMock =
  vi.fn<(handler: () => Promise<void>) => void>();
const createLightshipMock = vi
  .fn<
    (configuration?: { port: number }) => Promise<{
      registerShutdownHandler: typeof registerShutdownHandlerMock;
      signalReady: typeof signalReadyMock;
    }>
  >()
  .mockResolvedValue({
    registerShutdownHandler: registerShutdownHandlerMock,
    signalReady: signalReadyMock,
  });

vi.mock("lightship", () => ({
  createLightship: async (configuration?: { port: number }) =>
    createLightshipMock(configuration),
}));

vi.mock("./lexico-api.module", () => ({
  LexicoApiModule: function LexicoApiModule() {
    return undefined;
  },
}));

vi.mock("@codebase/logging", () => ({
  LoggerService: class MockLoggerService {
    public constructor() {
      loggerConstructorMock();
    }

    public log = logMock;
    public setContext = setContextMock;
  },
}));

describe("lexico api bootstrap suite", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("bootstraps nest application with default port and signals lightship ready", async () => {
    expect.hasAssertions();

    const closeMock = vi.fn<() => Promise<void>>().mockResolvedValue();
    const listenMock = vi
      .fn<() => Promise<INestApplication>>()
      .mockResolvedValue(undefined as unknown as INestApplication);
    const mockApp = createMock<INestApplication>({
      close: closeMock,
      listen: listenMock,
    });
    const createSpy = vi
      .spyOn(NestFactory, "create")
      .mockResolvedValue(mockApp);

    await import("./lexico-api");

    await vi.waitFor(() => {
      expect(createSpy).toHaveBeenCalledTimes(1);
    });

    expect(createSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.any(ExpressAdapter),
      expect.objectContaining({
        cors: { credentials: true, origin: ["http://localhost:3000"] },
      }),
    );
    expect(createLightshipMock).toHaveBeenCalledWith({ port: 9000 });
    expect(loggerConstructorMock).toHaveBeenCalledTimes(1);
    expect(setContextMock).toHaveBeenCalledWith("NestApplication");
    expect(listenMock).toHaveBeenCalledWith(8398);
    expect(signalReadyMock).toHaveBeenCalledTimes(1);
    expect(registerShutdownHandlerMock).toHaveBeenCalledTimes(1);

    const shutdownHandler = registerShutdownHandlerMock.mock.calls[0]?.[0];

    expect(shutdownHandler).toBeDefined();

    await shutdownHandler?.();

    expect(closeMock).toHaveBeenCalledTimes(1);
  });

  it("bootstraps nest application with custom LEXICO_API_PORT and LEXICO_API_LIGHTSHIP_PORT", async () => {
    expect.hasAssertions();

    process.env["LEXICO_API_LIGHTSHIP_PORT"] = "9005";
    process.env["LEXICO_API_PORT"] = "9999";
    const listenMock = vi
      .fn<() => Promise<INestApplication>>()
      .mockResolvedValue(undefined as unknown as INestApplication);
    const mockApp = createMock<INestApplication>({
      listen: listenMock,
    });
    const createSpy = vi
      .spyOn(NestFactory, "create")
      .mockResolvedValue(mockApp);

    await import("./lexico-api");

    await vi.waitFor(() => {
      expect(createSpy).toHaveBeenCalledTimes(1);
    });

    expect(createLightshipMock).toHaveBeenCalledWith({ port: 9005 });
    expect(listenMock).toHaveBeenCalledWith(9999);

    delete process.env["LEXICO_API_LIGHTSHIP_PORT"];
    delete process.env["LEXICO_API_PORT"];
  });
});
