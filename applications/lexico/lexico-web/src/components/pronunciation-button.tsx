import { Loader2, Volume2 } from "lucide-react";
import { useCallback, useState } from "react";

import { Button } from "@codebase/components-web";

import { getPronunciation } from "../lib/pronunciation";

import type { ReactNode } from "react";

// 🔖 Type

/**
 * Properties for the PronunciationButton component.
 */
export interface PronunciationButtonProperties {
  className?: string;
  dialect?: "classical" | "ecclesiastical";
  text: string;
}

// 🧩 Component

/**
 * Plays the pronunciation of a word in the chosen dialect.
 */
export function PronunciationButton(
  properties: Readonly<PronunciationButtonProperties>,
): ReactNode {
  const { className, dialect = "classical", text } = properties;

  // 🪝 Hooks
  const [isLoading, setIsLoading] = useState(false);

  // 🏗 Setup

  // 💪 Handlers
  const handlePlay = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getPronunciation({
        data: { dialect, text },
      });

      if (result?.audio) {
        // Decode base64 audio and play
        const audioData = atob(result.audio);
        const audioArray = new Uint8Array(audioData.length);
        for (let index = 0; index < audioData.length; index++) {
          audioArray[index] = audioData.codePointAt(index) ?? 0;
        }

        const blob = new Blob([audioArray], { type: result.contentType });
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);

        audio.addEventListener("ended", () => {
          URL.revokeObjectURL(url);
        });

        await audio.play();
      }
    } catch (error) {
      console.error("Failed to play pronunciation:", error);
    } finally {
      setIsLoading(false);
    }
  }, [text, dialect]);

  // ♻️ Lifecycle

  // 🏁 Early Returns

  // 🎨 Markup
  return (
    <div
      className={className}
      data-testid="pronunciation-button"
    >
      <Button
        disabled={isLoading}
        onClick={() => void handlePlay()}
        size="icon"
        title={`Play ${dialect} pronunciation`}
        variant="ghost"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Volume2 className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}
