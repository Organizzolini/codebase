import { Injectable } from "@nestjs/common";

/**
 * Six frames, a finding under five and not one under the run's own six.
 *
 * Six is the run's default: `callidescope.workspace.config.ts` declares it, and
 * it is the number a project adopts by spreading it. Six frames pass six. This
 * package's own `callidescope.config.ts` — a complete file, every field written
 * out, because a project's configuration leaving one out is refused — declares
 * five instead, and under five this chain is a finding. The only thing that
 * changed is which file the number was written in.
 */
@Injectable()
export class ProjectDepthLimitService {
  // 🔏 Private Methods

  /** Applies the limit the resolved project turned out to declare. */
  private applyLimit(project: string): string {
    return this.reportVerdict(`${project}:limit`);
  }

  /** Reads the file the number the verdict used was written in. */
  private readDeclaringFile(project: string): string {
    return `${project}:declared-in`;
  }

  /** Reads the limit whichever configuration file the project settled on. */
  private readLimit(project: string): string {
    return this.applyLimit(project);
  }

  /** States the verdict, and where the number behind it came from. */
  private reportVerdict(verdict: string): string {
    return this.readDeclaringFile(verdict);
  }

  /** Names the configuration file the project is judged by. */
  private resolveConfiguration(project: string): string {
    return this.readLimit(project);
  }

  // 🌎 Public Methods

  /** Judges one project, through every stage a resolved limit passes. */
  public judge(project: string): string {
    return this.resolveConfiguration(project);
  }
}
