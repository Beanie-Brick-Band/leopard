# Database Seeding Guide

## Overview

This guide explains how to seed the Leopard database with realistic McMaster University Computer Science course data.

## What Gets Seeded

The `createMock` internal mutation creates:

### 7 McMaster CS Classrooms:

1. **COMPSCI 1MD3** - Introduction to Programming (Python)
2. **COMPSCI 2C03** - Data Structures and Algorithms
3. **COMPSCI 2ME3** - Introduction to Software Development
4. **COMPSCI 3AC3** - Algorithms and Complexity
5. **COMPSCI 3DB3** - Databases
6. **COMPSCI 4ML3** - Introduction to Machine Learning
7. **COMPSCI 4TB3** - Syntax-Based Tools and Compilers

### 25+ Assignments:

- 3-4 assignments per course
- Realistic assignment names and descriptions
- Due dates spread over the next 50 days
- Template IDs for different programming environments

### 10 Mock Students:

- `student_john_doe`
- `student_jane_smith`
- `student_bob_wilson`
- `student_alice_brown`
- `student_charlie_davis`
- `student_emma_jones`
- `student_david_miller`
- `student_sophia_garcia`
- `student_james_martinez`
- `student_olivia_rodriguez`

### Enrollments:

- All students enrolled in COMPSCI 1MD3 (intro course)
- Decreasing enrollment in higher-level courses
- Mix of approved and pending enrollments (for courses with approval required)

### Submissions:

- Sample submissions for first few assignments
- Mix of submitted/unsubmitted
- Some with grades and feedback
- Randomized to simulate real usage

### Notifications:

- Enrollment approvals
- Assignment graded notifications
- Enrollment requests for teachers

## How to Seed the Database

### Step 1: Clear Existing Data (Optional)

If you want to start fresh:

1. Go to Convex Dashboard: https://dashboard.convex.dev
2. Navigate to your project → Functions
3. Run the internal mutation: `web/clearData:clearAllData`
4. This will delete ALL data in the database

### Step 2: Run the Seed Function

1. Go to Convex Dashboard → Functions
2. Run the internal mutation: `web/index:createMock`
3. Watch the console logs to see progress
4. Should complete in 5-10 seconds

### Step 3: Verify the Data

Check the Data tab in Convex Dashboard:

- **classrooms**: Should have 7 entries (COMPSCI courses)
- **assignments**: Should have 25+ entries
- **classroomStudentsRelations**: Should have 50+ entries (student enrollments)
- **submissions**: Should have 10+ entries with various states
- **notifications**: Should have 3 sample notifications

## Mock Teacher Accounts

The seed creates assignments owned by these mock teacher IDs:

- `teacher_dr_smith` - Teaches 1MD3 and 2ME3
- `teacher_dr_johnson` - Teaches 2C03 and 3DB3
- `teacher_dr_patel` - Teaches 3AC3 and 4TB3
- `teacher_dr_chen` - Teaches 4ML3

To use these as real teachers:

1. Create a real user account via signup
2. Use `setUserRole` to make them a teacher (see `HOW_TO_MAKE_TEACHER.md`)
3. Manually update classroom `ownerId` fields in the database to the real user ID

## Customizing the Seed Data

To modify the seed data, edit `/packages/backend/convex/web/index.ts`:

```typescript
// Add more classrooms
const newCourseId = await ctx.db.insert("classrooms", {
  className: "COMPSCI 3XY3",
  description: "Your course description",
  ownerId: "teacher_your_teacher",
  createdAt: now,
  enrollmentRequiresApproval: false,
});

// Add more assignments
await ctx.db.insert("assignments", {
  name: "Your Assignment",
  description: "Assignment description",
  dueDate: futureDate(14), // 14 days from now
  classroomId: newCourseId,
  templateId: "template-name",
  createdAt: now,
});
```

## Troubleshooting

### Error: "Mock data already exists"

This means there's already data in the database. Either:

1. Run `clearAllData` first to wipe everything
2. Manually delete specific entries in the Data tab
3. Comment out the check in `createMock` (not recommended)

### TypeScript Errors

The seed file has some TypeScript warnings about optional fields, but these are non-blocking. The function will still compile and run correctly.

### Missing Assignments in Frontend

Make sure:

1. The classroom `ownerId` matches a real teacher user ID if you're logged in as a teacher
2. Students are enrolled (status = "approved") in the classroom
3. Assignments have valid `classroomId` references

## Next Steps After Seeding

1. **Create a real teacher account**:
   - Sign up via `/auth/signup`
   - Use `setUserRole` to make them a teacher
   - Update classroom ownership

2. **Create student accounts**:
   - Sign up multiple accounts
   - Keep them as students (default)
   - Enroll in seeded classrooms

3. **Test the full flow**:
   - Teacher creates assignments
   - Students enroll and submit
   - Teacher grades submissions
   - Test notifications

## Sample Course Data Reference

All courses follow McMaster University naming conventions:

- Format: `COMPSCI [level][sequence][unit]`
- Level: 1 (first year), 2 (second year), 3 (third year), 4 (fourth year)
- Units: Usually 3 (3-unit courses)

Example: **COMPSCI 2C03** = Second-year Computer Science, sequence C, 3 units
