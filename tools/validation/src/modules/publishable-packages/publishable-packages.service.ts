import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { Injectable } from "@nestjs/common";

import { LoggerService } from "@codebase/logging";

import { PublishablePackagesChecksService } from "./publishable-packages-checks.service";
import { PublishablePackagesConsumerService } from "./publishable-packages-consumer.service";
import {
  formatMissingTarballsMessage,
  TARBALLS_DIRECTORY_MISSING_MESSAGE,
} from "./publishable-packages.constants";

import type {
  PublishablePackage,
  PublishablePackagesVerificationResult,
} from "./publishable-packages.types";

/**
 * Service that verifies the packed publishable packages from a consumer that
 * installs them the way a user would.
 */
@Injectable()
export class PublishablePackagesService {
  // 🏗 Dependency Injection

  constructor(
    private readonly logger: LoggerService,
    private readonly checksService: PublishablePackagesChecksService,
    private readonly consumerService: PublishablePackagesConsumerService,
  ) {
    this.logger.setContext(PublishablePackagesService.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Lists the packages `pnpm pack` has not written a tarball for, so a stale
   * or partial `dist/tarballs` is refused rather than installed.
   */
  private findMissingTarballs(
    tarballsDirectory: string,
    publishablePackages: readonly PublishablePackage[],
  ): string[] {
    return publishablePackages
      .map((item) => `${item.tarball}-${item.version}.tgz`)
      .filter((file) => !existsSync(path.join(tarballsDirectory, file)));
  }

  /**
   * Inspects a child directory and parses a PublishablePackage if publishable.
   */
  private parsePackageCandidate(
    familyDirectory: string,
    childName: string,
  ): null | PublishablePackage {
    const packageDirectory = path.resolve(familyDirectory, childName);
    const manifestPath = path.resolve(packageDirectory, "package.json");
    const projectPath = path.resolve(packageDirectory, "project.json");

    if (!existsSync(manifestPath) || !existsSync(projectPath)) {
      return null;
    }

    const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
      readonly bin?: Record<string, string> | string;
      readonly name: string;
      readonly publishConfig?: unknown;
      readonly version: string;
    };
    const project = JSON.parse(readFileSync(projectPath, "utf8")) as {
      readonly name: string;
      readonly tags?: readonly string[];
    };

    if (!manifest.publishConfig || !project.tags?.includes("type:package")) {
      return null;
    }

    let binaryName: string | undefined;
    if (manifest.bin && childName.endsWith("-cli")) {
      binaryName =
        typeof manifest.bin === "string"
          ? childName
          : Object.keys(manifest.bin)[0];
    }

    if (binaryName) {
      return {
        binary: binaryName,
        name: manifest.name,
        tarball: project.name,
        version: manifest.version,
      };
    }

    return {
      name: manifest.name,
      tarball: project.name,
      version: manifest.version,
    };
  }

  /**
   * Resolves publishable packages under a single toolchain family directory.
   */
  private resolveFamilyPackages(familyDirectory: string): PublishablePackage[] {
    const packages: PublishablePackage[] = [];
    const children = readdirSync(familyDirectory, { withFileTypes: true });

    for (const child of children) {
      if (!child.isDirectory()) {
        continue;
      }

      const item = this.parsePackageCandidate(familyDirectory, child.name);
      if (item) {
        packages.push(item);
      }
    }

    return packages;
  }

  // 🌎 Public Methods

  /**
   * Dynamically resolves all publishable packages in `packages/ic-suite`.
   *
   * @param workspaceRoot - Absolute path to the workspace root directory.
   * @returns Array of publishable packages with names, tarball bases, and CLI binaries.
   */
  public resolvePublishablePackages(
    workspaceRoot: string,
  ): PublishablePackage[] {
    const icSuiteDirectory = path.resolve(
      workspaceRoot,
      "packages",
      "ic-suite",
    );

    if (!existsSync(icSuiteDirectory)) {
      return [];
    }

    const packages: PublishablePackage[] = [];
    const families = readdirSync(icSuiteDirectory, { withFileTypes: true });

    for (const family of families) {
      if (!family.isDirectory()) {
        continue;
      }

      const familyDirectory = path.resolve(icSuiteDirectory, family.name);
      packages.push(...this.resolveFamilyPackages(familyDirectory));
    }

    return packages.toSorted((first, second) =>
      first.name.localeCompare(second.name),
    );
  }

  /**
   * Installs every packed publishable package into a consumer outside the
   * workspace and exercises it: each package's import typechecks, each command
   * line runs, the project graph builds with the Nx plugins registered, and
   * one inferred target per plugin passes a healthy project and fails a
   * broken one. Nothing is ever published.
   *
   * @param workspaceRoot - Absolute path to the workspace root directory.
   * @returns Verification result including success status, counts, and error messages.
   */
  public verifyPublishablePackages(
    workspaceRoot: string,
  ): PublishablePackagesVerificationResult {
    const tarballsDirectory = path.resolve(workspaceRoot, "dist", "tarballs");
    const publishablePackages = this.resolvePublishablePackages(workspaceRoot);
    const result = {
      binaryCount: publishablePackages.filter((item) => item.binary).length,
      packageCount: publishablePackages.length,
    };

    if (!existsSync(tarballsDirectory)) {
      return {
        ...result,
        messages: [TARBALLS_DIRECTORY_MISSING_MESSAGE],
        succeeded: false,
      };
    }

    const missing = this.findMissingTarballs(
      tarballsDirectory,
      publishablePackages,
    );
    if (missing.length > 0) {
      return {
        ...result,
        messages: [formatMissingTarballsMessage(missing)],
        succeeded: false,
      };
    }

    const consumer = this.consumerService.createConsumer({
      publishablePackages,
      tarballsDirectory,
      workspaceRoot,
    });

    try {
      const installMessages = this.consumerService.installConsumer(consumer);
      const messages =
        installMessages.length > 0
          ? installMessages
          : this.checksService.verifyConsumer(consumer, publishablePackages);

      return { ...result, messages, succeeded: messages.length === 0 };
    } finally {
      this.consumerService.removeConsumer(consumer);
    }
  }
}
