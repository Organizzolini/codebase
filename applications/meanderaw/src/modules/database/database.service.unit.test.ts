import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { meanderRecord } from "../../../testing/meanders";

import { DatabaseService } from "./database.service";
import { Meander } from "./entities/Meander.entity";

import type { MeanderRecord } from "./database.types";
import type { EntityManager, Repository } from "typeorm";
import type { ColumnMetadata } from "typeorm/metadata/ColumnMetadata.js";

// 🧪 Tests

describe(DatabaseService, () => {
  let service: DatabaseService;
  let meanderRepository: Repository<Meander>;

  const record: MeanderRecord = meanderRecord({
    code: "3c9a",
    columns: 2,
    lattice: "3c9a",
    rows: 3,
  });
  const savedMeander = createMock<Meander>({
    id: "01a107d6-cff8-7238-8684-a2a863bc6928",
    ...record,
  });

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        DatabaseService,
        {
          provide: getRepositoryToken(Meander),
          useValue: createMock<Repository<Meander>>(),
        },
      ],
    }).compile();

    service = await module.resolve(DatabaseService);
    meanderRepository = module.get(getRepositoryToken(Meander));

    vi.mocked(meanderRepository.save).mockResolvedValue(savedMeander);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("save", () => {
    it("delegates to the repository's own save", async () => {
      await service.save(record);

      expect(meanderRepository.save).toHaveBeenCalledWith(record);
    });

    it("resolves with the row the repository saved", async () => {
      await expect(service.save(record)).resolves.toBe(savedMeander);
    });
  });

  describe("findOneByCode", () => {
    it("delegates findOneBy with the Code alone", async () => {
      vi.mocked(meanderRepository.findOneBy).mockResolvedValue(savedMeander);

      await expect(service.findOneByCode("02x03y3c9a")).resolves.toStrictEqual(
        savedMeander,
      );
      expect(meanderRepository.findOneBy).toHaveBeenCalledWith({
        code: "02x03y3c9a",
      });
    });
  });

  describe("saveAll", () => {
    it("writes every record through one multi-row INSERT per chunk, inside a transaction, leaving generated columns out", async () => {
      vi.mocked(meanderRepository.manager.transaction).mockImplementation(
        async (
          callbackOrLevel: unknown,
          maybeCallback?: (manager: EntityManager) => Promise<unknown>,
        ) => {
          const callback =
            typeof callbackOrLevel === "function"
              ? (callbackOrLevel as (
                  manager: EntityManager,
                ) => Promise<unknown>)
              : maybeCallback;
          if (callback) {
            await callback(meanderRepository.manager);
          }
        },
      );
      const column = (name: "code" | "lattice"): ColumnMetadata =>
        createMock<ColumnMetadata>({
          databaseName: name,
          getEntityValue: (entity: MeanderRecord) => entity[name],
          isGenerated: false,
        });

      Object.defineProperty(meanderRepository, "metadata", {
        value: {
          columns: [
            column("code"),
            column("lattice"),
            createMock<ColumnMetadata>({ isGenerated: true }),
          ],
          tableName: "meanders",
        },
      });
      vi.mocked(
        meanderRepository.manager.dataSource.driver.preparePersistentValue,
      ).mockImplementation((value: unknown) => value);
      vi.mocked(meanderRepository.manager.query).mockResolvedValue(undefined);

      const records = [record, { ...record, lattice: "3c9b" }];
      const count = await service.saveAll(records);

      expect(count).toBe(2);
      expect(meanderRepository.manager.query).toHaveBeenCalledWith(
        'INSERT INTO "meanders" ("code", "lattice") VALUES (?, ?), (?, ?)',
        ["3c9a", "3c9a", "3c9a", "3c9b"],
      );
    });
  });
});
