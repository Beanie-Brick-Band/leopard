import { formatISO } from "date-fns";

import { Id } from "../_generated/dataModel";
import { internalMutation } from "../_generated/server";

export const createMock = internalMutation(async (ctx) => {
  if (
    (await ctx.db.query("assignments").collect()).length > 0 &&
    (await ctx.db.query("classrooms").collect()).length > 0
  ) {
    throw new Error("Mock data already exists");
  }

  const assignment1Id = await ctx.db.insert("assignments", {
    dueDate: formatISO(new Date(2030, 6, 30)), // July 30, 2030 - sometime in the future
    name: "Sample Homework",
  });

  const assignment2Id = await ctx.db.insert("assignments", {
    dueDate: formatISO(new Date(2030, 7, 15)), // August 15, 2030 - sometime in the future
    name: "Sample Project",
  });

  const assignment3Id = await ctx.db.insert("assignments", {
    dueDate: formatISO(new Date(2030, 8, 1)), // September 1, 2030 - sometime in the future
    name: "MNIST CNN Exploration",
  });

  await ctx.db.insert("classrooms", {
    assignments: [assignment1Id, assignment2Id],
    className: "DSA 101",
    metadata: "{}",
    ownerId: "user_123", // sample user that does not exist
  });

  await ctx.db.insert("classrooms", {
    assignments: [assignment3Id],
    className: "ML 102",
    metadata: "{}",
    ownerId: "user_456", // sample user that does not exist
  });

  await Promise.all(
    events.map((event) =>
      ctx.db.insert("events", {
        ...event,
        workspaceId: event.workspaceId as Id<"workspaces">,
      }),
    ),
  );
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
    workspaceId: "jx75g1jdes38h6v3bq54w7z2zn7z51kf",
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
    workspaceId: "jx75g1jdes38h6v3bq54w7z2zn7z51kf",
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
    workspaceId: "jx75g1jdes38h6v3bq54w7z2zn7z51kf",
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
    workspaceId: "jx75g1jdes38h6v3bq54w7z2zn7z51kf",
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
    workspaceId: "jx75g1jdes38h6v3bq54w7z2zn7z51kf",
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
    workspaceId: "jx75g1jdes38h6v3bq54w7z2zn7z51kf",
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
    workspaceId: "jx75g1jdes38h6v3bq54w7z2zn7z51kf",
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
    workspaceId: "jx75g1jdes38h6v3bq54w7z2zn7z51kf",
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
    workspaceId: "jx75g1jdes38h6v3bq54w7z2zn7z51kf",
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
    workspaceId: "jx75g1jdes38h6v3bq54w7z2zn7z51kf",
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
    workspaceId: "jx75g1jdes38h6v3bq54w7z2zn7z51kf",
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
    workspaceId: "jx75g1jdes38h6v3bq54w7z2zn7z51kf",
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
    workspaceId: "jx75g1jdes38h6v3bq54w7z2zn7z51kf",
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
    workspaceId: "jx75g1jdes38h6v3bq54w7z2zn7z51kf",
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
    workspaceId: "jx75g1jdes38h6v3bq54w7z2zn7z51kf",
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
    workspaceId: "jx75g1jdes38h6v3bq54w7z2zn7z51kf",
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
    workspaceId: "jx75g1jdes38h6v3bq54w7z2zn7z51kf",
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
    workspaceId: "jx75g1jdes38h6v3bq54w7z2zn7z51kf",
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
    workspaceId: "jx75g1jdes38h6v3bq54w7z2zn7z51kf",
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
    workspaceId: "jx75g1jdes38h6v3bq54w7z2zn7z51kf",
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
    workspaceId: "jx75g1jdes38h6v3bq54w7z2zn7z51kf",
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
    workspaceId: "jx75g1jdes38h6v3bq54w7z2zn7z51kf",
  },
];
