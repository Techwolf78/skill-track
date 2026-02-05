 import { StatsCard } from "@/components/dashboard/StatsCard";
 import { RecentTestsTable } from "@/components/dashboard/RecentTestsTable";
 import { Button } from "@/components/ui/button";
 import {
   Users,
   GraduationCap,
   FileQuestion,
   ClipboardCheck,
   Plus,
   TrendingUp,
 } from "lucide-react";
 
 export default function AdminDashboard() {
   return (
     <div className="p-8 space-y-8 animate-fade-in">
       {/* Header */}
       <div className="flex items-center justify-between">
         <div>
           <h1 className="text-3xl font-heading font-bold">Dashboard</h1>
           <p className="text-muted-foreground mt-1">
             Welcome back! Here's what's happening with your assessments.
           </p>
         </div>
         <Button variant="hero" size="lg">
           <Plus className="w-5 h-5" />
           Create Test
         </Button>
       </div>
 
       {/* Stats Grid */}
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         <StatsCard
           title="Total Students"
           value="2,847"
           subtitle="Across 12 colleges"
           icon={Users}
           variant="default"
           trend={{ value: 12, positive: true }}
         />
         <StatsCard
           title="Active Batches"
           value="48"
           subtitle="6 colleges active"
           icon={GraduationCap}
           variant="accent"
         />
         <StatsCard
           title="Question Bank"
           value="1,256"
           subtitle="MCQ: 890 | Coding: 366"
           icon={FileQuestion}
           variant="success"
         />
         <StatsCard
           title="Tests Completed"
           value="156"
           subtitle="This month"
           icon={ClipboardCheck}
           variant="warning"
           trend={{ value: 24, positive: true }}
         />
       </div>
 
       {/* Quick Actions */}
       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         <div className="lg:col-span-2">
           <RecentTestsTable />
         </div>
         
         <div className="space-y-6">
           {/* Quick Actions Card */}
           <div className="rounded-xl border bg-card p-6">
             <h3 className="font-heading font-semibold text-lg mb-4">Quick Actions</h3>
             <div className="space-y-3">
               <Button variant="outline" className="w-full justify-start gap-3">
                 <Plus className="w-4 h-4" />
                 Add New Question
               </Button>
               <Button variant="outline" className="w-full justify-start gap-3">
                 <GraduationCap className="w-4 h-4" />
                 Add New Batch
               </Button>
               <Button variant="outline" className="w-full justify-start gap-3">
                 <Users className="w-4 h-4" />
                 Bulk Upload Students
               </Button>
             </div>
           </div>
 
           {/* Performance Overview */}
           <div className="rounded-xl border bg-card p-6">
             <div className="flex items-center justify-between mb-4">
               <h3 className="font-heading font-semibold text-lg">Performance</h3>
               <TrendingUp className="w-5 h-5 text-success" />
             </div>
             <div className="space-y-4">
               <div>
                 <div className="flex justify-between text-sm mb-1">
                   <span className="text-muted-foreground">Average Score</span>
                   <span className="font-semibold">72%</span>
                 </div>
                 <div className="h-2 bg-muted rounded-full overflow-hidden">
                   <div className="h-full bg-gradient-primary rounded-full" style={{ width: "72%" }} />
                 </div>
               </div>
               <div>
                 <div className="flex justify-between text-sm mb-1">
                   <span className="text-muted-foreground">Completion Rate</span>
                   <span className="font-semibold">89%</span>
                 </div>
                 <div className="h-2 bg-muted rounded-full overflow-hidden">
                   <div className="h-full bg-gradient-accent rounded-full" style={{ width: "89%" }} />
                 </div>
               </div>
               <div>
                 <div className="flex justify-between text-sm mb-1">
                   <span className="text-muted-foreground">Pass Rate</span>
                   <span className="font-semibold">68%</span>
                 </div>
                 <div className="h-2 bg-muted rounded-full overflow-hidden">
                   <div className="h-full bg-success rounded-full" style={{ width: "68%" }} />
                 </div>
               </div>
             </div>
           </div>
         </div>
       </div>
     </div>
   );
 }