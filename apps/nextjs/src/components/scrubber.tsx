"use client";

import React from "react";
import { useQuery } from "convex/react";
import { Scrubber } from "react-scrubber";
import ShikiHighlighter from "react-shiki";

import type { Id } from "@package/backend/convex/_generated/dataModel";
import { api } from "@package/backend/convex/_generated/api";
import { assert } from "@package/validators/assert";

import "react-scrubber/lib/scrubber.css";

export const TextReplayScrubberComponent: React.FC = () => {
  const testToReplay = `def fizzbuzz(n):
    for i in range(1, n + 1):
        if i % 3 == 0 and i % 5 == 0:
            print("FizzBuzz")
        elif i % 3 == 0:
            print("Fizz")
        elif i % 5 == 0:
            print("Buzz")
        else:
            print(i)

fizzbuzz(100)

# String concatenation implementation
def fizzbuzz2(n):
    result = []
    for i in range(1, n + 1):
        output = ""
        if i % 3 == 0:
            output += "Fizz"
        if i % 5 == 0:
            output += "Buzz"
        result.append(output if output else str(i))
    
    for item in result:
        print(item)

fizzbuzz2(100)

# Join implementation
def fizzbuzz3(n):
    fizz_buzz_map = {3: "Fizz", 5: "Buzz"}
    
    for i in range(1, n + 1):
        output = "".join(word for divisor, word in fizz_buzz_map.items() if i % divisor == 0)
        print(output or i)

fizzbuzz3(100)`;

  // A list of line numbers and the character added. The line numbers have the line first, followed by the column.
  // If the previous column is one greater than the current, that means that a character was deleted
  // TODO: implement workspace session retrieval flow
  const userTranscript = useQuery(api.web.replay.getReplay, {
    workspaceId: "jx75g1jdes38h6v3bq54w7z2zn7z51kf" as Id<"workspaces">,
  });

  const SNAP_RELEASE_THRESHOLD = 0.5; // when released within this distance, snap to marker
  const STICK_THRESHOLD = 0.5; // while dragging, within this distance the cursor will "stick"
  const STICK_HYSTERESIS = 1.0; // distance to leave a stick once engaged

  const markers = [30.7, 70.4];

  const markerPositions = markers.map((m) => ({
    start: m - 0.3,
    end: m + 0.3,
  }));

  const [state, setState] = React.useState<{
    value: number;
    state: string;
    isScrubbing?: boolean;
    stickingTo?: number | null;
  }>({
    value: 50,
    state: "None",
    isScrubbing: false,
    stickingTo: null,
  });

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
    setState((s) => ({ ...s, value, state: "Scrub Start", isScrubbing: true }));
  };

  const handleScrubEnd = (value: number) => {
    // On release, if within SNAP_RELEASE_THRESHOLD of a marker, snap to it.
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
    // While scrubbing, if close enough to a marker, "stick" to it.
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

  // Original character-based scrubbing (simple version)
  const charCount = Math.round((state.value / 100) * testToReplay.length);
  const displayedTextSimple = testToReplay.slice(0, charCount);

  // Calculate how many events to replay based on scrubber position
  const totalEvents = userTranscript?.length ?? 0;
  const eventsToReplay = Math.round((state.value / 100) * totalEvents);
  const displayedUserTranscript = userTranscript?.slice(0, eventsToReplay);

  // Build the text progressively by replaying events
  const displayedOutputText = React.useMemo(() => {
    const lines: string[] = [""];

    displayedUserTranscript?.forEach((event) => {
      event.metadata.contentChanges.forEach((change) => {
        assert(
          change.range.start.column <=
            (lines[change.range.start.line]?.length ?? 0),
          "Column index out of bounds",
        );

        const isInsertion =
          change.range.start.line === change.range.end.line &&
          change.range.start.column === change.range.end.column;

        if (isInsertion) {
          insertText(lines, change.range.start, change.text);
        } else {
          // Otherwise, is a replacement. A deletion is a replacement where change.text = ""
          deleteText(lines, change.range);
          insertText(lines, change.range.start, change.text);
        }
      });
    });

    return lines.join("\n");
  }, [displayedUserTranscript]);

  // Choose which display mode to use
  // Set to true to use action-based replay, false to use simple character scrubbing
  const useActionBasedReplay = Boolean(true);
  const displayedText = useActionBasedReplay
    ? displayedOutputText
    : displayedTextSimple;

  return (
    <div className="h-max w-full space-y-4">
      <div className="flex h-[75vh] flex-col-reverse overflow-y-auto rounded-md">
        <ShikiHighlighter
          language="python"
          className="w-full grow [&>pre]:h-full"
          theme={{
            light: "github-light",
            dark: "github-dark",
          }}
          defaultColor="light-dark()"
          showLineNumbers={true}
          showLanguage={true}
        >
          {displayedText}
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

      <div className="text-md mt-4 flex gap-8 text-center text-gray-300">
        <p>Position: {state.value.toFixed(1)}</p>
        <p>
          Remaining Characters: {charCount}/{testToReplay.length}
        </p>
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
  assert(range.start.line < lines.length, "Start line index out of bounds");
  assert(range.end.line < lines.length, "End line index out of bounds");
  assert(
    range.start.column <= (lines[range.start.line]?.length ?? 0),
    "Start column index out of bounds",
  );
  assert(
    range.end.column <= (lines[range.end.line]?.length ?? 0),
    "End column index out of bounds",
  );

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
