import { createFileRoute } from "@tanstack/react-router";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@codebase/components-web";

import type { ReactNode } from "react";

// 🧭 Route

/**
 * Grammar reference tools.
 */
export const Route = createFileRoute("/tools")({
  component: ToolsPage,
});

// 🧩 Component

/**
 * Tools page component displaying available Latin learning utilities.
 *
 * @returns React node.
 */
function ToolsPage(): ReactNode {
  // 🪝 Hooks

  // 🏗 Setup

  // 💪 Handlers

  // ♻️ Lifecycle

  // 🏁 Early Returns

  // 🎨 Markup
  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-bold">Tools</h1>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Macronizer</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            <p>
              Add macrons (long vowel marks) to Latin text. Paste your text and
              get it with proper vowel length markings.
            </p>
            <p className="mt-4 text-sm italic">Coming soon!</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Text Reader</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            <p>
              Read Latin text with clickable words. Click any word to see its
              dictionary entry and grammatical forms.
            </p>
            <p className="mt-4 text-sm italic">Coming soon!</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Pronunciation</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            <p>
              Listen to Latin words pronounced using classical Latin
              pronunciation. Powered by AWS Polly.
            </p>
            <p className="mt-4 text-sm italic">Coming soon!</p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
