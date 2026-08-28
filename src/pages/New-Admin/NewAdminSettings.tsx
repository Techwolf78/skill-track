import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { userService, UserResponse } from "@/lib/user-service";
import { authService } from "@/lib/auth-service";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Lock,
  Loader2,
  Info,
  ChevronLeft,
} from "lucide-react";

export default function NewAdminSettings() {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") === "password" ? "password" : "account";
  const [activeTab, setActiveTab] = useState<"account" | "password">(initialTab);

  const [profile, setProfile] = useState<UserResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [savingProfile, setSavingProfile] = useState<boolean>(false);
  const [updatingPassword, setUpdatingPassword] = useState<boolean>(false);

  // Profile fields state
  const [name, setName] = useState<string>("");
  const [phoneNumber, setPhoneNumber] = useState<string>("");

  // Password fields state
  const [oldPassword, setOldPassword] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "password" || tabParam === "account") {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const handleTabChange = (tab: "account" | "password") => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

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
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#1E40AF]" />
          <p className="text-xs text-slate-500 font-medium">Loading account settings...</p>
        </div>
      </div>
    );
  }

  const userOrg = profile?.organisation?.name || authUser?.organisationData?.name || "Gryphon Academy";
  const userEmail = profile?.email || authUser?.email || "admin@gryphonacademy.co.in";

  return (
    <div className="w-full max-w-5xl mx-auto py-4 px-2 md:px-6 space-y-4">
      {/* Top Bar: Back to Home Button & Page Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">
            Account settings
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Customize how Gryphon360 works for you.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate("/admin/home")}
          className="border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-slate-900 text-xs font-semibold px-3.5 py-2 h-auto rounded-sm gap-1.5 shrink-0 shadow-none"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Home
        </Button>
      </div>

      {/* Main Box Container */}
      <div className="bg-white border border-slate-200 rounded-sm shadow-sm overflow-hidden">
        {/* Tab Navigation Header */}
        <div className="border-b border-slate-200 px-6 pt-3 flex items-center gap-8 bg-white">
          <button
            type="button"
            onClick={() => handleTabChange("account")}
            className={`pb-3 text-xs font-bold uppercase tracking-wider transition-all relative ${
              activeTab === "account"
                ? "text-emerald-600 border-b-2 border-emerald-500 font-semibold"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Account
          </button>
          <button
            type="button"
            onClick={() => handleTabChange("password")}
            className={`pb-3 text-xs font-bold uppercase tracking-wider transition-all relative ${
              activeTab === "password"
                ? "text-emerald-600 border-b-2 border-emerald-500 font-semibold"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Change Password
          </button>
        </div>

        {/* Tab 1: Account Information */}
        {activeTab === "account" && (
          <div className="p-6 md:p-10">
            {/* Info Notice Box */}
            <div className="bg-[#f8f9fa] border border-slate-200 rounded-sm p-3.5 mb-6 flex items-start gap-2.5 text-xs text-slate-600">
              <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <span>
                To delete or modify your account organization access, please contact your administrator.
              </span>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                {/* Full Name */}
                <div className="space-y-1.5">
                  <Label htmlFor="fullName" className="text-xs text-slate-500 font-medium">
                    Full name
                  </Label>
                  <Input
                    id="fullName"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter full name"
                    required
                    className="border-0 border-b border-slate-300 rounded-none px-0 py-1.5 focus-visible:ring-0 focus-visible:border-blue-600 shadow-none text-sm text-slate-800 bg-transparent"
                  />
                </div>

                {/* Phone Number */}
                <div className="space-y-1.5">
                  <Label htmlFor="phoneNumber" className="text-xs text-slate-500 font-medium">
                    Phone number
                  </Label>
                  <Input
                    id="phoneNumber"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+91 9876543210"
                    className="border-0 border-b border-slate-300 rounded-none px-0 py-1.5 focus-visible:ring-0 focus-visible:border-blue-600 shadow-none text-sm text-slate-800 bg-transparent font-mono"
                  />
                </div>

                {/* Email Address (Locked) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="email" className="text-xs text-slate-500 font-medium">
                      Email address
                    </Label>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Lock className="w-3 h-3 text-slate-400" /> Locked
                    </span>
                  </div>
                  <Input
                    id="email"
                    value={userEmail}
                    disabled
                    className="border-0 border-b border-dashed border-slate-300 rounded-none px-0 py-1.5 focus-visible:ring-0 shadow-none text-sm text-slate-400 bg-transparent cursor-not-allowed font-mono"
                  />
                </div>

                {/* Organization (Locked) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="organization" className="text-xs text-slate-500 font-medium">
                      Organization
                    </Label>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Lock className="w-3 h-3 text-slate-400" /> Locked
                    </span>
                  </div>
                  <Input
                    id="organization"
                    value={userOrg}
                    disabled
                    className="border-0 border-b border-dashed border-slate-300 rounded-none px-0 py-1.5 focus-visible:ring-0 shadow-none text-sm text-slate-400 bg-transparent cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="pt-6 border-t border-slate-100 flex items-center justify-end">
                <Button
                  type="submit"
                  disabled={savingProfile}
                  className="bg-[#2e52b2] hover:bg-[#234294] text-white text-xs font-bold uppercase tracking-wider px-6 py-2.5 rounded-sm shadow-none"
                >
                  {savingProfile ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                      Saving...
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
          <div className="p-6 md:p-10">
            {/* Info Notice Box */}
            <div className="bg-[#f8f9fa] border border-slate-200 rounded-sm p-3.5 mb-6 flex items-start gap-2.5 text-xs text-slate-600">
              <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <span>
                To delete or modify your account organization access, please contact your administrator.
              </span>
            </div>

            <form onSubmit={handleUpdatePassword} className="space-y-6 max-w-2xl">
              {/* Current Password */}
              <div className="space-y-1.5">
                <Label htmlFor="oldPassword" className="text-xs text-slate-500 font-medium">
                  Current password
                </Label>
                <Input
                  id="oldPassword"
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="Enter current password"
                  required
                  className="border-0 border-b border-slate-300 rounded-none px-0 py-1.5 focus-visible:ring-0 focus-visible:border-blue-600 shadow-none text-sm text-slate-800 bg-transparent"
                />
              </div>

              {/* New Password */}
              <div className="space-y-1.5">
                <Label htmlFor="newPassword" className="text-xs text-slate-500 font-medium">
                  New password
                </Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min. 8 characters)"
                  required
                  className="border-0 border-b border-slate-300 rounded-none px-0 py-1.5 focus-visible:ring-0 focus-visible:border-blue-600 shadow-none text-sm text-slate-800 bg-transparent"
                />
                <p className="text-[11px] text-slate-400">Must be at least 8 characters</p>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword" className="text-xs text-slate-500 font-medium">
                  Confirm password
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                  className="border-0 border-b border-slate-300 rounded-none px-0 py-1.5 focus-visible:ring-0 focus-visible:border-blue-600 shadow-none text-sm text-slate-800 bg-transparent"
                />
              </div>

              {/* Bottom Actions */}
              <div className="pt-6 border-t border-slate-100 flex items-center justify-end">
                <Button
                  type="submit"
                  disabled={updatingPassword}
                  className="bg-[#2e52b2] hover:bg-[#234294] text-white text-xs font-bold uppercase tracking-wider px-6 py-2.5 rounded-sm shadow-none"
                >
                  {updatingPassword ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Change Password"
                  )}
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
