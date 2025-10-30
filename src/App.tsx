import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
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
import StudentDashboard from "./pages/StudentDashboard";
import ParentDashboard from "./pages/ParentDashboard";
import SchoolDashboard from "./pages/SchoolDashboard";
import QuizPage from "./pages/QuizPage";
import SubjectAnalytics from "./pages/SubjectAnalytics";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
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
              <StudentDashboard />
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
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
