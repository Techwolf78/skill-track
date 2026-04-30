 import { useState } from "react";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { Badge } from "@/components/ui/badge";
 import {
   Card,
   CardContent,
   CardDescription,
   CardHeader,
   CardTitle,
 } from "@/components/ui/card";
 import {
   Plus,
   Search,
   Building2,
   Users,
   GraduationCap,
   MoreVertical,
   MapPin,
 } from "lucide-react";
 import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuTrigger,
 } from "@/components/ui/dropdown-menu";
 
 const colleges = [
   {
     id: "1",
     name: "ABC Engineering College",
     location: "Mumbai, Maharashtra",
     batches: 8,
     students: 450,
     activeTests: 3,
     status: "active",
   },
   {
     id: "2",
     name: "XYZ Institute of Technology",
     location: "Pune, Maharashtra",
     batches: 6,
     students: 320,
     activeTests: 2,
     status: "active",
   },
   {
     id: "3",
     name: "Tech College of Engineering",
     location: "Bangalore, Karnataka",
     batches: 10,
     students: 580,
     activeTests: 5,
     status: "active",
   },
   {
     id: "4",
     name: "National Institute of Science",
     location: "Hyderabad, Telangana",
     batches: 4,
     students: 210,
     activeTests: 1,
     status: "inactive",
   },
 ];
 
 export default function Colleges() {
   const [searchTerm, setSearchTerm] = useState("");
 
   return (
     <div className="p-8 space-y-6 animate-fade-in">
       {/* Header */}
       <div className="flex items-center justify-between">
         <div>
           <h1 className="text-3xl font-heading font-bold">Colleges</h1>
           <p className="text-muted-foreground mt-1">
             Manage your partner colleges and batches
           </p>
         </div>
         <Button variant="hero">
           <Plus className="w-4 h-4 mr-2" />
           Add College
         </Button>
       </div>
 
       {/* Search */}
       <div className="relative max-w-md">
         <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
         <Input
           placeholder="Search colleges..."
           value={searchTerm}
           onChange={(e) => setSearchTerm(e.target.value)}
           className="pl-10"
         />
       </div>
 
       {/* College Cards Grid */}
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         {colleges.map((college) => (
           <Card key={college.id} className="card-hover">
             <CardHeader className="pb-3">
               <div className="flex items-start justify-between">
                 <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center shadow-primary">
                   <Building2 className="w-6 h-6 text-primary-foreground" />
                 </div>
                 <DropdownMenu>
                   <DropdownMenuTrigger asChild>
                     <Button variant="ghost" size="icon">
                       <MoreVertical className="w-4 h-4" />
                     </Button>
                   </DropdownMenuTrigger>
                   <DropdownMenuContent align="end">
                     <DropdownMenuItem>View Details</DropdownMenuItem>
                     <DropdownMenuItem>Edit</DropdownMenuItem>
                     <DropdownMenuItem>Manage Batches</DropdownMenuItem>
                     <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                   </DropdownMenuContent>
                 </DropdownMenu>
               </div>
               <CardTitle className="mt-3">{college.name}</CardTitle>
               <CardDescription className="flex items-center gap-1">
                 <MapPin className="w-3 h-3" />
                 {college.location}
               </CardDescription>
             </CardHeader>
             <CardContent>
               <div className="grid grid-cols-3 gap-4 py-4 border-t">
                 <div className="text-center">
                   <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                     <GraduationCap className="w-4 h-4" />
                   </div>
                   <p className="text-2xl font-bold">{college.batches}</p>
                   <p className="text-xs text-muted-foreground">Batches</p>
                 </div>
                 <div className="text-center border-x">
                   <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                     <Users className="w-4 h-4" />
                   </div>
                   <p className="text-2xl font-bold">{college.students}</p>
                   <p className="text-xs text-muted-foreground">Candidates</p>
                 </div>
                 <div className="text-center">
                   <p className="text-2xl font-bold text-primary">{college.activeTests}</p>
                   <p className="text-xs text-muted-foreground">Active Tests</p>
                 </div>
               </div>
               <div className="flex items-center justify-between pt-4 border-t">
                 <Badge variant={college.status === "active" ? "default" : "secondary"}>
                   {college.status === "active" ? "Active" : "Inactive"}
                 </Badge>
                 <Button variant="outline" size="sm">
                   View Batches
                 </Button>
               </div>
             </CardContent>
           </Card>
         ))}
       </div>
     </div>
   );
 }