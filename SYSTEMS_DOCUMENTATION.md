# Éclat BECE Platform - Systems Documentation

**Generated:** 2025-01-08  
**Version:** 2.0 (Fresh Analysis)

---

## Table of Contents

1. [Overview](#overview)
2. [Technology Stack](#technology-stack)
3. [Architecture](#architecture)
4. [Database Schema](#database-schema)
5. [Authentication System](#authentication-system)
6. [User Roles & Access Control](#user-roles--access-control)
7. [Student System](#student-system)
8. [Parent System](#parent-system)
9. [Admin System](#admin-system)
10. [School System](#school-system)
11. [Quiz & Practice System](#quiz--practice-system)
12. [Competition System](#competition-system)
13. [Subscription System](#subscription-system)
14. [Notification System](#notification-system)
15. [Edge Functions](#edge-functions)
16. [Routing Structure](#routing-structure)
17. [Security](#security)

---

## Overview

Éclat BECE is an educational platform designed for Nigerian students preparing for the Basic Education Certificate Examination (BECE). The platform provides practice quizzes, progress tracking, competitions, and parent oversight.

**Key Features:**
- Role-based access for students, parents, schools, and administrators
- Year 6 and Year 9 curriculum-aligned quiz content
- Parent-controlled student account management
- Practice assignments with configurable parameters
- National competitions with leaderboards
- Premium subscription model
- Comprehensive analytics and reporting

---

## Technology Stack

### Frontend
- **Framework:** React 18 with TypeScript
- **Routing:** React Router v6
- **State Management:** React Query (TanStack Query)
- **UI Components:** shadcn/ui (Radix UI primitives)
- **Styling:** TailwindCSS
- **Form Validation:** Zod
- **Icons:** Lucide React
- **Date Handling:** date-fns
- **Notifications:** Sonner (toast notifications)

### Backend
- **Database:** PostgreSQL (via Supabase)
- **Authentication:** Supabase Auth
- **Edge Functions:** Deno (Supabase Edge Runtime)
- **Storage:** Supabase Storage (avatars, question images)
- **Email Service:** Resend API

### Infrastructure
- **Hosting:** Vercel
- **Database:** Supabase Cloud
- **Edge Functions:** Supabase Edge Functions

---

## Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ Student  │  │  Parent  │  │  School  │  │   Admin  │  │
│  │  Views   │  │  Views   │  │  Views   │  │  Views   │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  Supabase Client SDK                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │   Auth   │  │ Database │  │ Storage  │  │  Realtime│  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Supabase Edge Functions (Deno)                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │Provision │  │  Create  │  │  Manage  │  │  Quiz    │  │
│  │  User    │  │ Student  │  │ Student  │  │ Utilities│  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  PostgreSQL Database                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │  Users   │  │  Quiz    │  │ Practice │  │  Admin   │  │
│  │  Roles   │  │  Data    │  │ Assign.  │  │  Audit   │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Key Design Principles

1. **Row-Level Security (RLS):** All database tables use RLS policies to enforce data access based on user roles
2. **Edge Function Isolation:** Sensitive operations (user creation, student management) are handled via edge functions
3. **Role-Based Access:** Four distinct roles (student, parent, school, admin) with specific permissions
4. **Parent-Managed Students:** Students cannot self-register; parents create and manage student accounts
5. **Email Verification:** Parents and schools must verify email before accessing the platform

---

## Database Schema

### Core Tables

#### `auth.users`
Supabase Auth managed table for user authentication.

#### `profiles`
Extended user profile information.
- `id` (UUID, PK) - References auth.users
- `email` (TEXT)
- `full_name` (TEXT)
- `display_name` (TEXT)
- `username` (TEXT) - Unique, used for student login
- `avatar_url` (TEXT)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

#### `user_roles`
Role assignment table.
- `user_id` (UUID, PK) - References auth.users
- `role` (app_role enum) - 'student', 'parent', 'school', 'admin'
- **Unique constraint:** (user_id, role)

#### `students`
Student account information.
- `id` (UUID, PK)
- `user_id` (UUID, FK) - References auth.users
- `parent_id` (UUID, FK) - References parents.id
- `school_id` (UUID, FK) - References schools.id
- `class_year` (TEXT) - 'year_6' or 'year_9'
- `unique_id` (TEXT) - Unique student code for parent linking
- `is_premium` (BOOLEAN) - Premium subscription status
- `onboarding_completed` (BOOLEAN)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

**RLS Policies:**
- Parents can view/update their children
- Schools can view/update their students
- Students can view/update own record (with restrictions)
- Students cannot update protected fields (user_id, class_year, is_premium)

#### `parents`
Parent account information.
- `id` (UUID, PK)
- `user_id` (UUID, FK) - References auth.users
- `onboarding_completed` (BOOLEAN)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

#### `schools`
School account information.
- `id` (UUID, PK)
- `user_id` (UUID, FK) - References auth.users
- `school_name` (TEXT)
- `address` (TEXT)
- `contact_email` (TEXT)
- `unique_code` (TEXT) - Unique school code for student linking
- `onboarding_completed` (BOOLEAN)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

#### `admins`
Administrator account information.
- `id` (UUID, PK)
- `user_id` (UUID, FK, UNIQUE) - References auth.users
- `full_name` (TEXT)
- `permissions` (JSONB) - Granular permissions
- `is_super_admin` (BOOLEAN)
- `created_by` (UUID, FK) - References admins.id
- `is_active` (BOOLEAN)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

#### `admin_invitations`
Admin invitation tokens for fresh user creation.
- `id` (UUID, PK)
- `target_email` (TEXT) - Email of invited user
- `token` (TEXT, UNIQUE) - Invitation token
- `full_name` (TEXT)
- `is_super_admin` (BOOLEAN)
- `invited_by` (UUID, FK) - References admins.id
- `status` (TEXT) - 'pending', 'accepted', 'expired'
- `expires_at` (TIMESTAMPTZ)
- `accepted_at` (TIMESTAMPTZ)
- `created_at` (TIMESTAMPTZ)

#### `admin_audit_log`
Audit trail for admin actions.
- `id` (UUID, PK)
- `admin_id` (UUID, FK) - References admins.id
- `action` (TEXT)
- `resource_type` (TEXT)
- `resource_id` (UUID)
- `details` (JSONB)
- `ip_address` (INET)
- `user_agent` (TEXT)
- `created_at` (TIMESTAMPTZ)

### Quiz Tables

#### `quiz_questions_year6` / `quiz_questions_year9`
Question data for each class year.
- `id` (UUID, PK)
- `subject` (TEXT)
- `topic` (TEXT)
- `question_text` (TEXT)
- `correct_answer` (TEXT)
- `explanation` (TEXT)
- `difficulty` (TEXT) - 'easy', 'medium', 'hard'
- `image_url` (TEXT)
- `passage_id` (UUID, FK) - References comprehension_passages
- `uploaded_by` (UUID, FK) - References auth.users(id); the admin who uploaded the question. Stamped automatically by a BEFORE INSERT trigger via `auth.uid()` (service-role callers can pass it explicitly). Backfilled from admin_audit_log (per-question create events, then batch-level bulk events matched by class year + a 15-minute creation window when unambiguous); a small ambiguous remainder is null.
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

#### `quiz_options_year6` / `quiz_options_year9`
Multiple choice options for questions.
- `id` (UUID, PK)
- `question_id` (UUID, FK)
- `option_text` (TEXT)
- `image_url` (TEXT)
- `is_correct` (BOOLEAN)
- `display_order` (INTEGER)

#### `comprehension_passages_year6` / `comprehension_passages_year9`
Reading comprehension passages.
- `id` (UUID, PK)
- `title` (TEXT)
- `passage_text` (TEXT)
- `subject` (TEXT)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

#### `quiz_results`
Student quiz completion records.
- `id` (UUID, PK)
- `student_id` (UUID, FK) - References students.id
- `subject` (TEXT)
- `score` (NUMERIC) - Percentage
- `total_questions` (INTEGER)
- `correct_answers` (INTEGER)
- `completed_at` (TIMESTAMPTZ)
- `created_at` (TIMESTAMPTZ)

**RLS Policies:**
- Students can view own results
- Parents can view their children's results
- Schools can view their students' results
- Admins can view all results

#### `flagged_questions`
Student-reported question issues. Question content (`subject`, `topic`, `question_text`, `uploaded_by`) is a snapshot taken at report time, so reports survive question edits/deletes (`question_id` has no FK by design — it can point to either question table).
- `id` (UUID, PK)
- `student_id` (UUID, FK) - References students.id
- `class_year` (TEXT) - 'year_6' | 'year_9'
- `question_id` (UUID)
- `subject` (TEXT)
- `topic` (TEXT)
- `question_text` (TEXT)
- `reason` (TEXT, CHECK) - 'incorrect_answer', 'typo', 'missing_image', 'incomplete', 'other'
- `details` (TEXT)
- `status` (TEXT, NOT NULL DEFAULT 'pending', CHECK) - 'pending', 'resolved', 'dismissed'
- `uploaded_by` (UUID, FK) - References auth.users(id); snapshot of the question's uploader, set by the `set_flag_uploaded_by` trigger from quiz_questions_year6/year9 (null if the question was deleted)
- `created_at` (TIMESTAMPTZ)
- `resolved_at` (TIMESTAMPTZ)
- `resolved_by` (UUID, FK) - References profiles.id; the admin who resolved/dismissed

**Indexes:** (status, created_at DESC), question_id, class_year, student_id.

**RLS Policies:**
- Students can insert flags
- Admins can view and manage all flags

### Practice & Assignment Tables

#### `practice_assignments`
Parent-created practice tasks for students.
- `id` (UUID, PK)
- `student_id` (UUID, FK) - References students.id
- `parent_id` (UUID, FK) - References parents.id
- `subject` (TEXT)
- `topics` (TEXT[])
- `num_questions` (INTEGER) - 1-60
- `duration` (INTEGER) - Minutes, 1-240
- `status` (TEXT) - 'pending', 'in_progress', 'completed', 'cancelled'
- `score` (NUMERIC)
- `completed_at` (TIMESTAMPTZ)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

**RLS Policies:**
- Parents can view/create/update their children's assignments
- Students can view/update own assignments (progress fields only)
- **Trigger:** `enforce_practice_assignment_rules` - Enforces business rules:
  - At least one topic required
  - Assignment parent must own the student
  - Standard students limited to 10 questions per assignment
  - Maximum 60 questions per assignment

#### `subscriptions`
Premium subscription records.
- `id` (UUID, PK)
- `parent_id` (UUID, FK) - References parents.id
- `student_id` (UUID, FK) - References students.id
- `plan` (TEXT) - 'premium_annual'
- `status` (TEXT) - 'active', 'expired', 'cancelled'
- `amount` (INTEGER) - 15000 NGN
- `currency` (TEXT) - 'NGN'
- `started_at` (TIMESTAMPTZ)
- `expires_at` (TIMESTAMPTZ)
- `metadata` (JSONB)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

**Unique constraint:** One active subscription per student

**RLS Policies:**
- Parents can view subscriptions for their children
- Students can view own subscriptions

### Competition Tables

#### `competitions`
National competition management.
- `id` (UUID, PK)
- `title` (TEXT)
- `description` (TEXT)
- `start_date` (TIMESTAMPTZ)
- `end_date` (TIMESTAMPTZ)
- `status` (TEXT) - 'draft', 'active', 'completed', 'cancelled'
- `class_year` (TEXT) - 'year_6', 'year_9', 'all'
- `created_by` (UUID, FK) - References admins.id
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

**RLS Policies:**
- Public can view active competitions
- Admins can perform all operations

### Notification Tables

#### `notifications`
User notifications.
- `id` (UUID, PK)
- `user_id` (UUID, FK) - References auth.users
- `type` (TEXT)
- `title` (TEXT)
- `message` (TEXT)
- `read` (BOOLEAN)
- `metadata` (JSONB)
- `created_at` (TIMESTAMPTZ)

**Triggers:**
- `notify_practice_assignment_created` - Notifies student when assignment created
- `notify_practice_assignment_completed` - Notifies parent when assignment completed

### System Tables

#### `system_settings`
Global platform configuration.
- `id` (UUID, PK)
- `key` (TEXT, UNIQUE)
- `value` (TEXT)
- `description` (TEXT)
- `updated_by` (UUID, FK) - References admins.id
- `updated_at` (TIMESTAMPTZ)

#### `student_streaks`
Student practice streak tracking.
- `id` (UUID, PK)
- `student_id` (UUID, FK) - References students.id
- `current_streak` (INTEGER)
- `longest_streak` (INTEGER)
- `last_practice_date` (DATE)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

---

## Authentication System

### Authentication Flow Overview

```
┌──────────────┐
│ Role Select  │
└──────┬───────┘
       │
       ├────────────┬────────────┬────────────┐
       │            │            │            │
       ▼            ▼            ▼            ▼
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ Student  │ │  Parent  │ │  School  │ │  Admin   │
│  Login   │ │  Login   │ │  Login   │ │  Login   │
└─────┬────┘ └─────┬────┘ └─────┬────┘ └─────┬────┘
      │            │            │            │
      ▼            ▼            ▼            ▼
┌──────────────────────────────────────────────┐
│         Supabase Auth API                    │
│  - Password Sign In                          │
│  - Google OAuth                              │
│  - Email Verification                        │
│  - Password Reset                            │
└──────────────────────────────────────────────┘
```

### Role Selection & Sign Up

**Pages:**
- `LoginRoleSelectionPage` (`/login/role-selection`) - Choose role for login
- `SignUpRoleSelectionPage` (`/signup/role-selection`) - Choose role for sign-up (student disabled)
- `AuthPage` (`/auth`) - Parent/school sign-up form

**Sign-up Flow (Parent/School):**
1. User selects role (parent or school)
2. Fills sign-up form (email, password, full name)
3. Calls `supabase.auth.signUp()` with user metadata (role, full_name)
4. Calls `send-verification-email` edge function
5. Redirects to email verification page
6. User enters verification code
7. Calls `verify-email-code` edge function
8. On success, redirects to login

**Sign-up Flow (Admin):**
1. Admin sends invitation via `send-admin-invitation` edge function
2. Email contains link to `/admin/setup/{token}`
3. User clicks link, lands on `AdminPasswordSetupPage`
4. Validates token via `get_invitation_details` RPC
5. User sets password
6. Calls `create-admin-user` edge function
7. Creates auth user, profile, user_roles, and admin record
8. Redirects to admin login

### Login Flow

**Pages:**
- `ParentLoginInPage` (`/parent-login`) - Parent login
- `StudentLogInPage` (`/student-login`) - Student login
- `SchoolLogInPage` (`/school-login`) - School login
- `AdminLoginPage` (`/admin/login`) - Admin login

**Parent/School Login:**
1. User enters email and password
2. Calls `supabase.auth.signInWithPassword()`
3. Checks email verification status
4. Verifies role in `user_roles` table
5. Redirects to appropriate dashboard or onboarding

**Student Login:**
1. User enters username and password
2. Maps username to dummy email: `{username}@student.eclat.com`
3. Calls `supabase.auth.signInWithPassword()`
4. Verifies role is 'student'
5. Redirects to student dashboard

**Admin Login:**
1. User enters email and password
2. Calls `supabase.auth.signInWithPassword()`
3. Verifies role is 'admin' in `user_roles` table
4. Verifies admin record exists and is active in `admins` table
5. Redirects to admin dashboard

### OAuth Login (Google)

**Flow:**
1. User clicks "Sign in with Google"
2. Stores pending role in localStorage
3. Calls `supabase.auth.signInWithOAuth()`
4. Redirects to `AuthCallback` (`/auth/callback`)
5. Callback retrieves session
6. Checks if user has role in `user_roles`
7. If no role, calls `provision-user` edge function
8. Edge function creates role record and base profile
9. Updates user metadata with role
10. Marks email as verified
11. Redirects to onboarding or dashboard based on role

### Email Verification

**Pages:**
- `EmailVerificationPage` (`/verify-email`)

**Flow:**
1. User enters 6-digit verification code
2. Calls `verify-email-code` edge function
3. Edge function validates code and marks email verified
4. On success, redirects to login

**Edge Functions:**
- `send-verification-email` - Generates and sends verification code
- `verify-email-code` - Validates code and updates user status

### Password Reset

**Pages:**
- `PasswordResetPage` (`/password-reset`)

**Flow:**
1. User enters email
2. Calls `supabase.auth.resetPasswordForEmail()`
3. User clicks link in email
4. User enters new password
5. Calls `supabase.auth.updateUser()`

### User Provisioning

**Edge Function:** `provision-user`

**Purpose:** Provision user roles after OAuth signup

**Flow:**
1. Receives user ID from auth callback
2. Checks user metadata for role
3. If role is 'student', rejects (students must be created by parents)
4. Inserts/updates `user_roles` table
5. Creates base record in `parents` or `schools` table
6. Returns success

---

## User Roles & Access Control

### Role Definitions

#### Student
- **Purpose:** Primary user taking quizzes and practicing
- **Creation:** Parent-created only (no self-signup)
- **Login:** Username-based login mapped to dummy email
- **Access:** Student dashboard, practice, assignments, progress, leaderboard

#### Parent
- **Purpose:** Manages student accounts and monitors progress
- **Creation:** Self-signup with email verification
- **Login:** Email-based login
- **Access:** Parent dashboard, child management, practice assignment, subscriptions, settings

#### School
- **Purpose:** Educational institution managing students
- **Creation:** Self-signup with email verification
- **Login:** Email-based login
- **Access:** School dashboard, student linking, analytics

#### Admin
- **Purpose:** Platform administration and content management
- **Creation:** Invitation-only via existing admin
- **Login:** Email-based login with dedicated admin login page
- **Access:** Admin dashboard, user management, question bank, analytics, competitions, settings

### RLS Policy Structure

**General Pattern:**
```sql
CREATE POLICY "Policy Name"
ON table_name FOR operation
USING (
  EXISTS (
    SELECT 1 FROM role_table
    WHERE user_id = auth.uid()
      AND is_active = TRUE
  )
);
```

**Key RLS Policies:**

1. **Students:**
   - Can view own profile and quiz results
   - Can update own profile (with restrictions)
   - Can view own assignments
   - Can update own assignment progress
   - Can insert question flags

2. **Parents:**
   - Can view their children's profiles
   - Can view/update their children's records
   - Can view their children's quiz results
   - Can view/create/update their children's assignments
   - Can view subscriptions for their children

3. **Schools:**
   - Can view their students' profiles
   - Can view/update their students' records
   - Can view their students' quiz results

4. **Admins:**
   - Can view all data (with some restrictions)
   - Can insert/update/delete quiz questions
   - Can manage competitions
   - Can manage system settings
   - Can view and resolve flagged questions

### Helper Functions

**`is_admin(_user_id UUID)`**
- Returns TRUE if user is an active admin

**`is_super_admin(_user_id UUID)`**
- Returns TRUE if user is a super admin

**`get_admin_id(_user_id UUID)`**
- Returns admin ID for a given user ID

**`log_admin_action(...)`**
- Logs admin actions to audit log

---

## Student System

### Student Dashboard

**Page:** `StudentDashboardOverview` (`/dashboard/student`)

**Features:**
- Personalized welcome message
- Quick stats (total questions, average score, monthly rank)
- Quick access cards (practice, assignments, progress, leaderboard)
- Recent quiz activity
- Student unique code for parent linking

**Data Sources:**
- `profiles` - Display name, avatar
- `students` - Class year, unique code
- `quiz_results` - Recent activity, performance metrics
- `quiz_questions_yearX` - Question counts for stats

### Practice Selection

**Page:** `StudentPractice` (`/dashboard/student/practice`)

**Features:**
- Browse by subject (Mathematics, English, Basic Science, Social Studies)
- Browse by topic (with question counts)
- Start practice sessions

**Data Sources:**
- `students` - Class year
- `quiz_questions_year6` / `quiz_questions_year9` - Question data
- `topic_question_counts_year6` / `topic_question_counts_year9` - Pre-aggregated topic counts

### Quiz Interface

**Page:** `QuizPage` (`/quiz`)

**Features:**
- Display questions with options (text and images)
- Passage display for comprehension questions
- Image lightbox for question/option images
- Answer selection and submission
- Immediate feedback with explanations
- Progress tracking
- Question flagging (report issues)
- Results summary with score breakdown

**Query Parameters:**
- `subject` - Filter by subject
- `topic` - Filter by topic
- `assignmentId` - Load practice assignment

**Data Sources:**
- `students` - Class year
- `quiz_questions_yearX` - Question data
- `quiz_options_yearX` - Option data
- `comprehension_passages_yearX` - Passage data
- `practice_assignments` - Assignment details (if assignmentId provided)

**Quiz Completion Flow:**
1. Student completes all questions
2. Calculates score percentage
3. Inserts record into `quiz_results`
4. If assignment, updates `practice_assignments` status to 'completed'
5. Creates notification for parent (if assignment)
6. Displays results summary

### Question Flagging

**Feature:** Students can report question issues

**Flag Reasons:**
- Incorrect correct option
- Spelling or formatting issue
- Image failed to load / wrong image
- Question or options truncated
- Other issue

**Flow:**
1. Student clicks "Flag" button on question
2. Selects reason and optionally adds details
3. Inserts record into `flagged_questions`
4. Admins can review and resolve flags via `FlagReportsPage`

### Assignments

**Page:** `StudentAssignments` (`/dashboard/student/assignments`)

**Features:**
- View assigned practice tasks
- Start assigned practice
- View completed assignment scores
- Retry completed assignments

**Data Sources:**
- `practice_assignments` - Assignment records

**Component:** `PracticeAssignment`

### Progress Tracking

**Page:** `StudentProgressPage` (`/dashboard/student/progress`)

**Features:**
- Overall questions completed
- Weekly activity chart
- Accuracy and average score
- Subject-wise performance breakdown
- Strengths and weaknesses analysis
- Session history
- Earned badges

**Data Sources:**
- `students` - Student info
- `quiz_results` - Performance data
- `student_streaks` - Streak information

### Leaderboard

**Page:** `StudentLeaderboardPage` (`/dashboard/student/leaderboard`)

**Features:**
- Monthly leaderboard (current month)
- Annual leaderboard (year-to-date)
- Points calculation based on quiz results
- Current user position highlighting
- Prize information display

**Data Sources:**
- `profiles` - Student names
- `students` - Class year, school linking
- `schools` - School names
- `quiz_results` - Performance data for points calculation

**Component:** `CompetitionLeaderboards`

### Student Settings

**Component:** `StudentProfileSettings`

**Features:**
- Update display name
- Update email (requires verification)
- Upload avatar image
- Avatar stored in Supabase Storage (avatars bucket)

**Data Sources:**
- `profiles` - Profile data
- Supabase Storage - Avatar images

---

## Parent System

### Parent Dashboard

**Page:** `ParentDashboard` (`/dashboard/parent`)

**Features:**
- Overview of children's activity
- Recent activity feed
- Quick access to child management
- Analytics summary

### Child Management

**Page:** `MyChildren` (`/dashboard/parent/children`)

**Features:**
- View all linked children
- Add new child account
- Edit child name
- Edit child username
- Change child password
- Delete child account
- View child analytics
- Assign practice
- Upgrade to premium
- Search/filter children

**Data Sources:**
- `parents` - Parent ID
- `students` - Child records
- `profiles` - Child profile data
- `quiz_results` - Child analytics
- `practice_assignments` - Child assignments

**Components:**
- `ChildOverviewCard` - Child card with stats and actions
- `AddChildDialog` - Create new student account
- `EditChildNameDialog` - Edit child name
- `EditChildUsernameDialog` - Edit child username
- `ChangeChildPasswordDialog` - Change child password
- `DeleteChildDialog` - Delete child account
- `StudentReportDialog` - View detailed child report
- `AssignPracticeDialog` - Assign practice task

### Add Child Flow

**Edge Function:** `create-student-account`

**Flow:**
1. Parent fills form (full name, class year, username, password)
2. Calls `create-student-account` edge function
3. Edge function validates input
4. Checks parent authorization
5. Creates auth user with dummy email (`{username}@student.eclat.com`)
6. Sets user metadata (role: student, provisioned_by: parent)
7. Creates profile record
8. Inserts user_roles record
9. Creates student record linked to parent
10. Returns credentials to parent
11. Parent can share credentials with child

**Username Rules:**
- 2-20 characters
- Lowercase letters, numbers, dots, underscores, hyphens only
- Must be unique

### Manage Child Account

**Edge Function:** `manage-student-account`

**Actions:**
- `edit-name` - Update child's full name
- `change-password` - Update child's password
- `edit-username` - Update child's username (updates email)
- `upgrade-premium` - Upgrade child to premium (dummy payment)

**Flow:**
1. Parent initiates action
2. Calls `manage-student-account` edge function with action type
3. Edge function validates parent ownership of student
4. Performs requested action
5. Returns success/error response

### Practice Assignment

**Component:** `AssignPracticeDialog`

**Features:**
- Select subject
- Select topics (multi-select)
- Set number of questions (1-60, limited to 10 for standard students)
- Set duration (1-240 minutes)
- Assign to specific child
- Send notification to child

**Data Sources:**
- `students` - Child list and class year
- `quiz_questions_yearX` - Available subjects and topics

**Assignment Creation Flow:**
1. Parent selects child
2. Selects subject and topics
3. Configures question count and duration
4. Submits assignment
5. Inserts record into `practice_assignments`
6. Trigger `notify_practice_assignment_created` sends notification to child

**Assignment Completion Flow:**
1. Child completes assignment
2. Updates `practice_assignments` status to 'completed'
3. Sets score
4. Trigger `notify_practice_assignment_completed` sends notification to parent

### Subscriptions

**Page:** `SubscriptionsPage` (`/dashboard/parent/subscriptions`)

**Features:**
- View subscription plans (Standard vs Premium)
- View children's subscription status
- Upgrade children to premium
- View subscription expiry dates

**Plans:**
- **Standard (Free):**
  - Access to core question bank
  - 10 questions per practice session
  - Basic subject coverage
  - Parent progress overview

- **Premium (₦15,000/year per child):**
  - Unlimited practice questions
  - Full analytics & performance reports
  - All subjects including comprehension
  - Detailed topic-level breakdown
  - Priority support badge
  - Leaderboard access

**Upgrade Flow:**
1. Parent clicks "Upgrade" on child
2. Opens `DummyPaymentModal`
3. Parent confirms payment (dummy)
4. Calls `manage-student-account` with `upgrade-premium` action
5. Edge function creates/updates subscription record
6. Updates student `is_premium` flag
7. Sets expiry date (1 year from now or extends existing)

**Data Sources:**
- `students` - Child records and premium status
- `subscriptions` - Subscription records

### Parent Settings

**Page:** `ParentSettingsPage` (`/dashboard/parent/settings`)

**Features:**
- Update profile information
- Change password
- Account preferences

### Activity Feed

**Page:** `ActivityFeedPage` (`/dashboard/parent/activities`)

**Features:**
- View recent activity for all children
- Quiz completions
- Assignment completions
- Practice sessions

### Resources

**Page:** `ParentResourcesPage` (`/dashboard/parent/resources`)

**Features:**
- Educational resources for parents
- Study tips
- BECE preparation guides

---

## Admin System

### Admin Dashboard

**Page:** `AdminDashboard` (`/admin`)

**Features:**
- Platform statistics (total students, parents, schools, quizzes)
- Pending flagged questions count
- Recent admin activity log
- Quick access to admin functions

**Data Sources:**
- `students` - Student count
- `parents` - Parent count
- `schools` - School count
- `quiz_results` - Quiz count
- `flagged_questions` - Pending flags count
- `admin_audit_log` - Recent activity

### Admin Authentication

**Pages:**
- `AdminLoginPage` (`/admin/login`) - Dedicated admin login
- `AdminPasswordSetupPage` (`/admin/setup/:token`) - Set password from invitation
- `AcceptInvitationPage` (`/admin/accept/:token`) - Accept invitation (logged in users)

**Admin Login Flow:**
1. User enters email and password
2. Calls `supabase.auth.signInWithPassword()`
3. Verifies role is 'admin' in `user_roles` table
4. Verifies admin record exists and is active in `admins` table
5. Redirects to admin dashboard

**Admin Invitation Flow:**
1. Existing admin creates invitation via `AddAdminDialog`
2. Calls `send-admin-invitation` edge function
3. Edge function sends email with setup link
4. Invitee clicks link, lands on `AdminPasswordSetupPage`
5. Validates token via `get_invitation_details` RPC
6. User sets password
7. Calls `create-admin-user` edge function
8. Creates auth user, profile, user_roles, admin record
9. Marks invitation as accepted
10. Logs action in audit log
11. Redirects to admin login

### User Management

**Page:** `AdminUsersPage` (`/admin/users`)

**Features:**
- View all admins
- Add new admin (super admin only)
- Toggle admin active status
- Delete admins (super admin only)
- View admin permissions

**Data Sources:**
- `admins` - Admin records
- `profiles` - Admin profile data
- `user_roles` - Role verification

**Components:**
- `AddAdminDialog` - Create new admin invitation

### Platform Users

**Page:** `PlatformUsersPage` (`/admin/platform-users`)

**Features:**
- View all platform users (students, parents, schools)
- Tabbed navigation by user type
- Search and filter users
- View verification status
- View join date

**Data Sources:**
- `students` - Student records
- `parents` - Parent records
- `schools` - School records
- `profiles` - Profile data

### Question Bank Management

**Page:** `QuestionBankPage` (`/admin/questions`)

**Features:**
- View questions by class year (Year 6 / Year 9)
- Filter by subject and topic
- Add new questions
- Edit existing questions
- Delete questions (with image cleanup)
- Pagination

**Data Sources:**
- `quiz_questions_year6` / `quiz_questions_year9` - Question data
- `quiz_options_year6` / `quiz_options_year9` - Option data

**Components:**
- `AddQuestionDialog` - Add new question
- `EditQuestionDialog` - Edit existing question

**Audit Logging:**
- Question deletions logged to `admin_audit_log`
- Image cleanup from Supabase Storage

### Passage Management

**Page:** `PassagesPage` (`/admin/passages`)

**Features:**
- View comprehension passages by class year
- Add new passages
- Edit existing passages
- Delete passages

**Data Sources:**
- `comprehension_passages_year6` / `comprehension_passages_year9` - Passage data

**Components:**
- `AddPassageDialog` - Add new passage
- `EditPassageDialog` - Edit existing passage

### Flag Reports

**Page:** `FlagReportsPage` (`/admin/flags`)

**Features:**
- View all flagged questions
- Filter by status (pending, resolved, dismissed)
- View flag details (reason, student, question)
- Resolve flags
- Dismiss flags

**Data Sources:**
- `flagged_questions` - Flag records
- `students` - Student information
- `profiles` - Student names

### Analytics

**Page:** `AdminAnalyticsPage` (`/admin/analytics`)

**Features:**
- User distribution (students, parents, schools)
- Total quizzes completed
- Average quiz scores
- Quiz activity over time (last 7 days)
- Visual charts using Recharts

**Data Sources:**
- `students` - Student count
- `parents` - Parent count
- `schools` - School count
- `quiz_results` - Quiz data and activity

### Competitions

**Page:** `AdminCompetitionsPage` (`/admin/competitions`)

**Features:**
- View all competitions
- Add new competition
- Edit competition details
- Update competition status (active, completed, cancelled)
- Delete competitions

**Data Sources:**
- `competitions` - Competition records

**Components:**
- `AddCompetitionDialog` - Add new competition

### Reports

**Page:** `AdminReportsPage` (`/admin/reports`)

**Features:**
- Export student data as CSV
- Export quiz results as CSV
- Export competition data as CSV

**Data Sources:**
- `students` - Student data
- `quiz_results` - Quiz results
- `competitions` - Competition data

### System Settings

**Page:** `AdminSettingsPage` (`/admin/settings`)

**Features:**
- View global system settings
- Update system settings
- Configuration keys and values

**Data Sources:**
- `system_settings` - System configuration

**Access:** Super admins only

### Audit Log

All admin actions are logged to `admin_audit_log` table via `log_admin_action` function.

**Logged Actions:**
- User creation/deletion
- Question additions/deletions
- Competition management
- Settings changes
- Invitation acceptance

---

## School System

### School Dashboard

**Page:** `SchoolOverviewPage` (`/dashboard/school`) — one of 9 routed school pages exported from `src/pages/school/SchoolDashboardPages.tsx`

**Routed school pages:**
- `/dashboard/school` - `SchoolOverviewPage` (stats, top subject by mastery, top achievers)
- `/dashboard/school/students` - `SchoolStudentsPage`
- `/dashboard/school/teachers` - `SchoolTeachersPage` (teacher registry, departments, class allocations)
- `/dashboard/school/classes` - `SchoolClassesPage` (classes and arms)
- `/dashboard/school/assignments` - `SchoolAssignmentsPage`
- `/dashboard/school/reports` - `SchoolReportsPage`
- `/dashboard/school/exams` - `SchoolExamsPage` (exam scheduler, candidate seating roster)
- `/dashboard/school/leaderboard` - `SchoolLeaderboardPage`
- `/dashboard/school/settings` - `SchoolSettingsPage`

**Data layer:** the `useSchoolData` hook (TanStack Query, key `queryKeys.school`) aggregates schools, students, school_classes, practice_assignments, school_exams, school_teachers, profiles, quiz_results, and gamification data client-side in one cached query shared by all nine pages; per-student metric pulls are capped and the hook surfaces `isLoading`/`error` that every page renders through `SchoolDataState` (loading spinner or error + retry — never a fake empty state).

**Security hardening (2026-10):** the school portal runs as a persistent layout route (`SchoolLayout` + `<Outlet/>` + local Suspense). RLS is fully tenant-scoped — the former platform-wide `USING (true)` reads on `students`, `profiles`, and `quiz_results` were removed; features that needed broad reads now use scoped SECURITY DEFINER RPCs (`get_platform_student_rank`, `search_duel_opponents`, `lookup_student_by_code`, `lookup_parent_by_code`). Schools may only assign practice to their own students (trigger-enforced), students cannot change their own `school_id`/`class_id` (parent linking is allowed only for the first `NULL → parent` transition), exams/teachers may only reference same-school classes, and the league cohort RPCs reject unauthenticated callers while keeping the service-role path for `complete-quiz-session`.

### School Onboarding

**Page:** `SchoolOnboarding` (`/onboarding/school`)

**Features:**
- Optional address input
- Optional contact email input
- Updates `schools` table
- Marks onboarding as completed
- Displays school unique code

**Data Sources:**
- `schools` - School record

### Student Linking

Schools can link students using their unique school code (stored in `schools.unique_code`).

---

## Quiz & Practice System

### Server-Authoritative Scoring (quiz sessions)

Quiz scoring is enforced server-side. Correct answers are never shipped to the
browser; per-question grading and the EP pipeline run on the server.

**Flow (client `src/services/quizSession.ts`):**
1. `start_quiz_session` (RPC) — opens a `quiz_sessions` row for the student,
   validates the daily-challenge lock server-side, and receives only question
   IDs. The client then fetches sanitized question content (no
   `correct_answer`, options without `is_correct`).
2. `submit_quiz_answer` (RPC) — grades each answer server-side against the
   option rows and returns `{is_correct, correct_index, explanation}` for the
   instant-feedback UI; the graded answer is stored in
   `quiz_session_answers` with real per-question timing.
3. `complete-quiz-session` (Edge Function) — re-grades from stored answers,
   runs the EP pipeline (points, anti-gaming with real timings, mastery,
   streak, daily challenge, badges) using the shared TypeScript engines in
   `supabase/functions/_shared/gamification/` (re-exported to the client via
   `src/services/gamification/*` shims), writes `quiz_results`, the points
   ledger, mastery, badges, gamification profile and league cohort points,
   updates assignment status and notifies the parent.
4. `submit_duel_turn` (RPC) — records arena turns and resolves winner/EP
   server-side.

**Hardening:** `assign_student_to_weekly_cohort` and
`update_student_cohort_points` validate the caller; the points-ledger
reconciliation job is scheduled via pg_cron (`reconcile-student-points`,
daily 02:15 UTC).

**Rollout gate:** migration
`20261002230000_..._phase_b_rls_lockdown.sql` revokes the legacy client write
policies (ledger/profile/badges/mastery/cohort/quiz_results INSERTs). It must
only be applied AFTER the client using the session flow above is deployed —
see the header of that migration for details and rollback notes.

### Question Structure

**Question Tables:**
- `quiz_questions_year6` - Year 6 questions
- `quiz_questions_year9` - Year 9 questions
- `quiz_options_year6` - Year 6 options
- `quiz_options_year9` - Year 9 options

**Question Fields:**
- `subject` - Mathematics, English Language, Basic Science, Social Studies
- `topic` - Specific topic within subject
- `question_text` - Question content
- `correct_answer` - Correct answer text
- `explanation` - Explanation of answer
- `difficulty` - easy, medium, hard
- `image_url` - Optional question image
- `passage_id` - Optional linked comprehension passage

**Option Fields:**
- `option_text` - Option content
- `image_url` - Optional option image
- `is_correct` - Boolean flag
- `display_order` - Display order

### Comprehension Passages

**Passage Tables:**
- `comprehension_passages_year6` - Year 6 passages
- `comprehension_passages_year9` - Year 9 passages

**Passage Fields:**
- `title` - Passage title
- `passage_text` - Passage content
- `subject` - English Language

**Linking:** Questions reference passages via `passage_id` foreign key.

### Quiz Flow

**Initiation:**
1. Student selects subject/topic from practice page
2. Or student starts assigned practice
3. Navigates to `QuizPage` with query parameters

**Question Loading:**
1. Determines class year from student record
2. Selects appropriate question table (year6 or year9)
3. Filters by subject/topic if specified
4. Fetches questions with linked passages
5. Fetches options for each question
6. Randomly shuffles and selects questions (up to limit)
7. Displays first question

**Quiz Taking:**
1. Student views question with options
2. Passage displayed if linked
3. Images displayed with lightbox
4. Student selects answer
5. Submits answer
6. System shows feedback (correct/incorrect + explanation)
7. Student proceeds to next question

**Quiz Completion:**
1. Calculates final score percentage
2. Inserts record into `quiz_results`
3. If assignment, updates `practice_assignments`
4. Creates notification for parent (if assignment)
5. Displays results summary

### Practice Assignment Flow

**Creation (Parent):**
1. Parent opens `AssignPracticeDialog`
2. Selects child
3. Selects subject
4. Selects topics (multi-select)
5. Sets question count (1-60, limited to 10 for standard)
6. Sets duration (1-240 minutes)
7. Submits assignment
8. Inserts into `practice_assignments`
9. Trigger sends notification to child

**Taking (Student):**
1. Student views assignments on `StudentAssignments` page
2. Clicks "Start Task" on assignment
3. Navigates to `QuizPage` with `assignmentId` parameter
4. Quiz loads with assignment parameters (subject, topics, question count)
5. Student completes quiz
6. Assignment status updated to 'completed'
7. Score recorded
8. Trigger sends notification to parent

### Question Flagging

**Purpose:** Allow students to report question issues

**Flag Reasons:**
- `incorrect_answer` - Wrong correct option
- `typo` - Spelling/formatting issue
- `missing_image` - Image failed to load
- `incomplete` - Question/options truncated
- `other` - Other issue

**Flow:**
1. Student clicks "Flag" button on question
2. Opens flag dialog
3. Selects reason from dropdown
4. Optionally adds details
5. Submits flag
6. Inserts into `flagged_questions`
7. Admins review via `FlagReportsPage`

### Quiz Data Population

**Edge Function:** `populate-quiz-data`

**Purpose:** Populate quiz database with sample questions

**Features:**
- Admin-only access (verified via `is_admin` RPC)
- Inserts Year 6 questions (25 sample questions)
- Inserts Year 9 questions (25 sample questions)
- Covers all subjects (Mathematics, English, Science, Social Studies)
- Includes options for each question
- Handles errors gracefully

---

## Competition System

### Competition Structure

**Table:** `competitions`

**Fields:**
- `title` - Competition name
- `description` - Competition details
- `start_date` - Competition start
- `end_date` - Competition end
- `status` - draft, active, completed, cancelled
- `class_year` - year_6, year_9, or all
- `created_by` - Admin who created it

### Competition Management

**Page:** `AdminCompetitionsPage` (`/admin/competitions`)

**Features:**
- View all competitions
- Add new competition
- Edit competition
- Update status
- Delete competition

**Component:** `AddCompetitionDialog`

### Leaderboard Calculation

**Page:** `StudentLeaderboardPage` (`/dashboard/student/leaderboard`)

**Calculation:**
1. Fetch all students with profiles and schools
2. Fetch all quiz results
3. Calculate points based on quiz results
4. Rank students by points
5. Separate monthly and annual leaderboards
6. Highlight current user position

**Points System:**
- Points calculated from quiz results
- Monthly leaderboard: Current month only
- Annual leaderboard: Year-to-date

**Component:** `CompetitionLeaderboards`

---

## Subscription System

### Subscription Structure

**Table:** `subscriptions`

**Fields:**
- `parent_id` - Parent who purchased
- `student_id` - Student receiving premium
- `plan` - premium_annual
- `status` - active, expired, cancelled
- `amount` - 15000 NGN
- `currency` - NGN
- `started_at` - Subscription start
- `expires_at` - Subscription expiry
- `metadata` - Additional data (payment source, etc.)

### Subscription Plans

**Standard (Free):**
- Access to core question bank
- 10 questions per practice session
- Basic subject coverage
- Parent progress overview

**Premium (₦15,000/year per child):**
- Unlimited practice questions
- Full analytics & performance reports
- All subjects including comprehension
- Detailed topic-level breakdown
- Priority support badge
- Leaderboard access

### Upgrade Flow

**Edge Function:** `manage-student-account` (action: `upgrade-premium`)

**Flow:**
1. Parent clicks "Upgrade" on child
2. Opens `DummyPaymentModal`
3. Parent confirms payment (dummy)
4. Calls `manage-student-account` edge function
5. Edge function checks for existing active subscription
6. If exists, extends expiry by 1 year
7. If not exists, creates new subscription
8. Updates student `is_premium` flag to TRUE
9. Returns expiry date

**Subscription Management:**
- View subscriptions on `SubscriptionsPage`
- View expiry dates
- View subscription history

### Premium Enforcement

**Database Trigger:** `enforce_practice_assignment_rules`

**Rule:**
- Standard students (is_premium = FALSE) limited to 10 questions per assignment
- Premium students (is_premium = TRUE) can have up to 60 questions

---

## Notification System

### Notification Structure

**Table:** `notifications`

**Fields:**
- `user_id` - Recipient
- `type` - Notification type
- `title` - Notification title
- `message` - Notification message
- `read` - Read status
- `metadata` - Additional data (JSON)
- `created_at` - Timestamp

### Notification Types

1. **practice_assignment** - New practice task assigned
2. **practice_completed** - Practice task completed
3. **assignment_completed** - Assignment completed (parent notification)

### Notification Triggers

**Trigger:** `notify_practice_assignment_created`

**Fires:** When practice assignment is created

**Action:**
- Inserts notification for student
- Type: `practice_assignment`
- Metadata: assignment_id, student_id

**Trigger:** `notify_practice_assignment_completed`

**Fires:** When practice assignment status changes to 'completed'

**Action:**
- Inserts notification for parent
- Type: `assignment_completed`
- Metadata: assignment_id, student_id, score

### Notification Display

**Component:** `NotificationBell`

**Features:**
- Displays notification count
- Shows notification dropdown
- Marks notifications as read

**Component:** `NotificationItem`

**Features:**
- Displays individual notification
- Shows title, message, time
- Click to navigate to relevant page

---

## Edge Functions

### Overview

Edge functions are Deno-based serverless functions that handle sensitive operations and business logic that shouldn't run in the browser.

### Function List

#### `provision-user`

**Purpose:** Provision user roles after OAuth signup

**Input:** Authorization header (Bearer token)

**Flow:**
1. Verifies user from token
2. Checks user metadata for role
3. Rejects if role is 'student' (students must be created by parents)
4. Inserts/updates `user_roles` table
5. Creates base record in `parents` or `schools` table
6. Returns success

**RPC Used:** None

#### `create-student-account`

**Purpose:** Create student account from parent

**Input:** 
- fullName (string)
- classYear (string)
- username (string)
- password (string)
- Authorization header (Bearer token)

**Flow:**
1. Validates input
2. Checks parent authorization
3. Creates auth user with dummy email (`{username}@student.eclat.com`)
4. Sets user metadata (role: student, provisioned_by: parent)
5. Creates profile record
6. Inserts user_roles record
7. Creates student record linked to parent
8. Rolls back on failure
9. Returns credentials

**Tables Modified:** auth.users, profiles, user_roles, students

#### `delete-student-account`

**Purpose:** Delete student account

**Input:**
- studentId (UUID)
- Authorization header (Bearer token)

**Flow:**
1. Verifies parent authorization
2. Checks parent owns the student
3. Deletes auth user
4. Cascade deletes student record, profile, user_roles
5. Returns success

**Tables Modified:** auth.users, students, profiles, user_roles

#### `manage-student-account`

**Purpose:** Manage student account (edit name, change password, edit username, upgrade premium)

**Input:**
- studentId (UUID)
- action (string) - edit-name, change-password, edit-username, upgrade-premium
- fullName (string) - for edit-name
- password (string) - for change-password
- username (string) - for edit-username
- Authorization header (Bearer token)

**Actions:**

**edit-name:**
1. Validates name length (2-100)
2. Updates profile.full_name
3. Updates auth user metadata

**change-password:**
1. Validates password length (6-100)
2. Updates auth user password

**edit-username:**
1. Validates username format (2-20 chars, alphanumeric + ._-)
2. Checks username uniqueness
3. Updates auth user email to `{username}@student.eclat.com`
4. Updates profile.username

**upgrade-premium:**
1. Checks for existing active subscription
2. Extends expiry by 1 year if exists
3. Creates new subscription if not exists
4. Updates student.is_premium to TRUE
5. Returns expiry date

**Tables Modified:** profiles, auth.users, subscriptions, students

#### `create-admin-user`

**Purpose:** Create admin user from invitation

**Input:**
- token (string) - Invitation token
- password (string) - New password

**Flow:**
1. Validates invitation via `get_invitation_details` RPC
2. Checks email doesn't already exist
3. Creates auth user with email and password
4. Auto-confirms email
5. Creates/updates profile
6. Inserts user_roles (admin)
7. Creates admin record
8. Marks invitation as accepted
9. Logs action via `log_admin_action` RPC
10. Returns success

**RPC Used:** `get_invitation_details`, `log_admin_action`

**Tables Modified:** auth.users, profiles, user_roles, admins, admin_invitations, admin_audit_log

#### `send-admin-invitation`

**Purpose:** Send admin invitation email

**Input:**
- invitationId (UUID)
- Authorization header (Bearer token)

**Flow:**
1. Fetches invitation details
2. Fetches inviter name
3. Generates invitation link
4. Sends email via Resend API
5. Returns email ID

**Email Template:** Professional HTML email with invitation link and expiry info

**External API:** Resend API

#### `send-verification-email`

**Purpose:** Send email verification code

**Input:**
- user_id (UUID)

**Flow:**
1. Generates 6-digit code
2. Stores code in database (implementation varies)
3. Sends email with code
4. Returns success

#### `verify-email-code`

**Purpose:** Verify email verification code

**Input:**
- user_id (UUID)
- code (string)

**Flow:**
1. Validates code
2. Marks email as verified
3. Returns success

#### `quiz-utilities`

**Purpose:** Quiz-related utilities (implementation varies)

#### `send-support-email`

**Purpose:** Send support email from parent

**Input:**
- user_id (UUID)
- message (string)

**Flow:**
1. Fetches user profile
2. Sends email to support@eclatapp.xyz via Resend
3. Includes user details and message
4. Returns success

**External API:** Resend API

#### `populate-quiz-data`

**Purpose:** Populate quiz database with sample questions

**Input:** Authorization header (Bearer token)

**Flow:**
1. Verifies admin via `is_admin` RPC
2. Inserts 25 Year 6 questions with options
3. Inserts 25 Year 9 questions with options
4. Covers all subjects
5. Returns success

**RPC Used:** `is_admin`

**Tables Modified:** quiz_questions_year6, quiz_options_year6, quiz_questions_year9, quiz_options_year9

---

## Routing Structure

### Route Overview

**Public Routes:**
- `/` - Landing page (Index)
- `/privacy-policy` - Privacy policy
- `/terms-of-service` - Terms of service
- `/login/role-selection` - Login role selection
- `/signup/role-selection` - Sign-up role selection
- `/auth` - Parent/school sign-up
- `/parent-login` - Parent login
- `/student-login` - Student login
- `/school-login` - School login
- `/auth/callback` - OAuth callback
- `/password-reset` - Password reset
- `/verify-email` - Email verification
- `/admin/login` - Admin login
- `/admin/setup/:token` - Admin password setup
- `/admin/accept/:token` - Accept admin invitation

**Protected Routes (Student):**
- `/dashboard/student` - Student dashboard
- `/dashboard/student/practice` - Practice selection
- `/dashboard/student/assignments` - Assignments
- `/dashboard/student/progress` - Progress tracking
- `/dashboard/student/leaderboard` - Leaderboard

**Protected Routes (Parent):**
- `/onboarding/parent` - Parent onboarding
- `/dashboard/parent` - Parent dashboard
- `/dashboard/parent/activities` - Activity feed
- `/dashboard/parent/children` - Child management
- `/dashboard/parent/subscriptions` - Subscriptions
- `/dashboard/parent/settings` - Settings
- `/dashboard/parent/resources` - Resources

**Protected Routes (School):**
- `/onboarding/school` - School onboarding
- `/dashboard/school` - School dashboard

**Protected Routes (General):**
- `/quiz` - Quiz interface
- `/subject-analytics` - Subject analytics

**Admin Routes:**
- `/admin` - Admin dashboard (index)
- `/admin/users` - Admin user management
- `/admin/platform-users` - Platform users
- `/admin/questions` - Question bank
- `/admin/passages` - Passage management
- `/admin/analytics` - Analytics
- `/admin/competitions` - Competitions
- `/admin/reports` - Reports
- `/admin/settings` - System settings
- `/admin/flags` - Flag reports

### Route Protection

**Component:** `ProtectedRoute`

**Purpose:** Protect routes based on user role

**Props:**
- `requiredRole` - Optional role requirement (student, parent, school)

**Behavior:**
1. Checks if user is authenticated
2. If not authenticated, redirects to login
3. If requiredRole specified, checks user role
4. If role mismatch, redirects to appropriate dashboard
5. Renders children if authorized

**Component:** `AdminProtectedRoute`

**Purpose:** Protect admin routes

**Behavior:**
1. Checks if user is authenticated
2. Verifies user has admin role
3. Verifies admin record is active
4. Redirects to admin login if not authorized

### Layout Components

**StudentLayout:**
- Student sidebar navigation
- Student-specific header
- Content area

**AdminLayout:**
- Admin sidebar navigation
- Admin-specific header
- Content area

**ParentLayout:**
- Parent sidebar navigation
- Parent-specific header
- Content area

---

## Security

### Authentication Security

**Password Requirements:**
- Minimum 6 characters
- Maximum 100 characters

**Email Verification:**
- Required for parents and schools
- Optional for students (no email)
- Auto-verified for Google OAuth

**Session Management:**
- Supabase Auth handles sessions
- JWT tokens for API calls
- Automatic token refresh

### Row-Level Security (RLS)

**Principles:**
- All tables have RLS enabled
- Policies enforce role-based access
- Service role bypasses RLS for edge functions

**Key Policies:**
- Students can only access own data
- Parents can only access their children's data
- Schools can only access their students' data
- Admins can access all data (with logging)

### Edge Function Security

**Authentication:**
- All edge functions require Bearer token
- Token verified via Supabase Auth
- User context extracted from token

**Authorization:**
- Functions check user roles before operations
- Parent functions verify parent-child relationship
- Admin functions verify admin status

**Input Validation:**
- All inputs validated and sanitized
- Length checks on text fields
- Format checks on usernames/emails
- Type checking on all parameters

### Data Protection

**Sensitive Data:**
- Passwords never stored in plain text
- Admin service role key used for sensitive operations
- Email verification codes have expiry

**Audit Logging:**
- All admin actions logged
- Includes admin ID, action, resource, details
- IP address and user agent tracked

### API Security

**CORS:**
- Edge functions have CORS headers configured
- Origin restrictions in place

**Rate Limiting:**
- Supabase provides basic rate limiting
- Additional limits can be added via edge functions

### Storage Security

**Avatar Storage:**
- Private bucket with signed URLs
- User-specific folders
- File size limits (5MB max)
- File type validation (images only)

---

## Appendix

### Database Views

**topic_question_counts_year6** - Pre-aggregated topic counts for Year 6
**topic_question_counts_year9** - Pre-aggregated topic counts for Year 9

### RPC Functions

**is_admin(_user_id UUID)** - Check if user is admin
**is_super_admin(_user_id UUID)** - Check if user is super admin
**get_admin_id(_user_id UUID)** - Get admin ID from user ID
**log_admin_action(...)** - Log admin action to audit log
**get_invitation_details(_token TEXT)** - Get invitation details for validation
**accept_admin_invitation(_token TEXT)** - Accept admin invitation (deprecated, use create-admin-user)

### Enum Types

**app_role** - 'student', 'parent', 'school', 'admin'

### External Services

**Resend API** - Email delivery
- Admin invitations
- Support emails
- Verification emails

**Supabase** - Backend services
- Authentication
- Database
- Storage
- Edge Functions

---

**End of Documentation**
