"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { clsx } from "clsx";
import { useQuery } from "convex/react";
import { Scrubber } from "react-scrubber";
import ShikiHighlighter from "react-shiki";

import type { Id } from "@package/backend/convex/_generated/dataModel";
import { api } from "@package/backend/convex/_generated/api";

import "react-scrubber/lib/scrubber.css";

// Helper function for detecting the language for syntax highlighting
function getLanguageFromFilePath(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase() ?? "";
  const languageMap: Record<string, string> = {
    py: "python",
    js: "javascript",
    ts: "typescript",
    tsx: "tsx",
    jsx: "jsx",
    java: "java",
    cpp: "cpp",
    c: "c",
    cs: "csharp",
    go: "go",
    rs: "rust",
    rb: "ruby",
    php: "php",
    swift: "swift",
    kt: "kotlin",
    md: "markdown",
    json: "json",
    yaml: "yaml",
    yml: "yaml",
    html: "html",
    css: "css",
    scss: "scss",
    sql: "sql",
    sh: "bash",
    bash: "bash",
  };
  return languageMap[ext] ?? "plaintext";
}

interface TextReplayScrubberProps {
  workspaceId?: Id<"workspaces">;
}

export const TextReplayScrubberComponent: React.FC<TextReplayScrubberProps> = ({
  workspaceId,
}) => {
  const searchParams = useSearchParams();

  const selectedWorkspaceId = (workspaceId ??
    searchParams.get("workspaceId")) as Id<"workspaces"> | null;

  // TODO: implement workspace session retrieval flow
  const userTranscript = useQuery(
    api.web.replay.getReplay,
    selectedWorkspaceId ? { workspaceId: selectedWorkspaceId } : "skip",
  );

  const SNAP_RELEASE_THRESHOLD = 0.5; // when released within this distance, snap to marker
  const STICK_THRESHOLD = 0.5; // while dragging, within this distance the cursor will "stick"
  const STICK_HYSTERESIS = 1.0; // distance to leave a marker once engaged

  const markers: number[] = [];

  const markerPositions = markers.map((m) => ({
    start: m - 0.3,
    end: m + 0.3,
  }));

  const [state, setState] = useState<{
    value: number;
    state: string;
    isScrubbing?: boolean;
    stickingTo?: number | null;
  }>({
    value: 0,
    state: "None",
    isScrubbing: false,
    stickingTo: null,
  });

  const [isPlaying, setIsPlaying] = useState(false);

  // Autoplay effect
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setState((s) => {
        if (s.value >= 100) {
          setIsPlaying(false);
          return s;
        }
        // Advance by a small increment
        const newValue = Math.min(s.value + 0.5, 100);
        return { ...s, value: newValue };
      });
    }, 50); // Update every 50ms for smooth playback

    return () => clearInterval(interval);
  }, [isPlaying]);

  const nearestMarker = (
    v: number,
  ): { marker: number; distance: number } | null => {
    if (markers.length === 0) return null;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    let nearest = markers[0]!;
    let best = Math.abs(v - nearest);
    for (let i = 1; i < markers.length; i++) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const marker = markers[i]!;
      const d = Math.abs(v - marker);
      if (d < best) {
        best = d;
        nearest = marker;
      }
    }
    return { marker: nearest, distance: best };
  };

  const handleScrubStart = (value: number) => {
    setIsPlaying(false); // Pause when user starts scrubbing
    setState((s) => ({ ...s, value, state: "Scrub Start", isScrubbing: true }));
  };

  const handleScrubEnd = (value: number) => {
    // On release, if within SNAP_RELEASE_THRESHOLD of a marker, snap to that marker
    const found = nearestMarker(value);
    if (found && found.distance <= SNAP_RELEASE_THRESHOLD) {
      const markerValue = found.marker;
      setState((s) => ({
        ...s,
        value: markerValue,
        state: "Scrub End",
        isScrubbing: false,
        stickingTo: null,
      }));
    } else {
      setState((s) => ({
        ...s,
        value,
        state: "Scrub End",
        isScrubbing: false,
        stickingTo: null,
      }));
    }
  };

  const handleScrubChange = (value: number) => {
    // While scrubbing, if close enough to a marker, "stick" to that marker
    setState((s) => {
      if (!s.isScrubbing) {
        return { ...s, value, state: "Scrub Change" };
      }

      const found = nearestMarker(value);
      // If currently sticking to a marker, only release if we moved beyond hysteresis
      if (s.stickingTo != null) {
        const dist = Math.abs(value - s.stickingTo);
        if (dist <= STICK_HYSTERESIS) {
          // Keep sticking
          return { ...s, value: s.stickingTo, state: "Scrub Change" };
        } else {
          // Leave stick
          return { ...s, value, state: "Scrub Change", stickingTo: null };
        }
      }

      if (found && found.distance <= STICK_THRESHOLD) {
        // Engage stick
        return {
          ...s,
          value: found.marker,
          state: "Scrub Change",
          stickingTo: found.marker,
        };
      }

      return { ...s, value, state: "Scrub Change" };
    });
  };

  // Calculate how many events to replay based on scrubber position
  const totalEvents = userTranscript?.length ?? 0;
  const eventsToReplay = Math.round((state.value / 100) * totalEvents);
  const displayedUserTranscript = userTranscript?.slice(0, eventsToReplay);

  // Extract all unique file paths from the transcript
  const allFilePaths = React.useMemo(() => {
    const paths = new Set<string>();
    userTranscript?.forEach((event) => {
      event.metadata.contentChanges.forEach((change) => {
        paths.add(change.filePath);
      });
    });
    return Array.from(paths);
  }, [userTranscript]);

  // State that tracks the currently selected file
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);

  // Set initial file when transcript loads
  useEffect(() => {
    if (!selectedFilePath && allFilePaths.length > 0) {
      // TODO: fix cascading rendering issue ISSUE #193
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedFilePath(allFilePaths[0] ?? null);
    }
  }, [allFilePaths, selectedFilePath]);

  // Automatically switch to file being edited at current replay position
  useEffect(() => {
    if (!displayedUserTranscript || displayedUserTranscript.length === 0)
      return;

    const lastEvent =
      displayedUserTranscript[displayedUserTranscript.length - 1];
    if (!lastEvent) return;

    const lastChange =
      lastEvent.metadata.contentChanges[
        lastEvent.metadata.contentChanges.length - 1
      ];
    if (!lastChange) return;

    // Switch to that file if it's different from the current selection
    // only do so when the user is playing the replay, not when scrubbing
    if (!isPlaying && !state.isScrubbing) return;

    if (lastChange.filePath !== selectedFilePath) {
      // TODO: fix cascading rendering issue ISSUE #193
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedFilePath(lastChange.filePath);
    }
  }, [displayedUserTranscript, selectedFilePath, isPlaying, state.isScrubbing]);

  // Build the text progressively by replaying events for the selected file only
  const displayedOutputText = React.useMemo(() => {
    if (!selectedFilePath) return "";

    const lines: string[] = [""];

    displayedUserTranscript?.forEach((event) => {
      event.metadata.contentChanges.forEach((change) => {
        // Only apply changes for the currently selected file
        if (change.filePath !== selectedFilePath) return;

        const isInsertion =
          change.range.start.line === change.range.end.line &&
          change.range.start.column === change.range.end.column;

        if (isInsertion) {
          insertText(lines, change.range.start, change.text);
        } else {
          // A deletion is a replacement where change.text = ""
          deleteText(lines, change.range);
          insertText(lines, change.range.start, change.text);
        }
      });
    });

    return lines.join("\n");
  }, [displayedUserTranscript, selectedFilePath]);

  // Detect the language from the file path
  const detectedLanguage = React.useMemo(
    () =>
      selectedFilePath
        ? getLanguageFromFilePath(selectedFilePath)
        : "plaintext",
    [selectedFilePath],
  );

  const activeFileButtonRef = React.useRef<HTMLButtonElement>(null);

  // Scroll the active file button into view when selection changes
  React.useEffect(() => {
    if (activeFileButtonRef.current) {
      activeFileButtonRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [selectedFilePath]);

  if (!selectedWorkspaceId) {
    return (
      <p className="text-muted-foreground text-sm">No workspace ID provided</p>
    );
  }

  return (
    <div className="h-max w-full space-y-4">
      {allFilePaths.length > 1 && (
        <div className="border-border bg-muted/30 flex gap-0 overflow-x-auto border p-1">
          {allFilePaths.map((filePath, index) => {
            const fileName = filePath.split("/").pop() ?? filePath;
            const isActive = filePath === selectedFilePath;
            return (
              <button
                key={filePath}
                ref={isActive ? activeFileButtonRef : null}
                onClick={() => setSelectedFilePath(filePath)}
                className={clsx(
                  "group relative shrink-0 px-4 py-2.5 text-sm font-normal transition-all duration-500 ease-in-out",
                  isActive
                    ? "bg-background text-foreground"
                    : "text-muted-foreground hover:bg-muted bg-transparent",
                  index > 0 && "border-border border-l",
                )}
                title={filePath}
              >
                <span className="block whitespace-nowrap transition-all duration-500 ease-in-out">
                  {fileName}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div className="flex h-[75vh] flex-col-reverse overflow-y-auto rounded-md">
        <ShikiHighlighter
          language={detectedLanguage}
          className="w-full grow [&>pre]:h-full"
          theme={{
            light: "github-light",
            dark: "github-dark",
          }}
          defaultColor="light-dark()"
          showLineNumbers={true}
          showLanguage={true}
        >
          {displayedOutputText}
        </ShikiHighlighter>
      </div>

      <div className="h-8">
        <Scrubber
          min={0}
          max={100}
          value={state.value}
          onScrubStart={handleScrubStart}
          onScrubEnd={handleScrubEnd}
          onScrubChange={handleScrubChange}
          markers={markerPositions}
          className="[&_.bar]:h-4!"
        />
      </div>

      <div className="flex justify-center pb-8">
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="flex w-20 items-center justify-center rounded-md bg-blue-500 px-6 py-2 text-white transition-colors hover:bg-blue-600"
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <span className="-m-1 text-4xl">⏸</span>
          ) : (
            <span className="text-2xl">▶</span>
          )}
        </button>
      </div>
    </div>
  );
};

export interface TextDocumentPosition {
  line: number;
  column: number;
}

export interface Range {
  start: TextDocumentPosition;
  end: TextDocumentPosition;
}

export function insertText(
  lines: string[],
  position: TextDocumentPosition,
  text: string,
): void {
  const currentLine = lines[position.line] ?? "";

  const modifiedLine =
    currentLine.slice(0, position.column) +
    text +
    currentLine.slice(position.column);
  const splitLines = modifiedLine.split("\n");

  const [inlineText = "", ...newLineText] = splitLines;
  lines[position.line] = inlineText;
  lines.splice(position.line + 1, 0, ...newLineText);
}

export function deleteText(lines: string[], range: Range): void {
  const isMultiLineDeletion = range.start.line !== range.end.line;

  if (!isMultiLineDeletion) {
    const currentLine = lines[range.start.line] ?? "";
    lines[range.start.line] =
      currentLine.slice(0, range.start.column) +
      currentLine.slice(range.end.column);
  } else {
    const startLineContent = lines[range.start.line] ?? "";
    const endLineContent = lines[range.end.line] ?? "";

    // Keep content before start column on start line
    lines[range.start.line] = startLineContent.slice(0, range.start.column);

    // Remove lines between start and end (inclusive of end line)
    lines.splice(range.start.line + 1, range.end.line - range.start.line);

    // Append content after end column to start line
    lines[range.start.line] += endLineContent.slice(range.end.column);
  }
}
