import { describe, expect, it } from "vitest";

import {
  getObjectKey,
  getSubmissionObjectKey,
} from "../../convex/helpers/storageKeys";

describe("getObjectKey", () => {
  it("returns the correct path for starter code", () => {
    expect(getObjectKey("classroom1", "assignment1")).toBe(
      "classroom1/assignment1/starter-code.zip",
    );
  });
});

describe("getSubmissionObjectKey", () => {
  it("returns a path scoped to classroom, assignment, and student", () => {
    expect(
      getSubmissionObjectKey("classroom1", "assignment1", "student1"),
    ).toBe("submissions/classroom1/assignment1/student1/submission.zip");
  });

  it("generates unique keys for different students on the same assignment", () => {
    const key1 = getSubmissionObjectKey("c1", "a1", "studentA");
    const key2 = getSubmissionObjectKey("c1", "a1", "studentB");

    expect(key1).not.toBe(key2);
  });

  it("generates unique keys for the same student on different assignments", () => {
    const key1 = getSubmissionObjectKey("c1", "a1", "student1");
    const key2 = getSubmissionObjectKey("c1", "a2", "student1");

    expect(key1).not.toBe(key2);
  });
});
