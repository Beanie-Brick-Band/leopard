import { describe, expect, it } from "vitest";

import type { Range, TextDocumentPosition } from "./scrubber";
import { deleteText, insertText } from "./scrubber";

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
