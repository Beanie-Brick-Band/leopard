"use client";

import React, { Component } from "react";
// Note: ScrubberProps is a TypeScript interface and is not used for JS projects
import { Scrubber, ScrubberProps } from "react-scrubber";

import "react-scrubber/lib/scrubber.css";

export const TextReplayScrubberComponent: React.FC<ScrubberProps> = () => {
  const testToReplay =
    "Display This Text Character by Character Based on Scrubber Position";

  const SNAP_RELEASE_THRESHOLD = 0.5; // when released within this distance, snap to marker
  const STICK_THRESHOLD = 0.5; // while dragging, within this distance the cursor will "stick"
  const STICK_HYSTERESIS = 1.0; // distance to leave a stick once engaged

  const markers = [74, 88];

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

  const nearestMarker = (v: number) => {
    if (!markers || markers.length === 0) return null;
    let nearest = markers[0];
    let best = Math.abs(v - nearest);
    for (let i = 1; i < markers.length; i++) {
      const d = Math.abs(v - markers[i]);
      if (d < best) {
        best = d;
        nearest = markers[i];
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
      setState((s) => ({
        ...s,
        value: found.marker,
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
        const dist = Math.abs(value - (s.stickingTo as number));
        if (dist <= STICK_HYSTERESIS) {
          // Keep sticking
          return { ...s, value: s.stickingTo as number, state: "Scrub Change" };
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
    <div className="w-full space-y-4">
      <div className="min-h-[3rem] rounded border border-gray-200 bg-gray-50 p-4">
        <p className="font-mono text-lg text-black">{displayedText}</p>
      </div>

      <Scrubber
        min={0}
        max={100}
        value={state.value}
        onScrubStart={handleScrubStart}
        onScrubEnd={handleScrubEnd}
        onScrubChange={handleScrubChange}
        markers={markerPositions}
      />

      <div className="mt-4 flex gap-8 text-center text-sm text-gray-600">
        <p>Position: {state.value.toFixed(1)}</p>
        <p>
          Characters: {charCount}/{testToReplay.length}
        </p>
        <p>State: {state.state}</p>
      </div>
    </div>
  );
};
