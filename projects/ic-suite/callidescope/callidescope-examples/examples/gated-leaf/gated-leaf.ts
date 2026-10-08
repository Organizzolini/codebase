import { Injectable } from "@nestjs/common";

/**
 * A leaf package's whole surface, four frames deep and three callees wide.
 *
 * Nothing here is unusual code. It is a finding only because this directory is
 * its own project and that project declares its own limits — three frames and
 * two direct callees — in the `callidescope.config.ts` beside this file. The
 * package that imports it is held to five, and five would never have reported
 * any of this.
 */
@Injectable()
export class GatedLeafService {
  // 🔏 Private Methods

  /** Ends the chain, which is where the fourth frame is. */
  private finish(key: string): string {
    return key.trim();
  }

  /** Second of the three, one hop from the end. */
  private normalize(key: string): string {
    return this.finish(key);
  }

  /** First of the three, and the way into the chain. */
  private parse(key: string): string {
    return this.normalize(key);
  }

  // 🌎 Public Methods

  /**
   * The address this project declares as its entry point.
   *
   * Both findings are about this one method. It calls three things directly,
   * which is the breadth finding, and the longest path below it runs four
   * frames, which is the depth one.
   */
  public read(key: string): string {
    return `${this.parse(key)}${this.normalize(key)}${this.finish(key)}`;
  }
}
