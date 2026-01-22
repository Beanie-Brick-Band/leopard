# Teacher/Student Complete Flow Implementation - Progress Report

## Branch: `feat/teacher-student-complete-flow`

## ✅ Completed Tasks

### 1. Schema Updates (HIGH PRIORITY)

- ✅ Updated database schema with:
  - User roles (`userProfiles` table with teacher/student roles)
  - Enhanced assignments (description, classroom link, template ID)
  - Enhanced classrooms (description, enrollment approval settings)
  - Enhanced submissions (feedback, grading, timestamps)
  - Enrollment status tracking (pending/approved/rejected)
  - Notifications system
  - Flags with submission linkage
  - Proper indexes for all tables

### 2. Backend Mutations & Queries

#### User Profile Management

- ✅ Created `/packages/backend/convex/web/userProfile.ts`:
  - `getProfile` - Get user's profile and role
  - `createProfile` - Create user profile with role
  - `updateRole` - Update user role

#### Teacher Classroom Management

- ✅ Created `/packages/backend/convex/web/teacher.ts`:
  - `getMyClassrooms` - Get teacher's classrooms
  - `getClassroomDetails` - Get classroom with stats
  - `getPendingEnrollments` - Get pending student requests
  - `getEnrolledStudents` - Get approved students
  - `createClassroom` - Create new classroom
  - `updateClassroom` - Update classroom settings
  - `deleteClassroom` - Delete classroom and all related data
  - `updateEnrollmentStatus` - Approve/reject enrollments
  - `removeStudent` - Remove student from classroom

#### Teacher Assignment Management

- ✅ Created `/packages/backend/convex/web/teacherAssignments.ts`:
  - `getAssignmentsByClassroom` - Get assignments for a classroom
  - `createAssignment` - Create new assignment
  - `updateAssignment` - Update assignment details
  - `deleteAssignment` - Delete assignment and submissions
  - `getSubmissionsByAssignment` - Get all student submissions
  - `gradeSubmission` - Grade a student submission
  - `createFlag` - Flag suspicious work
  - `getFlagsBySubmission` - Get flags for a submission
  - `deleteFlag` - Remove a flag

#### Student Submissions

- ✅ Created `/packages/backend/convex/web/submissions.ts`:
  - `getOrCreateSubmission` - Initialize submission
  - `submitAssignment` - Submit assignment
  - `getMySubmissions` - Get all student's submissions
  - `getMySubmissionForAssignment` - Get specific submission
  - `unsubmitAssignment` - Allow resubmission

#### Notifications

- ✅ Created `/packages/backend/convex/web/notifications.ts`:
  - `getMyNotifications` - Get user notifications
  - `getUnreadCount` - Get unread count
  - `markAsRead` - Mark notification as read
  - `markAllAsRead` - Mark all as read
  - `deleteNotification` - Delete notification

#### Updated Existing Files

- ✅ Updated `/packages/backend/convex/web/classroom.ts`:
  - Fixed enrollment to use new schema
  - Added enrollment status tracking
  - Added notifications for enrollment

- ✅ Updated `/packages/backend/convex/web/assignment.ts`:
  - Added `assignmentId` to workspace tracking

- ✅ Updated `/packages/backend/convex/web/index.ts`:
  - Fixed mock data creation for new schema

### 3. Frontend Updates

- ✅ Updated `/apps/nextjs/src/app/app/page.tsx` (Student Dashboard):
  - Added submission status display
  - Added "Submit" button for assignments
  - Added grade and feedback display
  - Fixed to work with new schema (assignments no longer in classrooms array)
  - Created ClassroomCard component for better organization

## 🔄 In Progress / Not Started

### HIGH PRIORITY

#### 4. Role Selection on Signup

- ❌ Update `/apps/nextjs/src/app/auth/signup/page.tsx`:
  - Add role selection (Student/Teacher)
  - Create profile after Better Auth signup
  - Redirect based on role

#### 5. Teacher Dashboard Pages

- ❌ Create `/apps/nextjs/src/app/teacher/page.tsx`:
  - List all classrooms
  - Create new classroom button
  - Stats overview

- ❌ Create `/apps/nextjs/src/app/teacher/classroom/[id]/page.tsx`:
  - Classroom details
  - Student list
  - Pending enrollments with approve/reject
  - Assignment list for classroom
  - Create assignment button

- ❌ Create `/apps/nextjs/src/app/teacher/classroom/[id]/assignment/[assignmentId]/page.tsx`:
  - Assignment details
  - List of submissions
  - Grading interface

- ❌ Create `/apps/nextjs/src/app/teacher/classroom/[id]/assignment/[assignmentId]/submission/[submissionId]/page.tsx`:
  - Single submission view
  - Replay viewer integration
  - Grading form
  - Flag creation

#### 6. Classroom Creation UI

- ❌ Create `/apps/nextjs/src/app/teacher/classroom/new/page.tsx`:
  - Form for classroom creation
  - Settings for enrollment approval

#### 7. Assignment Creation UI

- ❌ Create `/apps/nextjs/src/app/teacher/classroom/[id]/assignment/new/page.tsx`:
  - Form for assignment creation
  - Due date picker
  - Description editor
  - Template selection (from Coder)

#### 8. Grading Interface

- ❌ Create grading component:
  - Grade input (0-100 or custom scale)
  - Feedback text area
  - Submit grade button

### MEDIUM PRIORITY

#### 9. Submission Flow

- ❌ Update workspace launch to auto-create submission
- ❌ Add submission confirmation dialog
- ❌ Show submission status in student dashboard

#### 10. Flagging UI

- ❌ Create flag creation dialog/form:
  - Flag type selector
  - Description field
  - Timestamps

- ❌ Display flags in submission view:
  - Flag list
  - Delete flag option

#### 11. Notifications

- ❌ Create notification bell component in header:
  - Unread count badge
  - Dropdown with notifications
  - Mark as read functionality

- ❌ Add notification preferences:
  - Email notifications
  - In-app only

## 📋 Additional Tasks Needed

### Navigation & Routing

- Update header/navigation to show different links for teachers vs students
- Add role-based route protection
- Create dashboard redirect based on role

### UI Components Needed

- Create reusable form components:
  - ClassroomForm
  - AssignmentForm
  - GradingForm
  - FlagForm
- Create data display components:
  - StudentList
  - SubmissionList
  - NotificationList

### Integration

- Connect replay viewer to submission view
- Integrate Coder templates into assignment creation
- Add real-time updates for notifications

## 🧪 Testing Needs

- Test teacher creating classroom
- Test student enrolling in classroom
- Test enrollment approval flow
- Test assignment creation and distribution
- Test submission flow
- Test grading flow
- Test flagging system
- Test notifications

## 📝 Documentation Needs

- Update README with new features
- Create teacher onboarding guide
- Create student guide
- Document API endpoints

## ⚠️ Important Notes

1. **Authentication**: All backend functions check for authenticated user
2. **Authorization**: Teacher functions verify classroom ownership
3. **Notifications**: Automatically sent for key actions (enrollment, grading, etc.)
4. **Data Deletion**: Cascading deletes implemented (classroom → assignments → submissions)
5. **Submission Tracking**: Workspace ID now linked to submissions

## 🚀 Next Steps

1. **Immediate**: Create role selection on signup
2. **Then**: Build teacher dashboard pages
3. **Then**: Create classroom/assignment creation forms
4. **Then**: Build grading interface
5. **Finally**: Add notifications UI and flagging system

## 💾 Files Changed

- `/packages/backend/convex/schema.ts` - Complete schema overhaul
- `/packages/backend/convex/web/userProfile.ts` - NEW
- `/packages/backend/convex/web/teacher.ts` - NEW
- `/packages/backend/convex/web/teacherAssignments.ts` - NEW
- `/packages/backend/convex/web/submissions.ts` - NEW
- `/packages/backend/convex/web/notifications.ts` - NEW
- `/packages/backend/convex/web/classroom.ts` - UPDATED
- `/packages/backend/convex/web/assignment.ts` - UPDATED
- `/packages/backend/convex/web/index.ts` - UPDATED (mock data)
- `/apps/nextjs/src/app/app/page.tsx` - UPDATED (student dashboard)
