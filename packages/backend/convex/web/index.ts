import { formatISO } from "date-fns";

import { internalMutation } from "../_generated/server";

// Helper to create dates in the future
const futureDate = (daysFromNow: number) => {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return formatISO(date);
};

export const createMock = internalMutation(async (ctx) => {
  if (
    (await ctx.db.query("assignments").collect()).length > 0 &&
    (await ctx.db.query("classrooms").collect()).length > 0
  ) {
    throw new Error("Mock data already exists");
  }

  const now = Date.now();

  // Create McMaster-style Computer Science classrooms
  console.log("Creating classrooms...");

  const compsci1md3 = await ctx.db.insert("classrooms", {
    className: "COMPSCI 1MD3",
    description:
      "Introduction to Programming - Learn fundamental programming concepts using Python. Topics include variables, control structures, functions, and basic data structures.",
    ownerId: "teacher_dr_smith", // Will be replaced with real teacher ID
    createdAt: now - 90 * 24 * 60 * 60 * 1000, // 90 days ago
    enrollmentRequiresApproval: false,
  });

  const compsci2c03 = await ctx.db.insert("classrooms", {
    className: "COMPSCI 2C03",
    description:
      "Data Structures and Algorithms - Study fundamental data structures (arrays, linked lists, trees, graphs) and algorithms (sorting, searching, graph algorithms).",
    ownerId: "teacher_dr_johnson",
    createdAt: now - 60 * 24 * 60 * 60 * 1000, // 60 days ago
    enrollmentRequiresApproval: true,
  });

  const compsci2me3 = await ctx.db.insert("classrooms", {
    className: "COMPSCI 2ME3",
    description:
      "Introduction to Software Development - Learn software engineering principles, version control, testing, and team collaboration.",
    ownerId: "teacher_dr_smith",
    createdAt: now - 75 * 24 * 60 * 60 * 1000,
    enrollmentRequiresApproval: false,
  });

  const compsci3ac3 = await ctx.db.insert("classrooms", {
    className: "COMPSCI 3AC3",
    description:
      "Algorithms and Complexity - Advanced algorithm design and analysis. Topics include dynamic programming, greedy algorithms, NP-completeness.",
    ownerId: "teacher_dr_patel",
    createdAt: now - 45 * 24 * 60 * 60 * 1000,
    enrollmentRequiresApproval: true,
  });

  const compsci3db3 = await ctx.db.insert("classrooms", {
    className: "COMPSCI 3DB3",
    description:
      "Databases - Database design, SQL, normalization, transactions, and NoSQL systems.",
    ownerId: "teacher_dr_johnson",
    createdAt: now - 30 * 24 * 60 * 60 * 1000,
    enrollmentRequiresApproval: false,
  });

  const compsci4ml3 = await ctx.db.insert("classrooms", {
    className: "COMPSCI 4ML3",
    description:
      "Introduction to Machine Learning - Supervised and unsupervised learning, neural networks, deep learning basics.",
    ownerId: "teacher_dr_chen",
    createdAt: now - 20 * 24 * 60 * 60 * 1000,
    enrollmentRequiresApproval: true,
  });

  const compsci4tb3 = await ctx.db.insert("classrooms", {
    className: "COMPSCI 4TB3",
    description:
      "Syntax-Based Tools and Compilers - Compiler design, parsing, code generation, and optimization.",
    ownerId: "teacher_dr_patel",
    createdAt: now - 15 * 24 * 60 * 60 * 1000,
    enrollmentRequiresApproval: false,
  });

  console.log("Creating assignments for COMPSCI 1MD3...");
  // COMPSCI 1MD3 assignments
  const assign1md3_1 = await ctx.db.insert("assignments", {
    name: "Assignment 1: Hello Python",
    description:
      "Write your first Python program. Create a program that prints 'Hello, World!' and takes user input to print a personalized greeting.",
    dueDate: futureDate(7),
    classroomId: compsci1md3,
    templateId: "python-basic",
    createdAt: now - 14 * 24 * 60 * 60 * 1000,
  });

  await ctx.db.insert("assignments", {
    name: "Assignment 2: Control Flow",
    description:
      "Implement programs using if statements, loops, and functions. Create a simple calculator and a number guessing game.",
    dueDate: futureDate(14),
    classroomId: compsci1md3,
    templateId: "python-basic",
    createdAt: now - 7 * 24 * 60 * 60 * 1000,
  });

  await ctx.db.insert("assignments", {
    name: "Assignment 3: Lists and Dictionaries",
    description:
      "Work with Python data structures. Implement a simple contact book using dictionaries and lists.",
    dueDate: futureDate(21),
    classroomId: compsci1md3,
    templateId: "python-basic",
    createdAt: now - 3 * 24 * 60 * 60 * 1000,
  });

  await ctx.db.insert("assignments", {
    name: "Final Project: Text-Based Game",
    description:
      "Create a text-based adventure game using all concepts learned. Must include functions, data structures, and control flow.",
    dueDate: futureDate(45),
    classroomId: compsci1md3,
    templateId: "python-basic",
    createdAt: now - 1 * 24 * 60 * 60 * 1000,
  });

  console.log("Creating assignments for COMPSCI 2C03...");
  // COMPSCI 2C03 assignments
  const assign2c03_1 = await ctx.db.insert("assignments", {
    name: "Lab 1: Array and Linked List Implementation",
    description:
      "Implement a dynamic array and singly linked list from scratch in C. Include all basic operations (insert, delete, search).",
    dueDate: futureDate(10),
    classroomId: compsci2c03,
    templateId: "c-datastructures",
    createdAt: now - 12 * 24 * 60 * 60 * 1000,
  });

  const assign2c03_2 = await ctx.db.insert("assignments", {
    name: "Lab 2: Sorting Algorithms",
    description:
      "Implement and compare bubble sort, merge sort, and quicksort. Analyze time complexity and benchmark performance.",
    dueDate: futureDate(17),
    classroomId: compsci2c03,
    templateId: "c-datastructures",
    createdAt: now - 8 * 24 * 60 * 60 * 1000,
  });

  await ctx.db.insert("assignments", {
    name: "Lab 3: Binary Search Trees",
    description:
      "Implement a binary search tree with insert, delete, search, and traversal operations. Include tree balancing.",
    dueDate: futureDate(24),
    classroomId: compsci2c03,
    templateId: "c-datastructures",
    createdAt: now - 4 * 24 * 60 * 60 * 1000,
  });

  await ctx.db.insert("assignments", {
    name: "Lab 4: Graph Algorithms",
    description:
      "Implement BFS, DFS, Dijkstra's algorithm, and Kruskal's MST algorithm. Use adjacency list representation.",
    dueDate: futureDate(31),
    classroomId: compsci2c03,
    templateId: "c-datastructures",
    createdAt: now - 2 * 24 * 60 * 60 * 1000,
  });

  console.log("Creating assignments for COMPSCI 2ME3...");
  // COMPSCI 2ME3 assignments
  await ctx.db.insert("assignments", {
    name: "Lab 1: Git and Version Control",
    description:
      "Set up a Git repository, make commits, create branches, and resolve merge conflicts. Submit your commit history.",
    dueDate: futureDate(5),
    classroomId: compsci2me3,
    templateId: "java-project",
    createdAt: now - 10 * 24 * 60 * 60 * 1000,
  });

  await ctx.db.insert("assignments", {
    name: "Lab 2: Unit Testing with JUnit",
    description:
      "Write comprehensive unit tests for a provided Java class. Achieve 95%+ code coverage.",
    dueDate: futureDate(12),
    classroomId: compsci2me3,
    templateId: "java-project",
    createdAt: now - 6 * 24 * 60 * 60 * 1000,
  });

  await ctx.db.insert("assignments", {
    name: "Group Project: Task Manager Application",
    description:
      "Build a command-line task manager with your team. Must include proper OOP design, tests, and documentation.",
    dueDate: futureDate(40),
    classroomId: compsci2me3,
    templateId: "java-project",
    createdAt: now - 2 * 24 * 60 * 60 * 1000,
  });

  console.log("Creating assignments for COMPSCI 3AC3...");
  // COMPSCI 3AC3 assignments
  await ctx.db.insert("assignments", {
    name: "Assignment 1: Dynamic Programming",
    description:
      "Solve classic DP problems: longest common subsequence, knapsack, matrix chain multiplication. Analyze time and space complexity.",
    dueDate: futureDate(15),
    classroomId: compsci3ac3,
    templateId: "cpp-algorithms",
    createdAt: now - 9 * 24 * 60 * 60 * 1000,
  });

  await ctx.db.insert("assignments", {
    name: "Assignment 2: Greedy Algorithms",
    description:
      "Implement greedy solutions for interval scheduling, Huffman coding, and minimum spanning trees. Prove correctness.",
    dueDate: futureDate(22),
    classroomId: compsci3ac3,
    templateId: "cpp-algorithms",
    createdAt: now - 5 * 24 * 60 * 60 * 1000,
  });

  await ctx.db.insert("assignments", {
    name: "Assignment 3: NP-Completeness",
    description:
      "Analyze NP-complete problems. Implement approximation algorithms for traveling salesman and vertex cover.",
    dueDate: futureDate(29),
    classroomId: compsci3ac3,
    templateId: "cpp-algorithms",
    createdAt: now - 3 * 24 * 60 * 60 * 1000,
  });

  console.log("Creating assignments for COMPSCI 3DB3...");
  // COMPSCI 3DB3 assignments
  await ctx.db.insert("assignments", {
    name: "Lab 1: SQL Basics and Schema Design",
    description:
      "Design a normalized database schema for a library system. Write SQL queries to create tables and insert sample data.",
    dueDate: futureDate(8),
    classroomId: compsci3db3,
    templateId: "sql-workspace",
    createdAt: now - 11 * 24 * 60 * 60 * 1000,
  });

  await ctx.db.insert("assignments", {
    name: "Lab 2: Advanced SQL Queries",
    description:
      "Write complex queries using joins, subqueries, aggregations, and window functions. Optimize query performance.",
    dueDate: futureDate(15),
    classroomId: compsci3db3,
    templateId: "sql-workspace",
    createdAt: now - 7 * 24 * 60 * 60 * 1000,
  });

  await ctx.db.insert("assignments", {
    name: "Project: Full-Stack Database Application",
    description:
      "Build a web application with a backend database. Include CRUD operations, transactions, and proper indexing.",
    dueDate: futureDate(35),
    classroomId: compsci3db3,
    templateId: "fullstack-db",
    createdAt: now - 3 * 24 * 60 * 60 * 1000,
  });

  console.log("Creating assignments for COMPSCI 4ML3...");
  // COMPSCI 4ML3 assignments
  await ctx.db.insert("assignments", {
    name: "Assignment 1: Linear and Logistic Regression",
    description:
      "Implement linear and logistic regression from scratch using NumPy. Compare with scikit-learn implementations.",
    dueDate: futureDate(12),
    classroomId: compsci4ml3,
    templateId: "python-ml",
    createdAt: now - 8 * 24 * 60 * 60 * 1000,
  });

  await ctx.db.insert("assignments", {
    name: "Assignment 2: Neural Networks",
    description:
      "Build a feedforward neural network from scratch. Train on MNIST dataset and achieve >95% accuracy.",
    dueDate: futureDate(19),
    classroomId: compsci4ml3,
    templateId: "python-ml",
    createdAt: now - 5 * 24 * 60 * 60 * 1000,
  });

  await ctx.db.insert("assignments", {
    name: "Assignment 3: CNNs and Transfer Learning",
    description:
      "Implement a CNN architecture and use transfer learning with pre-trained models. Apply to image classification task.",
    dueDate: futureDate(26),
    classroomId: compsci4ml3,
    templateId: "python-ml",
    createdAt: now - 2 * 24 * 60 * 60 * 1000,
  });

  await ctx.db.insert("assignments", {
    name: "Final Project: Real-World ML Application",
    description:
      "Choose a real-world problem and build a complete ML solution. Include data preprocessing, model training, evaluation, and deployment plan.",
    dueDate: futureDate(50),
    classroomId: compsci4ml3,
    templateId: "python-ml",
    createdAt: now,
  });

  console.log("Creating assignments for COMPSCI 4TB3...");
  // COMPSCI 4TB3 assignments
  await ctx.db.insert("assignments", {
    name: "Lab 1: Lexical Analysis",
    description:
      "Build a lexer/tokenizer for a simple programming language. Handle keywords, identifiers, operators, and literals.",
    dueDate: futureDate(11),
    classroomId: compsci4tb3,
    templateId: "compiler-lab",
    createdAt: now - 6 * 24 * 60 * 60 * 1000,
  });

  await ctx.db.insert("assignments", {
    name: "Lab 2: Parsing and AST Construction",
    description:
      "Implement a recursive descent parser. Build an abstract syntax tree from token stream.",
    dueDate: futureDate(18),
    classroomId: compsci4tb3,
    templateId: "compiler-lab",
    createdAt: now - 4 * 24 * 60 * 60 * 1000,
  });

  await ctx.db.insert("assignments", {
    name: "Lab 3: Code Generation",
    description:
      "Generate assembly code from AST. Implement basic optimizations (constant folding, dead code elimination).",
    dueDate: futureDate(25),
    classroomId: compsci4tb3,
    templateId: "compiler-lab",
    createdAt: now - 1 * 24 * 60 * 60 * 1000,
  });

  // Create some mock student enrollments
  console.log("Creating student enrollments...");
  const students = [
    "student_john_doe",
    "student_jane_smith",
    "student_bob_wilson",
    "student_alice_brown",
    "student_charlie_davis",
    "student_emma_jones",
    "student_david_miller",
    "student_sophia_garcia",
    "student_james_martinez",
    "student_olivia_rodriguez",
  ];

  // Enroll students in various courses
  for (const studentId of students) {
    // Everyone in 1MD3 (intro course)
    await ctx.db.insert("classroomStudentsRelations", {
      classroomId: compsci1md3,
      studentId,
      status: "approved",
      enrolledAt: now - 80 * 24 * 60 * 60 * 1000,
    });

    // Most in 2C03
    if (Math.random() > 0.2) {
      await ctx.db.insert("classroomStudentsRelations", {
        classroomId: compsci2c03,
        studentId,
        status: Math.random() > 0.3 ? "approved" : "pending",
        enrolledAt: now - 50 * 24 * 60 * 60 * 1000,
      });
    }

    // Half in 2ME3
    if (Math.random() > 0.5) {
      await ctx.db.insert("classroomStudentsRelations", {
        classroomId: compsci2me3,
        studentId,
        status: "approved",
        enrolledAt: now - 60 * 24 * 60 * 60 * 1000,
      });
    }

    // Some in 3AC3
    if (Math.random() > 0.6) {
      await ctx.db.insert("classroomStudentsRelations", {
        classroomId: compsci3ac3,
        studentId,
        status: Math.random() > 0.4 ? "approved" : "pending",
        enrolledAt: now - 35 * 24 * 60 * 60 * 1000,
      });
    }

    // Some in 3DB3
    if (Math.random() > 0.5) {
      await ctx.db.insert("classroomStudentsRelations", {
        classroomId: compsci3db3,
        studentId,
        status: "approved",
        enrolledAt: now - 25 * 24 * 60 * 60 * 1000,
      });
    }

    // Few in 4ML3 (advanced)
    if (Math.random() > 0.7) {
      await ctx.db.insert("classroomStudentsRelations", {
        classroomId: compsci4ml3,
        studentId,
        status: Math.random() > 0.5 ? "approved" : "pending",
        enrolledAt: now - 15 * 24 * 60 * 60 * 1000,
      });
    }

    // Few in 4TB3 (advanced)
    if (Math.random() > 0.8) {
      await ctx.db.insert("classroomStudentsRelations", {
        classroomId: compsci4tb3,
        studentId,
        status: "approved",
        enrolledAt: now - 10 * 24 * 60 * 60 * 1000,
      });
    }
  }

  // Create some submissions for first assignment in 1MD3
  console.log("Creating sample submissions...");
  for (let i = 0; i < 5; i++) {
    const studentId = students[i];
    const isSubmitted = Math.random() > 0.3;
    const isGraded = isSubmitted && Math.random() > 0.4;
    const submittedTime = now - Math.random() * 7 * 24 * 60 * 60 * 1000;
    const gradedTime = now - Math.random() * 3 * 24 * 60 * 60 * 1000;
    const grade = 65 + Math.random() * 35;

    const submission: any = {
      assignmentId: assign1md3_1,
      studentId,
      submitted: isSubmitted,
      createdAt: now - 14 * 24 * 60 * 60 * 1000,
    };

    if (isSubmitted) {
      submission.submittedAt = submittedTime;
    }

    if (isGraded) {
      submission.grade = grade;
      submission.feedback = "Good work! Pay attention to edge cases.";
      submission.gradedAt = gradedTime;
      submission.gradedBy = "teacher_dr_smith";
    }

    await ctx.db.insert("submissions", submission);
  }

  // Create some submissions for 2C03
  for (let i = 0; i < 4; i++) {
    const studentId = students[i];
    const isSubmitted = Math.random() > 0.2;
    const isGraded = isSubmitted && Math.random() > 0.3;
    const submittedTime = now - Math.random() * 10 * 24 * 60 * 60 * 1000;
    const gradedTime = now - Math.random() * 5 * 24 * 60 * 60 * 1000;
    const grade = 70 + Math.random() * 30;

    const submission: any = {
      assignmentId: assign2c03_1,
      studentId,
      submitted: isSubmitted,
      createdAt: now - 12 * 24 * 60 * 60 * 1000,
    };

    if (isSubmitted) {
      submission.submittedAt = submittedTime;
    }

    if (isGraded) {
      submission.grade = grade;
      submission.feedback =
        "Well implemented. Consider optimizing the delete operation.";
      submission.gradedAt = gradedTime;
      submission.gradedBy = "teacher_dr_johnson";
    }

    await ctx.db.insert("submissions", submission);

    if (i < 3) {
      const isSubmitted2 = Math.random() > 0.4;
      const submission2: any = {
        assignmentId: assign2c03_2,
        studentId,
        submitted: isSubmitted2,
        createdAt: now - 8 * 24 * 60 * 60 * 1000,
      };

      if (isSubmitted2) {
        submission2.submittedAt = now - Math.random() * 5 * 24 * 60 * 60 * 1000;
      }

      await ctx.db.insert("submissions", submission2);
    }
  }

  // Create some submissions for 2C03
  for (let i = 0; i < 4; i++) {
    const studentId = students[i];
    const isSubmitted = Math.random() > 0.2;
    const isGraded = isSubmitted && Math.random() > 0.3;

    await ctx.db.insert("submissions", {
      assignmentId: assign2c03_1,
      studentId,
      submitted: isSubmitted,
      submittedAt: isSubmitted
        ? now - Math.random() * 10 * 24 * 60 * 60 * 1000
        : undefined,
      grade: isGraded ? 70 + Math.random() * 30 : undefined,
      feedback: isGraded
        ? "Well implemented. Consider optimizing the delete operation."
        : undefined,
      gradedAt: isGraded
        ? now - Math.random() * 5 * 24 * 60 * 60 * 1000
        : undefined,
      gradedBy: isGraded
        ? ("teacher_dr_johnson" as string | undefined)
        : undefined,
      createdAt: now - 12 * 24 * 60 * 60 * 1000,
    });

    if (i < 3) {
      const isSubmitted2 = Math.random() > 0.4;
      await ctx.db.insert("submissions", {
        assignmentId: assign2c03_2,
        studentId,
        submitted: isSubmitted2,
        submittedAt: isSubmitted2
          ? now - Math.random() * 5 * 24 * 60 * 60 * 1000
          : undefined,
        createdAt: now - 8 * 24 * 60 * 60 * 1000,
      });
    }
  }

  // Create some submissions for 2C03
  for (let i = 0; i < 4; i++) {
    const studentId = students[i];
    const isSubmitted = Math.random() > 0.2;
    const isGraded = isSubmitted && Math.random() > 0.3;

    await ctx.db.insert("submissions", {
      assignmentId: assign2c03_1,
      studentId,
      submitted: isSubmitted,
      submittedAt: isSubmitted
        ? now - Math.random() * 10 * 24 * 60 * 60 * 1000
        : undefined,
      grade: isGraded ? 70 + Math.random() * 30 : undefined,
      feedback: isGraded
        ? "Well implemented. Consider optimizing the delete operation."
        : undefined,
      gradedAt: isGraded
        ? now - Math.random() * 5 * 24 * 60 * 60 * 1000
        : undefined,
      gradedBy: isGraded ? "teacher_dr_johnson" : undefined,
      createdAt: now - 12 * 24 * 60 * 60 * 1000,
    });

    if (i < 3) {
      const isSubmitted2 = Math.random() > 0.4;
      await ctx.db.insert("submissions", {
        assignmentId: assign2c03_2,
        studentId,
        submitted: isSubmitted2,
        submittedAt: isSubmitted2
          ? now - Math.random() * 5 * 24 * 60 * 60 * 1000
          : undefined,
        createdAt: now - 8 * 24 * 60 * 60 * 1000,
      });
    }
  }

  // Create some notifications
  console.log("Creating sample notifications...");
  const notif1Metadata: Record<string, any> = { assignmentId: assign1md3_1 };
  await ctx.db.insert("notifications", {
    userId: students[0]!,
    type: "assignment_graded",
    title: "Assignment Graded",
    message:
      "Your submission for 'Assignment 1: Hello Python' has been graded.",
    read: false,
    metadata: notif1Metadata,
    createdAt: now - 2 * 24 * 60 * 60 * 1000,
  });

  const notif2Metadata: Record<string, any> = { classroomId: compsci2c03 };
  await ctx.db.insert("notifications", {
    userId: students[1]!,
    type: "enrollment_approved",
    title: "Enrollment Approved",
    message: "You have been approved to join COMPSCI 2C03.",
    read: true,
    metadata: notif2Metadata,
    createdAt: now - 5 * 24 * 60 * 60 * 1000,
  });

  const notif3Metadata: Record<string, any> = { classroomId: compsci1md3 };
  await ctx.db.insert("notifications", {
    userId: "teacher_dr_smith",
    type: "enrollment_request",
    title: "New Enrollment Request",
    message: "A student has requested to join COMPSCI 1MD3.",
    read: false,
    metadata: notif3Metadata,
    createdAt: now - 1 * 24 * 60 * 60 * 1000,
  });

  await ctx.db.insert("notifications", {
    userId: students[1],
    type: "enrollment_approved",
    title: "Enrollment Approved",
    message: "You have been approved to join COMPSCI 2C03.",
    read: true,
    metadata: { classroomId: compsci2c03 },
    createdAt: now - 5 * 24 * 60 * 60 * 1000,
  });

  await ctx.db.insert("notifications", {
    userId: "teacher_dr_smith",
    type: "enrollment_request",
    title: "New Enrollment Request",
    message: "A student has requested to join COMPSCI 1MD3.",
    read: false,
    metadata: { classroomId: compsci1md3 },
    createdAt: now - 1 * 24 * 60 * 60 * 1000,
  });

  console.log("✅ Mock data created successfully!");
  console.log(`Created ${7} classrooms`);
  console.log(`Created ${25} assignments`);
  console.log(`Created multiple enrollments and submissions`);
});
