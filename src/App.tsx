import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/lib/auth";
import { PWAInstallButton, PWAUpdateToast } from "@/components/PWAInstallButton";
import { SEOHead } from "@/components/SEOHead";
import { JsonLd } from "@/components/JsonLd";

// Layouts
import { PublicLayout } from "@/components/layout/PublicLayout";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AdminLayout } from "@/components/layout/AdminLayout";

// Public Pages
import LandingPage from "@/pages/LandingPage";
import AboutPage from "@/pages/AboutPage";
import ContactPage from "@/pages/ContactPage";
import TermsPage from "@/pages/TermsPage";
import NotFound from "@/pages/NotFound";

// Auth Pages
import StudentAuthPage from "@/pages/StudentAuthPage";
import AdminAuthPage from "@/pages/AdminAuthPage";

// Student Dashboard
import StudentDashboard from "@/pages/dashboard/StudentDashboard";
import TestsPage from "@/pages/dashboard/TestsPage";
import TestAttemptPage from "@/pages/dashboard/TestAttemptPage";
import TestResultPage from "@/pages/dashboard/TestResultPage";
import NotesPage from "@/pages/dashboard/NotesPage";
import VideosPage from "@/pages/dashboard/VideosPage";
import VideoWatchPage from "@/pages/dashboard/VideoWatchPage";
import ProfilePage from "@/pages/dashboard/ProfilePage";

// Admin Dashboard
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminStudentsPage from "@/pages/admin/AdminStudentsPage";
import AdminTestsPage from "@/pages/admin/AdminTestsPage";
import AdminQuestionsPage from "@/pages/admin/AdminQuestionsPage";
import TestBuilder from "@/components/admin/TestBuilder";
import AdminNotesPage from "@/pages/admin/AdminNotesPage";
import AdminVideosPage from "@/pages/admin/AdminVideosPage";
import AdminPasswordResetPage from "@/pages/admin/AdminPasswordResetPage";
import AdminResultsPage from "@/pages/admin/AdminResultsPage";
import AdminEventsPage from "@/pages/admin/AdminEventsPage";
import AdminBannersPage from "@/pages/admin/AdminBannersPage";
import AdminLeaderboardPage from "@/pages/admin/AdminLeaderboardPage";
import LeaderboardPage from "@/pages/dashboard/LeaderboardPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <PWAInstallButton />
        <PWAUpdateToast />
        <BrowserRouter>
          <SEOHead />
          <JsonLd />
          <Routes>
            {/* Public Routes */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<LandingPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/terms" element={<TermsPage />} />
            </Route>
            
            {/* Auth Routes - Separate for Student and Admin */}
            <Route path="/student-login" element={<StudentAuthPage />} />
            <Route path="/admin-login" element={<AdminAuthPage />} />
            {/* Legacy route redirect */}
            <Route path="/auth" element={<StudentAuthPage />} />

            {/* Student Dashboard */}
            <Route path="/dashboard" element={<DashboardLayout />}>
              <Route index element={<StudentDashboard />} />
              <Route path="tests" element={<TestsPage />} />
              <Route path="tests/:testId" element={<TestAttemptPage />} />
              <Route path="results/:attemptId" element={<TestResultPage />} />
              <Route path="notes" element={<NotesPage />} />
              <Route path="videos" element={<VideosPage />} />
              <Route path="videos/:videoId" element={<VideoWatchPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="leaderboard/:eventId" element={<LeaderboardPage />} />
            </Route>

            {/* Admin Dashboard */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="students" element={<AdminStudentsPage />} />
              <Route path="tests" element={<AdminTestsPage />} />
              <Route path="tests/:testId/questions" element={<AdminQuestionsPage />} />
              <Route path="tests/:testId/builder" element={<TestBuilder />} />
              <Route path="results" element={<AdminResultsPage />} />
              <Route path="notes" element={<AdminNotesPage />} />
              <Route path="videos" element={<AdminVideosPage />} />
              <Route path="password-resets" element={<AdminPasswordResetPage />} />
              <Route path="events" element={<AdminEventsPage />} />
              <Route path="banners" element={<AdminBannersPage />} />
              <Route path="leaderboard" element={<AdminLeaderboardPage />} />
            </Route>

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
