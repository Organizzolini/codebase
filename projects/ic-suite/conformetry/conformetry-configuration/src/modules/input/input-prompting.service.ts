import { Injectable } from "@nestjs/common";
import prompts from "prompts";

import { InputSchemaService } from "./input-schema.service";
import { ALL_TEMPLATES_SELECTION, missingInputError } from "./input.constants";

import type { PromptRunner, SchemaInput, TemplateChoice } from "./input.types";

/**
 * Asks the user for input values interactively.
 *
 * Whether anybody *can* be asked is decided here rather than by the caller,
 * and `promptForInput` refuses rather than draws itself when nobody can. That
 * used to be the caller's job, behind a `--no-interactive` flag; a flag is a
 * poor place for it, because forgetting to consult it is what hung this CLI
 * in non-interactive environments.
 *
 * `isAtTerminal` stays public because some callers genuinely need the question
 * rather than the refusal: an **optional** input nobody can be asked about is
 * left out where a required one is refused, and the two template pickers below
 * are only ever reached once a command has already asked it.
 *
 * Those pickers widen this service's remit from "values a schema declares" to
 * "also, which template to run". That is a deliberate trade: one prompting
 * seam is easier to keep honest than two, and a second one would have to read
 * the terminal for itself.
 */
@Injectable()
export class InputPromptingService {
  // 🏗 Dependency Injection

  constructor(private readonly inputSchemaService: InputSchemaService) {}

  // 🔐 Private Fields

  /** Overridable so tests never touch a real terminal. */
  private readonly promptRunner: PromptRunner = prompts;

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Refuses to draw a prompt nobody can answer.
   *
   * `prompts` does not fail on a non-terminal stdin — it renders the menu,
   * never resolves, and lets the process exit 0, so a run that generated
   * nothing reads as one that succeeded.
   */
  private assertCanPrompt(inputName: string): void {
    if (!this.isAtTerminal()) {
      throw missingInputError(inputName);
    }
  }

  /** Renders one template as a choice, omitting an absent description. */
  private describeChoice(template: TemplateChoice): {
    description?: string;
    title: string;
    value: string;
  } {
    return {
      ...(template.description === undefined
        ? {}
        : { description: template.description }),
      title: template.name,
      value: template.name,
    };
  }

  // 🌎 Public Methods

  /**
   * Whether anybody is there to answer a question.
   *
   * The one place the terminal is read, so the refusal in front of a prompt
   * and the caller's decision to skip an optional input cannot disagree about
   * what counts as interactive. `isTTY` is read as falsy rather than coerced:
   * `@types/node` calls it a `boolean` while it is `undefined` off a terminal,
   * so lint rejects the coercion that would say so.
   */
  public isAtTerminal(): boolean {
    return process.stdin.isTTY;
  }

  /**
   * Prompts for one value, offering a choice list when the schema declares an
   * `enum` and free text otherwise.
   */
  public async promptForInput(input: SchemaInput): Promise<string | undefined> {
    this.assertCanPrompt(input.inputName);

    const enumValues = this.inputSchemaService.readEnumValues(
      input.propertySchema,
    );
    const response = await this.promptRunner({
      ...(enumValues.length > 0
        ? {
            choices: enumValues.map((value) => ({ title: value, value })),
            type: "select",
          }
        : { type: "text" }),
      message: this.inputSchemaService.readPromptMessage(input),
      name: "value",
      validate: (value: unknown): string | true => {
        return this.inputSchemaService.validateValue({ input, value });
      },
    });
    const value: unknown = response.value;

    return typeof value === "string" ? value : undefined;
  }

  /**
   * Asks which single template to run, filtering as the caller types.
   *
   * Autocomplete rather than a plain select because a template name is long
   * by design — `nestjs-service-module` — and typing a fragment is what makes
   * that cheap. Whether anybody can be asked at all is the caller's decision,
   * already taken by the time this is reached.
   */
  public async promptForTemplate(
    templates: readonly TemplateChoice[],
  ): Promise<string | undefined> {
    const response = await this.promptRunner({
      choices: templates.map((template) => this.describeChoice(template)),
      message: "Which template should be rendered?",
      name: "template",
      type: "autocomplete",
    });
    const value: unknown = response.template;

    return typeof value === "string" ? value : undefined;
  }

  /**
   * Asks which templates to narrow a run to, offering the `all` sentinel
   * alongside them so the picker can express everything the flag can.
   *
   * Ticking nothing resolves to no selection rather than an empty one: an
   * empty narrowing would validate nothing at all, where the caller plainly
   * declined to narrow.
   */
  public async promptForTemplates(
    templates: readonly TemplateChoice[],
  ): Promise<string[] | undefined> {
    const response = await this.promptRunner({
      choices: [
        {
          description: "Every configured template",
          title: ALL_TEMPLATES_SELECTION,
          value: ALL_TEMPLATES_SELECTION,
        },
        ...templates.map((template) => this.describeChoice(template)),
      ],
      message: "Which templates should be validated?",
      name: "templates",
      type: "autocompleteMultiselect",
    });
    const value: unknown = response.templates;

    if (!Array.isArray(value)) {
      return undefined;
    }

    const entries: unknown[] = value;
    const selected = entries.filter((entry) => typeof entry === "string");

    return selected.length === 0 ? undefined : selected;
  }
}
