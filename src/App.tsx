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
import { lazyWithRetry } from "./lib/lazyWithRetry";

// Lazy load pages with auto-recovery on deployment updates
const Login = lazyWithRetry(() => import("./pages/Login"));
const NotFound = lazyWithRetry(() => import("./pages/NotFound"));
const NationalLandingPage = lazyWithRetry(() => import("./pages/NationalLandingPage"));
const AdminDashboard = lazyWithRetry(() => import("./pages/SuperAdmin/Dashboard"));
const Organisations = lazyWithRetry(() => import("./pages/SuperAdmin/Organisations"));
const Students = lazyWithRetry(() => import("./pages/SuperAdmin/SuperAdminCandidates"));
const Users = lazyWithRetry(() => import("./pages/SuperAdmin/Users"));
const QuestionBank = lazyWithRetry(() => import("./pages/SuperAdmin/QuestionBank"));
const ManageSubjects = lazyWithRetry(() => import("./pages/SuperAdmin/ManageSubjects"));
const Tests = lazyWithRetry(() => import("./pages/SuperAdmin/Tests"));
const TestCreate = lazyWithRetry(() => import("./pages/SuperAdmin/TestCreate"));
const TestsEdit = lazyWithRetry(() => import("./pages/SuperAdmin/TestsEdit"));
const TestQuestions = lazyWithRetry(() => import("./pages/SuperAdmin/TestQuestions"));
const TestDetails = lazyWithRetry(() => import("./pages/SuperAdmin/TestDetails"));
const TestScheduleDetails = lazyWithRetry(() => import("./pages/SuperAdmin/TestScheduleDetails"));
const InviteCandidates = lazyWithRetry(() => import("./pages/SuperAdmin/InviteCandidates"));
const InvitedCandidatesHistory = lazyWithRetry(() => import("./pages/SuperAdmin/InvitedCandidatesHistory"));
const EditQuestion = lazyWithRetry(() => import("./pages/SuperAdmin/EditQuestion"));
const AddQuestion = lazyWithRetry(() => import("./pages/SuperAdmin/AddQuestion"));
const Settings = lazyWithRetry(() => import("./pages/SuperAdmin/Settings"));
const DSAPlayground = lazyWithRetry(() => import("./pages/SuperAdmin/DSAPlayground"));
const Reports = lazyWithRetry(() => import("./pages/SuperAdmin/Reports"));
const TestSchedules = lazyWithRetry(() => import("./pages/SuperAdmin/TestSchedules"));
const AuditLogs = lazyWithRetry(() => import("./pages/SuperAdmin/AuditLogs"));
const Documentation = lazyWithRetry(() => import("./pages/SuperAdmin/Documentation"));
const SeedData = lazyWithRetry(() => import("./pages/SeedData"));
const ProctoringDashboard = lazyWithRetry(() => import("@/pages/Admin/ProctoringDashboard"));

// New-Admin pages
const NewAdminLayout = lazyWithRetry(() => import("./pages/New-Admin/NewAdminLayout"));
const NewAdminTests = lazyWithRetry(() => import("./pages/New-Admin/NewAdminTests"));
const NewAdminHome = lazyWithRetry(() => import("./pages/New-Admin/NewAdminHome"));
const NewAdminLibrary = lazyWithRetry(() => import("./pages/New-Admin/NewAdminLibrary"));
const NewAdminQuestionCreate = lazyWithRetry(() => import("./pages/New-Admin/NewAdminQuestionCreate"));
const NewAdminQuestionPreview = lazyWithRetry(() => import("./pages/New-Admin/NewAdminQuestionPreview"));
const NewAdminTestEdit = lazyWithRetry(() => import("./pages/New-Admin/NewAdminTestEdit"));
const NewAdminTestAddProblems = lazyWithRetry(() => import("./pages/New-Admin/NewAdminTestAddProblems"));
const NewAdminSettings = lazyWithRetry(() => import("./pages/New-Admin/NewAdminSettings"));

// Test Taking
const TestInterface = lazyWithRetry(() => import("./pages/test/TestInterface"));
const TestResults = lazyWithRetry(() => import("./pages/test/TestResults"));
const NewCandidateTestWelcome = lazyWithRetry(() => import("./pages/test/NewCandidateTestWelcome"));

// Candidate Dashboard pages
const CandidateDashboard = lazyWithRetry(() => import("./pages/Candidate/Dashboard"));
const MyAssessments = lazyWithRetry(() => import("./pages/Candidate/MyAssessments"));
const ResultsReports = lazyWithRetry(() => import("./pages/Candidate/ResultsReports"));
const Profile = lazyWithRetry(() => import("./pages/Candidate/Profile"));
const CandidateAssessmentFlow = lazyWithRetry(() => import("./pages/Candidate/CandidateAssessmentFlow"));

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
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
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
                <Route path="question-bank" element={<Navigate to="/superadmin/questions" replace />} />
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
                <Route path="reports" element={<Reports />} />
                <Route path="proctoring" element={<ProctoringDashboard />} />
                <Route path="proctoring/:sessionId" element={<ProctoringDashboard />} />
                <Route path="audit-logs" element={<AuditLogs />} />
                <Route path="docs" element={<Documentation />} />
                <Route path="settings" element={<Settings />} />
                <Route path="subjects/manage" element={<ManageSubjects />} />
              </Route>
              {/* Student Test Taking */}
              <Route path="/test/:testId" element={<TestInterface />} />
              <Route
                path="/test/:testId/session/:sessionId"
                element={<TestInterface />}
              />
              <Route path="/test/:testId/results" element={<TestResults />} />
              <Route path="/test/access/:id/:token" element={<NewCandidateTestWelcome />} />
              <Route path="/tests/access/:id/:token" element={<NewCandidateTestWelcome />} />
              <Route path="/test/access/:id" element={<NewCandidateTestWelcome />} />
              <Route path="/tests/access/:id" element={<NewCandidateTestWelcome />} />
              <Route path="/test/access/:token" element={<NewCandidateTestWelcome />} />

              {/* Candidate Dashboard Routes */}
              <Route path="/candidate" element={<CandidateLayout />}>
                <Route index element={<CandidateDashboard />} />
                <Route path="assessments" element={<MyAssessments />} />
                <Route path="results" element={<ResultsReports />} />
                <Route path="profile" element={<Profile />} />
                <Route path="flow" element={<CandidateAssessmentFlow />} />
              </Route>

              {/* Admin Routes (ADMIN and SUPERADMIN access) */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute requiredRoles={[ROLES.ADMIN, ROLES.SUPERADMIN]}>
                    <NewAdminLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/admin/home" replace />} />
                <Route path="home" element={<NewAdminHome />} />
                <Route path="tests" element={<NewAdminTests />} />
                <Route path="library" element={<NewAdminLibrary />} />
                <Route path="settings" element={<NewAdminSettings />} />
                <Route path="profile" element={<NewAdminSettings />} />
              </Route>

              {/* Standalone Full-Screen Question Create / Edit for Admin */}
              <Route
                path="/admin/questions/create"
                element={
                  <ProtectedRoute requiredRoles={[ROLES.ADMIN, ROLES.SUPERADMIN]}>
                    <NewAdminQuestionCreate />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/library/create"
                element={
                  <ProtectedRoute requiredRoles={[ROLES.ADMIN, ROLES.SUPERADMIN]}>
                    <NewAdminQuestionCreate />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/questions/edit/:id"
                element={
                  <ProtectedRoute requiredRoles={[ROLES.ADMIN, ROLES.SUPERADMIN]}>
                    <NewAdminQuestionCreate />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/library/edit/:id"
                element={
                  <ProtectedRoute requiredRoles={[ROLES.ADMIN, ROLES.SUPERADMIN]}>
                    <NewAdminQuestionCreate />
                  </ProtectedRoute>
                }
              />

              {/* Standalone Full-Screen Question Create / Edit for SuperAdmin */}
              <Route
                path="/superadmin/questions/create"
                element={
                  <ProtectedRoute requiredRoles={[ROLES.SUPERADMIN]}>
                    <NewAdminQuestionCreate />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/superadmin/questions/add"
                element={
                  <ProtectedRoute requiredRoles={[ROLES.SUPERADMIN]}>
                    <NewAdminQuestionCreate />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/superadmin/questions/edit/:id"
                element={
                  <ProtectedRoute requiredRoles={[ROLES.SUPERADMIN]}>
                    <NewAdminQuestionCreate />
                  </ProtectedRoute>
                }
              />

              {/* Standalone Full-Screen Question Preview (DoSelect / Learn Style) */}
              <Route
                path="/admin/questions/preview/:id"
                element={
                  <ProtectedRoute requiredRoles={[ROLES.ADMIN, ROLES.SUPERADMIN]}>
                    <NewAdminQuestionPreview />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/library/preview/:id"
                element={
                  <ProtectedRoute requiredRoles={[ROLES.ADMIN, ROLES.SUPERADMIN]}>
                    <NewAdminQuestionPreview />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/superadmin/questions/preview/:id"
                element={
                  <ProtectedRoute requiredRoles={[ROLES.SUPERADMIN]}>
                    <NewAdminQuestionPreview />
                  </ProtectedRoute>
                }
              />

              {/* Standalone Full-Screen Test Edit for Admin */}
              <Route
                path="/admin/tests/:id"
                element={
                  <ProtectedRoute requiredRoles={[ROLES.ADMIN, ROLES.SUPERADMIN]}>
                    <NewAdminTestEdit />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/tests/edit/:id"
                element={
                  <ProtectedRoute requiredRoles={[ROLES.ADMIN, ROLES.SUPERADMIN]}>
                    <NewAdminTestEdit />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/tests/edit"
                element={
                  <ProtectedRoute requiredRoles={[ROLES.ADMIN, ROLES.SUPERADMIN]}>
                    <NewAdminTestEdit />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/tests/:id/add-problems"
                element={
                  <ProtectedRoute requiredRoles={[ROLES.ADMIN, ROLES.SUPERADMIN]}>
                    <NewAdminTestAddProblems />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/tests/edit/:id/library"
                element={
                  <ProtectedRoute requiredRoles={[ROLES.ADMIN, ROLES.SUPERADMIN]}>
                    <NewAdminTestAddProblems />
                  </ProtectedRoute>
                }
              />

              {/* Standalone Full-Screen Playground for Admin */}
              <Route
                path="/admin/playground/:id"
                element={
                  <ProtectedRoute requiredRoles={[ROLES.ADMIN, ROLES.SUPERADMIN]}>
                    <DSAPlayground />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/questions/playground/:id"
                element={
                  <ProtectedRoute requiredRoles={[ROLES.ADMIN, ROLES.SUPERADMIN]}>
                    <DSAPlayground />
                  </ProtectedRoute>
                }
              />

              {/* Backwards compatibility for /new-admin routes */}
              <Route path="/new-admin/*" element={<Navigate to="/admin" replace />} />

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
