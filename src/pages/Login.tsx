 import { useState } from "react";
 import { motion } from "framer-motion";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
 import { useNavigate } from "react-router-dom";
 import { GraduationCap, Shield, BookOpen, CheckCircle2 } from "lucide-react";
 
 const features = [
   "MCQ & Coding Assessments",
   "Anti-Cheating Detection",
   "Auto-Evaluation",
   "Detailed Analytics",
 ];
 
 export default function Login() {
   const navigate = useNavigate();
   const [isLoading, setIsLoading] = useState(false);
 
   const handleAdminLogin = (e: React.FormEvent) => {
     e.preventDefault();
     setIsLoading(true);
     // Simulate login
     setTimeout(() => {
       setIsLoading(false);
       navigate("/admin");
     }, 1000);
   };
 
   const handleStudentAccess = (e: React.FormEvent) => {
     e.preventDefault();
     setIsLoading(true);
     setTimeout(() => {
       setIsLoading(false);
       navigate("/test/demo");
     }, 1000);
   };
 
   return (
     <div className="min-h-screen flex">
       {/* Left Panel - Hero */}
       <motion.div 
         className="hidden lg:flex lg:w-1/2 bg-gradient-hero p-12 flex-col justify-between relative overflow-hidden"
         initial={{ opacity: 0, x: -50 }}
         animate={{ opacity: 1, x: 0 }}
         transition={{ duration: 0.6 }}
       >
         {/* Background decoration */}
         <div className="absolute inset-0 opacity-10">
           <div className="absolute top-20 left-10 w-72 h-72 bg-primary rounded-full blur-3xl" />
           <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent rounded-full blur-3xl" />
         </div>
 
         <div className="relative z-10">
           <div className="flex items-center gap-3 mb-2">
             <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center shadow-primary">
               <span className="text-2xl font-bold text-primary-foreground">A</span>
             </div>
             <span className="font-heading font-bold text-2xl text-white">AssessHub</span>
           </div>
           <p className="text-white/60 text-sm">Skill Assessment Platform</p>
         </div>
 
         <div className="relative z-10 space-y-8">
           <div>
             <h1 className="text-4xl lg:text-5xl font-heading font-bold text-white leading-tight">
               Assess Skills.
               <br />
               <span className="text-gradient-primary">Build Talent.</span>
             </h1>
             <p className="text-white/70 mt-4 text-lg max-w-md">
               Comprehensive assessment platform for training institutes and placement companies.
             </p>
           </div>
 
           <div className="grid grid-cols-2 gap-4">
             {features.map((feature, index) => (
               <motion.div
                 key={feature}
                 className="flex items-center gap-2 text-white/80"
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ delay: 0.3 + index * 0.1 }}
               >
                 <CheckCircle2 className="w-5 h-5 text-primary" />
                 <span className="text-sm">{feature}</span>
               </motion.div>
             ))}
           </div>
         </div>
 
         <div className="relative z-10 flex items-center gap-8 text-white/40 text-sm">
           <div className="flex items-center gap-2">
             <GraduationCap className="w-5 h-5" />
             <span>12+ Colleges</span>
           </div>
           <div className="flex items-center gap-2">
             <BookOpen className="w-5 h-5" />
             <span>2,500+ Students</span>
           </div>
           <div className="flex items-center gap-2">
             <Shield className="w-5 h-5" />
             <span>Secure Platform</span>
           </div>
         </div>
       </motion.div>
 
       {/* Right Panel - Login Forms */}
       <motion.div 
         className="flex-1 flex items-center justify-center p-8 bg-background"
         initial={{ opacity: 0, x: 50 }}
         animate={{ opacity: 1, x: 0 }}
         transition={{ duration: 0.6, delay: 0.2 }}
       >
         <div className="w-full max-w-md space-y-8">
           <div className="text-center lg:text-left">
             <h2 className="text-2xl font-heading font-bold">Welcome Back</h2>
             <p className="text-muted-foreground mt-1">Choose your portal to continue</p>
           </div>
 
           <Tabs defaultValue="admin" className="w-full">
             <TabsList className="grid w-full grid-cols-2 h-12">
               <TabsTrigger value="admin" className="text-sm font-medium">
                 <Shield className="w-4 h-4 mr-2" />
                 Admin / Trainer
               </TabsTrigger>
               <TabsTrigger value="student" className="text-sm font-medium">
                 <GraduationCap className="w-4 h-4 mr-2" />
                 Student
               </TabsTrigger>
             </TabsList>
 
             <TabsContent value="admin" className="mt-6">
               <form onSubmit={handleAdminLogin} className="space-y-4">
                 <div className="space-y-2">
                   <Label htmlFor="email">Email</Label>
                   <Input
                     id="email"
                     type="email"
                     placeholder="admin@company.com"
                     className="h-12"
                     required
                   />
                 </div>
                 <div className="space-y-2">
                   <Label htmlFor="password">Password</Label>
                   <Input
                     id="password"
                     type="password"
                     placeholder="••••••••"
                     className="h-12"
                     required
                   />
                 </div>
                 <div className="flex items-center justify-between text-sm">
                   <label className="flex items-center gap-2 cursor-pointer">
                     <input type="checkbox" className="rounded border-input" />
                     <span className="text-muted-foreground">Remember me</span>
                   </label>
                   <a href="#" className="text-primary hover:underline">
                     Forgot password?
                   </a>
                 </div>
                 <Button 
                   type="submit" 
                   variant="hero" 
                   size="lg" 
                   className="w-full"
                   disabled={isLoading}
                 >
                   {isLoading ? "Signing in..." : "Sign in as Admin"}
                 </Button>
               </form>
             </TabsContent>
 
             <TabsContent value="student" className="mt-6">
               <form onSubmit={handleStudentAccess} className="space-y-4">
                 <div className="space-y-2">
                   <Label htmlFor="testCode">Test Access Code</Label>
                   <Input
                     id="testCode"
                     type="text"
                     placeholder="Enter test code (e.g., TEST-2024-001)"
                     className="h-12 font-mono uppercase tracking-wider"
                     required
                   />
                 </div>
                 <div className="space-y-2">
                   <Label htmlFor="studentEmail">Your Email</Label>
                   <Input
                     id="studentEmail"
                     type="email"
                     placeholder="student@email.com"
                     className="h-12"
                     required
                   />
                 </div>
                 <Button 
                   type="submit" 
                   variant="hero" 
                   size="lg" 
                   className="w-full"
                   disabled={isLoading}
                 >
                   {isLoading ? "Verifying..." : "Start Test"}
                 </Button>
                 <p className="text-center text-sm text-muted-foreground">
                   Enter the test code provided by your trainer
                 </p>
               </form>
             </TabsContent>
           </Tabs>
         </div>
       </motion.div>
     </div>
   );
 }