import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Shield, Lock, Bell, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

export default function Settings() {
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [passwordForm, setPasswordForm] = useState({
    current: "",
    newPass: "",
    confirm: ""
  });

  const [tfaEnabled, setTfaEnabled] = useState(false);

  const [notifications, setNotifications] = useState({
    invitations: true,
    reminders: true,
    results: true,
    system: false
  });

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPass !== passwordForm.confirm) {
      toast.error("Passwords do not match!", {
        description: "New Password and Confirm Password fields must be identical."
      });
      return;
    }

    toast.success("Password updated successfully!", {
      description: "Use your new password for your next login session."
    });
    setPasswordForm({ current: "", newPass: "", confirm: "" });
  };

  const handleTfaToggle = (checked: boolean) => {
    setTfaEnabled(checked);
    if (checked) {
      toast.success("Two-Factor Authentication Setup Opened", {
        description: "Scanning QR code will be prompted on next login."
      });
    } else {
      toast.info("Two-Factor Authentication Disabled.");
    }
  };

  const handlePrefsSave = () => {
    toast.success("Notification preferences saved successfully!");
  };

  return (
    <div className="space-y-8 animate-slide-up w-full">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold font-heading text-foreground">Settings</h2>
        <p className="text-sm text-muted-foreground">Manage password credentials, multi-factor authenticator setup, and email notification alerts.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Navigation/Sidebar */}
        <div className="space-y-2">
          <div className="flex items-center gap-3 p-3 bg-primary/10 text-primary rounded-xl font-bold text-sm">
            <Lock className="w-5 h-5" /> Security & Account
          </div>
          <div className="flex items-center gap-3 p-3 text-muted-foreground rounded-xl hover:bg-muted font-semibold text-sm cursor-pointer">
            <Bell className="w-5 h-5" /> Communications
          </div>
        </div>

        {/* Content (Right 2 columns) */}
        <div className="md:col-span-2 space-y-6">
          {/* Password Reset */}
          <Card className="border border-border/60">
            <CardHeader>
              <CardTitle className="text-lg font-bold font-heading flex items-center gap-2">
                Change Password
              </CardTitle>
              <CardDescription>Keep your account secure by rotating your password regularly.</CardDescription>
            </CardHeader>
            <form onSubmit={handlePasswordChange}>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="current">Current Password</Label>
                  <div className="relative">
                    <Input 
                      id="current" 
                      type={showCurrent ? "text" : "password"} 
                      value={passwordForm.current}
                      onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })}
                      required
                    />
                    <button 
                      type="button" 
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowCurrent(!showCurrent)}
                    >
                      {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="newPass">New Password</Label>
                  <div className="relative">
                    <Input 
                      id="newPass" 
                      type={showNew ? "text" : "password"} 
                      value={passwordForm.newPass}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPass: e.target.value })}
                      required
                    />
                    <button 
                      type="button" 
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowNew(!showNew)}
                    >
                      {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirm">Confirm New Password</Label>
                  <div className="relative">
                    <Input 
                      id="confirm" 
                      type={showConfirm ? "text" : "password"} 
                      value={passwordForm.confirm}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                      className="pr-10"
                      required
                    />
                    <button 
                      type="button" 
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowConfirm(!showConfirm)}
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t border-border/40 p-6 flex justify-end">
                <Button type="submit" className="bg-gradient-primary text-white shadow-primary">
                  Update Password
                </Button>
              </CardFooter>
            </form>
          </Card>

          {/* 2FA Card */}
          <Card className="border border-border/60">
            <CardHeader>
              <CardTitle className="text-lg font-bold font-heading flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" /> Two-Factor Authentication (2FA)
              </CardTitle>
              <CardDescription>Secure your profile using Google Authenticator or Microsoft Authenticator app.</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-6">
              <div className="space-y-1">
                <p className="text-sm font-bold text-foreground">MFA Authenticator Apps</p>
                <p className="text-xs text-muted-foreground leading-normal max-w-sm">Requires verification code token upon any dashboard login attempt from new device browser instances.</p>
              </div>
              <Switch checked={tfaEnabled} onCheckedChange={handleTfaToggle} />
            </CardContent>
          </Card>

          {/* Notifications Prefs */}
          <Card className="border border-border/60">
            <CardHeader>
              <CardTitle className="text-lg font-bold font-heading">Notification Preferences</CardTitle>
              <CardDescription>Determine what notifications you'd like to get forwarded to your email address.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <Checkbox 
                  id="invites" 
                  checked={notifications.invitations} 
                  onCheckedChange={(checked) => setNotifications({ ...notifications, invitations: !!checked })}
                />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="invites" className="text-xs font-bold text-foreground">Assessment Invitations</Label>
                  <span className="text-[10px] text-muted-foreground">Receive instant email updates when a recruiter invites you to take a test.</span>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Checkbox 
                  id="reminders" 
                  checked={notifications.reminders} 
                  onCheckedChange={(checked) => setNotifications({ ...notifications, reminders: !!checked })}
                />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="reminders" className="text-xs font-bold text-foreground">Schedules & Reminders</Label>
                  <span className="text-[10px] text-muted-foreground">Remind me 24 hours and 1 hour before scheduled testing slots begin.</span>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Checkbox 
                  id="results" 
                  checked={notifications.results} 
                  onCheckedChange={(checked) => setNotifications({ ...notifications, results: !!checked })}
                />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="results" className="text-xs font-bold text-foreground">Grades & Results</Label>
                  <span className="text-[10px] text-muted-foreground">Receive PDF report score card details as soon as evaluation is completed.</span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t border-border/40 p-6 flex justify-end">
              <Button onClick={handlePrefsSave} className="bg-primary text-white">
                Save Preferences
              </Button>
            </CardFooter>
          </Card>

        </div>

      </div>
    </div>
  );
}
