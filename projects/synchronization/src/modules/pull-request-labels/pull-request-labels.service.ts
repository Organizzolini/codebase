import { createRequire } from "node:module";
import path from "node:path";

import { Injectable } from "@nestjs/common";

import {
  CONVENTIONAL_CONFIG_PATH,
  conventionalConfigSchema,
  repositoryLabelsSchema,
  SCOPE_LABEL_COLOR,
  STATIC_LABELS,
  TRACKED_LABEL_PREFIXES,
  TYPE_LABEL_COLOR,
} from "./pull-request-labels.constants";

import type {
  ConventionalLabel,
  LabelReconciliationPlan,
} from "./pull-request-labels.types";

/**
 * Decides what the repository's label vocabulary should be, and how far it has
 * drifted from that.
 *
 * Every comparison happens here, in one place, over values that were never
 * encoded on the way in. A color or a description is a plain string
 * comparison, so an identical value can never compare unequal because it
 * round-tripped through some intermediate text format on the way from `gh`.
 */
@Injectable()
export class PullRequestLabelsService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  private readonly requireFromCurrentModule = createRequire(import.meta.url);

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Whether this reconciliation owns the label with this name. */
  private isTrackedLabel(labelName: string): boolean {
    return TRACKED_LABEL_PREFIXES.some((prefix) =>
      labelName.startsWith(prefix),
    );
  }

  // 🌎 Public Methods

  /** Reads the labels `gh label list --json name,color,description` returned. */
  public parseRepositoryLabels(listing: string): ConventionalLabel[] {
    return repositoryLabelsSchema.parse(JSON.parse(listing) as unknown);
  }

  /**
   * Works out what reconciling would create, update, and leave behind.
   *
   * A label is missing, drifted, or stale — never deletable. Deleting is the
   * one thing a reconciliation must not decide on its own: a label somebody
   * removed from the configuration may still be on open pull requests, and
   * removing it there loses information no run can put back.
   */
  public planReconciliation(options: {
    currentLabels: readonly ConventionalLabel[];
    expectedLabels: readonly ConventionalLabel[];
  }): LabelReconciliationPlan {
    const { currentLabels, expectedLabels } = options;
    const currentLabelsByName = new Map(
      currentLabels.map((label) => [label.name, label]),
    );
    const expectedNames = new Set(expectedLabels.map((label) => label.name));

    return {
      creations: expectedLabels.filter(
        (label) => !currentLabelsByName.has(label.name),
      ),
      staleNames: currentLabels
        .filter(
          (label) =>
            this.isTrackedLabel(label.name) && !expectedNames.has(label.name),
        )
        .map((label) => label.name),
      updates: expectedLabels.filter((label) => {
        const currentLabel = currentLabelsByName.get(label.name);

        return (
          currentLabel !== undefined &&
          (currentLabel.color !== label.color ||
            currentLabel.description !== label.description)
        );
      }),
    };
  }

  /**
   * The whole vocabulary this repository must carry.
   *
   * Read fresh from `conventional.config.cjs` on every run rather than copied
   * here, so a scope added to the configuration needs no matching change in
   * this project. A scope name is lowercased because a label name is
   * case-sensitive while `JimmyPaolini` is a scope spelled with capitals.
   */
  public readExpectedLabels(): ConventionalLabel[] {
    const configPath = path.join(process.cwd(), CONVENTIONAL_CONFIG_PATH);
    const config = conventionalConfigSchema.parse(
      this.requireFromCurrentModule(configPath) as unknown,
    );

    return [
      ...config.types.map((type) => ({
        color: TYPE_LABEL_COLOR,
        description: type.description,
        name: `type:${type.name}`,
      })),
      ...config.scopes.map((scope) => ({
        color: SCOPE_LABEL_COLOR,
        description: scope.description,
        name: `scope:${scope.name.toLowerCase()}`,
      })),
      ...STATIC_LABELS,
    ];
  }
}
