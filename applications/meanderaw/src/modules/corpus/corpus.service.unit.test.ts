import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { characteristicRecord } from "../../../testing/meanders";
import { CharacteristicsService } from "../characteristics/characteristics.service";
import { ClassificationService } from "../classification/classification.service";
import { CodeService } from "../code/code.service";
import { DatabaseService } from "../database/database.service";
import { TileEnumerationService } from "../enumeration/tile-enumeration.service";

import { DuplicateCorpusCodeError } from "./corpus.constants";
import { CorpusService } from "./corpus.service";

import type { Meander } from "../database/entities/Meander.entity";
import type { Tile } from "../tile/tile.types";
import type { CorpusEntry } from "./corpus.types";

// 🧪 Tests

describe(CorpusService, () => {
  let service: CorpusService;
  let characteristicsService: CharacteristicsService;
  let classificationService: ClassificationService;
  let databaseService: DatabaseService;
  let codeService: CodeService;
  let tileEnumerationService: TileEnumerationService;

  const tile = createMock<Tile>({ columns: 1, rows: 2 });
  const record = characteristicRecord({
    bettiNumber0Count: 1,
    forkCount: 1,
    freeEndCount: 2,
    isSingleArc: true,
  });
  const stored = {
    aSoutheastLatinCount: 2,
    bettiNumber0Count: 1,
    forkCount: 1,
    freeEndCount: 2,
    isSingleArc: true,
  } as const;
  const savedMeander = createMock<Meander>({
    id: "01a107d6-cff8-7238-8684-a2a863bc6928",
  });

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        CorpusService,
        {
          provide: CharacteristicsService,
          useValue: createMock<CharacteristicsService>(),
        },
        {
          provide: ClassificationService,
          useValue: createMock<ClassificationService>(),
        },
        {
          provide: DatabaseService,
          useValue: createMock<DatabaseService>(),
        },
        {
          provide: CodeService,
          useValue: createMock<CodeService>(),
        },
        {
          provide: TileEnumerationService,
          useValue: createMock<TileEnumerationService>(),
        },
      ],
    }).compile();

    service = await module.resolve(CorpusService);
    characteristicsService = await module.resolve(CharacteristicsService);
    classificationService = await module.resolve(ClassificationService);
    databaseService = await module.resolve(DatabaseService);
    codeService = await module.resolve(CodeService);
    tileEnumerationService = await module.resolve(TileEnumerationService);
  });

  beforeEach(() => {
    vi.mocked(codeService.parse).mockImplementation((code, rows, columns) => ({
      columns: columns ?? 1,
      digits: code,
      repeats: 1,
      rows: rows ?? 2,
    }));
    vi.mocked(codeService.format).mockImplementation(
      (code) =>
        `${String(code.columns).padStart(2, "0")}x${String(code.rows).padStart(2, "0")}y${code.digits}${code.repeats > 1 ? `r${String(code.repeats).padStart(2, "0")}` : ""}`,
    );
    vi.mocked(codeService.canonicalPhase).mockImplementation(
      (parsed) => parsed,
    );
    vi.mocked(codeService.tile).mockReturnValue(tile);
    vi.mocked(characteristicsService.compute).mockReturnValue(record);
    vi.mocked(characteristicsService.isReducible).mockReturnValue(false);
    vi.mocked(characteristicsService.stored).mockImplementation(
      (_characteristics, isReducible) =>
        isReducible ? { ...stored, isReducible: true } : stored,
    );
    vi.mocked(classificationService.classify).mockReturnValue("snake");
    vi.mocked(tileEnumerationService.edges).mockReturnValue(17);
    vi.mocked(databaseService.findOneByCode).mockResolvedValue(null);
    vi.mocked(databaseService.save).mockResolvedValue(savedMeander);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("ingest", () => {
    const entry: CorpusEntry = {
      code: "2",
      columns: 1,
      filedUnder: ["boxes"],
      rows: 4,
    };

    it("reads each entry's code at its own rows and columns", async () => {
      await service.ingest([entry]);

      expect(codeService.parse).toHaveBeenCalledWith("2", 4, 1);
    });

    it("computes the characteristic record of the Code it read", async () => {
      await service.ingest([entry]);

      expect(characteristicsService.compute).toHaveBeenCalledWith(
        expect.objectContaining({ columns: 1, digits: "2", rows: 4 }),
      );
    });

    it("scores each phase by its tile-crossing component delta", async () => {
      vi.mocked(codeService.canonicalPhase).mockImplementation(
        (parsed, score) => {
          score(parsed);
          return parsed;
        },
      );

      await service.ingest([entry]);

      expect(
        vi.mocked(characteristicsService.tileCrossingComponentDeltaCount),
      ).toHaveBeenCalledWith(
        expect.objectContaining({ columns: 1, digits: "2", rows: 4 }),
      );
    });

    it("persists each entry's stored characteristics, as hardcoded, under the first family it was filed under", async () => {
      await service.ingest([
        { code: "3", columns: 3, filedUnder: ["boxes", "parallel"], rows: 4 },
      ]);

      expect(databaseService.save).toHaveBeenCalledWith(
        expect.objectContaining({
          characteristics: stored,
          code: "03x04y3",
          columns: 3,
          family: "boxes",
          isHardcoded: true,
          lattice: "3",
          repeats: 1,
          rows: 4,
        }),
      );
    });

    it("does not spread any characteristic into the saved row's own columns", async () => {
      await service.ingest([entry]);

      const [saved] = vi
        .mocked(databaseService.save)
        .mock.calls.map(([row]) => row);

      expect(saved).not.toHaveProperty("isSingleArc");
      expect(saved).not.toHaveProperty("bettiNumber0Count");
    });

    it("tells the classifier an entry filed under branch reduces when its Code is wider than its unit", async () => {
      vi.mocked(characteristicsService.isReducible).mockReturnValue(true);

      await service.ingest([
        { code: "3", columns: 3, filedUnder: ["branch"], rows: 4 },
      ]);

      expect(classificationService.classify).toHaveBeenCalledWith(record, {
        isReducible: true,
        rows: 4,
      });
    });

    it("stores isReducible when the filed Code reduces to a narrower unit", async () => {
      vi.mocked(characteristicsService.isReducible).mockReturnValue(true);

      await service.ingest([entry]);

      expect(characteristicsService.stored).toHaveBeenCalledWith(record, true);
      expect(databaseService.save).toHaveBeenCalledWith(
        expect.objectContaining({
          characteristics: { ...stored, isReducible: true },
        }),
      );
    });

    it("classifies an entry filed under branch from its computed record and filed shape", async () => {
      await service.ingest([
        { code: "3", columns: 3, filedUnder: ["branch"], rows: 4 },
      ]);

      expect(classificationService.classify).toHaveBeenCalledWith(record, {
        isReducible: false,
        rows: 4,
      });
      expect(databaseService.save).toHaveBeenCalledWith(
        expect.objectContaining({ family: "snake" }),
      );
    });

    it("skips an entry within the sixteen edges the corpus was extracted against", async () => {
      vi.mocked(tileEnumerationService.edges).mockReturnValue(16);

      await expect(service.ingest([entry])).resolves.toStrictEqual([]);
      expect(databaseService.save).not.toHaveBeenCalled();
    });

    it("looks an entry up by the canonical Code it would be saved under, which carries its shape and repeats", async () => {
      vi.mocked(codeService.canonicalPhase).mockImplementation((parsed) => ({
        ...parsed,
        digits: "4",
        repeats: 2,
      }));

      await service.ingest([entry]);

      expect(databaseService.findOneByCode).toHaveBeenCalledWith("01x04y4r02");
    });

    it("returns existing record if already found in database", async () => {
      vi.mocked(databaseService.findOneByCode).mockResolvedValueOnce(
        savedMeander,
      );

      await expect(service.ingest([entry])).resolves.toStrictEqual([
        savedMeander,
      ]);
      expect(databaseService.save).not.toHaveBeenCalled();
    });

    it("keeps an entry past sixteen edges even where a raised budget now enumerates it, so a hardcoded meander is never folded into the draw run", async () => {
      vi.mocked(tileEnumerationService.edges).mockReturnValue(21);

      await expect(service.ingest([entry])).resolves.toStrictEqual([
        savedMeander,
      ]);
    });

    it("keeps an entry shallower than the draw run's own floor, which the edge boundary alone would skip", async () => {
      vi.mocked(tileEnumerationService.edges).mockReturnValue(16);

      await expect(
        service.ingest([{ ...entry, rows: 1 }]),
      ).resolves.toStrictEqual([savedMeander]);
    });

    it("ingests family by family in the order the retired file tree gave them up", async () => {
      const second = createMock<Meander>({
        id: "01a107d6-cff8-7238-8684-a2a863bc6929",
      });

      vi.mocked(databaseService.save)
        .mockResolvedValueOnce(savedMeander)
        .mockResolvedValueOnce(second);

      await service.ingest([
        { code: "5", columns: 1, filedUnder: ["snake"], rows: 4 },
        { code: "6", columns: 1, filedUnder: ["boxes"], rows: 4 },
      ]);

      expect(
        vi.mocked(databaseService.save).mock.calls.map(([row]) => row.lattice),
      ).toStrictEqual(["6", "5"]);
    });

    it("resolves with every saved row", async () => {
      const second = createMock<Meander>({
        id: "01a107d6-cff8-7238-8684-a2a863bc6929",
      });

      vi.mocked(databaseService.save)
        .mockResolvedValueOnce(savedMeander)
        .mockResolvedValueOnce(second);

      await expect(
        service.ingest([
          entry,
          { code: "3", columns: 3, filedUnder: ["branch"], rows: 4 },
        ]),
      ).resolves.toStrictEqual([savedMeander, second]);
    });

    it("raises a clear ingestion failure when a Code collides with one already committed", async () => {
      vi.mocked(databaseService.save).mockRejectedValue(
        new Error("UNIQUE constraint failed: meanders.code"),
      );

      await expect(service.ingest([entry])).rejects.toThrow(
        DuplicateCorpusCodeError,
      );
    });
  });
});
