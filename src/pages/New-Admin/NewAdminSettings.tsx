import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { userService, UserResponse } from "@/lib/user-service";
import { authService } from "@/lib/auth-service";
import {
  organisationPinService,
  type PinTransactionResponse,
  type PinTransactionType,
} from "@/lib/organisation-pin-service";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Lock,
  Loader2,
  Info,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Coins,
  Calendar,
  History,
  Sparkles,
  User,
  HelpCircle,
} from "lucide-react";
import { formatDateTime } from "@/lib/date-utils";

function PinTransactionBadge({ type }: { type: PinTransactionType }) {
  switch (type) {
    case "ALLOCATION":
      return (
        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-semibold hover:bg-emerald-50 shadow-none">
          CREDIT
        </Badge>
      );
    case "DEDUCTION":
      return (
        <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-semibold hover:bg-rose-50 shadow-none">
          DEBIT
        </Badge>
      );
    case "DEDUCTION_WAIVED":
      return (
        <Badge className="bg-slate-100 text-slate-700 border-slate-200 text-[10px] font-semibold hover:bg-slate-100 shadow-none">
          WAIVED
        </Badge>
      );
    case "REFUND":
      return (
        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-semibold hover:bg-emerald-50 shadow-none">
          REFUND
        </Badge>
      );
    case "ADJUSTMENT":
      return (
        <Badge className="bg-slate-100 text-slate-700 border-slate-200 text-[10px] font-semibold hover:bg-slate-100 shadow-none">
          ADJUSTMENT
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="text-[10px] border-slate-200 text-slate-700">
          {type}
        </Badge>
      );
  }
}

export default function NewAdminSettings() {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab =
    searchParams.get("tab") === "password"
      ? "password"
      : searchParams.get("tab") === "billing"
      ? "billing"
      : "account";
  const [activeTab, setActiveTab] = useState<"account" | "password" | "billing">(initialTab);

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

  // Org PIN Audit Ledger Pagination
  const [txPage, setTxPage] = useState<number>(0);
  const [txPageSize, setTxPageSize] = useState<number>(10);

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "password" || tabParam === "account" || tabParam === "billing") {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const handleTabChange = (tab: "account" | "password" | "billing") => {
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

  const orgId = profile?.organisation?.id || authUser?.organisationData?.id;

  // PIN Summary Query
  const {
    data: pinSummary,
    isLoading: isSummaryLoading,
  } = useQuery({
    queryKey: ["org-admin-pins-summary", orgId],
    queryFn: () => organisationPinService.getPinSummary(orgId!),
    enabled: !!orgId && activeTab === "billing",
  });

  // PIN FY Summary Query
  const {
    data: fySummaryList = [],
    isLoading: isFyLoading,
  } = useQuery({
    queryKey: ["org-admin-pins-fy-summary", orgId],
    queryFn: () => organisationPinService.getPinSummaryByFinancialYear(orgId!),
    enabled: !!orgId && activeTab === "billing",
  });

  // PIN Transactions Ledger Query
  const {
    data: txData,
    isLoading: isTxLoading,
  } = useQuery({
    queryKey: ["org-admin-pins-tx", orgId, txPage, txPageSize],
    queryFn: () => organisationPinService.getPinTransactions(orgId!, txPage, txPageSize),
    enabled: !!orgId && activeTab === "billing",
  });

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
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <p className="text-xs text-slate-500 font-medium">Loading account settings...</p>
        </div>
      </div>
    );
  }

  const userOrg = profile?.organisation?.name || authUser?.organisationData?.name || "Gryphon Academy";
  const userEmail = profile?.email || authUser?.email || "admin@gryphon360.com";

  return (
    <div className="w-full max-w-5xl mx-auto py-4 px-2 md:px-6 space-y-4">
      {/* Top Bar: Back to Home Button & Page Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">
            Account & Quota Settings
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Manage your profile, login security, and live assessment PIN quotas.
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
                ? "text-indigo-600 border-b-2 border-indigo-600 font-bold"
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
                ? "text-indigo-600 border-b-2 border-indigo-600 font-bold"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Change Password
          </button>
          <button
            type="button"
            onClick={() => handleTabChange("billing")}
            className={`pb-3 text-xs font-bold uppercase tracking-wider transition-all relative flex items-center gap-1.5 ${
              activeTab === "billing"
                ? "text-indigo-600 border-b-2 border-indigo-600 font-bold"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Coins className="w-3.5 h-3.5 text-indigo-600" />
            Billing & PIN Quota
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
                    className="border-0 border-b border-slate-300 rounded-none px-0 py-1.5 focus-visible:ring-0 focus-visible:border-indigo-600 shadow-none text-sm text-slate-800 bg-transparent"
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
                    className="border-0 border-b border-slate-300 rounded-none px-0 py-1.5 focus-visible:ring-0 focus-visible:border-indigo-600 shadow-none text-sm text-slate-800 bg-transparent font-mono"
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
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase tracking-wider px-6 py-2.5 rounded-sm shadow-none cursor-pointer"
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
                  className="border-0 border-b border-slate-300 rounded-none px-0 py-1.5 focus-visible:ring-0 focus-visible:border-indigo-600 shadow-none text-sm text-slate-800 bg-transparent"
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
                  className="border-0 border-b border-slate-300 rounded-none px-0 py-1.5 focus-visible:ring-0 focus-visible:border-indigo-600 shadow-none text-sm text-slate-800 bg-transparent"
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
                  className="border-0 border-b border-slate-300 rounded-none px-0 py-1.5 focus-visible:ring-0 focus-visible:border-indigo-600 shadow-none text-sm text-slate-800 bg-transparent"
                />
              </div>

              {/* Bottom Actions */}
              <div className="pt-6 border-t border-slate-100 flex items-center justify-end">
                <Button
                  type="submit"
                  disabled={updatingPassword}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase tracking-wider px-6 py-2.5 rounded-sm shadow-none cursor-pointer"
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

        {/* Tab 3: Billing & Assessment PINs (Org Admin Visibility) */}
        {activeTab === "billing" && (
          <div className="p-6 md:p-8 space-y-6">
            {/* Minimalist Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs">
                <span className="text-[10.5px] uppercase font-bold tracking-wider text-slate-500 block">
                  Active Balance
                </span>
                <span className="font-mono font-bold text-2xl text-slate-900 block mt-1">
                  {isSummaryLoading ? "..." : (pinSummary?.pinBalance ?? 0).toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5 block font-medium">Ready for tests</span>
              </div>

              <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs">
                <span className="text-[10.5px] uppercase font-bold tracking-wider text-slate-500 block">
                  Total Credited
                </span>
                <span className="font-mono font-bold text-2xl text-emerald-600 block mt-1">
                  +{isSummaryLoading ? "..." : (pinSummary?.totalAllocatedPins ?? 0).toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5 block font-medium">Lifetime credits</span>
              </div>

              <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs">
                <span className="text-[10.5px] uppercase font-bold tracking-wider text-slate-500 block">
                  Total Debited
                </span>
                <span className="font-mono font-bold text-2xl text-rose-600 block mt-1">
                  -{isSummaryLoading ? "..." : (pinSummary?.totalUsedPins ?? 0).toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5 block font-medium">Submissions graded</span>
              </div>

              <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs">
                <span className="text-[10.5px] uppercase font-bold tracking-wider text-slate-500 block">
                  Last Top-Up
                </span>
                <span
                  className="font-sans font-medium text-xs text-slate-900 block mt-2 truncate"
                  title={pinSummary?.lastAllocatedAt ? formatDateTime(pinSummary.lastAllocatedAt) : "Never"}
                >
                  {isSummaryLoading ? "..." : pinSummary?.lastAllocatedAt ? formatDateTime(pinSummary.lastAllocatedAt, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "Never"}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5 block font-medium">Latest allocation</span>
              </div>
            </div>

            {/* Financial Year Usage Statements */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Financial Year Breakdown (FY)</span>
                </h4>
              </div>

              {isFyLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                </div>
              ) : fySummaryList.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg">
                  No financial year breakdown available.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50 text-[10.5px] text-slate-600 font-bold hover:bg-slate-50">
                        <TableHead className="h-8 py-1.5 px-3">Financial Year</TableHead>
                        <TableHead className="h-8 py-1.5 px-2 text-right">Credited</TableHead>
                        <TableHead className="h-8 py-1.5 px-2 text-right">Debited</TableHead>
                        <TableHead className="h-8 py-1.5 px-2 text-right">Refunded</TableHead>
                        <TableHead className="h-8 py-1.5 px-2 text-right">Adjusted</TableHead>
                        <TableHead className="h-8 py-1.5 px-3 text-right">Net Change</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="text-[11px]">
                      {fySummaryList.map((fy) => (
                        <TableRow key={fy.financialYear} className=" border-b border-slate-100">
                          <TableCell className="py-2.5 px-3 font-semibold text-slate-900">
                            <span>{fy.financialYear}</span>
                            <span className="block text-[10px] text-slate-400 font-mono font-normal">
                              {fy.startDate} to {fy.endDate}
                            </span>
                          </TableCell>
                          <TableCell className="py-2.5 px-2 text-right font-mono text-emerald-600 font-semibold">
                            +{fy.allocatedPins.toLocaleString()}
                          </TableCell>
                          <TableCell className="py-2.5 px-2 text-right font-mono text-rose-600 font-medium">
                            {fy.usedPins > 0 ? `-${fy.usedPins.toLocaleString()}` : "0"}
                          </TableCell>
                          <TableCell className="py-2.5 px-2 text-right font-mono text-emerald-600 font-medium">
                            {fy.refundedPins > 0 ? `+${fy.refundedPins.toLocaleString()}` : "0"}
                          </TableCell>
                          <TableCell className="py-2.5 px-2 text-right font-mono text-slate-600">
                            {fy.adjustedPins !== 0 ? (fy.adjustedPins > 0 ? `+${fy.adjustedPins.toLocaleString()}` : fy.adjustedPins.toLocaleString()) : "0"}
                          </TableCell>
                          <TableCell className="py-2.5 px-3 text-right font-mono font-bold">
                            <Badge
                              className={
                                fy.netChange > 0
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-mono shadow-none"
                                  : fy.netChange < 0
                                  ? "bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-mono shadow-none"
                                  : "bg-slate-100 text-slate-700 border-slate-200 text-[10px] font-mono shadow-none"
                              }
                            >
                              {fy.netChange > 0 ? `+${fy.netChange.toLocaleString()}` : fy.netChange.toLocaleString()}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            {/* Itemized Audit Ledger */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Itemized PIN Transaction History</span>
                </h4>
              </div>

              {isTxLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                </div>
              ) : !txData || txData.content.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg">
                  No transaction history recorded yet.
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50 text-[10.5px] text-slate-600 font-bold hover:bg-slate-50">
                          <TableHead className="h-8 py-1.5 px-3">Date / Time</TableHead>
                          <TableHead className="h-8 py-1.5 px-2">Type</TableHead>
                          <TableHead className="h-8 py-1.5 px-2 text-center">Change</TableHead>
                          <TableHead className="h-8 py-1.5 px-2 text-right">Balance After</TableHead>
                          <TableHead className="h-8 py-1.5 px-3">Details / Reference</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="text-[11px]">
                        {txData.content.map((tx: PinTransactionResponse) => {
                          const isPositive = tx.amount > 0;
                          const isNegative = tx.amount < 0;

                          return (
                            <TableRow key={tx.id} className="hover:bg-transparent border-b border-slate-100">
                              <TableCell className="py-2.5 px-3 text-slate-500 font-mono text-[10px] whitespace-nowrap">
                                {formatDateTime(tx.createdAt, {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </TableCell>
                              <TableCell className="py-2.5 px-2">
                                <PinTransactionBadge type={tx.transactionType} />
                              </TableCell>
                              <TableCell className="py-2.5 px-2 text-center font-mono font-bold">
                                {isPositive && (
                                  <span className="text-emerald-600">+{tx.amount.toLocaleString()}</span>
                                )}
                                {isNegative && (
                                  <span className="text-rose-600">{tx.amount.toLocaleString()}</span>
                                )}
                                {!isPositive && !isNegative && (
                                  <span className="text-slate-400">0</span>
                                )}
                              </TableCell>
                              <TableCell className="py-2.5 px-2 text-right font-mono font-bold text-slate-900">
                                {tx.balanceAfter.toLocaleString()}
                              </TableCell>
                              <TableCell className="py-2.5 px-3 text-slate-700 max-w-[220px]">
                                {tx.notes && <p className="truncate font-medium">{tx.notes}</p>}
                                {tx.candidateName && (
                                  <p className="text-[10px] text-slate-500 truncate flex items-center gap-1">
                                    <User className="w-2.5 h-2.5" />
                                    {tx.candidateName}
                                    {tx.candidateEmail && <span className="text-slate-400">({tx.candidateEmail})</span>}
                                  </p>
                                )}
                                {!tx.notes && !tx.candidateName && (
                                  <span className="text-slate-400">—</span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Standardised Pagination Bar */}
                  {(() => {
                    const totalRecords = txData.totalElements ?? 0;
                    const totalPages = Math.max(1, txData.totalPages ?? 1);
                    const currentPageDisplay = (txData.number ?? txPage) + 1;
                    const startRecord = totalRecords === 0 ? 0 : txPage * txPageSize + 1;
                    const endRecord = Math.min(totalRecords, (txPage + 1) * txPageSize);

                    return (
                      <div className="bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-2.5 rounded-lg flex flex-wrap items-center justify-end gap-4 text-xs text-slate-600">
                        {/* Page selector */}
                        <div className="flex items-center gap-1.5">
                          <span className="px-1.5 py-0.5 bg-slate-100 text-[10px] font-semibold text-slate-500 tracking-wider">
                            PAGE:
                          </span>
                          <div className="relative flex items-center">
                            <select
                              value={currentPageDisplay}
                              onChange={(e) => setTxPage(Number(e.target.value) - 1)}
                              className="appearance-none bg-transparent pr-4 pl-1 py-0.5 text-xs font-medium text-slate-700 focus:outline-none cursor-pointer"
                            >
                              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                                <option key={p} value={p}>
                                  {p}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500" />
                          </div>
                        </div>

                        {/* Rows per page selector */}
                        <div className="flex items-center gap-1.5">
                          <span className="px-1.5 py-0.5 bg-slate-100 text-[10px] font-semibold text-slate-500 tracking-wider">
                            ROWS PER PAGE:
                          </span>
                          <div className="relative flex items-center">
                            <select
                              value={txPageSize}
                              onChange={(e) => {
                                setTxPageSize(Number(e.target.value));
                                setTxPage(0);
                              }}
                              className="appearance-none bg-transparent pr-4 pl-1 py-0.5 text-xs font-medium text-slate-700 focus:outline-none cursor-pointer"
                            >
                              <option value={10}>10</option>
                              <option value={20}>20</option>
                              <option value={50}>50</option>
                              <option value={100}>100</option>
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500" />
                          </div>
                        </div>

                        {/* Record range badge */}
                        <span className="px-2 py-0.5 bg-slate-100 text-[11px] font-medium text-slate-600">
                          {startRecord} - {endRecord} OF {totalRecords}
                        </span>

                        {/* Navigation Arrows */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setTxPage((p) => Math.max(0, p - 1))}
                            disabled={txData.first || txPage === 0}
                            className="p-1 hover:bg-slate-100 text-slate-500 hover:text-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer disabled:cursor-not-allowed"
                            title="Previous page"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setTxPage((p) => Math.min(totalPages - 1, p + 1))}
                            disabled={txData.last || txPage >= totalPages - 1}
                            className="p-1 hover:bg-slate-100 text-slate-500 hover:text-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer disabled:cursor-not-allowed"
                            title="Next page"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Need More Quota Info Box */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3.5 flex items-start gap-3 text-xs text-slate-600">
              <HelpCircle className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-900">Need additional assessment PIN quota?</p>
                <p className="mt-0.5 text-slate-500 leading-relaxed">
                  To top up your organization's PIN balance or adjust capacity for large-scale assessment drives, contact your Gryphon360 SuperAdministrator.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
