import type {
  FormMood,
  formNumberValues,
  FormTense,
  formVoiceValues,
  Lexeme,
} from "@codebase/lexico-entities";

// 🏷️ Types

/**
 * Arguments for building finite verb forms for specific persons, used in the FormsBuilderVerbProvider.
 */
export interface BuildFinitePersonFormsArguments {
  lexeme: Lexeme;
  mood: FormMood;
  number: (typeof formNumberValues)[number];
  numberData: Record<string, unknown>;
  tense: FormTense;
  voice: (typeof formVoiceValues)[number];
}

/**
 * Grammatical gender
 */
export type FormGender = "feminine" | "masculine" | "neuter";
