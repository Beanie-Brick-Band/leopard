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

  // Map scrubber value (0-100) to character count
  const charCount = Math.round((state.value / 100) * testToReplay.length);
  const displayedText = testToReplay.slice(0, charCount);

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
