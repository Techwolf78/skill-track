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
import Students from "./pages/SuperAdmin/Students";
import Users from "./pages/SuperAdmin/Users";
import QuestionBank from "./pages/SuperAdmin/QuestionBank";
import ManageSubjects from "./pages/SuperAdmin/ManageSubjects";
import Tests from "./pages/SuperAdmin/Tests";
import TestCreate from "./pages/SuperAdmin/TestCreate";
import TestsEdit from "./pages/SuperAdmin/TestsEdit";
import TestQuestions from "./pages/SuperAdmin/TestQuestions";
import TestDetails from "./pages/SuperAdmin/TestDetails"; // Add this import
import EditQuestion from "./pages/SuperAdmin/EditQuestion";
import AddQuestion from "./pages/SuperAdmin/AddQuestion";
import Settings from "./pages/SuperAdmin/Settings";
import DSAPlayground from "./pages/SuperAdmin/DSAPlayground";
import Reports from "./pages/SuperAdmin/Reports";
import { AuthProvider } from "./lib/auth-context";
import ErrorBoundary from "./components/ErrorBoundary";

// Test Taking
import TestInterface from "./pages/test/TestInterface";
import TestResults from "./pages/test/TestResults";

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

              {/* Admin Routes */}
              <Route path="/admin" element={<AdminLayout />}>
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
                <Route path="tests/create" element={<TestCreate />} />
                <Route path="tests/edit/:id" element={<TestsEdit />} />
                <Route path="tests/:id" element={<TestDetails />} />{" "}
                {/* Add this route - IMPORTANT: place before the /tests/:id/questions route */}
                <Route path="tests/:id/questions" element={<TestQuestions />} />
                <Route path="questions/add" element={<AddQuestion />} />
                <Route path="questions/create" element={<AddQuestion />} />
                <Route path="questions/edit/:id" element={<EditQuestion />} />
                <Route path="reports" element={<Reports />} />
                <Route path="settings" element={<Settings />} />
                <Route path="subjects/manage" element={<ManageSubjects />} />
              </Route>

              {/* Student Test Taking */}
              <Route path="/test/:testId" element={<TestInterface />} />
              <Route path="/test/:testId/results" element={<TestResults />} />

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
