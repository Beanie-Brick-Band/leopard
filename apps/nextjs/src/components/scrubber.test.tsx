import type { output } from "zod";
import { describe, expect, it } from "vitest";

import { WorkspaceEvent as WorkspaceEventSchema } from "@package/validators/workspaceEvents";

import type { Range, TextDocumentPosition } from "./scrubber";
import { deleteText, insertText } from "./scrubber";

type ReplayEvent = output<typeof WorkspaceEventSchema>;

function createReplayEvent(
  event: Omit<
    ReplayEvent,
    "_id" | "_creationTime" | "timestamp" | "workspaceId"
  > &
    Partial<
      Pick<ReplayEvent, "_id" | "_creationTime" | "timestamp" | "workspaceId">
    >,
): ReplayEvent {
  return WorkspaceEventSchema.parse({
    _id: "test-id",
    _creationTime: 0,
    timestamp: 0,
    workspaceId: "test-workspace",
    ...event,
  });
}

function getVisibleFilePathsFromTimeline(transcript: ReplayEvent[]): string[] {
  const paths = new Set<string>();

  transcript.forEach((event) => {
    if (event.eventType === "DID_CHANGE_TEXT_DOCUMENT") {
      event.metadata.contentChanges.forEach((change) => {
        paths.add(change.filePath);
      });
      return;
    }

    event.metadata.renamedFiles.forEach((rename) => {
      paths.delete(rename.oldFilePath);
      paths.add(rename.newFilePath);
    });
  });

  return Array.from(paths);
}

function replayFileContents(transcript: ReplayEvent[]): Map<string, string> {
  const fileContents = new Map<string, string[]>();

  transcript.forEach((event) => {
    if (event.eventType === "DID_CHANGE_TEXT_DOCUMENT") {
      event.metadata.contentChanges.forEach((change) => {
        const lines = fileContents.get(change.filePath) ?? [""];
        const isInsertion =
          change.range.start.line === change.range.end.line &&
          change.range.start.column === change.range.end.column;

        if (isInsertion) {
          insertText(lines, change.range.start, change.text);
        } else {
          deleteText(lines, change.range);
          insertText(lines, change.range.start, change.text);
        }

        fileContents.set(change.filePath, lines);
      });
      return;
    }

    event.metadata.renamedFiles.forEach((rename) => {
      const oldLines = fileContents.get(rename.oldFilePath) ?? [""];
      fileContents.set(rename.newFilePath, [...oldLines]);
      fileContents.delete(rename.oldFilePath);
    });
  });

  return new Map(
    Array.from(fileContents.entries()).map(([filePath, lines]) => [
      filePath,
      lines.join("\n"),
    ]),
  );
}

describe("insertText", () => {
  it("should insert text at the beginning of a line", () => {
    const lines = `world`.split("\n");
    const position: TextDocumentPosition = { line: 0, column: 0 };
    insertText(lines, position, "hello ");

    expect(lines.join("\n")).toBe(`hello world`);
  });

  it("should insert text in the middle of a single line", () => {
    const lines = `hello world`.split("\n");
    const position: TextDocumentPosition = { line: 0, column: 5 };
    insertText(lines, position, " beautiful");

    expect(lines.join("\n")).toBe(`hello beautiful world`);
  });

  it("should insert text at the end of a line", () => {
    const lines = `hello`.split("\n");
    const position: TextDocumentPosition = { line: 0, column: 5 };
    insertText(lines, position, " world");

    expect(lines.join("\n")).toBe(`hello world`);
  });

  it("should insert multi-line text creating new lines", () => {
    const lines = `function test() {
  return true;
    }`.split("\n");
    const position: TextDocumentPosition = { line: 1, column: 0 };
    insertText(lines, position, "    console.log('test');\n  ");

    expect(lines.join("\n")).toBe(`function test() {
    console.log('test');
    return true;
    }`);
  });

  it("should insert text on an empty line", () => {
    const lines = `line1

line3`.split("\n");
    const position: TextDocumentPosition = { line: 1, column: 0 };
    insertText(lines, position, "line2");

    expect(lines.join("\n")).toBe(`line1
line2
line3`);
  });

  it("should insert text with multiple newlines creating multiple new lines", () => {
    const lines = `start
end`.split("\n");
    const position: TextDocumentPosition = { line: 0, column: 5 };
    insertText(lines, position, "\nline1\nline2");

    expect(lines.join("\n")).toBe(`start
line1
line2
end`);
  });

  it("should insert text in the middle of a code block", () => {
    const lines = `function example() {
  const x = 1;
  const y = 2;
  return x + y;
}`.split("\n");
    const position: TextDocumentPosition = { line: 2, column: 13 };
    insertText(lines, position, " + 1");

    expect(lines.join("\n")).toBe(`function example() {
  const x = 1;
  const y = 2 + 1;
  return x + y;
}`);
  });

  it("should insert large chunks of text", () => {
    const lines = `headerfooter`.split("\n");
    const position: TextDocumentPosition = { line: 0, column: 6 };
    const largeText = Array.from(
      { length: 100 },
      (_, i) => `line ${i + 1}`,
    ).join("\n");
    insertText(lines, position, largeText + "\n");

    expect(lines.length).toBe(101);
    expect(lines[0]).toBe("headerline 1");
    expect(lines[1]).toBe("line 2");
    expect(lines[100]).toBe("footer");
  });
});

describe("deleteText", () => {
  it("should delete text in the middle of a single line", () => {
    const lines = `hello beautiful world`.split("\n");
    const range: Range = {
      start: { line: 0, column: 5 },
      end: { line: 0, column: 15 },
    };
    deleteText(lines, range);

    expect(lines.join("\n")).toBe(`hello world`);
  });

  it("should delete text at the beginning of a line", () => {
    const lines = `hello world`.split("\n");
    const range: Range = {
      start: { line: 0, column: 0 },
      end: { line: 0, column: 6 },
    };
    deleteText(lines, range);

    expect(lines.join("\n")).toBe(`world`);
  });

  it("should delete text at the end of a line", () => {
    const lines = `hello world`.split("\n");
    const range: Range = {
      start: { line: 0, column: 5 },
      end: { line: 0, column: 11 },
    };
    deleteText(lines, range);

    expect(lines.join("\n")).toBe(`hello`);
  });

  it("should delete entire line content", () => {
    const lines = `line1
line2
line3`.split("\n");
    const range: Range = {
      start: { line: 1, column: 0 },
      end: { line: 1, column: 5 },
    };
    deleteText(lines, range);

    expect(lines.join("\n")).toBe(`line1

line3`);
  });

  it("should delete multiple entire lines", () => {
    const lines = `line1
line2
line3
line4
line5`.split("\n");
    const range: Range = {
      start: { line: 1, column: 0 },
      end: { line: 4, column: 0 },
    };
    deleteText(lines, range);

    expect(lines.join("\n")).toBe(`line1
line5`);
  });

  it("should delete multi-line text starting in the middle of one line and ending in the middle of another", () => {
    const lines = `function example() {
  const x = 1;
  const y = 2;
  return x + y;
}`.split("\n");
    const range: Range = {
      start: { line: 1, column: 8 },
      end: { line: 3, column: 13 },
    };
    deleteText(lines, range);

    expect(lines.join("\n")).toBe(`function example() {
  const y;
}`);
  });
});
describe("switching files", () => {
  it("should handle insertions and deletions across different files independently", () => {
    const fileA = `line1
line2
line3`.split("\n");
    const fileB = `alpha
beta
gamma`.split("\n");

    // Insert into fileA
    insertText(fileA, { line: 1, column: 5 }, " inserted");
    expect(fileA.join("\n")).toBe(`line1
line2 inserted
line3`);

    // Delete from fileB
    deleteText(fileB, {
      start: { line: 0, column: 0 },
      end: { line: 1, column: 0 },
    });
    expect(fileB.join("\n")).toBe(`beta
gamma`);
  });
  it("should handle switching back and forth across files", () => {
    const fileX = `a
b
c`.split("\n");
    const fileY = `1
2
3`.split("\n");
    const fileZ = `foobar`.split("\n");

    // Insert into fileX
    insertText(fileX, { line: 2, column: 1 }, " insertedX");
    expect(fileX.join("\n")).toBe(`a
b
c insertedX`);

    // Insert into fileY
    insertText(fileY, { line: 2, column: 2 }, " insertedY");
    expect(fileY.join("\n")).toBe(`1
2
3 insertedY`);

    // Delete from fileZ
    deleteText(fileZ, {
      start: { line: 0, column: 0 },
      end: { line: 1, column: 3 },
    });
    expect(fileZ.join("\n")).toBe(``);
  });
});

describe("rename timeline functionality", () => {
  it("shows first created file in the timeline at the first event", () => {
    const timeline: ReplayEvent[] = [
      createReplayEvent({
        eventType: "DID_CHANGE_TEXT_DOCUMENT",
        metadata: {
          contentChanges: [
            {
              filePath: "src/file1.ts",
              range: {
                start: { line: 0, column: 0 },
                end: { line: 0, column: 0 },
              },
              text: "const a = 1;",
            },
          ],
        },
      }),
    ];

    expect(getVisibleFilePathsFromTimeline(timeline)).toEqual(["src/file1.ts"]);
  });

  it("keeps old file name before rename and new file name after rename", () => {
    const events: ReplayEvent[] = [
      createReplayEvent({
        eventType: "DID_CHANGE_TEXT_DOCUMENT",
        metadata: {
          contentChanges: [
            {
              filePath: "src/file1.ts",
              range: {
                start: { line: 0, column: 0 },
                end: { line: 0, column: 0 },
              },
              text: "hello",
            },
          ],
        },
      }),
      createReplayEvent({
        eventType: "DID_RENAME_FILES",
        metadata: {
          renamedFiles: [
            {
              oldFilePath: "src/file1.ts",
              newFilePath: "src/file2.ts",
            },
          ],
        },
      }),
    ];

    expect(getVisibleFilePathsFromTimeline(events.slice(0, 1))).toEqual([
      "src/file1.ts",
    ]);
    expect(getVisibleFilePathsFromTimeline(events)).toEqual(["src/file2.ts"]);
  });

  it("does not keep old content when old file name is reused after rename", () => {
    const events: ReplayEvent[] = [
      createReplayEvent({
        eventType: "DID_CHANGE_TEXT_DOCUMENT",
        metadata: {
          contentChanges: [
            {
              filePath: "src/file1.ts",
              range: {
                start: { line: 0, column: 0 },
                end: { line: 0, column: 0 },
              },
              text: "const oldValue = 123;",
            },
          ],
        },
      }),
      createReplayEvent({
        eventType: "DID_RENAME_FILES",
        metadata: {
          renamedFiles: [
            {
              oldFilePath: "src/file1.ts",
              newFilePath: "src/file2.ts",
            },
          ],
        },
      }),
      createReplayEvent({
        eventType: "DID_CHANGE_TEXT_DOCUMENT",
        metadata: {
          contentChanges: [
            {
              filePath: "src/file1.ts",
              range: {
                start: { line: 0, column: 0 },
                end: { line: 0, column: 0 },
              },
              text: "const newValue = 999;",
            },
          ],
        },
      }),
    ];

    const visibleFiles = getVisibleFilePathsFromTimeline(events);
    expect(visibleFiles).toEqual(
      expect.arrayContaining(["src/file1.ts", "src/file2.ts"]),
    );

    const fileContents = replayFileContents(events);
    expect(fileContents.get("src/file2.ts")).toBe("const oldValue = 123;");
    expect(fileContents.get("src/file1.ts")).toBe("const newValue = 999;");
    expect(fileContents.get("src/file1.ts")).not.toContain("oldValue");
  });
});

describe("insertText edge cases", () => {
  it("should insert at the last line when position.line exceeds array length", () => {
    const lines: string[] = [];
    const position: TextDocumentPosition = { line: 0, column: 0 };
    insertText(lines, position, "hello");

    expect(lines).toEqual(["hello"]);
  });

  it("should insert at out-of-bounds line creating new lines", () => {
    const lines = ["line1", "line2"];
    const position: TextDocumentPosition = { line: 5, column: 0 };
    insertText(lines, position, "new");

    expect(lines.length).toBe(6);
    expect(lines[5]).toBe("new");
  });

  it("should insert empty string without changing lines", () => {
    const lines = ["hello world"];
    const position: TextDocumentPosition = { line: 0, column: 5 };
    insertText(lines, position, "");

    expect(lines.join("\n")).toBe("hello world");
  });

  it("should handle column beyond line length", () => {
    const lines = ["hello"];
    const position: TextDocumentPosition = { line: 0, column: 100 };
    insertText(lines, position, " world");

    expect(lines.join("\n")).toBe("hello world");
  });

  it("should insert text with only newlines", () => {
    const lines = ["start", "end"];
    const position: TextDocumentPosition = { line: 0, column: 5 };
    insertText(lines, position, "\n");

    expect(lines.join("\n")).toBe("start\n\nend");
  });

  it("should insert text with trailing newlines", () => {
    const lines = ["start"];
    const position: TextDocumentPosition = { line: 0, column: 5 };
    insertText(lines, position, "middle\n");

    expect(lines.join("\n")).toBe("startmiddle\n");
  });

  it("should insert at beginning of line (column 0)", () => {
    const lines = ["existing text"];
    const position: TextDocumentPosition = { line: 0, column: 0 };
    insertText(lines, position, "prefix ");

    expect(lines.join("\n")).toBe("prefix existing text");
  });
});

describe("deleteText edge cases", () => {
  it("should handle empty array without error", () => {
    const lines: string[] = [];
    const range: Range = {
      start: { line: 0, column: 0 },
      end: { line: 0, column: 5 },
    };
    expect(() => deleteText(lines, range)).not.toThrow();
  });

  it("should handle deleting with column beyond line length", () => {
    const lines = ["hello"];
    const range: Range = {
      start: { line: 0, column: 0 },
      end: { line: 0, column: 100 },
    };
    deleteText(lines, range);

    expect(lines.join("\n")).toBe("");
  });

  it("should handle deleting zero-width range (no deletion)", () => {
    const lines = ["hello world"];
    const range: Range = {
      start: { line: 0, column: 5 },
      end: { line: 0, column: 5 },
    };
    deleteText(lines, range);

    expect(lines.join("\n")).toBe("hello world");
  });

  it("should handle deleting at out-of-bounds line", () => {
    const lines = ["hello"];
    const range: Range = {
      start: { line: 5, column: 0 },
      end: { line: 6, column: 0 },
    };
    expect(() => deleteText(lines, range)).not.toThrow();
  });

  it("should delete across multiple lines including entire intermediate lines", () => {
    const lines = ["line1", "line2", "line3", "line4"];
    const range: Range = {
      start: { line: 1, column: 0 },
      end: { line: 3, column: 0 },
    };
    deleteText(lines, range);

    expect(lines.join("\n")).toBe("line1\nline4");
  });

  it("should delete entire file content", () => {
    const lines = ["const x = 1;", "const y = 2;"];
    const range: Range = {
      start: { line: 0, column: 0 },
      end: { line: 1, column: 14 },
    };
    deleteText(lines, range);

    expect(lines.join("\n")).toBe("");
  });

  it("should handle multi-line delete where end is same as start line", () => {
    const lines = ["line1", "line2", "line3"];
    const range: Range = {
      start: { line: 1, column: 0 },
      end: { line: 1, column: 5 },
    };
    deleteText(lines, range);

    expect(lines.join("\n")).toBe("line1\n\nline3");
  });

  it("should preserve leading content on start line in multi-line delete", () => {
    const lines = ["  indented line", "second", "third"];
    const range: Range = {
      start: { line: 0, column: 2 },
      end: { line: 2, column: 6 },
    };
    deleteText(lines, range);

    expect(lines.join("\n")).toBe("  ");
  });

  it("should handle multi-line delete preserving trailing content on end line", () => {
    const lines = ["first", "middle", "  trailing content here"];
    const range: Range = {
      start: { line: 0, column: 3 },
      end: { line: 2, column: 2 },
    };
    deleteText(lines, range);

    expect(lines.join("\n")).toBe("firtrailing content here");
  });
});

describe("shouldIgnoreFrozenReplayFilePath", () => {
  const shouldIgnore = (filePath: string) =>
    /^\/terminal[1-9]\d*(?:\..*)?$/.test(filePath);

  it("should return true for /terminal1", () => {
    expect(shouldIgnore("/terminal1")).toBe(true);
  });

  it("should return true for /terminal2", () => {
    expect(shouldIgnore("/terminal2")).toBe(true);
  });

  it("should return true for /terminal10", () => {
    expect(shouldIgnore("/terminal10")).toBe(true);
  });

  it("should return true for /terminal1.something", () => {
    expect(shouldIgnore("/terminal1.something")).toBe(true);
  });

  it("should return true for /terminal12.log", () => {
    expect(shouldIgnore("/terminal12.log")).toBe(true);
  });

  it("should return false for /terminal", () => {
    expect(shouldIgnore("/terminal")).toBe(false);
  });

  it("should return false for /terminal0", () => {
    expect(shouldIgnore("/terminal0")).toBe(false);
  });

  it("should return false for /terminal01", () => {
    expect(shouldIgnore("/terminal01")).toBe(false);
  });

  it("should return false for /path/to/terminal1", () => {
    expect(shouldIgnore("/path/to/terminal1")).toBe(false);
  });

  it("should return false for /terminal/1", () => {
    expect(shouldIgnore("/terminal/1")).toBe(false);
  });

  it("should return false for regular file paths", () => {
    expect(shouldIgnore("/src/app.tsx")).toBe(false);
    expect(shouldIgnore("/components/Button.ts")).toBe(false);
    expect(shouldIgnore("index.js")).toBe(false);
  });

  it("should return false for paths with terminal but different format", () => {
    expect(shouldIgnore("/myterminal1")).toBe(false);
    expect(shouldIgnore("/terminalfile1")).toBe(false);
  });
});

describe("replayFileContents integration", () => {
  it("should handle sequential edits to the same file", () => {
    const events: ReplayEvent[] = [
      createReplayEvent({
        eventType: "DID_CHANGE_TEXT_DOCUMENT",
        metadata: {
          contentChanges: [
            {
              filePath: "test.txt",
              range: {
                start: { line: 0, column: 0 },
                end: { line: 0, column: 0 },
              },
              text: "Hello",
            },
          ],
        },
      }),
      createReplayEvent({
        eventType: "DID_CHANGE_TEXT_DOCUMENT",
        metadata: {
          contentChanges: [
            {
              filePath: "test.txt",
              range: {
                start: { line: 0, column: 5 },
                end: { line: 0, column: 5 },
              },
              text: " World",
            },
          ],
        },
      }),
      createReplayEvent({
        eventType: "DID_CHANGE_TEXT_DOCUMENT",
        metadata: {
          contentChanges: [
            {
              filePath: "test.txt",
              range: {
                start: { line: 0, column: 0 },
                end: { line: 0, column: 5 },
              },
              text: "Hi",
            },
          ],
        },
      }),
    ];

    const fileContents = replayFileContents(events);
    expect(fileContents.get("test.txt")).toBe("Hi World");
  });

  it("should handle file rename preserving content", () => {
    const events: ReplayEvent[] = [
      createReplayEvent({
        eventType: "DID_CHANGE_TEXT_DOCUMENT",
        metadata: {
          contentChanges: [
            {
              filePath: "old.ts",
              range: {
                start: { line: 0, column: 0 },
                end: { line: 0, column: 0 },
              },
              text: "original content",
            },
          ],
        },
      }),
      createReplayEvent({
        eventType: "DID_RENAME_FILES",
        metadata: {
          renamedFiles: [
            {
              oldFilePath: "old.ts",
              newFilePath: "new.ts",
            },
          ],
        },
      }),
    ];

    const fileContents = replayFileContents(events);
    expect(fileContents.get("new.ts")).toBe("original content");
    expect(fileContents.has("old.ts")).toBe(false);
  });

  it("should handle multiple files with interleaved edits", () => {
    const events: ReplayEvent[] = [
      createReplayEvent({
        eventType: "DID_CHANGE_TEXT_DOCUMENT",
        metadata: {
          contentChanges: [
            {
              filePath: "fileA.txt",
              range: {
                start: { line: 0, column: 0 },
                end: { line: 0, column: 0 },
              },
              text: "A1",
            },
          ],
        },
      }),
      createReplayEvent({
        eventType: "DID_CHANGE_TEXT_DOCUMENT",
        metadata: {
          contentChanges: [
            {
              filePath: "fileB.txt",
              range: {
                start: { line: 0, column: 0 },
                end: { line: 0, column: 0 },
              },
              text: "B1",
            },
          ],
        },
      }),
      createReplayEvent({
        eventType: "DID_CHANGE_TEXT_DOCUMENT",
        metadata: {
          contentChanges: [
            {
              filePath: "fileA.txt",
              range: {
                start: { line: 0, column: 2 },
                end: { line: 0, column: 2 },
              },
              text: "A2",
            },
          ],
        },
      }),
    ];

    const fileContents = replayFileContents(events);
    expect(fileContents.get("fileA.txt")).toBe("A1A2");
    expect(fileContents.get("fileB.txt")).toBe("B1");
  });

  it("should handle deletion and insertion in single event", () => {
    const events: ReplayEvent[] = [
      createReplayEvent({
        eventType: "DID_CHANGE_TEXT_DOCUMENT",
        metadata: {
          contentChanges: [
            {
              filePath: "code.txt",
              range: {
                start: { line: 0, column: 0 },
                end: { line: 0, column: 0 },
              },
              text: "hello world",
            },
          ],
        },
      }),
      createReplayEvent({
        eventType: "DID_CHANGE_TEXT_DOCUMENT",
        metadata: {
          contentChanges: [
            {
              filePath: "code.txt",
              range: {
                start: { line: 0, column: 0 },
                end: { line: 0, column: 5 },
              },
              text: "goodbye",
            },
          ],
        },
      }),
    ];

    const fileContents = replayFileContents(events);
    expect(fileContents.get("code.txt")).toBe("goodbye world");
  });
});
