 import { Toaster } from "@/components/ui/toaster";
 import { Toaster as Sonner } from "@/components/ui/sonner";
 import { TooltipProvider } from "@/components/ui/tooltip";
 import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
 import { BrowserRouter, Routes, Route } from "react-router-dom";
 import Index from "./pages/Index";
 import Login from "./pages/Login";
 import NotFound from "./pages/NotFound";
 
 // Admin Pages
 import { AdminLayout } from "./components/layout/AdminLayout";
 import AdminDashboard from "./pages/admin/Dashboard";
 import Colleges from "./pages/admin/Colleges";
 import Students from "./pages/admin/Students";
 import QuestionBank from "./pages/admin/QuestionBank";
 import Tests from "./pages/admin/Tests";
 import TestCreate from "./pages/admin/TestCreate";
 import Reports from "./pages/admin/Reports";
 import Settings from "./pages/admin/Settings";
 
 // Test Taking
 import TestInterface from "./pages/test/TestInterface";
 
 const queryClient = new QueryClient();
 
 const App = () => (
   <QueryClientProvider client={queryClient}>
     <TooltipProvider>
       <Toaster />
       <Sonner />
       <BrowserRouter>
         <Routes>
           <Route path="/" element={<Index />} />
           <Route path="/login" element={<Login />} />
           
           {/* Admin Routes */}
           <Route path="/admin" element={<AdminLayout />}>
             <Route index element={<AdminDashboard />} />
             <Route path="colleges" element={<Colleges />} />
             <Route path="students" element={<Students />} />
             <Route path="questions" element={<QuestionBank />} />
             <Route path="tests" element={<Tests />} />
             <Route path="tests/create" element={<TestCreate />} />
             <Route path="reports" element={<Reports />} />
             <Route path="settings" element={<Settings />} />
           </Route>
 
           {/* Student Test Taking */}
           <Route path="/test/:testId" element={<TestInterface />} />
           
           {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
           <Route path="*" element={<NotFound />} />
         </Routes>
       </BrowserRouter>
     </TooltipProvider>
   </QueryClientProvider>
 );
 
 export default App;
