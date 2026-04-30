 import {
   Table,
   TableBody,
   TableCell,
   TableHead,
   TableHeader,
   TableRow,
 } from "@/components/ui/table";
 import { Badge } from "@/components/ui/badge";
 import { Button } from "@/components/ui/button";
 import { Eye, MoreVertical } from "lucide-react";
 
 const recentTests = [
  {
    id: "1",
    name: "Python Fundamentals",
    type: "Mixed",
    batch: "CSE 2024",
    college: "ABC Engineering",
    date: "2024-01-15",
    status: "completed",
    participants: 45,
    invited: 45,
  },
  {
    id: "2",
    name: "Data Structures MCQ",
    type: "MCQ",
    batch: "IT 2024",
    college: "XYZ Institute",
    date: "2024-01-14",
    status: "active",
    participants: 12,
    invited: 32,
  },
  {
    id: "3",
    name: "Java Coding Challenge",
    type: "Coding",
    batch: "CSE 2025",
    college: "Tech College",
    date: "2024-01-13",
    status: "scheduled",
    participants: 0,
    invited: 60,
  },
  {
    id: "4",
    name: "SQL Proficiency",
    type: "Mixed",
    batch: "MCA 2024",
    college: "ABC Engineering",
    date: "2024-01-12",
    status: "completed",
    participants: 28,
    invited: 28,
  },
];
 
 const statusStyles = {
   completed: "bg-success/10 text-success border-success/20",
   active: "bg-accent/10 text-accent border-accent/20",
   scheduled: "bg-warning/10 text-warning border-warning/20",
 };
 
 export function RecentTestsTable() {
   return (
     <div className="rounded-xl border bg-card overflow-hidden">
       <div className="px-6 py-4 border-b">
         <h3 className="font-heading font-semibold text-lg">Recent Tests</h3>
       </div>
       <Table>
         <TableHeader>
           <TableRow className="bg-muted/50">
             <TableHead className="font-semibold">Test Name</TableHead>
             <TableHead className="font-semibold">Type</TableHead>
             <TableHead className="font-semibold">Batch</TableHead>
             <TableHead className="font-semibold">Status</TableHead>
             <TableHead className="font-semibold text-center">Invited / Started</TableHead>
             <TableHead className="font-semibold text-right">Actions</TableHead>
           </TableRow>
         </TableHeader>
         <TableBody>
           {recentTests.map((test) => (
             <TableRow key={test.id} className="hover:bg-muted/30 transition-colors">
               <TableCell>
                 <div>
                   <p className="font-medium">{test.name}</p>
                   <p className="text-sm text-muted-foreground">{test.college}</p>
                 </div>
               </TableCell>
               <TableCell>
                 <Badge variant="secondary">{test.type}</Badge>
               </TableCell>
               <TableCell className="text-muted-foreground">{test.batch}</TableCell>
               <TableCell>
                 <Badge 
                   variant="outline" 
                   className={statusStyles[test.status as keyof typeof statusStyles]}
                 >
                   {test.status.charAt(0).toUpperCase() + test.status.slice(1)}
                 </Badge>
               </TableCell>
               <TableCell className="text-center font-medium">
                 {test.invited} / {test.participants}
                 <div className="w-24 h-1.5 bg-muted rounded-full mt-2 mx-auto overflow-hidden">
                   <div 
                     className="h-full bg-primary" 
                     style={{ width: `${(test.participants / test.invited) * 100}%` }}
                   />
                 </div>
               </TableCell>
               <TableCell className="text-right">
                 <div className="flex items-center justify-end gap-2">
                   <Button variant="ghost" size="icon">
                     <Eye className="w-4 h-4" />
                   </Button>
                   <Button variant="ghost" size="icon">
                     <MoreVertical className="w-4 h-4" />
                   </Button>
                 </div>
               </TableCell>
             </TableRow>
           ))}
         </TableBody>
       </Table>
     </div>
   );
 }