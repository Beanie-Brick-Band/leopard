import { v } from "convex/values";

import { internalMutation, internalQuery } from "../_generated/server";

export const createMock = internalMutation(async (ctx) => {
  if (
    (await ctx.db.query("assignments").collect()).length > 0 &&
    (await ctx.db.query("classrooms").collect()).length > 0
  ) {
    throw new Error("Mock data already exists");
  }

  const classroom1Id = await ctx.db.insert("classrooms", {
    // assignments: [assignment1Id, assignment2Id],
    assignments: [],
    className: "DSA 101",
    metadata: "{}",
    ownerId: "user_123", // sample user that does not exist
    assistantIds: [],
  });

  const classroom2Id = await ctx.db.insert("classrooms", {
    assignments: [],
    className: "ML 102",
    metadata: "{}",
    ownerId: "user_456", // sample user that does not exist
    assistantIds: [],
  });

  const assignment1Id = await ctx.db.insert("assignments", {
    dueDate: 1911614400000, // July 30, 2030 - sometime in the future
    name: "Sample Homework",
    releaseDate: 1704067200000, // December 31, 2023 - in the past
    classroomId: classroom1Id,
  });

  const assignment2Id = await ctx.db.insert("assignments", {
    dueDate: 1912996800000, // August 15, 2030 - sometime in the future
    name: "Sample Project",
    classroomId: classroom1Id,
    releaseDate: 1704067200000, // December 31, 2023 - in the past
  });

  const assignment3Id = await ctx.db.insert("assignments", {
    dueDate: 1914465600000, // September 1, 2030 - sometime in the future
    name: "MNIST CNN Exploration",
    classroomId: classroom2Id,
    releaseDate: 1704067200000, // December 31, 2023 - in the past
  });

  // Use some placeholder workspace ID that matches the requirements specified in
  // addBatchedChangesMutation
  const workspaceId = await ctx.db.insert("workspaces", {
    coderWorkspaceId: "273044a0-03a7-49ef-b1a4-e1bbc3c49d9b",
    isActive: true,
    userId: "user_123", // sample user that does not exist
  });

  // Update classrooms with assignments
  await ctx.db.patch(classroom1Id, {
    assignments: [assignment1Id, assignment2Id],
  });
  await ctx.db.patch(classroom2Id, {
    assignments: [assignment3Id],
  });

  await Promise.all(
    events.map((event) =>
      ctx.db.insert("events", {
        ...event,
        workspaceId,
      }),
    ),
  );
});

export const getWorkspaceByCoderWorkspaceId = internalQuery({
  args: { coderWorkspaceId: v.string() },
  handler: async (ctx, args) => {
    const workspace = await ctx.db
      .query("workspaces")
      .withIndex("coderWorkspaceId", (q) =>
        q.eq("coderWorkspaceId", args.coderWorkspaceId),
      )
      .first();

    return workspace?._id ?? null;
  },
});

const events = [
  {
    eventType: "DID_CHANGE_TEXT_DOCUMENT",
    metadata: {
      contentChanges: [
        {
          filePath: "/Users/fvcci/Code/Github/price-matched/test.py",
          range: {
            end: { column: 8.0, line: 0.0 },
            start: { column: 8.0, line: 0.0 },
          },
          text: ":",
        },
      ],
    },
    timestamp: 1769638584411.0,
  },
  {
    eventType: "DID_CHANGE_TEXT_DOCUMENT",
    metadata: {
      contentChanges: [
        {
          filePath: "/Users/fvcci/Code/Github/price-matched/test.py",
          range: {
            end: { column: 5.0, line: 0.0 },
            start: { column: 5.0, line: 0.0 },
          },
          text: "()",
        },
      ],
    },
    timestamp: 1769638583322.0,
  },
  {
    eventType: "DID_CHANGE_TEXT_DOCUMENT",
    metadata: {
      contentChanges: [
        {
          filePath: "/Users/fvcci/Code/Github/price-matched/test.py",
          range: {
            end: { column: 6.0, line: 0.0 },
            start: { column: 6.0, line: 0.0 },
          },
          text: "n",
        },
      ],
    },
    timestamp: 1769638584081.0,
  },
  {
    eventType: "DID_CHANGE_TEXT_DOCUMENT",
    metadata: {
      contentChanges: [
        {
          filePath: "/Users/fvcci/Code/Github/price-matched/test.py",
          range: {
            end: { column: 4.0, line: 0.0 },
            start: { column: 4.0, line: 0.0 },
          },
          text: "f",
        },
      ],
    },
    timestamp: 1769638583101.0,
  },
  {
    eventType: "DID_CHANGE_TEXT_DOCUMENT",
    metadata: {
      contentChanges: [
        {
          filePath: "/Users/fvcci/Code/Github/price-matched/test.py",
          range: {
            end: { column: 2.0, line: 0.0 },
            start: { column: 2.0, line: 0.0 },
          },
          text: "f",
        },
      ],
    },
    timestamp: 1769638578000.0,
  },
  {
    eventType: "DID_CHANGE_TEXT_DOCUMENT",
    metadata: {
      contentChanges: [
        {
          filePath: "/Users/fvcci/Code/Github/price-matched/test.py",
          range: {
            end: { column: 7.0, line: 1.0 },
            start: { column: 7.0, line: 1.0 },
          },
          text: "s",
        },
      ],
    },
    timestamp: 1769638590601.0,
  },
  {
    eventType: "DID_CHANGE_TEXT_DOCUMENT",
    metadata: {
      contentChanges: [
        {
          filePath: "/Users/fvcci/Code/Github/price-matched/test.py",
          range: {
            end: { column: 5.0, line: 1.0 },
            start: { column: 5.0, line: 1.0 },
          },
          text: "a",
        },
      ],
    },
    timestamp: 1769638590410.0,
  },
  {
    eventType: "DID_CHANGE_TEXT_DOCUMENT",
    metadata: {
      contentChanges: [
        {
          filePath: "/Users/fvcci/Code/Github/price-matched/test.py",
          range: {
            end: { column: 0.0, line: 0.0 },
            start: { column: 0.0, line: 0.0 },
          },
          text: "def f(n):\n",
        },
      ],
    },
    timestamp: 1769638624564.0,
  },
  {
    eventType: "DID_CHANGE_TEXT_DOCUMENT",
    metadata: {
      contentChanges: [
        {
          filePath: "/Users/fvcci/Code/Github/price-matched/test.py",
          range: {
            end: { column: 4.0, line: 1.0 },
            start: { column: 4.0, line: 1.0 },
          },
          text: "p",
        },
      ],
    },
    timestamp: 1769638590246.0,
  },
  {
    eventType: "DID_CHANGE_TEXT_DOCUMENT",
    metadata: {
      contentChanges: [
        {
          filePath: "/Users/fvcci/Code/Github/price-matched/test.py",
          range: {
            end: { column: 7.0, line: 0.0 },
            start: { column: 7.0, line: 0.0 },
          },
          text: ")",
        },
      ],
    },
    timestamp: 1769638584241.0,
  },
  {
    eventType: "DID_CHANGE_TEXT_DOCUMENT",
    metadata: {
      contentChanges: [
        {
          filePath: "/Users/fvcci/Code/Github/price-matched/test.py",
          range: {
            end: { column: 1.0, line: 0.0 },
            start: { column: 1.0, line: 0.0 },
          },
          text: "e",
        },
      ],
    },
    timestamp: 1769638577954.0,
  },
  {
    eventType: "DID_CHANGE_TEXT_DOCUMENT",
    metadata: {
      contentChanges: [
        {
          filePath: "/Users/fvcci/Code/Github/price-matched/test.py",
          range: {
            end: { column: 6.0, line: 1.0 },
            start: { column: 6.0, line: 1.0 },
          },
          text: "s",
        },
      ],
    },
    timestamp: 1769638590477.0,
  },
  {
    eventType: "DID_CHANGE_TEXT_DOCUMENT",
    metadata: {
      contentChanges: [
        {
          filePath: "/Users/fvcci/Code/Github/price-matched/test.py",
          range: {
            end: { column: 3.0, line: 0.0 },
            start: { column: 3.0, line: 0.0 },
          },
          text: " ",
        },
      ],
    },
    timestamp: 1769638578079.0,
  },
  {
    eventType: "DID_CHANGE_TEXT_DOCUMENT",
    metadata: {
      contentChanges: [
        {
          filePath: "/Users/fvcci/Code/Github/price-matched/test.py",
          range: {
            end: { column: 9.0, line: 0.0 },
            start: { column: 9.0, line: 0.0 },
          },
          text: "\n    ",
        },
      ],
    },
    timestamp: 1769638588349.0,
  },
  {
    eventType: "DID_CHANGE_TEXT_DOCUMENT",
    metadata: {
      contentChanges: [
        {
          filePath: "/Users/fvcci/Code/Github/price-matched/test.py",
          range: {
            end: { column: 9.0, line: 0.0 },
            start: { column: 9.0, line: 0.0 },
          },
          text: "\n    pass",
        },
      ],
    },
    timestamp: 1769638620218.0,
  },
  {
    eventType: "DID_CHANGE_TEXT_DOCUMENT",
    metadata: {
      contentChanges: [
        {
          filePath: "/Users/fvcci/Code/Github/price-matched/test.py",
          range: {
            end: { column: 7.0, line: 0.0 },
            start: { column: 6.0, line: 0.0 },
          },
          text: ")",
        },
      ],
    },
    timestamp: 1769638583402.0,
  },
  {
    eventType: "DID_CHANGE_TEXT_DOCUMENT",
    metadata: {
      contentChanges: [
        {
          filePath: "/Users/fvcci/Code/Github/price-matched/test.py",
          range: {
            end: { column: 5.0, line: 1.0 },
            start: { column: 4.0, line: 1.0 },
          },
          text: "",
        },
        {
          filePath: "/Users/fvcci/Code/Github/price-matched/test.py",
          range: {
            end: { column: 5.0, line: 0.0 },
            start: { column: 4.0, line: 0.0 },
          },
          text: "",
        },
      ],
    },
    timestamp: 1769638600190.0,
  },
  {
    eventType: "DID_CHANGE_TEXT_DOCUMENT",
    metadata: {
      contentChanges: [
        {
          filePath: "/Users/fvcci/Code/Github/price-matched/test.py",
          range: {
            end: { column: 8.0, line: 1.0 },
            start: { column: 9.0, line: 0.0 },
          },
          text: "",
        },
      ],
    },
    timestamp: 1769638619035.0,
  },
  {
    eventType: "DID_CHANGE_TEXT_DOCUMENT",
    metadata: {
      contentChanges: [
        {
          filePath: "/Users/fvcci/Code/Github/price-matched/test.py",
          range: {
            end: { column: 0.0, line: 1.0 },
            start: { column: 0.0, line: 0.0 },
          },
          text: "",
        },
      ],
    },
    timestamp: 1769638622957.0,
  },
  {
    eventType: "DID_CHANGE_TEXT_DOCUMENT",
    metadata: {
      contentChanges: [
        {
          filePath: "/Users/fvcci/Code/Github/price-matched/test.py",
          range: {
            end: { column: 4.0, line: 1.0 },
            start: { column: 4.0, line: 1.0 },
          },
          text: "h",
        },
        {
          filePath: "/Users/fvcci/Code/Github/price-matched/test.py",
          range: {
            end: { column: 4.0, line: 0.0 },
            start: { column: 4.0, line: 0.0 },
          },
          text: "h",
        },
      ],
    },
    timestamp: 1769638598663.0,
  },
  {
    eventType: "DID_CHANGE_TEXT_DOCUMENT",
    metadata: {
      contentChanges: [
        {
          filePath: "/Users/fvcci/Code/Github/price-matched/test.py",
          range: {
            end: { column: 0.0, line: 0.0 },
            start: { column: 0.0, line: 0.0 },
          },
          text: "d",
        },
      ],
    },
    timestamp: 1769638577793.0,
  },
  {
    eventType: "DID_CHANGE_TEXT_DOCUMENT",
    metadata: {
      contentChanges: [
        {
          filePath: "/Users/fvcci/Code/Github/price-matched/test.py",
          range: {
            end: { column: 7.0, line: 0.0 },
            start: { column: 6.0, line: 0.0 },
          },
          text: "",
        },
      ],
    },
    timestamp: 1769638583829.0,
  },
  {
    eventType: "DID_RENAME_FILES",
    metadata: {
      renamedFiles: [
        {
          newFilePath: "/Users/fvcci/Code/Github/price-matched/test-renamed.py",
          oldFilePath: "/Users/fvcci/Code/Github/price-matched/test.py",
        },
      ],
    },
    timestamp: 1769638614000,
  },
];
