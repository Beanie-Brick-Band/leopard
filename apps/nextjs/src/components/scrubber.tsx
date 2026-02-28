"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { clsx } from "clsx";
import { usePaginatedQuery, useQuery } from "convex/react";
import { Scrubber } from "react-scrubber";
import ShikiHighlighter from "react-shiki";

import type { Id } from "@package/backend/convex/_generated/dataModel";
import { api } from "@package/backend/convex/_generated/api";

import "react-scrubber/lib/scrubber.css";

interface ReplayContentChange {
  range: Range;
  text: string;
  filePath: string;
}

interface ReplayEvent {
  timestamp: number;
  contentChanges: ReplayContentChange[];
}

const INITIAL_PAGE_SIZE = 10;
const PAGE_LOAD_SIZE = 10;

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

export const TextReplayScrubberComponent: React.FC = () => {
  // TODO: FiX THIS TO BE PROPER REPLAY INSTEAD OF DEV OVERWRITE WORKSPACE
  const searchParams = useSearchParams();

  const workspaceId = (searchParams.get("workspaceId") ??
    "jx757hjx7ze0r9pgqnb7atp6eh80fyxc") as Id<"workspaces">;

  const [snapshotAsOfTimestamp] = React.useState(() => Date.now());
  const replayBounds = useQuery(api.web.replay.getReplayBounds, {
    workspaceId,
    asOfTimestamp: snapshotAsOfTimestamp,
  });
  const snapshotEndTimestamp = replayBounds?.endTimestamp ?? 0;

  const {
    results: userTranscript,
    status: paginationStatus,
    loadMore,
  } = usePaginatedQuery(
    api.web.replay.getReplay,
    { workspaceId, endTimestamp: snapshotEndTimestamp },
    { initialNumItems: INITIAL_PAGE_SIZE },
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

  // Replay position is mapped to a fixed snapshot time range.
  const targetTimestamp = React.useMemo(() => {
    const startTimestamp = replayBounds?.startTimestamp;
    const endTimestamp = replayBounds?.endTimestamp;

    if (startTimestamp == null || endTimestamp == null) return null;

    const replayDuration = Math.max(0, endTimestamp - startTimestamp);
    return startTimestamp + Math.round((state.value / 100) * replayDuration);
  }, [replayBounds?.endTimestamp, replayBounds?.startTimestamp, state.value]);

  const displayedUserTranscript = React.useMemo(() => {
    if (targetTimestamp == null) return [] as ReplayEvent[];
    return userTranscript.filter((event) => event.timestamp <= targetTimestamp);
  }, [targetTimestamp, userTranscript]);

  const loadedEndTimestamp =
    userTranscript.length > 0
      ? (userTranscript[userTranscript.length - 1]?.timestamp ?? null)
      : null;

  useEffect(() => {
    if (targetTimestamp == null) return;
    if (paginationStatus !== "CanLoadMore") return;
    if (loadedEndTimestamp == null || loadedEndTimestamp < targetTimestamp) {
      loadMore(PAGE_LOAD_SIZE);
    }
  }, [loadedEndTimestamp, loadMore, paginationStatus, targetTimestamp]);

  // Extract all unique file paths from the transcript
  const allFilePaths = React.useMemo(() => {
    const paths = new Set<string>();
    userTranscript.forEach((event) => {
      event.contentChanges.forEach((change) => {
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
    if (displayedUserTranscript.length === 0) return;

    const lastEvent =
      displayedUserTranscript[displayedUserTranscript.length - 1];
    if (!lastEvent) return;

    const lastChange =
      lastEvent.contentChanges[lastEvent.contentChanges.length - 1];
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

    displayedUserTranscript.forEach((event) => {
      event.contentChanges.forEach((change) => {
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

  return (
    <div className="h-max w-full space-y-4">
      {allFilePaths.length > 1 && (
        <div className="flex gap-0 overflow-x-auto border border-gray-200 bg-gray-100 p-1 dark:border-gray-700 dark:bg-gray-900">
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
                    ? "bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100"
                    : "bg-transparent text-gray-600 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-800",
                  index > 0 && "border-l border-gray-300 dark:border-gray-600",
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
