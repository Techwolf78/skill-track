import { useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Search,
  Building2,
  MoreVertical,
  Pencil,
  AlertTriangle,
  Calendar,
  CreditCard,
  Coins,
  ArrowUpRight,
  ArrowDownRight,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  Clock,
  User,
  FileText,
  ChevronLeft,
  ChevronRight,
  Loader2,
  History,
  SlidersHorizontal,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  organisationService,
  type OrganisationResponse,
} from "@/lib/organisation-service";
import {
  organisationPinService,
  type PinTransactionType,
  type PinTransactionResponse,
} from "@/lib/organisation-pin-service";
import { useToast } from "@/hooks/use-toast";
import { formatDateTime } from "@/lib/date-utils";

function PinTransactionBadge({ type }: { type: PinTransactionType }) {
  switch (type) {
    case "ALLOCATION":
      return (
        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-semibold hover:bg-emerald-50 shadow-none">
          ALLOCATION
        </Badge>
      );
    case "DEDUCTION":
      return (
        <Badge className="bg-slate-100 text-slate-700 border-slate-200 text-[10px] font-semibold hover:bg-slate-100 shadow-none">
          DEDUCTION
        </Badge>
      );
    case "DEDUCTION_WAIVED":
      return (
        <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-semibold hover:bg-amber-50 shadow-none">
          WAIVED
        </Badge>
      );
    case "REFUND":
      return (
        <Badge className="bg-teal-50 text-teal-700 border-teal-200 text-[10px] font-semibold hover:bg-teal-50 shadow-none">
          REFUND
        </Badge>
      );
    case "ADJUSTMENT":
      return (
        <Badge className="bg-sky-50 text-sky-700 border-sky-200 text-[10px] font-semibold hover:bg-sky-50 shadow-none">
          ADJUSTMENT
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="text-[10px]">
          {type}
        </Badge>
      );
  }
}

interface OrganisationCardProps {
  org: OrganisationResponse;
  openPinModal: (org: OrganisationResponse, tab?: string) => void;
  openAdjustRefundModal: (org: OrganisationResponse, tab?: string) => void;
  setEditingOrg: (org: OrganisationResponse) => void;
  setEditName: (name: string) => void;
  setEditLogo: (logo: string) => void;
}

function OrganisationCard({
  org,
  openPinModal,
  openAdjustRefundModal,
  setEditingOrg,
  setEditName,
  setEditLogo,
}: OrganisationCardProps) {
  const { data: pinSummary, isLoading: isPinLoading } = useQuery({
    queryKey: ["org-pins-summary", org.id],
    queryFn: () => organisationPinService.getPinSummary(org.id),
    staleTime: 30_000,
  });

  const pinCount = pinSummary?.pinBalance ?? org.pinBalance ?? 0;

  return (
    <div
      key={org.id}
      className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs hover:border-slate-300 hover:shadow-md transition-all duration-200 flex flex-col justify-between"
    >
      {/* Top Row: Circular Logo & More Actions */}
      <div className="flex items-center justify-between">
        <div className="w-12 h-12 rounded-full border border-slate-200/80 bg-slate-50 flex items-center justify-center overflow-hidden shadow-2xs shrink-0">
          {org.logoUrl ? (
            <img src={org.logoUrl} alt={org.name} className="w-full h-full object-cover" />
          ) : (
            <Building2 className="w-6 h-6 text-slate-700" />
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-400 hover:text-slate-800 rounded-full hover:bg-slate-100 shrink-0"
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="text-xs">
            <DropdownMenuItem onClick={() => openPinModal(org, "allocate")}>
              <Coins className="w-3.5 h-3.5 mr-2 text-indigo-600" />
              Allocate PINs
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openAdjustRefundModal(org, "adjust")}>
              <SlidersHorizontal className="w-3.5 h-3.5 mr-2 text-sky-500" />
              Adjust & Refund
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openPinModal(org, "fy-summary")}>
              <Calendar className="w-3.5 h-3.5 mr-2 text-indigo-500" />
              FY Summary
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setEditingOrg(org);
                setEditName(org.name);
                setEditLogo(org.logoUrl || "");
              }}
            >
              <Pencil className="w-3.5 h-3.5 mr-2 text-slate-600" />
              Edit Details
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Centre Content: Organisation Name & Subtitle */}
      <div className="my-4 space-y-1">
        <h3 className="text-base font-bold text-slate-900 tracking-tight leading-snug line-clamp-1">
          {org.name}
        </h3>
        <p className="text-xs text-slate-400 font-medium">
          Created {formatDateTime(org.createdAt, { month: "short", day: "numeric", year: "numeric", hour: undefined, minute: undefined })}
        </p>
      </div>

      {/* Bottom Row: PIN Balance & Allocate Button */}
      <div className="border-t border-slate-100 pt-3.5 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-bold text-slate-900 font-mono tracking-tight leading-none">
            {isPinLoading ? (
              <div className="flex items-center gap-1.5 text-slate-400">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span className="text-[11px] font-sans">Loading...</span>
              </div>
            ) : (
              <>
                {pinCount.toLocaleString()}
                <span className="text-slate-400 font-normal text-xs"> / {(pinSummary?.totalAllocatedPins ?? pinCount).toLocaleString()}</span>
              </>
            )}
          </div>
          <p className="text-[11px] text-slate-400 font-medium mt-1">User PINs</p>
        </div>

        <Button
          onClick={() => openPinModal(org, "allocate")}
          className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl px-4 h-8.5 shadow-2xs shrink-0 transition-all hover:shadow-xs"
        >
          Allocate
        </Button>
      </div>
    </div>
  );
}

export default function Organisations() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");

  // Add Org State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgLogo, setNewOrgLogo] = useState("");

  // Edit Org State
  const [editingOrg, setEditingOrg] = useState<OrganisationResponse | null>(null);
  const [editName, setEditName] = useState("");
  const [editLogo, setEditLogo] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  // Manage PINs Modal State
  const [pinOrg, setPinOrg] = useState<OrganisationResponse | null>(null);
  const [pinActiveTab, setPinActiveTab] = useState<string>("allocate");

  // Adjust & Refund Modal State
  const [adjustRefundOrg, setAdjustRefundOrg] = useState<OrganisationResponse | null>(null);
  const [adjustRefundActiveTab, setAdjustRefundActiveTab] = useState<string>("adjust");

  // Allocation Form State
  const [allocatePinsCount, setAllocatePinsCount] = useState<number>(0);
  const [allocateNotes, setAllocateNotes] = useState<string>("");
  const [isAllocating, setIsAllocating] = useState(false);

  // Adjustment Form State
  const [adjustType, setAdjustType] = useState<"ADD" | "DEDUCT">("ADD");
  const [adjustPinsCount, setAdjustPinsCount] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState<string>("");
  const [isAdjusting, setIsAdjusting] = useState(false);

  // Refund Form State
  const [refundReason, setRefundReason] = useState<string>("");
  const [refundSessionId, setRefundSessionId] = useState<string>("");
  const [isRefunding, setIsRefunding] = useState(false);

  // Audit Ledger Pagination State
  const [txPage, setTxPage] = useState<number>(0);

  const { data: organisations = [], isLoading } = useQuery({
    queryKey: ["organisations"],
    queryFn: () => organisationService.getOrganisations(),
  });

  // PIN Summary Query for Selected Org (Allocate / FY Modal)
  const {
    data: pinSummary,
    isLoading: isSummaryLoading,
  } = useQuery({
    queryKey: ["org-pins-summary", pinOrg?.id],
    queryFn: () => organisationPinService.getPinSummary(pinOrg!.id),
    enabled: !!pinOrg?.id,
  });

  // PIN Summary Query for Adjust & Refund Modal
  const {
    data: adjustRefundSummary,
    isLoading: isAdjustRefundSummaryLoading,
  } = useQuery({
    queryKey: ["org-pins-summary", adjustRefundOrg?.id],
    queryFn: () => organisationPinService.getPinSummary(adjustRefundOrg!.id),
    enabled: !!adjustRefundOrg?.id,
  });

  // PIN Financial Year Summary Query for Selected Org
  const {
    data: fySummaryList = [],
    isLoading: isFyLoading,
  } = useQuery({
    queryKey: ["org-pins-fy-summary", pinOrg?.id],
    queryFn: () => organisationPinService.getPinSummaryByFinancialYear(pinOrg!.id),
    enabled: !!pinOrg?.id && pinActiveTab === "fy-summary",
  });

  // PIN Ledger Transactions Query for Selected Org
  const {
    data: txData,
    isLoading: isTxLoading,
  } = useQuery({
    queryKey: ["org-pins-tx", pinOrg?.id, txPage],
    queryFn: () => organisationPinService.getPinTransactions(pinOrg!.id, txPage, 6),
    enabled: !!pinOrg?.id && pinActiveTab === "ledger",
  });

  const filteredOrgs = (organisations as OrganisationResponse[]).filter((org) =>
    org.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await organisationService.createOrganisation({
        name: newOrgName.trim(),
        logoUrl: newOrgLogo.trim() || undefined,
      });
      toast({ title: "Organisation Created", description: `${newOrgName} has been added.` });
      setIsAddOpen(false);
      setNewOrgName("");
      setNewOrgLogo("");
      queryClient.invalidateQueries({ queryKey: ["organisations"] });
    } catch (error: unknown) {
      let msg = "Failed to create organisation.";
      if (axios.isAxiosError(error)) msg = error.response?.data?.message || error.message;
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingOrg) return;
    setIsUpdating(true);
    try {
      await organisationService.updateOrganisation(editingOrg.id, {
        name: editName.trim(),
        logoUrl: editLogo.trim() || undefined,
      });
      toast({ title: "Organisation Updated", description: `${editName} has been updated.` });
      setEditingOrg(null);
      queryClient.invalidateQueries({ queryKey: ["organisations"] });
    } catch (error: unknown) {
      let msg = "Failed to update organisation.";
      if (axios.isAxiosError(error)) msg = error.response?.data?.message || error.message;
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setIsUpdating(false);
    }
  };

  const openPinModal = (org: OrganisationResponse, tab = "allocate") => {
    setPinOrg(org);
    setPinActiveTab(tab);
    setAllocatePinsCount(0);
    setAllocateNotes("");
  };

  const openAdjustRefundModal = (org: OrganisationResponse, tab = "adjust") => {
    setAdjustRefundOrg(org);
    setAdjustRefundActiveTab(tab);
    setAdjustType("ADD");
    setAdjustPinsCount(0);
    setAdjustReason("");
    setRefundReason("");
    setRefundSessionId("");
  };

  const handleAllocatePins = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinOrg) return;
    if (allocatePinsCount < 1) {
      toast({ title: "Invalid PIN amount", description: "Must allocate at least 1 PIN.", variant: "destructive" });
      return;
    }
    setIsAllocating(true);
    try {
      const summary = await organisationPinService.allocatePins(pinOrg.id, {
        pins: allocatePinsCount,
        notes: allocateNotes.trim() || undefined,
      });
      toast({
        title: "PINs Allocated Successfully",
        description: `Added ${allocatePinsCount.toLocaleString()} PINs. New balance: ${summary.pinBalance.toLocaleString()} PINs.`,
      });
      setAllocateNotes("");
      queryClient.invalidateQueries({ queryKey: ["organisations"] });
      queryClient.invalidateQueries({ queryKey: ["org-pins-summary", pinOrg.id] });
      queryClient.invalidateQueries({ queryKey: ["org-pins-fy-summary", pinOrg.id] });
      queryClient.invalidateQueries({ queryKey: ["org-pins-tx", pinOrg.id] });
    } catch (error: unknown) {
      let msg = "Failed to allocate PINs.";
      if (axios.isAxiosError(error)) msg = error.response?.data?.message || error.message;
      toast({ title: "Allocation Failed", description: msg, variant: "destructive" });
    } finally {
      setIsAllocating(false);
    }
  };

  const handleAdjustPins = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustRefundOrg) return;
    if (adjustPinsCount <= 0) {
      toast({ title: "Invalid PIN amount", description: "Adjustment amount must be greater than zero.", variant: "destructive" });
      return;
    }
    if (!adjustReason.trim()) {
      toast({ title: "Reason Required", description: "Audit reason is required for adjustments.", variant: "destructive" });
      return;
    }
    const currentBal = adjustRefundSummary?.pinBalance ?? adjustRefundOrg?.pinBalance ?? 0;
    const signedAmount = adjustType === "ADD" ? adjustPinsCount : -adjustPinsCount;
    if (currentBal + signedAmount < 0) {
      toast({
        title: "Adjustment Prohibited",
        description: `Cannot deduct ${adjustPinsCount} PINs. Organisation only has ${currentBal} PINs remaining.`,
        variant: "destructive",
      });
      return;
    }

    setIsAdjusting(true);
    try {
      const summary = await organisationPinService.adjustPins(adjustRefundOrg.id, {
        amount: signedAmount,
        reason: adjustReason.trim(),
      });
      toast({
        title: "PIN Balance Adjusted",
        description: `${adjustType === "ADD" ? `Added +${adjustPinsCount}` : `Deducted -${adjustPinsCount}`} PINs. New balance: ${summary.pinBalance.toLocaleString()} PINs.`,
      });
      setAdjustReason("");
      queryClient.invalidateQueries({ queryKey: ["organisations"] });
      queryClient.invalidateQueries({ queryKey: ["org-pins-summary", adjustRefundOrg.id] });
      queryClient.invalidateQueries({ queryKey: ["org-pins-fy-summary", adjustRefundOrg.id] });
      queryClient.invalidateQueries({ queryKey: ["org-pins-tx", adjustRefundOrg.id] });
    } catch (error: unknown) {
      let msg = "Failed to adjust PIN balance.";
      if (axios.isAxiosError(error)) msg = error.response?.data?.message || error.message;
      toast({ title: "Adjustment Failed", description: msg, variant: "destructive" });
    } finally {
      setIsAdjusting(false);
    }
  };

  const handleRefundPins = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustRefundOrg) return;
    const cleanSessionId = refundSessionId.trim();
    if (!cleanSessionId) {
      toast({ title: "Session ID Required", description: "A valid Test Session UUID is required to issue a refund.", variant: "destructive" });
      return;
    }
    if (!refundReason.trim()) {
      toast({ title: "Reason Required", description: "Refund reason is mandatory for audit trail.", variant: "destructive" });
      return;
    }
    setIsRefunding(true);
    try {
      const summary = await organisationPinService.refundPins(adjustRefundOrg.id, {
        testSessionId: cleanSessionId,
        reason: refundReason.trim(),
      });
      toast({
        title: "PIN Refunded Successfully",
        description: `Refunded 1 PIN for test session ${cleanSessionId.slice(0, 8)}... New balance: ${summary.pinBalance.toLocaleString()} PINs.`,
      });
      setRefundReason("");
      setRefundSessionId("");
      queryClient.invalidateQueries({ queryKey: ["organisations"] });
      queryClient.invalidateQueries({ queryKey: ["org-pins-summary", adjustRefundOrg.id] });
      queryClient.invalidateQueries({ queryKey: ["org-pins-fy-summary", adjustRefundOrg.id] });
      queryClient.invalidateQueries({ queryKey: ["org-pins-tx", adjustRefundOrg.id] });
    } catch (error: unknown) {
      let msg = "Failed to refund PIN.";
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 409) {
          msg = "Conflict: This test session has already been refunded.";
        } else if (error.response?.status === 400) {
          msg = error.response?.data?.message || "Invalid request: No PIN deduction was recorded for this test session.";
        } else {
          msg = error.response?.data?.message || error.message;
        }
      }
      toast({ title: "Refund Failed", description: msg, variant: "destructive" });
    } finally {
      setIsRefunding(false);
    }
  };

  return (
    <div className="p-8 space-y-6 animate-fade-in font-sans">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold text-slate-900 tracking-tight">Organisations</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage partner organisations, live PIN quotas, credit balances, and audit ledgers
          </p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button variant="default" className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold h-9 px-4">
              <Plus className="w-4 h-4 mr-2" />
              Add Organisation
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[420px]">
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>Add Organisation</DialogTitle>
                <DialogDescription>Create a new partner organisation with zero initial PIN balance.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Organisation Name</Label>
                  <Input
                    placeholder="e.g. Gryphon Academy"
                    required
                    value={newOrgName}
                    onChange={(e) => setNewOrgName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Logo URL (optional)</Label>
                  <Input
                    placeholder="https://example.com/logo.png"
                    value={newOrgLogo}
                    onChange={(e) => setNewOrgLogo(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting} className="bg-slate-900 hover:bg-slate-800 text-white">
                  {isSubmitting ? "Creating..." : "Create Organisation"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search organisations by name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 h-10 text-sm bg-white"
        />
      </div>

      {/* Organisation Cards Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-muted-foreground text-xs">Loading organisations...</span>
          </div>
        </div>
      ) : filteredOrgs.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground bg-white border border-slate-200/80 rounded-xl p-8">
          <Building2 className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium text-slate-800">No organisations found</p>
          <p className="text-sm mt-1">Create one using the button above to begin allocating assessment PINs.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredOrgs.map((org) => (
            <OrganisationCard
              key={org.id}
              org={org}
              openPinModal={openPinModal}
              openAdjustRefundModal={openAdjustRefundModal}
              setEditingOrg={setEditingOrg}
              setEditName={setEditName}
              setEditLogo={setEditLogo}
            />
          ))}
        </div>
      )}

      {/* ── MANAGE PINS & CREDIT AUDIT LEDGER MODAL ── */}
      <Dialog open={!!pinOrg} onOpenChange={(open) => !open && setPinOrg(null)}>
        <DialogContent className="sm:max-w-[640px] bg-white text-slate-900 p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b border-slate-200 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Coins className="w-5 h-5 text-indigo-600" />
                  <span>PIN & Credit Management</span>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-1">
                  Allocate quotas and inspect fiscal year statements for <strong>{pinOrg?.name}</strong>
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Live Metric Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 py-3">
           
            <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-2.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-600 block">Purchased PINs</span>
              <span className="font-mono font-bold text-base text-emerald-700 block mt-0.5">
                {isSummaryLoading ? "..." : (pinSummary?.totalAllocatedPins ?? 0).toLocaleString()}
              </span>
            </div>
            <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-2.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-rose-600 block">Consumed PINs</span>
              <span className="font-mono font-bold text-base text-rose-700 block mt-0.5">
                {isSummaryLoading ? "..." : (pinSummary?.totalUsedPins ?? 0).toLocaleString()}
              </span>
            </div>
             <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-2.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">Current Balance</span>
              <span className="font-mono font-bold text-base text-slate-900 block mt-0.5">
                {isSummaryLoading ? "..." : (pinSummary?.pinBalance ?? pinOrg?.pinBalance ?? 0).toLocaleString()}
              </span>
            </div>
            <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-2.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">Last Recharge</span>
              <span className="font-sans text-xs font-medium text-slate-700 block mt-1 truncate" title={pinSummary?.lastAllocatedAt ? formatDateTime(pinSummary.lastAllocatedAt) : "Never"}>
                {isSummaryLoading ? "..." : pinSummary?.lastAllocatedAt ? formatDateTime(pinSummary.lastAllocatedAt, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "Never"}
              </span>
            </div>
          </div>

          {/* Tabbed Actions */}
          <Tabs value={pinActiveTab} onValueChange={setPinActiveTab} className="pt-1">
            <TabsList className="grid grid-cols-2 bg-slate-100 p-1 mb-4 text-xs rounded-lg">
              <TabsTrigger value="allocate" className="text-xs font-medium gap-1 data-[state=active]:text-indigo-600">
                <Plus className="w-3.5 h-3.5 text-indigo-600" />
                <span>Allocate</span>
              </TabsTrigger>
              <TabsTrigger value="fy-summary" className="text-xs font-medium gap-1 data-[state=active]:text-indigo-600">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                <span>FY Summary</span>
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: ALLOCATE PINS */}
            <TabsContent value="allocate">
              <form onSubmit={handleAllocatePins} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5 sm:col-span-1">
                    <Label className="text-xs font-semibold text-slate-700">PIN Amount <span className="text-destructive">*</span></Label>
                    <Input
                      type="number"
                      min={1}
                      required
                      value={allocatePinsCount || ""}
                      onChange={(e) => setAllocatePinsCount(parseInt(e.target.value) || 0)}
                      className="h-9 text-xs font-mono font-bold"
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs font-semibold text-slate-700">Audit Notes </Label>
                    <Input
                      placeholder="e.g. Annual contract top-up / Renewal agreement"
                      value={allocateNotes}
                      onChange={(e) => setAllocateNotes(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>

                {/* Projected Balance Callout */}
                <div className="bg-slate-50/60 border border-slate-200/80 rounded-lg p-2.5 flex items-center justify-between text-xs">
                  <span className="text-slate-800 font-medium">Projected Balance:</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    {((pinSummary?.pinBalance ?? pinOrg?.pinBalance ?? 0) + (allocatePinsCount > 0 ? allocatePinsCount : 0)).toLocaleString()} PINs
                  </span>
                </div>

                <div className="flex justify-end items-center gap-2 pt-3 border-t border-slate-200">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setPinOrg(null)}
                    className="text-xs font-semibold h-9 px-4 border-slate-200"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isAllocating || allocatePinsCount < 1}
                    className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold h-9 px-5 gap-1.5"
                  >
                    {isAllocating ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Allocating...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        <span>Allocate {allocatePinsCount > 0 ? `${allocatePinsCount.toLocaleString()} ` : ""}PINs</span>
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </TabsContent>

            {/* TAB 2: FINANCIAL YEAR BREAKDOWN */}
            <TabsContent value="fy-summary" className="pt-1 space-y-4">
              {isFyLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                </div>
              ) : !fySummaryList || fySummaryList.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400 border border-slate-100 rounded-xl bg-slate-50/50">
                  No financial year statements recorded yet.
                </div>
              ) : (
                <div className="border border-slate-200/90 rounded-xl overflow-hidden shadow-2xs">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/80 hover:bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-semibold text-slate-500">
                        <TableHead className="h-9 py-2 px-4">Financial Year</TableHead>
                        <TableHead className="h-9 py-2 px-3 text-right">Allocated</TableHead>
                        <TableHead className="h-9 py-2 px-3 text-right">Used</TableHead>
                        <TableHead className="h-9 py-2 px-4 text-right">Net Balance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="text-xs divide-y divide-slate-100">
                      {fySummaryList.map((fy) => (
                        <TableRow key={fy.financialYear} className="hover:bg-slate-50/50">
                          <TableCell className="py-3 px-4 font-semibold text-slate-900">
                            {fy.financialYear}
                          </TableCell>
                          <TableCell className="py-3 px-3 text-right font-mono font-semibold text-emerald-600">
                            +{fy.allocatedPins.toLocaleString()}
                          </TableCell>
                          <TableCell className="py-3 px-3 text-right font-mono text-slate-500">
                            {fy.usedPins.toLocaleString()}
                          </TableCell>
                          <TableCell className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                            {fy.netChange.toLocaleString()} PINs
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              <div className="flex justify-end pt-2 border-t border-slate-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPinOrg(null)}
                  className="text-xs font-semibold h-9 px-4 border-slate-200"
                >
                  Cancel
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* ── ADJUST & REFUND PINs MODAL ── */}
      <Dialog open={!!adjustRefundOrg} onOpenChange={(open) => !open && setAdjustRefundOrg(null)}>
        <DialogContent className="sm:max-w-[640px] bg-white text-slate-900 p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b border-slate-200 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <SlidersHorizontal className="w-5 h-5 text-indigo-600" />
                  <span>Adjust & Refund PINs</span>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-1">
                  Correct quotas or issue candidate test session refunds for <strong>{adjustRefundOrg?.name}</strong>
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Live Metric Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 py-3">
            <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-2.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-600 block">Purchased PINs</span>
              <span className="font-mono font-bold text-base text-emerald-700 block mt-0.5">
                {isAdjustRefundSummaryLoading ? "..." : (adjustRefundSummary?.totalAllocatedPins ?? 0).toLocaleString()}
              </span>
            </div>
            <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-2.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-rose-600 block">Consumed PINs</span>
              <span className="font-mono font-bold text-base text-rose-700 block mt-0.5">
                {isAdjustRefundSummaryLoading ? "..." : (adjustRefundSummary?.totalUsedPins ?? 0).toLocaleString()}
              </span>
            </div>
            <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-2.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">Current Balance</span>
              <span className="font-mono font-bold text-base text-slate-900 block mt-0.5">
                {isAdjustRefundSummaryLoading ? "..." : (adjustRefundSummary?.pinBalance ?? adjustRefundOrg?.pinBalance ?? 0).toLocaleString()}
              </span>
            </div>
            <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-2.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">Last Recharge</span>
              <span className="font-sans text-xs font-medium text-slate-700 block mt-1 truncate" title={adjustRefundSummary?.lastAllocatedAt ? formatDateTime(adjustRefundSummary.lastAllocatedAt) : "Never"}>
                {isAdjustRefundSummaryLoading ? "..." : adjustRefundSummary?.lastAllocatedAt ? formatDateTime(adjustRefundSummary.lastAllocatedAt, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "Never"}
              </span>
            </div>
          </div>

          {/* Tabbed Actions */}
          <Tabs value={adjustRefundActiveTab} onValueChange={setAdjustRefundActiveTab} className="pt-1">
            <TabsList className="grid grid-cols-2 bg-slate-100 p-1 mb-4 text-xs rounded-lg">
              <TabsTrigger value="adjust" className="text-xs font-medium gap-1 data-[state=active]:text-indigo-600">
                <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600" />
                <span>Adjust Balance</span>
              </TabsTrigger>
              <TabsTrigger value="refund" className="text-xs font-medium gap-1 data-[state=active]:text-indigo-600">
                <RotateCcw className="w-3.5 h-3.5 text-indigo-600" />
                <span>Issue Refund</span>
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: ADJUST BALANCE */}
            <TabsContent value="adjust">
              <form onSubmit={handleAdjustPins} className="space-y-4">
                {/* Action Type Toggle */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Adjustment Type</Label>
                  <div>
                    <div className="inline-flex bg-slate-100 p-1 rounded-lg gap-1 border border-slate-200/60">
                      <button
                        type="button"
                        onClick={() => setAdjustType("ADD")}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                          adjustType === "ADD"
                            ? "bg-white text-emerald-700 shadow-2xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        <Plus className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Credit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setAdjustType("DEDUCT")}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                          adjustType === "DEDUCT"
                            ? "bg-white text-rose-700 shadow-2xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        <ArrowDownRight className="w-3.5 h-3.5 text-rose-600" />
                        <span>Debit</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5 sm:col-span-1">
                    <Label className="text-xs font-semibold text-slate-700">PIN Amount <span className="text-destructive">*</span></Label>
                    <Input
                      type="number"
                      min={1}
                      required
                      placeholder="e.g. 50"
                      value={adjustPinsCount || ""}
                      onChange={(e) => setAdjustPinsCount(Math.max(0, parseInt(e.target.value) || 0))}
                      className="h-9 text-xs font-mono font-bold"
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs font-semibold text-slate-700">Audit Reason <span className="text-destructive">*</span></Label>
                    <Input
                      required
                      placeholder="e.g. Quota alignment correction / Invoice adjustment"
                      value={adjustReason}
                      onChange={(e) => setAdjustReason(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>

                {/* Clear Visual Live Balance Preview */}
                {(() => {
                  const currentBal = adjustRefundSummary?.pinBalance ?? adjustRefundOrg?.pinBalance ?? 0;
                  const signedAmount = adjustType === "ADD" ? adjustPinsCount : -adjustPinsCount;
                  const finalBal = currentBal + signedAmount;
                  const isNegative = finalBal < 0;

                  return (
                    <div
                      className={`border rounded-xl p-3 text-xs transition-colors ${
                        isNegative
                          ? "bg-rose-50 border-rose-200 text-rose-900"
                          : "bg-slate-50 border-slate-200/80 text-slate-700"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <span className="text-[10.5px] uppercase font-bold text-slate-400 tracking-wider">Current</span>
                          <p className="font-mono font-bold text-slate-800 text-sm">{currentBal.toLocaleString()} PINs</p>
                        </div>
                        <div className="text-center space-y-0.5">
                          <span className="text-[10.5px] uppercase font-bold text-slate-400 tracking-wider">Adjustment</span>
                          <p className={`font-mono font-bold text-sm ${adjustType === "ADD" ? "text-emerald-600" : "text-rose-600"}`}>
                            {adjustType === "ADD" ? `+${adjustPinsCount.toLocaleString()}` : `-${adjustPinsCount.toLocaleString()}`} PINs
                          </p>
                        </div>
                        <div className="text-right space-y-0.5">
                          <span className="text-[10.5px] uppercase font-bold text-slate-400 tracking-wider">New Balance</span>
                          <p className={`font-mono font-bold text-sm ${isNegative ? "text-rose-600" : "text-slate-900"}`}>
                            {isNegative ? "Insufficient PINs" : `${finalBal.toLocaleString()} PINs`}
                          </p>
                        </div>
                      </div>
                      {isNegative && (
                        <p className="text-[11px] text-rose-600 font-medium mt-2 pt-2 border-t border-rose-200/60">
                          ⚠️ Balance cannot fall below 0. Maximum possible deduction is {currentBal.toLocaleString()} PINs.
                        </p>
                      )}
                    </div>
                  );
                })()}

                <div className="flex justify-end items-center gap-2 pt-3 border-t border-slate-200">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setAdjustRefundOrg(null)}
                    className="text-xs font-semibold h-9 px-4 border-slate-200"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={
                      isAdjusting ||
                      adjustPinsCount <= 0 ||
                      !adjustReason.trim() ||
                      (adjustType === "DEDUCT" &&
                        ((adjustRefundSummary?.pinBalance ?? adjustRefundOrg?.pinBalance ?? 0) - adjustPinsCount < 0))
                    }
                    className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold h-9 px-5 gap-1.5"
                  >
                    {isAdjusting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Applying...</span>
                      </>
                    ) : (
                      <>
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                        <span>
                          {adjustType === "ADD"
                            ? `Credit +${adjustPinsCount > 0 ? adjustPinsCount.toLocaleString() : "0"} PINs`
                            : `Debit -${adjustPinsCount > 0 ? adjustPinsCount.toLocaleString() : "0"} PINs`}
                        </span>
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </TabsContent>

            {/* TAB 2: REFUND PINS */}
            <TabsContent value="refund">
              <form onSubmit={handleRefundPins} className="space-y-4">
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Test Session ID (UUID) <span className="text-destructive">*</span></Label>
                    <Input
                      required
                      placeholder="e.g. 123e4567-e89b-12d3-a456-426614174000"
                      value={refundSessionId}
                      onChange={(e) => setRefundSessionId(e.target.value)}
                      className="h-9 text-xs font-mono"
                    />
                    <p className="text-[10.5px] text-slate-400">
                      Must correspond to a test session where a PIN deduction was previously recorded.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Refund Reason <span className="text-destructive">*</span></Label>
                    <Input
                      required
                      placeholder="e.g. Session voided due to proctoring network error"
                      value={refundReason}
                      onChange={(e) => setRefundReason(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>

                <div className="bg-slate-50/60 border border-slate-200/80 rounded-lg p-2.5 flex items-center justify-between text-xs">
                  <span className="text-slate-600 font-medium">Refund Amount:</span>
                  <span className="font-mono font-bold text-emerald-700 text-sm">
                    +1 PIN Credit
                  </span>
                </div>

                <div className="flex justify-end items-center gap-2 pt-3 border-t border-slate-200">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setAdjustRefundOrg(null)}
                    className="text-xs font-semibold h-9 px-4 border-slate-200"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isRefunding || !refundSessionId.trim() || !refundReason.trim()}
                    className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold h-9 px-5 gap-1.5"
                  >
                    {isRefunding ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Refunding...</span>
                      </>
                    ) : (
                      <>
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Issue Refund (1 PIN)</span>
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* ── EDIT ORGANISATION DIALOG ── */}
      <Dialog open={!!editingOrg} onOpenChange={(open) => !open && setEditingOrg(null)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Edit Organisation</DialogTitle>
            <DialogDescription>Update details for {editingOrg?.name}.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Organisation Name</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Logo URL</Label>
              <Input value={editLogo} onChange={(e) => setEditLogo(e.target.value)} placeholder="https://..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingOrg(null)}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={isUpdating} className="bg-slate-900 hover:bg-slate-800 text-white">
              {isUpdating ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
