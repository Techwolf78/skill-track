import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { userService, UserResponse } from "@/lib/user-service";
import { authService } from "@/lib/auth-service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  User,
  Mail,
  Phone,
  Building2,
  Key,
  Loader2,
  Lock,
  Save,
  ShieldAlert,
} from "lucide-react";

export default function AdminProfile() {
  const { user: authUser } = useAuth();
  const [profile, setProfile] = useState<UserResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [savingProfile, setSavingProfile] = useState<boolean>(false);
  const [updatingPassword, setUpdatingPassword] = useState<boolean>(false);

  // Profile form state
  const [name, setName] = useState<string>("");
  const [phoneNumber, setPhoneNumber] = useState<string>("");

  // Password form state
  const [oldPassword, setOldPassword] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");

  useEffect(() => {
    async function loadUserProfile() {
      if (!authUser?.id) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const data = await userService.getUserById(authUser.id);
        setProfile(data);
        setName(data.name || "");
        setPhoneNumber(data.phoneNumber || "");
      } catch (err: any) {
        console.error("Failed to load user profile:", err);
        setName(authUser.name || "");
        setPhoneNumber(authUser.phoneNumber || "");
        toast.error("Could not fetch latest profile data from server");
      } finally {
        setLoading(false);
      }
    }

    loadUserProfile();
  }, [authUser?.id]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUser?.id) return;

    if (!name.trim()) {
      toast.error("Full Name cannot be empty.");
      return;
    }

    try {
      setSavingProfile(true);
      const updatedUser = await userService.patchUser(authUser.id, {
        name: name.trim(),
        phoneNumber: phoneNumber.trim() || undefined,
      });

      setProfile(updatedUser);
      toast.success("Profile updated successfully!");

      const localUserStr = localStorage.getItem("user");
      if (localUserStr) {
        try {
          const parsed = JSON.parse(localUserStr);
          parsed.name = updatedUser.name || name;
          parsed.phoneNumber = updatedUser.phoneNumber || phoneNumber;
          localStorage.setItem("user", JSON.stringify(parsed));
        } catch {}
      }
    } catch (err: any) {
      console.error("Failed to update profile:", err);
      toast.error(
        err?.response?.data?.message || err.message || "Failed to update profile details."
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!oldPassword) {
      toast.error("Please enter your current password.");
      return;
    }

    if (!newPassword || newPassword.length < 8) {
      toast.error("New password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }

    try {
      setUpdatingPassword(true);
      await authService.resetPassword({
        oldPassword,
        newPassword,
      });

      toast.success("Password changed successfully!");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      console.error("Failed to change password:", err);
      toast.error(
        err?.response?.data?.message || err.message || "Failed to update password."
      );
    } finally {
      setUpdatingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          <p className="text-sm font-mono text-muted-foreground">Loading profile data...</p>
        </div>
      </div>
    );
  }

  const userOrg = profile?.organisation?.name || authUser?.organisationData?.name || "N/A";
  const userEmail = profile?.email || authUser?.email || "N/A";
  const userPhone = profile?.phoneNumber || authUser?.phoneNumber || phoneNumber || "Not provided";

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-5xl mx-auto animate-fade-in">
      {/* Top Info Bar - Clean Card with Orange Accents */}
      <div className="bg-card border border-border/60 rounded-xl p-6 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-foreground tracking-tight">
            {name || "Admin User"}
          </h1>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-600 dark:text-orange-400 font-medium text-xs">
            <Building2 className="w-4 h-4 text-orange-500" />
            <span>{userOrg}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-6 pt-1 text-sm text-muted-foreground font-mono">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-orange-500" />
            <span>{userEmail}</span>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-orange-500" />
            <span>{userPhone}</span>
          </div>
        </div>
      </div>

      {/* Forms Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Profile Information Card */}
        <div className="lg:col-span-2">
          <Card className="border border-border/60 shadow-sm bg-card h-full">
            <CardHeader className="border-b border-border/40 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-orange-500/10 text-orange-500">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-lg font-heading font-semibold">User Profile Information</CardTitle>
                  <CardDescription className="text-xs">
                    Update your account details. Saved changes sync immediately with the system.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleUpdateProfile} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Full Name */}
                  <div className="space-y-2">
                    <Label htmlFor="fullName" className="text-xs font-medium text-foreground flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-muted-foreground" /> Full Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="fullName"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter full name"
                      className="bg-background/50 focus:bg-background transition-colors"
                      required
                    />
                  </div>

                  {/* Phone Number */}
                  <div className="space-y-2">
                    <Label htmlFor="phoneNumber" className="text-xs font-medium text-foreground flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-muted-foreground" /> Phone Number
                    </Label>
                    <Input
                      id="phoneNumber"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className="bg-background/50 focus:bg-background transition-colors font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Email - Disabled */}
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5" /> Email Address <Lock className="w-3 h-3 text-muted-foreground/60 ml-auto" />
                    </Label>
                    <Input
                      id="email"
                      value={userEmail}
                      disabled
                      className="bg-muted/50 text-muted-foreground cursor-not-allowed font-mono text-xs"
                    />
                  </div>

                  {/* Organisation - Disabled */}
                  <div className="space-y-2">
                    <Label htmlFor="organisation" className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5" /> Organization <Lock className="w-3 h-3 text-muted-foreground/60 ml-auto" />
                    </Label>
                    <Input
                      id="organisation"
                      value={userOrg}
                      disabled
                      className="bg-muted/50 text-muted-foreground cursor-not-allowed text-xs"
                    />
                  </div>
                </div>

                <Separator className="my-4" />

                <div className="flex items-center justify-end gap-3 pt-2">
                  <Button
                    type="submit"
                    disabled={savingProfile}
                    className="min-w-[140px] gap-2 bg-orange-600 hover:bg-orange-700 text-white shadow-sm"
                  >
                    {savingProfile ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" /> Save Profile
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Change Password Card */}
        <div>
          <Card className="border border-border/60 shadow-sm bg-card h-full">
            <CardHeader className="border-b border-border/40 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-orange-500/10 text-orange-500">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-lg font-heading font-semibold">Change Password</CardTitle>
                  <CardDescription className="text-xs">
                    Update your security password for this account.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="oldPassword" className="text-xs font-medium">
                    Current Password <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="oldPassword"
                    type="password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="text-xs font-medium">
                    New Password <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                  <p className="text-[11px] text-muted-foreground">At least 8 characters</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-xs font-medium">
                    Confirm New Password <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="outline"
                    disabled={updatingPassword}
                    className="w-full gap-2 border-orange-500/30 text-orange-600 dark:text-orange-400 hover:bg-orange-500/10"
                  >
                    {updatingPassword ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Updating...
                      </>
                    ) : (
                      <>
                        <ShieldAlert className="w-4 h-4 text-orange-500" /> Update Password
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
