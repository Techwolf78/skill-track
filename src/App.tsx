import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import NotFound from "./pages/NotFound";
import NationalLandingPage from "./pages/NationalLandingPage";
import { AdminLayout } from "./components/layout/AdminLayout";
import AdminDashboard from "./pages/SuperAdmin/Dashboard";
import Organisations from "./pages/SuperAdmin/Organisations";
import Students from "./pages/SuperAdmin/SuperAdminCandidates";
import Users from "./pages/SuperAdmin/Users";
import QuestionBank from "./pages/SuperAdmin/QuestionBank";
import ManageSubjects from "./pages/SuperAdmin/ManageSubjects";
import Tests from "./pages/SuperAdmin/Tests";
import TestCreate from "./pages/SuperAdmin/TestCreate";
import TestsEdit from "./pages/SuperAdmin/TestsEdit";
import TestQuestions from "./pages/SuperAdmin/TestQuestions";
import TestDetails from "./pages/SuperAdmin/TestDetails"; // Add this import
import TestScheduleDetails from "./pages/SuperAdmin/TestScheduleDetails";
import InviteCandidates from "./pages/SuperAdmin/InviteCandidates";
import TestAccess from "./pages/Test/TestAccess";
import EditQuestion from "./pages/SuperAdmin/EditQuestion";
import AddQuestion from "./pages/SuperAdmin/AddQuestion";
import Settings from "./pages/SuperAdmin/Settings";
import DSAPlayground from "./pages/SuperAdmin/DSAPlayground";
import Reports from "./pages/SuperAdmin/Reports";
import TestSchedules from "./pages/SuperAdmin/TestSchedules";
import { AuthProvider } from "./lib/auth-context";
import ErrorBoundary from "./components/ErrorBoundary";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ROLES } from "./lib/roles";

// Admin pages
import AdminDashboardAdmin from "./pages/Admin/Dashboard";
import AdminCandidates from "./pages/Admin/AdminCandidates";
import AdminQuestionBank from "./pages/Admin/QuestionBank";
import AdminTests from "./pages/Admin/Tests";
import AdminTestCreate from "./pages/Admin/TestCreate";
import AdminTestsEdit from "./pages/Admin/TestsEdit";
import AdminTestDetails from "./pages/Admin/TestDetails";

// Test Taking
import TestInterface from "./pages/Test/TestInterface";
import TestResults from "./pages/Test/TestResults";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      throwOnError: true,
    },
    mutations: {
      throwOnError: true,
    },
  },
});

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<NationalLandingPage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/unauthorized" element={<NotFound />} />
              {/* SuperAdmin Routes (SUPERADMIN role only) */}
              <Route
                path="/superadmin"
                element={
                  <ProtectedRoute requiredRoles={[ROLES.SUPERADMIN]}>
                    <AdminLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<AdminDashboard />} />
                <Route path="organisations" element={<Organisations />} />
                <Route path="users" element={<Users />} />
                <Route path="students" element={<Students />} />
                <Route path="questions" element={<QuestionBank />} />
                <Route
                  path="questions/playground/:id"
                  element={<DSAPlayground />}
                />
                <Route path="tests" element={<Tests />} />
                <Route path="test-schedules" element={<TestSchedules />} />
                <Route path="test-schedules/:id" element={<TestScheduleDetails />} />
                <Route path="invitations" element={<InviteCandidates />} />
                <Route path="tests/create" element={<TestCreate />} />
                <Route path="tests/edit/:id" element={<TestsEdit />} />
                <Route path="tests/:id" element={<TestDetails />} />
                <Route path="tests/:id/questions" element={<TestQuestions />} />
                <Route path="questions/add" element={<AddQuestion />} />
                <Route path="questions/create" element={<AddQuestion />} />
                <Route path="questions/edit/:id" element={<EditQuestion />} />
                <Route path="reports" element={<Reports />} />
                <Route path="settings" element={<Settings />} />
                <Route path="subjects/manage" element={<ManageSubjects />} />
              </Route>
              {/* Admin Routes (ADMIN role only) */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute requiredRoles={[ROLES.ADMIN]}>
                    <AdminLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<AdminDashboardAdmin />} />
                <Route path="candidates" element={<AdminCandidates />} />
                <Route path="questions" element={<AdminQuestionBank />} />
                <Route path="tests" element={<AdminTests />} />
                <Route path="tests/create" element={<AdminTestCreate />} />
                <Route path="tests/edit/:id" element={<AdminTestsEdit />} />
                <Route path="tests/:id" element={<AdminTestDetails />} />
              </Route>
              {/* Student Test Taking */}
              <Route path="/test/:testId" element={<TestInterface />} />
              <Route
                path="/test/:testId/session/:sessionId"
                element={<TestInterface />}
              />
              <Route path="/test/:testId/results" element={<TestResults />} />
              <Route path="/test/access/:token" element={<TestAccess />} />{" "}
              {/* ← Add this line */}
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
