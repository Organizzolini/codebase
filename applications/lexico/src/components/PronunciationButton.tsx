import { Loader2, Volume2 } from "lucide-react";
import { type ReactElement, useCallback, useState } from "react";

import { Button } from "@codebase/components-web";

import { getPronunciation } from "../lib/pronunciation";

// 🔖 Type
/**
 * Props for the PronunciationButton component.
 */
export interface PronunciationButtonProperties {
  className?: string;
  dialect?: "classical" | "ecclesiastical";
  text: string;
}

// 🧩 Component
export const PronunciationButton = (
  properties: PronunciationButtonProperties,
): ReactElement => {
  const { className, dialect = "classical", text } = properties;

  // 🪝 Hooks
  const [isLoading, setIsLoading] = useState(false);

  // 🏗 Setup

  // 💪 Handler
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

  // 🎨 Markup

  // ♻️ Lifecycle

  // 🔌 Short Circuits

  return (
    <div className={className}>
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
};
