"use client";

import React from "react";
import { Scrubber } from "react-scrubber";
import ShikiHighlighter from "react-shiki";

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
  const userTranscript = React.useMemo(
    () => [
      { line: 1, col: 0, endLine: 1, endCol: 0, char: "d" },
      { line: 1, col: 1, endLine: 1, endCol: 1, char: "e" },
      { line: 1, col: 2, endLine: 1, endCol: 2, char: "f" },
      { line: 1, col: 3, endLine: 1, endCol: 3, char: " " },
      { line: 1, col: 4, endLine: 1, endCol: 4, char: "f" },
      { line: 1, col: 5, endLine: 1, endCol: 5, char: "i" },
      { line: 1, col: 6, endLine: 1, endCol: 6, char: "t" },
      { line: 1, col: 7, endLine: 1, endCol: 7, char: "t" },
      { line: 1, col: 8, endLine: 1, endCol: 8, char: "i" },
      { line: 1, col: 9, endLine: 1, endCol: 8, char: "" },
      { line: 1, col: 8, endLine: 1, endCol: 7, char: "" },
      { line: 1, col: 7, endLine: 1, endCol: 6, char: "" },
      { line: 1, col: 6, endLine: 1, endCol: 6, char: "z" },
      { line: 1, col: 7, endLine: 1, endCol: 7, char: "z" },
      { line: 1, col: 8, endLine: 1, endCol: 8, char: "b" },
      { line: 1, col: 9, endLine: 1, endCol: 9, char: "u" },
      { line: 1, col: 10, endLine: 1, endCol: 10, char: "z" },
      { line: 1, col: 11, endLine: 1, endCol: 11, char: "z" },
      { line: 1, col: 12, endLine: 1, endCol: 12, char: "(" },
      { line: 1, col: 13, endLine: 1, endCol: 13, char: "n" },
      { line: 1, col: 14, endLine: 1, endCol: 14, char: ")" },
      { line: 1, col: 15, endLine: 1, endCol: 15, char: ":" },
      { line: 2, col: 0, endLine: 2, endCol: 2, char: "  " },
      { line: 2, col: 2, endLine: 2, endCol: 3, char: "p" },
      { line: 2, col: 3, endLine: 2, endCol: 4, char: "r" },
      { line: 2, col: 4, endLine: 2, endCol: 5, char: "i" },
      { line: 2, col: 5, endLine: 2, endCol: 6, char: "n" },
      { line: 2, col: 6, endLine: 2, endCol: 7, char: "t" },
      { line: 2, col: 7, endLine: 2, endCol: 8, char: "(" },
      { line: 2, col: 8, endLine: 2, endCol: 9, char: '"' },
      { line: 2, col: 9, endLine: 2, endCol: 10, char: "F" },
      { line: 2, col: 10, endLine: 2, endCol: 11, char: "i" },
      { line: 2, col: 11, endLine: 2, endCol: 12, char: "z" },
      { line: 2, col: 12, endLine: 2, endCol: 13, char: "z" },
      { line: 2, col: 13, endLine: 2, endCol: 17, char: "Buzz" },
      { line: 2, col: 17, endLine: 2, endCol: 18, char: '"' },
      { line: 2, col: 18, endLine: 2, endCol: 19, char: ")" },
      // ...more edits
    ],
    [],
  );

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

  // Calculate how many actions to replay based on scrubber position
  const totalActions = userTranscript.length;
  const actionsToReplay = Math.round((state.value / 100) * totalActions);

  // Build the text progressively by replaying actions
  const displayedOutputText = React.useMemo(() => {
    // Initialize with empty lines
    const lines: string[] = [""];

    for (let i = 0; i < actionsToReplay; i++) {
      const action = userTranscript[i];
      if (!action) continue;

      // Ensure we have enough lines
      while (lines.length < action.line) {
        lines.push("");
      }

      const lineIndex = action.line - 1; // Convert to 0-indexed
      const currentLine = lines[lineIndex] ?? "";

      if (action.endCol < action.col) {
        // Deletion: remove character(s)
        const charsToDelete = action.col - action.endCol;
        lines[lineIndex] =
          currentLine.slice(0, action.endCol) +
          currentLine.slice(action.endCol + charsToDelete);
      } else {
        // Insertion: add character(s) at position
        lines[lineIndex] =
          currentLine.slice(0, action.col) +
          action.char +
          currentLine.slice(action.col);
      }
    }

    return lines.join("\n");
  }, [actionsToReplay, userTranscript]);

  // Choose which display mode to use
  // Set to true to use action-based replay, false to use simple character scrubbing
  const useActionBasedReplay = true as boolean;
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
