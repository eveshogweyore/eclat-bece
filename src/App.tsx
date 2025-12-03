import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminProtectedRoute } from "@/components/AdminProtectedRoute";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import RoleSelectionPage from "./pages/RoleSelectionPage";
import AuthPage from "./pages/AuthPage";
import AuthCallback from "./pages/AuthCallback";
import PasswordResetPage from "./pages/PasswordResetPage";
import EmailVerificationPage from "./pages/EmailVerificationPage";
import StudentOnboarding from "./pages/StudentOnboarding";
import ParentOnboarding from "./pages/ParentOnboarding";
import SchoolOnboarding from "./pages/SchoolOnboarding";
import StudentDashboardOverview from "./pages/StudentDashboardOverview";
import StudentPractice from "./pages/StudentPractice";
import StudentAssignments from "./pages/StudentAssignments";
import StudentProgressPage from "./pages/StudentProgressPage";
import StudentLeaderboardPage from "./pages/StudentLeaderboardPage";
import ParentDashboard from "./pages/ParentDashboard";
import SchoolDashboard from "./pages/SchoolDashboard";
import QuizPage from "./pages/QuizPage";
import SubjectAnalytics from "./pages/SubjectAnalytics";
import { StudentLayout } from "./components/StudentLayout";
import { AdminLayout } from "./components/AdminLayout";
import AdminDashboard from "./pages/AdminDashboard";
import AdminLoginPage from "./pages/AdminLoginPage";
import AdminUsersPage from "./pages/AdminUsersPage";
import PlatformUsersPage from "./pages/PlatformUsersPage";
import QuestionBankPage from "./pages/QuestionBankPage";
import AdminAnalyticsPage from "./pages/AdminAnalyticsPage";
import AdminCompetitionsPage from "./pages/AdminCompetitionsPage";
import AdminReportsPage from "./pages/AdminReportsPage";
import AdminSettingsPage from "./pages/AdminSettingsPage";
import PassagesPage from "./pages/PassagesPage";
import { AuthProvider } from "./components/AuthProvider";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/role-selection" element={<RoleSelectionPage />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/password-reset" element={<PasswordResetPage />} />
              <Route path="/verify-email" element={<EmailVerificationPage />} />
              <Route path="/onboarding/student" element={
                <ProtectedRoute requiredRole="student">
                  <StudentOnboarding />
                </ProtectedRoute>
              } />
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
              <Route path="/dashboard/parent" element={
                <ProtectedRoute requiredRole="parent">
                  <ParentDashboard />
                </ProtectedRoute>
              } />
              <Route path="/dashboard/school" element={
                <ProtectedRoute requiredRole="school">
                  <SchoolDashboard />
                </ProtectedRoute>
              } />
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
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboard />} />
                <Route path="users" element={<AdminUsersPage />} />
                <Route path="platform-users" element={<PlatformUsersPage />} />
                <Route path="questions" element={<QuestionBankPage />} />
                <Route path="passages" element={<PassagesPage />} />
                <Route path="analytics" element={<AdminAnalyticsPage />} />
                <Route path="competitions" element={<AdminCompetitionsPage />} />
                <Route path="reports" element={<AdminReportsPage />} />
                <Route path="settings" element={<AdminSettingsPage />} />
              </Route>
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
