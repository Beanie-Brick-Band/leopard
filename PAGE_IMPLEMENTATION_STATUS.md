# LMS Page Structure Implementation - Progress Report

## ✅ Completed Pages & Features

### Core Infrastructure

1. **Role-Based Routing** (`src/lib/role-utils.ts`)
   - Utility functions for role-based navigation
   - Dashboard route resolution
   - Classroom and assignment route helpers

2. **Navigation Header** (`src/components/header.tsx`)
   - Role-aware navigation menu
   - Dynamic dashboard links based on user role
   - Authentication state display

3. **Home Page** (`src/app/page.tsx`)
   - Landing page for unauthenticated users
   - Auto-redirect to role-appropriate dashboard for authenticated users
   - Engaging hero section with features

### Authentication

4. **Signup Page** (`src/app/auth/signup/page.tsx`)
   - Role selection during signup (Student/Teacher)
   - Visual role cards for selection
   - Profile creation after auth account creation
   - Automatic redirect to role-specific dashboard

### Student Pages (Complete Flow)

5. **Student Dashboard** (`src/app/student/page.tsx`)
   - List of enrolled classrooms
   - List of available classrooms to enroll
   - Quick classroom access

6. **Student Classroom Detail** (`src/app/student/classroom/[id]/page.tsx`)
   - Classroom information display
   - Assignment list with due dates
   - Submission status indicators
   - Overdue warnings
   - Grade display for graded assignments
   - Quick actions: Launch workspace, Submit assignment
   - Enrollment button for non-enrolled students

7. **Student Assignment Detail** (`src/app/student/classroom/[id]/assignment/[assignmentId]/page.tsx`)
   - Full assignment description
   - Due date and status display
   - Grade and feedback display (when graded)
   - Submission status
   - Launch workspace button
   - Submit assignment button

### Teacher Pages (Partial Implementation)

8. **Teacher Dashboard** (`src/app/teacher/page.tsx`)
   - List of owned classrooms
   - Create new classroom button
   - Quick access to classroom management
   - Role verification

9. **Create Classroom** (`src/app/teacher/classroom/new/page.tsx`)
   - Classroom creation form
   - Name and description fields
   - Enrollment approval setting
   - Form validation

## 🚧 Pages Still Needed

### Teacher Classroom Management

- **Teacher Classroom Detail** (`/teacher/classroom/[id]/page.tsx`)
  - Classroom information with edit capability
  - Student list (enrolled and pending)
  - Approve/reject enrollment requests
  - Assignment list with create button
  - Remove students
  - Delete classroom

- **Create Assignment** (`/teacher/classroom/[id]/assignment/new/page.tsx`)
  - Assignment creation form
  - Name, description, due date
  - Template ID selection (Coder integration)

- **Edit Assignment** (`/teacher/classroom/[id]/assignment/[assignmentId]/edit/page.tsx`)
  - Update assignment details
  - Change due date
  - Delete assignment

### Teacher Grading & Submissions

- **Teacher Assignment View** (`/teacher/classroom/[id]/assignment/[assignmentId]/page.tsx`)
  - Assignment details
  - Edit assignment button
  - List of all student submissions
  - Quick grade overview
  - Link to individual submissions

- **Student Submission List** (`/teacher/classroom/[id]/assignment/[assignmentId]/submissions/page.tsx`)
  - Table/list of all student submissions
  - Submission status
  - Grades (if graded)
  - Filter by status
  - Sort options
  - Quick access to individual submissions

- **Student Submission Detail** (`/teacher/classroom/[id]/assignment/[assignmentId]/submission/[submissionId]/page.tsx`)
  - Student information
  - Submission timestamp
  - Replay viewer integration
  - Grading form (grade input + feedback textarea)
  - Submit grade button
  - Flag creation interface
  - List of existing flags

### Additional Components Needed

- **GradingForm** component
  - Grade input field
  - Feedback textarea
  - Submit button
  - Validation

- **FlagForm** component
  - Flag type selector
  - Description field
  - Timestamp input
  - Submit button

- **StudentList** component
  - Table view of students
  - Status indicators
  - Actions (approve, reject, remove)

- **NotificationBell** component
  - Unread count badge
  - Dropdown with notification list
  - Mark as read functionality
  - Real-time updates

### Route Protection

- Middleware to check user roles
- Redirect unauthorized users
- Loading states for role verification

## 📋 API Integrations Available (Backend Complete)

All backend APIs are already implemented and available:

### User Profile

- `api.web.userProfile.getProfile` - Get current user's profile and role
- `api.web.userProfile.createProfile` - Create user profile with role
- `api.web.userProfile.updateRole` - Update user role

### Teacher APIs

- `api.web.teacher.getMyClassrooms` - Get teacher's classrooms
- `api.web.teacher.getClassroomDetails` - Get classroom with stats
- `api.web.teacher.getPendingEnrollments` - Get pending student requests
- `api.web.teacher.getEnrolledStudents` - Get approved students
- `api.web.teacher.createClassroom` - Create new classroom
- `api.web.teacher.updateClassroom` - Update classroom settings
- `api.web.teacher.deleteClassroom` - Delete classroom
- `api.web.teacher.updateEnrollmentStatus` - Approve/reject enrollments
- `api.web.teacher.removeStudent` - Remove student from classroom

### Teacher Assignment APIs

- `api.web.teacherAssignments.getAssignmentsByClassroom` - Get assignments
- `api.web.teacherAssignments.createAssignment` - Create assignment
- `api.web.teacherAssignments.updateAssignment` - Update assignment
- `api.web.teacherAssignments.deleteAssignment` - Delete assignment
- `api.web.teacherAssignments.getSubmissionsByAssignment` - Get all submissions
- `api.web.teacherAssignments.gradeSubmission` - Grade a submission
- `api.web.teacherAssignments.createFlag` - Flag suspicious work
- `api.web.teacherAssignments.getFlagsBySubmission` - Get submission flags
- `api.web.teacherAssignments.deleteFlag` - Remove a flag

### Student APIs

- `api.web.classroom.getEnrolled` - Get enrolled classrooms
- `api.web.classroom.getAvailableToEnroll` - Get available classrooms
- `api.web.classroom.enroll` - Enroll in classroom
- `api.web.submissions.getOrCreateSubmission` - Initialize submission
- `api.web.submissions.submitAssignment` - Submit assignment
- `api.web.submissions.getMySubmissions` - Get all student's submissions
- `api.web.submissions.getMySubmissionForAssignment` - Get specific submission
- `api.web.submissions.unsubmitAssignment` - Allow resubmission

### Notifications

- `api.web.notifications.getMyNotifications` - Get user notifications
- `api.web.notifications.getUnreadCount` - Get unread count
- `api.web.notifications.markAsRead` - Mark notification as read
- `api.web.notifications.markAllAsRead` - Mark all as read
- `api.web.notifications.deleteNotification` - Delete notification

### Assignment APIs

- `api.web.assignment.getById` - Get assignment by ID
- `api.web.assignment.openWorkspace` - Create/open workspace for assignment

## 🎯 Next Steps Priority

1. **HIGH PRIORITY**
   - Teacher classroom detail page (manage students, view pending enrollments)
   - Create assignment page
   - Teacher assignment view with submissions list
   - Grading interface

2. **MEDIUM PRIORITY**
   - Student submission detail page for teachers
   - Flag creation interface
   - Edit assignment page
   - Notification bell component

3. **LOW PRIORITY**
   - Route protection middleware
   - Enhanced error handling
   - Loading states optimization
   - Accessibility improvements

## 📝 Usage Notes

### For Students

1. Sign up and select "Student" role
2. Browse available classrooms
3. Enroll in classrooms
4. View assignments
5. Launch workspace to work on assignments
6. Submit assignments
7. View grades and feedback

### For Teachers

1. Sign up and select "Teacher" role
2. Create classrooms
3. Approve/reject student enrollment requests (if approval required)
4. Create assignments for classrooms
5. View student submissions
6. Grade submissions with feedback
7. Flag suspicious submissions

## 🔧 Technical Details

### File Structure

```
apps/nextjs/src/
├── app/
│   ├── page.tsx                                    ✅ Home with redirects
│   ├── auth/
│   │   └── signup/page.tsx                         ✅ Role selection
│   ├── student/
│   │   ├── page.tsx                                ✅ Student dashboard
│   │   └── classroom/
│   │       └── [id]/
│   │           ├── page.tsx                        ✅ Classroom detail
│   │           └── assignment/
│   │               └── [assignmentId]/page.tsx     ✅ Assignment detail
│   └── teacher/
│       ├── page.tsx                                ✅ Teacher dashboard
│       └── classroom/
│           ├── new/page.tsx                        ✅ Create classroom
│           └── [id]/
│               ├── page.tsx                        ❌ TODO
│               └── assignment/
│                   ├── new/page.tsx                ❌ TODO
│                   ├── [assignmentId]/
│                   │   ├── page.tsx                ❌ TODO
│                   │   ├── edit/page.tsx           ❌ TODO
│                   │   └── submission/
│                   │       └── [submissionId]/
│                   │           └── page.tsx        ❌ TODO
│                   └── submissions/page.tsx        ❌ TODO
├── components/
│   └── header.tsx                                  ✅ Role-aware navigation
└── lib/
    └── role-utils.ts                               ✅ Role utilities
```

### Dependencies Added

- `lucide-react` - Icon library for UI components

### UI Components Available

- Button, Card, Input, Label, Separator, Spinner
- Field (with Label, Error, Description)
- Dropdown Menu
- Toast notifications
- Textarea (newly exported)

## 🚀 Getting Started

1. Run the development server:

   ```bash
   pnpm dev
   ```

2. Create a teacher account:
   - Navigate to `/auth/signup`
   - Select "Teacher" role
   - Fill in details and sign up

3. Create a student account (in another browser/incognito):
   - Navigate to `/auth/signup`
   - Select "Student" role
   - Fill in details and sign up

4. Test the flow:
   - As teacher: Create a classroom, create assignments
   - As student: Enroll in classroom, view assignments, submit work
   - As teacher: Grade submissions

## 📌 Implementation Notes

- All pages use the `Authenticated`, `Unauthenticated`, and `AuthLoading` components for auth state management
- Role verification is done at the component level using `api.web.userProfile.getProfile`
- Navigation uses role-aware routing utilities for consistent links
- Toast notifications are used throughout for user feedback
- Forms use controlled components with React state
- All mutations handle errors gracefully with try-catch blocks
