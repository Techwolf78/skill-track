import React, { Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AdminLayout } from "./components/layout/AdminLayout";
import { AssessmentsLayout } from "./components/layout/AssessmentsLayout";
import { AuthProvider } from "./lib/auth-context";
import ErrorBoundary from "./components/ErrorBoundary";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ROLES } from "./lib/roles";
import { CandidateLayout } from "./pages/Candidate/CandidateLayout";

// Lazy load pages
const Login = React.lazy(() => import("./pages/Login"));
const NotFound = React.lazy(() => import("./pages/NotFound"));
const NationalLandingPage = React.lazy(() => import("./pages/NationalLandingPage"));
const AdminDashboard = React.lazy(() => import("./pages/SuperAdmin/Dashboard"));
const Organisations = React.lazy(() => import("./pages/SuperAdmin/Organisations"));
const Students = React.lazy(() => import("./pages/SuperAdmin/SuperAdminCandidates"));
const Users = React.lazy(() => import("./pages/SuperAdmin/Users"));
const QuestionBank = React.lazy(() => import("./pages/SuperAdmin/QuestionBank"));
const ManageSubjects = React.lazy(() => import("./pages/SuperAdmin/ManageSubjects"));
const Tests = React.lazy(() => import("./pages/SuperAdmin/Tests"));
const TestCreate = React.lazy(() => import("./pages/SuperAdmin/TestCreate"));
const TestsEdit = React.lazy(() => import("./pages/SuperAdmin/TestsEdit"));
const TestQuestions = React.lazy(() => import("./pages/SuperAdmin/TestQuestions"));
const TestDetails = React.lazy(() => import("./pages/SuperAdmin/TestDetails"));
const TestScheduleDetails = React.lazy(() => import("./pages/SuperAdmin/TestScheduleDetails"));
const InviteCandidates = React.lazy(() => import("./pages/SuperAdmin/InviteCandidates"));
const InvitedCandidatesHistory = React.lazy(() => import("./pages/SuperAdmin/InvitedCandidatesHistory"));
const TestAccess = React.lazy(() => import("./pages/test/TestAccess"));
const EditQuestion = React.lazy(() => import("./pages/SuperAdmin/EditQuestion"));
const AddQuestion = React.lazy(() => import("./pages/SuperAdmin/AddQuestion"));
const Settings = React.lazy(() => import("./pages/SuperAdmin/Settings"));
const DSAPlayground = React.lazy(() => import("./pages/SuperAdmin/DSAPlayground"));
const Reports = React.lazy(() => import("./pages/SuperAdmin/Reports"));
const TestSchedules = React.lazy(() => import("./pages/SuperAdmin/TestSchedules"));
const AuditLogs = React.lazy(() => import("./pages/SuperAdmin/AuditLogs"));
const SeedData = React.lazy(() => import("./pages/SeedData"));
const ProctoringDashboard = React.lazy(() => import("@/pages/Admin/ProctoringDashboard"));

// Admin pages
const AdminDashboardAdmin = React.lazy(() => import("./pages/Admin/Dashboard"));
const AdminCandidates = React.lazy(() => import("./pages/Admin/AdminCandidates"));
const AdminQuestionBank = React.lazy(() => import("./pages/Admin/QuestionBank"));
const AdminTests = React.lazy(() => import("./pages/Admin/Tests"));
const AdminTestCreate = React.lazy(() => import("./pages/Admin/TestCreate"));
const AdminTestsEdit = React.lazy(() => import("./pages/Admin/TestsEdit"));
const AdminTestDetails = React.lazy(() => import("./pages/Admin/TestDetails"));
const AdminProfile = React.lazy(() => import("./pages/Admin/Profile"));

// New-Admin pages
const NewAdminLayout = React.lazy(() => import("./pages/New-Admin/NewAdminLayout"));
const NewAdminTests = React.lazy(() => import("./pages/New-Admin/NewAdminTests"));
const NewAdminHome = React.lazy(() => import("./pages/New-Admin/NewAdminHome"));
const NewAdminLibrary = React.lazy(() => import("./pages/New-Admin/NewAdminLibrary"));
const NewAdminQuestionCreate = React.lazy(() => import("./pages/New-Admin/NewAdminQuestionCreate"));
const NewAdminQuestionPreview = React.lazy(() => import("./pages/New-Admin/NewAdminQuestionPreview"));
const NewAdminTestEdit = React.lazy(() => import("./pages/New-Admin/NewAdminTestEdit"));
const NewAdminTestAddProblems = React.lazy(() => import("./pages/New-Admin/NewAdminTestAddProblems"));
const NewAdminSettings = React.lazy(() => import("./pages/New-Admin/NewAdminSettings"));

// Test Taking
const TestInterface = React.lazy(() => import("./pages/test/TestInterface"));
const TestResults = React.lazy(() => import("./pages/test/TestResults"));

// Candidate Dashboard pages
const CandidateDashboard = React.lazy(() => import("./pages/Candidate/Dashboard"));
const MyAssessments = React.lazy(() => import("./pages/Candidate/MyAssessments"));
const ResultsReports = React.lazy(() => import("./pages/Candidate/ResultsReports"));
const Profile = React.lazy(() => import("./pages/Candidate/Profile"));
const CandidateAssessmentFlow = React.lazy(() => import("./pages/Candidate/CandidateAssessmentFlow"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      throwOnError: true,
    },
    mutations: {
      throwOnError: false,
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
            <Suspense
              fallback={
                <div className="flex h-screen w-full items-center justify-center bg-background">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
              }
            >
              <Routes>
              <Route path="/" element={<NationalLandingPage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/unauthorized" element={<NotFound />} />
              <Route path="/seed-data" element={<SeedData />} />
              <Route path="/seed" element={<SeedData />} />
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
                  path="dsa-playground"
                  element={<DSAPlayground />}
                />
                <Route
                  path="questions/playground"
                  element={<DSAPlayground />}
                />
                <Route
                  path="questions/playground/:id"
                  element={<DSAPlayground />}
                />

                {/* Assessments Tab Group */}
                <Route element={<AssessmentsLayout />}>
                  <Route path="tests" element={<Tests />} />
                  <Route path="test-schedules" element={<TestSchedules />} />
                  <Route path="invitations" element={<InviteCandidates />} />
                </Route>

                <Route
                  path="test-schedules/:id"
                  element={<TestScheduleDetails />}
                />
                <Route
                  path="invitations-history"
                  element={<InvitedCandidatesHistory />}
                />
                <Route path="tests/create" element={<TestCreate />} />
                <Route path="tests/edit/:id" element={<TestsEdit />} />
                <Route path="tests/:id" element={<TestDetails />} />
                <Route path="tests/:id/questions" element={<TestQuestions />} />
                <Route path="questions/add" element={<AddQuestion />} />
                <Route path="questions/create" element={<AddQuestion />} />
                <Route path="questions/edit/:id" element={<EditQuestion />} />
                 <Route path="reports" element={<Reports />} />
                <Route path="proctoring" element={<ProctoringDashboard />} />
                <Route path="proctoring/:sessionId" element={<ProctoringDashboard />} />
                <Route path="audit-logs" element={<AuditLogs />} />
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
                <Route
                  path="questions/playground/:id"
                  element={<DSAPlayground />}
                />
                <Route path="questions/add" element={<AddQuestion />} />
                <Route path="questions/create" element={<AddQuestion />} />
                <Route path="questions/edit/:id" element={<EditQuestion />} />

                {/* Assessments Tab Group */}
                <Route element={<AssessmentsLayout />}>
                  <Route path="tests" element={<AdminTests />} />
                  <Route path="schedules" element={<TestSchedules />} />
                  <Route path="invitations" element={<InviteCandidates />} />
                </Route>

                <Route path="tests/create" element={<AdminTestCreate />} />
                <Route path="tests/edit/:id" element={<AdminTestsEdit />} />
                <Route path="tests/:id" element={<AdminTestDetails />} />
                <Route path="tests/:id/questions" element={<TestQuestions />} />
                <Route path="schedules/:id" element={<TestScheduleDetails />} />
                <Route path="proctoring" element={<ProctoringDashboard />} />
                <Route path="proctoring/:sessionId" element={<ProctoringDashboard />} />
                <Route
                  path="invitations-history"
                  element={<InvitedCandidatesHistory />}
                />
                <Route path="profile" element={<AdminProfile />} />
              </Route>
              {/* Student Test Taking */}
              <Route path="/test/:testId" element={<TestInterface />} />
              <Route
                path="/test/:testId/session/:sessionId"
                element={<TestInterface />}
              />
              <Route path="/test/:testId/results" element={<TestResults />} />
              <Route path="/test/access/:id/:token" element={<TestAccess />} />
              <Route path="/tests/access/:id/:token" element={<TestAccess />} />
              <Route path="/test/access/:id" element={<TestAccess />} />
              <Route path="/tests/access/:id" element={<TestAccess />} />
              <Route path="/test/access/:token" element={<TestAccess />} />
              {/* ← Add this line */}

              {/* Candidate Dashboard Routes */}
              <Route path="/candidate" element={<CandidateLayout />}>
                <Route index element={<CandidateDashboard />} />
                <Route path="assessments" element={<MyAssessments />} />
                <Route path="results" element={<ResultsReports />} />
                <Route path="profile" element={<Profile />} />
                <Route path="flow" element={<CandidateAssessmentFlow />} />
              </Route>

              {/* New-Admin Routes */}
              <Route path="/new-admin" element={<NewAdminLayout />}>
                <Route index element={<Navigate to="/new-admin/home" replace />} />
                <Route path="home" element={<NewAdminHome />} />
                <Route path="tests" element={<NewAdminTests />} />
                <Route path="library" element={<NewAdminLibrary />} />
                <Route path="settings" element={<NewAdminSettings />} />
                <Route path="profile" element={<NewAdminSettings />} />
              </Route>

              {/* Standalone Full-Screen Question Create / Edit for New-Admin (No 2nd Navbar) */}
              <Route path="/new-admin/questions/create" element={<NewAdminQuestionCreate />} />
              <Route path="/new-admin/library/create" element={<NewAdminQuestionCreate />} />

              {/* Standalone Full-Screen Question Preview (DoSelect / Learn Style) */}
              <Route path="/new-admin/questions/preview/:id" element={<NewAdminQuestionPreview />} />
              <Route path="/new-admin/library/preview/:id" element={<NewAdminQuestionPreview />} />
              <Route path="/superadmin/questions/preview/:id" element={<NewAdminQuestionPreview />} />
              <Route path="/admin/questions/preview/:id" element={<NewAdminQuestionPreview />} />

              {/* Standalone Full-Screen Test Edit for New-Admin */}
              <Route path="/new-admin/tests/edit/:id" element={<NewAdminTestEdit />} />
              <Route path="/new-admin/tests/edit" element={<NewAdminTestEdit />} />
              <Route path="/new-admin/tests/:id/add-problems" element={<NewAdminTestAddProblems />} />
              <Route path="/new-admin/tests/edit/:id/library" element={<NewAdminTestAddProblems />} />

              {/* Standalone Full-Screen Playground for New-Admin (No Sidebars) */}
              <Route path="/new-admin/playground/:id" element={<DSAPlayground />} />
              <Route path="/new-admin/questions/playground/:id" element={<DSAPlayground />} />

              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
             </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
