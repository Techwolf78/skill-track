 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 import { Switch } from "@/components/ui/switch";
 import {
   Card,
   CardContent,
   CardDescription,
   CardHeader,
   CardTitle,
 } from "@/components/ui/card";
 import { Separator } from "@/components/ui/separator";
 import { User, Bell, Shield, Palette } from "lucide-react";
 
 export default function Settings() {
   return (
     <div className="p-8 space-y-6 animate-fade-in max-w-4xl">
       {/* Header */}
       <div>
         <h1 className="text-3xl font-heading font-bold">Settings</h1>
         <p className="text-muted-foreground mt-1">
           Manage your account and platform settings
         </p>
       </div>
 
       {/* Profile Settings */}
       <Card>
         <CardHeader>
           <CardTitle className="flex items-center gap-2">
             <User className="w-5 h-5" />
             Profile Settings
           </CardTitle>
           <CardDescription>Manage your account information</CardDescription>
         </CardHeader>
         <CardContent className="space-y-4">
           <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
               <Label htmlFor="name">Full Name</Label>
               <Input id="name" defaultValue="Admin User" />
             </div>
             <div className="space-y-2">
               <Label htmlFor="email">Email</Label>
               <Input id="email" type="email" defaultValue="admin@company.com" />
             </div>
           </div>
           <div className="space-y-2">
             <Label htmlFor="company">Company Name</Label>
             <Input id="company" defaultValue="Training & Placement Company" />
           </div>
           <Button>Save Changes</Button>
         </CardContent>
       </Card>
 
       {/* Notification Settings */}
       <Card>
         <CardHeader>
           <CardTitle className="flex items-center gap-2">
             <Bell className="w-5 h-5" />
             Notifications
           </CardTitle>
           <CardDescription>Configure how you receive notifications</CardDescription>
         </CardHeader>
         <CardContent className="space-y-4">
           <div className="flex items-center justify-between">
             <div>
               <p className="font-medium">Email Notifications</p>
               <p className="text-sm text-muted-foreground">
                 Receive email updates about test completions
               </p>
             </div>
             <Switch defaultChecked />
           </div>
           <Separator />
           <div className="flex items-center justify-between">
             <div>
               <p className="font-medium">Test Reminders</p>
               <p className="text-sm text-muted-foreground">
                 Get notified before scheduled tests
               </p>
             </div>
             <Switch defaultChecked />
           </div>
           <Separator />
           <div className="flex items-center justify-between">
             <div>
               <p className="font-medium">Weekly Reports</p>
               <p className="text-sm text-muted-foreground">
                 Receive weekly performance summaries
               </p>
             </div>
             <Switch />
           </div>
         </CardContent>
       </Card>
 
       {/* Security Settings */}
       <Card>
         <CardHeader>
           <CardTitle className="flex items-center gap-2">
             <Shield className="w-5 h-5" />
             Security
           </CardTitle>
           <CardDescription>Manage your security preferences</CardDescription>
         </CardHeader>
         <CardContent className="space-y-4">
           <div className="space-y-2">
             <Label htmlFor="currentPassword">Current Password</Label>
             <Input id="currentPassword" type="password" />
           </div>
           <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
               <Label htmlFor="newPassword">New Password</Label>
               <Input id="newPassword" type="password" />
             </div>
             <div className="space-y-2">
               <Label htmlFor="confirmPassword">Confirm Password</Label>
               <Input id="confirmPassword" type="password" />
             </div>
           </div>
           <Button>Update Password</Button>
         </CardContent>
       </Card>
 
       {/* Platform Settings */}
       <Card>
         <CardHeader>
           <CardTitle className="flex items-center gap-2">
             <Palette className="w-5 h-5" />
             Platform Settings
           </CardTitle>
           <CardDescription>Configure platform-wide settings</CardDescription>
         </CardHeader>
         <CardContent className="space-y-4">
           <div className="flex items-center justify-between">
             <div>
               <p className="font-medium">Default Test Duration</p>
               <p className="text-sm text-muted-foreground">
                 Default duration for new tests (minutes)
               </p>
             </div>
             <Input type="number" defaultValue="60" className="w-24" />
           </div>
           <Separator />
           <div className="flex items-center justify-between">
             <div>
               <p className="font-medium">Auto-save Answers</p>
               <p className="text-sm text-muted-foreground">
                 Automatically save student answers during tests
               </p>
             </div>
             <Switch defaultChecked />
           </div>
           <Separator />
           <div className="flex items-center justify-between">
             <div>
               <p className="font-medium">Show Correct Answers</p>
               <p className="text-sm text-muted-foreground">
                 Allow students to see correct answers after test
               </p>
             </div>
             <Switch />
           </div>
         </CardContent>
       </Card>
     </div>
   );
 }