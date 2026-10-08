import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { SvgService } from "./svg.service";

describe(SvgService, () => {
  let service: SvgService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [SvgService],
    }).compile();

    service = await module.resolve(SvgService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("render", () => {
    it("assembles a single-path document matching the reference markup shape", () => {
      const svg = service.render({
        height: "66",
        paths: ["M3 15H39V51H3V27H27V39H15"],
        strokeWidth: "6",
        width: "282",
      });

      expect(svg).toBe(
        '<svg width="282" height="66" viewBox="0 0 282 66" fill="none" xmlns="http://www.w3.org/2000/svg">\n' +
          '<path d="M3 15H39V51H3V27H27V39H15" stroke="black" stroke-width="6" stroke-linecap="square"/>\n' +
          "</svg>\n",
      );
    });

    it("renders one path element per entry, in order", () => {
      const svg = service.render({
        height: "10",
        paths: ["M0 0H1", "M1 1H2"],
        strokeWidth: "2",
        width: "20",
      });

      expect(svg).toContain('<path d="M0 0H1"');
      expect(svg).toContain('<path d="M1 1H2"');
      expect(svg.indexOf('d="M0 0H1"')).toBeLessThan(svg.indexOf('d="M1 1H2"'));
    });
  });
});
