 import { useState } from "react";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 import { Textarea } from "@/components/ui/textarea";
 import { Badge } from "@/components/ui/badge";
 import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
 } from "@/components/ui/select";
 import { Switch } from "@/components/ui/switch";
 import {
   Card,
   CardContent,
   CardDescription,
   CardHeader,
   CardTitle,
 } from "@/components/ui/card";
 import { ArrowLeft, Save, Play, Settings, FileQuestion, Users } from "lucide-react";
 import { Link } from "react-router-dom";
 
 export default function TestCreate() {
   const [testType, setTestType] = useState("mixed");
 
   return (
     <div className="p-8 space-y-6 animate-fade-in">
       {/* Header */}
       <div className="flex items-center justify-between">
         <div className="flex items-center gap-4">
           <Link to="/admin/tests">
             <Button variant="ghost" size="icon">
               <ArrowLeft className="w-5 h-5" />
             </Button>
           </Link>
           <div>
             <h1 className="text-3xl font-heading font-bold">Create New Test</h1>
             <p className="text-muted-foreground mt-1">
               Configure your assessment settings
             </p>
           </div>
         </div>
         <div className="flex items-center gap-3">
           <Button variant="outline">
             <Save className="w-4 h-4 mr-2" />
             Save as Draft
           </Button>
           <Button variant="hero">
             <Play className="w-4 h-4 mr-2" />
             Publish Test
           </Button>
         </div>
       </div>
 
       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         {/* Main Form */}
         <div className="lg:col-span-2 space-y-6">
           {/* Basic Info */}
           <Card>
             <CardHeader>
               <CardTitle className="flex items-center gap-2">
                 <Settings className="w-5 h-5" />
                 Basic Information
               </CardTitle>
               <CardDescription>Set the test name and basic settings</CardDescription>
             </CardHeader>
             <CardContent className="space-y-4">
               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                   <Label htmlFor="testName">Test Name</Label>
                   <Input id="testName" placeholder="e.g., Python Fundamentals" />
                 </div>
                 <div className="space-y-2">
                   <Label htmlFor="testType">Test Type</Label>
                   <Select value={testType} onValueChange={setTestType}>
                     <SelectTrigger>
                       <SelectValue />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="mcq">MCQ Only</SelectItem>
                       <SelectItem value="coding">Coding Only</SelectItem>
                       <SelectItem value="mixed">Mixed (MCQ + Coding)</SelectItem>
                     </SelectContent>
                   </Select>
                 </div>
               </div>
 
               <div className="space-y-2">
                 <Label htmlFor="description">Description (Optional)</Label>
                 <Textarea 
                   id="description" 
                   placeholder="Brief description of the test..."
                   rows={3}
                 />
               </div>
 
               <div className="grid grid-cols-3 gap-4">
                 <div className="space-y-2">
                   <Label htmlFor="duration">Duration (minutes)</Label>
                   <Input id="duration" type="number" placeholder="60" />
                 </div>
                 <div className="space-y-2">
                   <Label htmlFor="totalMarks">Total Marks</Label>
                   <Input id="totalMarks" type="number" placeholder="100" />
                 </div>
                 <div className="space-y-2">
                   <Label htmlFor="passingMarks">Passing Marks</Label>
                   <Input id="passingMarks" type="number" placeholder="40" />
                 </div>
               </div>
             </CardContent>
           </Card>
 
           {/* Question Configuration */}
           <Card>
             <CardHeader>
               <CardTitle className="flex items-center gap-2">
                 <FileQuestion className="w-5 h-5" />
                 Question Configuration
               </CardTitle>
               <CardDescription>Configure sections and question distribution</CardDescription>
             </CardHeader>
             <CardContent className="space-y-6">
               {/* MCQ Section */}
               {(testType === "mcq" || testType === "mixed") && (
                 <div className="p-4 border rounded-lg space-y-4">
                   <div className="flex items-center justify-between">
                     <h4 className="font-semibold">MCQ Section</h4>
                     <Badge>Section A</Badge>
                   </div>
                   <div className="grid grid-cols-3 gap-4">
                     <div className="space-y-2">
                       <Label>Number of Questions</Label>
                       <Input type="number" placeholder="20" />
                     </div>
                     <div className="space-y-2">
                       <Label>Marks per Question</Label>
                       <Input type="number" placeholder="2" />
                     </div>
                     <div className="space-y-2">
                       <Label>Topics</Label>
                       <Select>
                         <SelectTrigger>
                           <SelectValue placeholder="Select topics" />
                         </SelectTrigger>
                         <SelectContent>
                           <SelectItem value="all">All Topics</SelectItem>
                           <SelectItem value="python">Python</SelectItem>
                           <SelectItem value="java">Java</SelectItem>
                           <SelectItem value="dsa">Data Structures</SelectItem>
                         </SelectContent>
                       </Select>
                     </div>
                   </div>
                   <div className="flex items-center gap-2">
                     <Switch id="randomizeMcq" defaultChecked />
                     <Label htmlFor="randomizeMcq">Randomize questions for each student</Label>
                   </div>
                 </div>
               )}
 
               {/* Coding Section */}
               {(testType === "coding" || testType === "mixed") && (
                 <div className="p-4 border rounded-lg space-y-4">
                   <div className="flex items-center justify-between">
                     <h4 className="font-semibold">Coding Section</h4>
                     <Badge variant="secondary">Section B</Badge>
                   </div>
                   <div className="grid grid-cols-3 gap-4">
                     <div className="space-y-2">
                       <Label>Number of Questions</Label>
                       <Input type="number" placeholder="3" />
                     </div>
                     <div className="space-y-2">
                       <Label>Marks per Question</Label>
                       <Input type="number" placeholder="20" />
                     </div>
                     <div className="space-y-2">
                       <Label>Difficulty Mix</Label>
                       <Select>
                         <SelectTrigger>
                           <SelectValue placeholder="Select mix" />
                         </SelectTrigger>
                         <SelectContent>
                           <SelectItem value="easy">All Easy</SelectItem>
                           <SelectItem value="medium">All Medium</SelectItem>
                           <SelectItem value="hard">All Hard</SelectItem>
                           <SelectItem value="mixed">Mixed</SelectItem>
                         </SelectContent>
                       </Select>
                     </div>
                   </div>
                   <div className="flex items-center gap-2">
                     <Switch id="partialScoring" defaultChecked />
                     <Label htmlFor="partialScoring">Enable partial scoring for test cases</Label>
                   </div>
                 </div>
               )}
             </CardContent>
           </Card>
         </div>
 
         {/* Sidebar */}
         <div className="space-y-6">
           {/* Assign to Batches */}
           <Card>
             <CardHeader>
               <CardTitle className="flex items-center gap-2">
                 <Users className="w-5 h-5" />
                 Assign Test
               </CardTitle>
               <CardDescription>Select batches to assign this test</CardDescription>
             </CardHeader>
             <CardContent className="space-y-4">
               <div className="space-y-2">
                 <Label>Select College</Label>
                 <Select>
                   <SelectTrigger>
                     <SelectValue placeholder="Choose college" />
                   </SelectTrigger>
                   <SelectContent>
                     <SelectItem value="abc">ABC Engineering</SelectItem>
                     <SelectItem value="xyz">XYZ Institute</SelectItem>
                     <SelectItem value="tech">Tech College</SelectItem>
                   </SelectContent>
                 </Select>
               </div>
               <div className="space-y-2">
                 <Label>Select Batches</Label>
                 <Select>
                   <SelectTrigger>
                     <SelectValue placeholder="Choose batches" />
                   </SelectTrigger>
                   <SelectContent>
                     <SelectItem value="cse2024">CSE 2024</SelectItem>
                     <SelectItem value="it2024">IT 2024</SelectItem>
                     <SelectItem value="cse2025">CSE 2025</SelectItem>
                   </SelectContent>
                 </Select>
               </div>
             </CardContent>
           </Card>
 
           {/* Schedule */}
           <Card>
             <CardHeader>
               <CardTitle>Schedule</CardTitle>
               <CardDescription>Set test availability window</CardDescription>
             </CardHeader>
             <CardContent className="space-y-4">
               <div className="space-y-2">
                 <Label>Start Date & Time</Label>
                 <Input type="datetime-local" />
               </div>
               <div className="space-y-2">
                 <Label>End Date & Time</Label>
                 <Input type="datetime-local" />
               </div>
             </CardContent>
           </Card>
 
           {/* Anti-Cheating */}
           <Card>
             <CardHeader>
               <CardTitle>Security Settings</CardTitle>
               <CardDescription>Anti-cheating configurations</CardDescription>
             </CardHeader>
             <CardContent className="space-y-4">
               <div className="flex items-center justify-between">
                 <Label htmlFor="tabSwitch">Detect Tab Switch</Label>
                 <Switch id="tabSwitch" defaultChecked />
               </div>
               <div className="flex items-center justify-between">
                 <Label htmlFor="fullscreen">Force Fullscreen</Label>
                 <Switch id="fullscreen" defaultChecked />
               </div>
               <div className="flex items-center justify-between">
                 <Label htmlFor="copyPaste">Disable Copy-Paste</Label>
                 <Switch id="copyPaste" />
               </div>
               <div className="flex items-center justify-between">
                 <Label htmlFor="autoSubmit">Auto-submit on Violation</Label>
                 <Switch id="autoSubmit" defaultChecked />
               </div>
             </CardContent>
           </Card>
         </div>
       </div>
     </div>
   );
 }