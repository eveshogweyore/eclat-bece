import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminProtectedRoute } from "@/components/AdminProtectedRoute";
import { AdminPermissionGuard } from "@/components/AdminPermissionGuard";
import { PageLoader } from "@/components/PageLoader";
import { AuthProvider } from "./components/AuthProvider";
import { PrivacyPolicy } from "./components/PrivacyPolicy";
import { TermsOfService } from "./components/TermsOfService";
import { StudentLayout } from "./components/StudentLayout";
import { AdminLayout } from "./components/AdminLayout";
import { ParentLayout } from "./components/parent/ParentLayout";
import { SchoolLayout } from "./components/school/SchoolLayout";
// Landing page stays eager: it is the most common entry point and should
// render without an extra chunk round-trip.
import Index from "./pages/Index";

// Route-level code splitting: each portal/page ships in its own chunk.
const NotFound = lazy(() => import("./pages/NotFound"));

const LoginRoleSelectionPage = lazy(() => import("./pages/auth/LoginRoleSelectionPage"));
const SignUpRoleSelectionPage = lazy(() => import("./pages/auth/SignUpRoleSelectionPage"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const ParentLoginInPage = lazy(() => import("./pages/auth/ParentLoginInPage"));
const ParentSignUpPage = lazy(() => import("./pages/auth/ParentSignUpPage"));
const SchoolLogInPage = lazy(() => import("./pages/auth/SchoolLogInPage"));
const SchoolSignUpPage = lazy(() => import("./pages/auth/SchoolSignUpPage"));
const StudentLogInPage = lazy(() => import("./pages/auth/StudentLogInPage"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const PasswordResetPage = lazy(() => import("./pages/PasswordResetPage"));
const EmailVerificationPage = lazy(() => import("./pages/EmailVerificationPage"));

const ParentOnboarding = lazy(() => import("./pages/ParentOnboarding"));
const SchoolOnboarding = lazy(() => import("./pages/SchoolOnboarding"));

const StudentDashboardOverview = lazy(() => import("./pages/StudentDashboardOverview"));
const StudentPractice = lazy(() => import("./pages/StudentPractice"));
const StudentAssignments = lazy(() => import("./pages/StudentAssignments"));
const StudentProgressPage = lazy(() => import("./pages/StudentProgressPage"));
const StudentLeaderboardPage = lazy(() => import("./pages/StudentLeaderboardPage"));
const StudentSettingsPage = lazy(() => import("./pages/StudentSettingsPage"));
const DuelOfMindsPage = lazy(() => import("./pages/DuelOfMindsPage"));
const QuizPage = lazy(() => import("./pages/QuizPage"));
const SubjectAnalytics = lazy(() => import("./pages/SubjectAnalytics"));

const ParentDashboard = lazy(() => import("./pages/ParentDashboard"));
const MyChildren = lazy(() => import("./pages/parent/MyChildren"));
const ParentAssignmentsPage = lazy(() => import("./pages/parent/ParentAssignmentsPage"));
const ParentReportsPage = lazy(() => import("./pages/parent/ParentReportsPage"));
const SubscriptionsPage = lazy(() => import("./pages/parent/SubscriptionsPage"));
const ParentSettingsPage = lazy(() => import("./pages/parent/ParentSettingsPage"));
const ParentResourcesPage = lazy(() => import("./pages/parent/ParentResourcesPage"));
const ActivityFeedPage = lazy(() => import("./pages/parent/ActivityFeedPage"));

const SchoolOverviewPage = lazy(() => import("./pages/school/SchoolOverviewPage"));
const SchoolStudentsPage = lazy(() => import("./pages/school/SchoolStudentsPage"));
const SchoolTeachersPage = lazy(() => import("./pages/school/SchoolTeachersPage"));
const SchoolClassesPage = lazy(() => import("./pages/school/SchoolClassesPage"));
const SchoolAssignmentsPage = lazy(() => import("./pages/school/SchoolAssignmentsPage"));
const SchoolReportsPage = lazy(() => import("./pages/school/SchoolReportsPage"));
const SchoolExamsPage = lazy(() => import("./pages/school/SchoolExamsPage"));
const SchoolLeaderboardPage = lazy(() => import("./pages/school/SchoolLeaderboardPage"));
const SchoolSettingsPage = lazy(() => import("./pages/school/SchoolSettingsPage"));

const AdminLoginPage = lazy(() => import("./pages/AdminLoginPage"));
const AdminPasswordSetupPage = lazy(() => import("./pages/AdminPasswordSetupPage"));
const AdminPasswordResetPage = lazy(() => import("./pages/AdminPasswordResetPage"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminUsersPage = lazy(() => import("./pages/AdminUsersPage"));
const PlatformUsersPage = lazy(() => import("./pages/PlatformUsersPage"));
const QuestionBankPage = lazy(() => import("./pages/QuestionBankPage"));
const AdminAnalyticsPage = lazy(() => import("./pages/AdminAnalyticsPage"));
const AdminCompetitionsPage = lazy(() => import("./pages/AdminCompetitionsPage"));
const AdminReportsPage = lazy(() => import("./pages/AdminReportsPage"));
const AdminSettingsPage = lazy(() => import("./pages/AdminSettingsPage"));
const PassagesPage = lazy(() => import("./pages/PassagesPage"));
const AdminSubjectsPage = lazy(() => import("./pages/AdminSubjectsPage"));
const FlagReportsPage = lazy(() => import("./pages/admin/FlagReportsPage"));

const AboutPage = lazy(() => import("./pages/AboutPage"));
const PricingPage = lazy(() => import("./pages/PricingPage"));
const FeaturesPage = lazy(() => import("./pages/FeaturesPage"));
const PublicLeaderboardPage = lazy(() => import("./pages/PublicLeaderboardPage"));
const CertificateVerificationPage = lazy(() => import("./pages/CertificateVerificationPage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 2, // 2 minutes
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthProvider>
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/pricing" element={<PricingPage />} />
                <Route path="/features" element={<FeaturesPage />} />
                <Route path="/leaderboard" element={<PublicLeaderboardPage />} />
                <Route path="/verify-certificate" element={<CertificateVerificationPage />} />
                <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                <Route path="/terms-of-service" element={<TermsOfService />} />
                <Route path="/role-selection" element={<Navigate to="/auth/login/role-selection" replace />} />
                <Route path="/auth/login/role-selection" element={<LoginRoleSelectionPage />} />
                <Route path="/auth/signup/role-selection" element={<SignUpRoleSelectionPage />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/parent-login" element={<ParentLoginInPage />} />
                <Route path="/parent-signup" element={<ParentSignUpPage />} />
                <Route path="/student-login" element={<StudentLogInPage />} />
                <Route path="/student-signup" element={<Navigate to="/student-login" replace />} />
                <Route path="/school-login" element={<SchoolLogInPage />} />
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route path="/password-reset" element={<PasswordResetPage />} />
                <Route path="/verify-email" element={<EmailVerificationPage />} />
                <Route path="/onboarding/parent" element={
                  <ProtectedRoute requiredRole="parent">
                    <ParentOnboarding />
                  </ProtectedRoute>
                } />
                <Route path="/onboarding/school" element={
                  <ProtectedRoute requiredRole="school">
                    <SchoolOnboarding />
                  </ProtectedRoute>
                } />
                <Route path="/dashboard/student" element={
                  <ProtectedRoute requiredRole="student">
                    <StudentLayout>
                      <StudentDashboardOverview />
                    </StudentLayout>
                  </ProtectedRoute>
                } />
                <Route path="/dashboard/student/daily-challenge" element={
                  <ProtectedRoute requiredRole="student">
                    <Navigate to="/quiz?mode=daily_challenge" replace />
                  </ProtectedRoute>
                } />
                <Route path="/dashboard/student/practice" element={
                  <ProtectedRoute requiredRole="student">
                    <StudentLayout>
                      <StudentPractice />
                    </StudentLayout>
                  </ProtectedRoute>
                } />
                <Route path="/dashboard/student/assignments" element={
                  <ProtectedRoute requiredRole="student">
                    <StudentLayout>
                      <StudentAssignments />
                    </StudentLayout>
                  </ProtectedRoute>
                } />
                <Route path="/dashboard/student/progress" element={
                  <ProtectedRoute requiredRole="student">
                    <StudentLayout>
                      <StudentProgressPage />
                    </StudentLayout>
                  </ProtectedRoute>
                } />
                <Route path="/dashboard/student/leaderboard" element={
                  <ProtectedRoute requiredRole="student">
                    <StudentLayout>
                      <StudentLeaderboardPage />
                    </StudentLayout>
                  </ProtectedRoute>
                } />
                <Route path="/dashboard/student/settings" element={
                  <ProtectedRoute requiredRole="student">
                    <StudentLayout>
                      <StudentSettingsPage />
                    </StudentLayout>
                  </ProtectedRoute>
                } />
                <Route path="/settings" element={<Navigate to="/dashboard/student/settings" replace />} />
                <Route path="/dashboard/student/duel-of-minds" element={
                  <ProtectedRoute requiredRole="student">
                    <StudentLayout>
                      <DuelOfMindsPage />
                    </StudentLayout>
                  </ProtectedRoute>
                } />
                <Route path="/dashboard/parent" element={
                  <ProtectedRoute requiredRole="parent">
                    <ParentLayout>
                      <ParentDashboard />
                    </ParentLayout>
                  </ProtectedRoute>
                } />
                <Route path="/dashboard/parent/activities" element={
                  <ProtectedRoute requiredRole="parent">
                    <ParentLayout>
                      <ActivityFeedPage />
                    </ParentLayout>
                  </ProtectedRoute>
                } />
                <Route path="/dashboard/parent/children" element={
                  <ProtectedRoute requiredRole="parent">
                    <ParentLayout>
                      <MyChildren />
                    </ParentLayout>
                  </ProtectedRoute>
                } />
                <Route path="/dashboard/parent/assignments" element={
                  <ProtectedRoute requiredRole="parent">
                    <ParentLayout>
                      <ParentAssignmentsPage />
                    </ParentLayout>
                  </ProtectedRoute>
                } />
                <Route path="/dashboard/parent/reports" element={
                  <ProtectedRoute requiredRole="parent">
                    <ParentLayout>
                      <ParentReportsPage />
                    </ParentLayout>
                  </ProtectedRoute>
                } />
                <Route path="/dashboard/parent/subscriptions" element={
                  <ProtectedRoute requiredRole="parent">
                    <ParentLayout>
                      <SubscriptionsPage />
                    </ParentLayout>
                  </ProtectedRoute>
                } />
                <Route path="/dashboard/parent/settings" element={
                  <ProtectedRoute requiredRole="parent">
                    <ParentLayout>
                      <ParentSettingsPage />
                    </ParentLayout>
                  </ProtectedRoute>
                } />
                <Route path="/dashboard/parent/resources" element={
                  <ProtectedRoute requiredRole="parent">
                    <ParentLayout>
                      <ParentResourcesPage />
                    </ParentLayout>
                  </ProtectedRoute>
                } />
                <Route path="/dashboard/school" element={
                  <ProtectedRoute requiredRole="school">
                    <SchoolLayout />
                  </ProtectedRoute>
                }>
                  <Route index element={<SchoolOverviewPage />} />
                  <Route path="students" element={<SchoolStudentsPage />} />
                  <Route path="teachers" element={<SchoolTeachersPage />} />
                  <Route path="classes" element={<SchoolClassesPage />} />
                  <Route path="assignments" element={<SchoolAssignmentsPage />} />
                  <Route path="reports" element={<SchoolReportsPage />} />
                  <Route path="exams" element={<SchoolExamsPage />} />
                  <Route path="leaderboard" element={<SchoolLeaderboardPage />} />
                  <Route path="settings" element={<SchoolSettingsPage />} />
                </Route>
                <Route path="/quiz" element={
                  <ProtectedRoute>
                    <QuizPage />
                  </ProtectedRoute>
                } />
                <Route path="/subject-analytics" element={
                  <ProtectedRoute>
                    <SubjectAnalytics />
                  </ProtectedRoute>
                } />
                {/* Admin Routes */}
                <Route path="/admin/login" element={<AdminLoginPage />} />
                <Route path="/admin/setup/:token" element={<AdminPasswordSetupPage />} />
                <Route path="/admin/reset-password" element={<AdminPasswordResetPage />} />
                <Route path="/admin" element={
                  <AdminProtectedRoute>
                    <AdminLayout />
                  </AdminProtectedRoute>
                }>
                  <Route index element={<AdminDashboard />} />
                  <Route path="users" element={
                    <AdminPermissionGuard requiresSuperAdmin={true} resourceName="Admin Users">
                      <AdminUsersPage />
                    </AdminPermissionGuard>
                  } />
                  <Route path="platform-users" element={
                    <AdminPermissionGuard requiredPermission="canManageUsers" resourceName="Platform Users">
                      <PlatformUsersPage />
                    </AdminPermissionGuard>
                  } />
                  <Route path="questions" element={
                    <AdminPermissionGuard requiredPermission="canManageQuestions" resourceName="Question Bank">
                      <QuestionBankPage />
                    </AdminPermissionGuard>
                  } />
                  <Route path="subjects" element={
                    <AdminPermissionGuard requiredPermission="canManageQuestions" resourceName="Subjects">
                      <AdminSubjectsPage />
                    </AdminPermissionGuard>
                  } />
                  <Route path="passages" element={
                    <AdminPermissionGuard requiredPermission="canManageQuestions" resourceName="Passages">
                      <PassagesPage />
                    </AdminPermissionGuard>
                  } />
                  <Route path="flags" element={
                    <AdminPermissionGuard requiredPermission="canManageFlags" resourceName="Flag Reports">
                      <FlagReportsPage />
                    </AdminPermissionGuard>
                  } />
                  <Route path="competitions" element={
                    <AdminPermissionGuard requiredPermission="canManageCompetitions" resourceName="Competitions">
                      <AdminCompetitionsPage />
                    </AdminPermissionGuard>
                  } />
                  <Route path="analytics" element={
                    <AdminPermissionGuard requiredPermission="canViewAnalytics" resourceName="Analytics">
                      <AdminAnalyticsPage />
                    </AdminPermissionGuard>
                  } />
                  <Route path="reports" element={
                    <AdminPermissionGuard requiredPermission="canViewAnalytics" resourceName="Reports">
                      <AdminReportsPage />
                    </AdminPermissionGuard>
                  } />
                  <Route path="settings" element={<AdminSettingsPage />} />
                </Route>
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
