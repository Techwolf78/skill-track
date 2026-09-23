import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  User,
  Shield,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Server,
  Activity,
  UserCheck,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { userService, UserResponse } from "@/lib/user-service";
import { authService } from "@/lib/auth-service";
import { toast } from "sonner";

export default function Settings() {
  const { user: authUser } = useAuth();
  const [activeTab, setActiveTab] = useState<"account" | "password" | "platform">("account");
  const [loading, setLoading] = useState<boolean>(true);
  const [profile, setProfile] = useState<UserResponse | null>(null);

  // Profile Fields
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Password Fields
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      try {
        setLoading(true);
        if (authUser?.id) {
          const data = await userService.getUserById(authUser.id);
          setProfile(data);
          setName(data.name || authUser.name || "");
          setPhoneNumber(data.phoneNumber || authUser.phoneNumber || "");
        } else {
          setName(authUser?.name || "");
          setPhoneNumber(authUser?.phoneNumber || "");
        }
      } catch (err) {
        console.error("Failed to load SuperAdmin profile:", err);
        setName(authUser?.name || "");
        setPhoneNumber(authUser?.phoneNumber || "");
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [authUser]);

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
      toast.success("SuperAdmin profile updated successfully!");

      const localUserStr = localStorage.getItem("user");
      if (localUserStr) {
        try {
          const parsed = JSON.parse(localUserStr);
          parsed.name = updatedUser.name || name.trim();
          parsed.phoneNumber = updatedUser.phoneNumber || phoneNumber.trim();
          localStorage.setItem("user", JSON.stringify(parsed));
        } catch {}
      }
    } catch (err: any) {
      console.error("Failed to update SuperAdmin profile:", err);
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

      toast.success("SuperAdmin password changed successfully!");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      console.error("Failed to change SuperAdmin password:", err);
      toast.error(
        err?.response?.data?.message || err.message || "Failed to update password."
      );
    } finally {
      setUpdatingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          <p className="text-xs text-slate-500 font-medium">Loading SuperAdmin settings...</p>
        </div>
      </div>
    );
  }

  const userEmail = profile?.email || authUser?.email || "superadmin@gryphon360.com";

  return (
    <div className="w-full max-w-5xl mx-auto py-6 px-4 md:px-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-heading font-bold text-slate-900 tracking-tight">
          SuperAdmin Settings & Profile
        </h1>
        <p className="text-xs md:text-sm text-slate-500 mt-1">
          Manage your SuperAdmin identity, credentials, and platform security.
        </p>
      </div>

      {/* Main Container Card */}
      <div className="bg-white border border-slate-200/90 rounded-xl shadow-xs overflow-hidden">
        {/* Navigation Tabs */}
        <div className="border-b border-slate-200 px-6 pt-3 flex items-center gap-8 bg-slate-50/50">
          <button
            type="button"
            onClick={() => setActiveTab("account")}
            className={`pb-3 text-xs font-bold uppercase tracking-wider transition-all relative flex items-center gap-2 cursor-pointer ${
              activeTab === "account"
                ? "text-orange-600 border-b-2 border-orange-500 font-bold"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <User className="w-4 h-4" />
            Account & Profile
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("password")}
            className={`pb-3 text-xs font-bold uppercase tracking-wider transition-all relative flex items-center gap-2 cursor-pointer ${
              activeTab === "password"
                ? "text-orange-600 border-b-2 border-orange-500 font-bold"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Shield className="w-4 h-4" />
            Change Password
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("platform")}
            className={`pb-3 text-xs font-bold uppercase tracking-wider transition-all relative flex items-center gap-2 cursor-pointer ${
              activeTab === "platform"
                ? "text-orange-600 border-b-2 border-orange-500 font-bold"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Server className="w-4 h-4" />
            Platform Info
          </button>
        </div>

        {/* Tab 1: Account Information */}
        {activeTab === "account" && (
          <div className="p-6 md:p-8 space-y-6">
            <form onSubmit={handleUpdateProfile} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Full Name */}
                <div className="space-y-1.5">
                  <Label htmlFor="superadminName" className="text-xs text-slate-700 font-semibold">
                    Full Name <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="superadminName"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter full name"
                    required
                    className="h-10 text-xs border-slate-200 focus-visible:ring-1 focus-visible:ring-orange-500"
                  />
                </div>

                {/* Phone Number */}
                <div className="space-y-1.5">
                  <Label htmlFor="superadminPhone" className="text-xs text-slate-700 font-semibold">
                    Phone Number
                  </Label>
                  <Input
                    id="superadminPhone"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+91..."
                    className="h-10 text-xs border-slate-200 font-mono focus-visible:ring-1 focus-visible:ring-orange-500"
                  />
                </div>

                {/* Email Address (Locked) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-slate-500 font-medium">Email Address</Label>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Lock className="w-3 h-3" /> System Locked
                    </span>
                  </div>
                  <Input
                    value={userEmail}
                    disabled
                    className="h-10 text-xs bg-slate-50 border-slate-200 text-slate-600 font-mono"
                  />
                </div>

                {/* Role (Locked) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-slate-500 font-medium">Assigned Role</Label>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Lock className="w-3 h-3" /> System Locked
                    </span>
                  </div>
                  <div className="h-10 px-3 flex items-center bg-slate-50 border border-slate-200 rounded-md">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold bg-orange-100 text-orange-800 font-mono">
                      <Shield className="w-3 h-3" /> SUPERADMIN
                    </span>
                    <span className="ml-2 text-xs text-slate-500">Global System Super Administrator</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
                <Button
                  type="submit"
                  disabled={savingProfile}
                  className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold uppercase tracking-wider px-6 h-10 rounded-md cursor-pointer transition-colors"
                >
                  {savingProfile ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving Profile...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 2: Change Password */}
        {activeTab === "password" && (
          <div className="p-6 md:p-8 space-y-6 max-w-2xl">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Update Credentials</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Ensure your SuperAdmin account uses a strong, unique password with at least 8 characters.
              </p>
            </div>

            <form onSubmit={handleUpdatePassword} className="space-y-4">
              {/* Current Password */}
              <div className="space-y-1.5">
                <Label htmlFor="oldPassword" className="text-xs text-slate-700 font-semibold">
                  Current Password <span className="text-rose-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="oldPassword"
                    type={showOldPassword ? "text" : "password"}
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="Enter current SuperAdmin password"
                    required
                    className="h-10 text-xs border-slate-200 pr-10 font-mono focus-visible:ring-1 focus-visible:ring-orange-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOldPassword(!showOldPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    tabIndex={-1}
                  >
                    {showOldPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div className="space-y-1.5">
                <Label htmlFor="newPassword" className="text-xs text-slate-700 font-semibold">
                  New Password <span className="text-rose-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password (min. 8 characters)"
                    required
                    className="h-10 text-xs border-slate-200 pr-10 font-mono focus-visible:ring-1 focus-visible:ring-orange-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    tabIndex={-1}
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">Must be at least 8 characters long</p>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword" className="text-xs text-slate-700 font-semibold">
                  Confirm New Password <span className="text-rose-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    required
                    className="h-10 text-xs border-slate-200 pr-10 font-mono focus-visible:ring-1 focus-visible:ring-orange-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
                <Button
                  type="submit"
                  disabled={updatingPassword}
                  className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold uppercase tracking-wider px-6 h-10 rounded-md cursor-pointer transition-colors"
                >
                  {updatingPassword ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Updating Password...
                    </>
                  ) : (
                    "Update Password"
                  )}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 3: Platform Information */}
        {activeTab === "platform" && (
          <div className="p-6 md:p-8 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-lg">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                  <Server className="w-4 h-4 text-orange-500" />
                  Environment
                </div>
                <div className="mt-2 text-sm font-semibold text-slate-900 capitalize font-mono">
                  {import.meta.env.VITE_APP_ENV || "development"}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Current frontend runtime mode</p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-lg">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                  <Activity className="w-4 h-4 text-emerald-500" />
                  API Endpoint
                </div>
                <div className="mt-2 text-xs font-semibold text-slate-900 truncate font-mono" title={import.meta.env.VITE_API_BASE_URL || window.location.origin}>
                  {import.meta.env.VITE_API_BASE_URL || window.location.origin}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Target backend gateway</p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-lg">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                  <UserCheck className="w-4 h-4 text-indigo-500" />
                  Access Scope
                </div>
                <div className="mt-2 text-sm font-semibold text-slate-900 font-mono">
                  Global (All Tenancies)
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Cross-organisation governance</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}