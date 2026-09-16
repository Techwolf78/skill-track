import { useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Plus,
  Search,
  Building2,
  MoreVertical,
  Trash2,
  Pencil,
  AlertTriangle,
  Calendar,
  CreditCard,
  Shield,
  Zap,
  CheckCircle2,
  Coins,
  Users as UsersIcon,
  Clock,
  Sparkles,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  organisationService,
  type OrganisationResponse,
  type OrganisationSubscriptionConfig,
} from "@/lib/organisation-service";
import { useToast } from "@/hooks/use-toast";

function formatValidityDate(startDate?: string, endDate?: string) {
  if (!startDate || !endDate) return "Nov 14, 2025 – Aug 26, 2027";
  const fmt = (d: string) => {
    try {
      const p = new Date(d);
      if (isNaN(p.getTime())) return d;
      return p.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch {
      return d;
    }
  };
  return `${fmt(startDate)} – ${fmt(endDate)}`;
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

  // Delete Org State
  const [orgToDelete, setOrgToDelete] = useState<OrganisationResponse | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Manage Subscription & PINs Dialog State
  const [subOrg, setSubOrg] = useState<OrganisationResponse | null>(null);
  const [subConfig, setSubConfig] = useState<OrganisationSubscriptionConfig | null>(null);
  const [topUpAmount, setTopUpAmount] = useState<number>(0);
  const [topUpReason, setTopUpReason] = useState<string>("");
  const [isSavingSub, setIsSavingSub] = useState(false);

  const { data: organisations = [], isLoading } = useQuery({
    queryKey: ["organisations"],
    queryFn: () => organisationService.getOrganisations(),
  });

  const filteredOrgs = (organisations as OrganisationResponse[]).filter((org) =>
    org.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const created = await organisationService.createOrganisation({ name: newOrgName, logoUrl: newOrgLogo || undefined });
      // Initialize default subscription config
      if (created?.id) {
        organisationService.getSubscriptionConfig(created.id);
      }
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
      await organisationService.updateOrganisation(editingOrg.id, { name: editName, logoUrl: editLogo || undefined });
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

  const handleDelete = async () => {
    if (!orgToDelete) return;
    setIsDeleting(true);
    try {
      await organisationService.deleteOrganisation(orgToDelete.id);
      toast({ title: "Organisation Deleted", description: `${orgToDelete.name} has been removed.` });
      setOrgToDelete(null);
      queryClient.invalidateQueries({ queryKey: ["organisations"] });
    } catch (error: unknown) {
      let msg = "Failed to delete organisation.";
      if (axios.isAxiosError(error)) msg = error.response?.data?.message || error.message;
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  const openSubscriptionModal = (org: OrganisationResponse) => {
    setSubOrg(org);
    const config = organisationService.getSubscriptionConfig(org.id);
    setSubConfig(config);
    setTopUpAmount(0);
    setTopUpReason("");
  };

  const handleSaveSubscription = () => {
    if (!subOrg || !subConfig) return;
    setIsSavingSub(true);
    try {
      let finalAllocated = subConfig.allocatedPins;
      const adjustments = [...(subConfig.statementAdjustments || [])];

      if (topUpAmount !== 0) {
        finalAllocated = Math.max(0, finalAllocated + topUpAmount);
        adjustments.unshift({
          id: `adj-${Date.now()}`,
          date: new Date().toLocaleString(),
          reason: topUpReason.trim() || (topUpAmount > 0 ? "SuperAdmin Top-up" : "SuperAdmin Adjustment"),
          pinsChange: topUpAmount,
          initiatedBy: "SuperAdmin",
        });
      }

      organisationService.updateSubscriptionConfig(subOrg.id, {
        ...subConfig,
        allocatedPins: finalAllocated,
        statementAdjustments: adjustments,
      });

      toast({
        title: "Subscription & PINs Updated",
        description: `Plan and PIN allocation saved for ${subOrg.name}.`,
      });
      setSubOrg(null);
      queryClient.invalidateQueries({ queryKey: ["organisations"] });
    } catch {
      toast({ title: "Error", description: "Failed to save subscription config.", variant: "destructive" });
    } finally {
      setIsSavingSub(false);
    }
  };

  return (
    <div className="p-8 space-y-6 animate-fade-in font-sans">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold text-slate-900">Organisations</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage partner organisations, B2B subscriptions, and assessment PIN quotas
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
                <DialogDescription>Create a new partner organisation with subscription quota.</DialogDescription>
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

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search organisations..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 h-11 text-sm"
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
        <div className="text-center py-20 text-muted-foreground">
          <Building2 className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">No organisations found</p>
          <p className="text-sm mt-1">Create one using the button above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredOrgs.map((org) => {
            const currentSub = organisationService.getSubscriptionConfig(org.id);

            return (
              <div
                key={org.id}
                className="bg-white border border-slate-200/90 rounded-lg p-4 shadow-2xs hover:border-slate-300 transition-all duration-150 flex flex-col justify-between space-y-3.5"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-md bg-slate-900 flex items-center justify-center text-white shrink-0 shadow-2xs">
                      {org.logoUrl ? (
                        <img src={org.logoUrl} alt={org.name} className="w-7 h-7 rounded object-cover" />
                      ) : (
                        <Building2 className="w-5 h-5 text-white" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 leading-snug line-clamp-1">{org.name}</h3>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                        ID: {org.id.slice(0, 8)}...
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="px-2 py-0.5 bg-[#4152A4]/10 text-[#4152A4] border border-[#4152A4]/25 text-[10px] font-semibold rounded shadow-2xs">
                      {currentSub.planTier || "Standard"}
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-slate-800 rounded">
                          <MoreVertical className="w-3.5 h-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="text-xs">
                        <DropdownMenuItem onClick={() => openSubscriptionModal(org)}>
                          <CreditCard className="w-3.5 h-3.5 mr-2 text-slate-600" />
                          Manage Subscription & PINs
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          setEditingOrg(org);
                          setEditName(org.name);
                          setEditLogo(org.logoUrl || "");
                        }}>
                          <Pencil className="w-3.5 h-3.5 mr-2" />
                          Edit Details
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive font-medium"
                          onClick={() => setOrgToDelete(org)}
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Quota Info Box */}
                <div className="bg-slate-50/80 border border-slate-200/70 rounded-md p-2.5 text-xs space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[11.5px] text-slate-500 flex items-center gap-1.5">
                      <Coins className="w-3.5 h-3.5 text-[#4152A4]" />
                      Allocated PINs
                    </span>
                    <span className="font-bold text-slate-900 font-mono text-[11.5px]">
                      {currentSub.allocatedPins.toLocaleString()} PINs
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[11px] text-slate-400 pt-1.5 border-t border-slate-200/50">
                    <span>Validity</span>
                    <span className="text-slate-700 font-medium">
                      {formatValidityDate(currentSub.subscriptionStartDate, currentSub.subscriptionEndDate)}
                    </span>
                  </div>
                </div>

                {/* Action & Footer */}
                <div className="space-y-2.5 pt-0.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openSubscriptionModal(org)}
                    className="w-full h-8 text-xs font-medium border-slate-200 text-slate-700 hover:bg-slate-900 hover:text-white hover:border-slate-900 rounded flex items-center justify-center gap-1.5 transition-all"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Manage Subscription & PINs</span>
                  </Button>

                  <div className="flex items-center gap-1.5 text-[10.5px] text-slate-400 border-t border-slate-100 pt-2">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    <span>Created {new Date(org.createdAt).toLocaleDateString("en-GB")}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── MANAGE SUBSCRIPTION & PINS MODAL DIALOG ── */}
      <Dialog open={!!subOrg && !!subConfig} onOpenChange={(open) => !open && setSubOrg(null)}>
        <DialogContent className="sm:max-w-[560px] bg-white text-slate-900 p-6">
          <DialogHeader className="border-b border-slate-200 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-slate-700" />
                  <span>Subscription & PIN Management</span>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-1">
                  Configure plan package, PIN allocations, and billing dates for <strong>{subOrg?.name}</strong>
                </DialogDescription>
              </div>
              <Badge variant="outline" className="bg-[#4152A4]/10 text-[#4152A4] border-[#4152A4]/25 text-xs font-semibold px-2.5 py-0.5">
                {subConfig?.planTier}
              </Badge>
            </div>
          </DialogHeader>

          {subConfig && (
            <Tabs defaultValue="plan" className="pt-2">
              <TabsList className="grid grid-cols-3 bg-slate-100 p-1 mb-4 text-xs">
                <TabsTrigger value="plan" className="text-xs font-medium">
                  Plan & Dates
                </TabsTrigger>
                <TabsTrigger value="pins" className="text-xs font-medium">
                  PIN Allocation
                </TabsTrigger>
                <TabsTrigger value="ledger" className="text-xs font-medium">
                  Audit Ledger
                </TabsTrigger>
              </TabsList>

              {/* Tab 1: Plan & Validity Dates */}
              <TabsContent value="plan" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Plan Tier</Label>
                    <Select
                      value={subConfig.planTier || "Standard"}
                      onValueChange={(val) => setSubConfig({ ...subConfig, planTier: val as OrganisationSubscriptionConfig["planTier"] })}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Select Tier" />
                      </SelectTrigger>
                      <SelectContent className="text-xs">
                        <SelectItem value="Standard">Standard</SelectItem>
                        <SelectItem value="Pro">Pro</SelectItem>
                        <SelectItem value="Enterprise">Enterprise</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Billing Mode</Label>
                    <Select
                      value={subConfig.billingMode || "One-time Subscription"}
                      onValueChange={(val) => setSubConfig({ ...subConfig, billingMode: val as OrganisationSubscriptionConfig["billingMode"] })}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Select Mode" />
                      </SelectTrigger>
                      <SelectContent className="text-xs">
                        <SelectItem value="One-time Subscription">One-time Subscription</SelectItem>
                        <SelectItem value="Annual Recurring">Annual Recurring</SelectItem>
                        <SelectItem value="Monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-3 space-y-3">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                    Subscription Validity Period
                  </span>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[11px] text-slate-500">Start Date</Label>
                      <Input
                        type="date"
                        value={subConfig.subscriptionStartDate}
                        onChange={(e) => setSubConfig({ ...subConfig, subscriptionStartDate: e.target.value })}
                        className="h-9 text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[11px] text-slate-500">End Date</Label>
                      <Input
                        type="date"
                        value={subConfig.subscriptionEndDate}
                        onChange={(e) => setSubConfig({ ...subConfig, subscriptionEndDate: e.target.value })}
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-3 space-y-3">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                    Current Billing Cycle Period
                  </span>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[11px] text-slate-500">Cycle Start Date</Label>
                      <Input
                        type="date"
                        value={subConfig.billingCycleStartDate}
                        onChange={(e) => setSubConfig({ ...subConfig, billingCycleStartDate: e.target.value })}
                        className="h-9 text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[11px] text-slate-500">Cycle End Date</Label>
                      <Input
                        type="date"
                        value={subConfig.billingCycleEndDate}
                        onChange={(e) => setSubConfig({ ...subConfig, billingCycleEndDate: e.target.value })}
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Tab 2: PIN Allocation & Top-up */}
              <TabsContent value="pins" className="space-y-4">
                <div className="bg-slate-50 border border-slate-200 p-4 space-y-3 rounded-md">
                  <div className="flex justify-between items-center">
                    <div>
                      <Label className="text-xs font-bold text-slate-900">Total Base PINs Allocated</Label>
                      <p className="text-[11px] text-slate-500">Total invite credits assigned to this organization</p>
                    </div>
                    <div className="px-3 py-1.5 bg-white border border-slate-200 rounded text-right font-mono font-bold text-sm text-slate-900 select-none shadow-2xs">
                      {subConfig.allocatedPins.toLocaleString()} PINs
                    </div>
                  </div>
                </div>

                {/* Instant Top-Up Credit Tool (Clean Neutral Theme) */}
                <div className="border border-slate-200 bg-slate-50/70 p-4 space-y-3 rounded-md">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                    <Sparkles className="w-4 h-4 text-slate-600" />
                    <span>Instant PIN Top-Up / Adjustment</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Add or deduct PINs immediately. Positive adds bonus credits; negative deducts.
                  </p>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setTopUpAmount(500)}
                      className={`text-xs h-7 border transition-colors ${topUpAmount === 500 ? "bg-slate-900 text-white font-semibold" : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"}`}
                    >
                      +500 PINs
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setTopUpAmount(1000)}
                      className={`text-xs h-7 border transition-colors ${topUpAmount === 1000 ? "bg-slate-900 text-white font-semibold" : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"}`}
                    >
                      +1,000 PINs
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setTopUpAmount(5000)}
                      className={`text-xs h-7 border transition-colors ${topUpAmount === 5000 ? "bg-slate-900 text-white font-semibold" : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"}`}
                    >
                      +5,000 PINs
                    </Button>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <div className="col-span-1">
                      <Label className="text-[10px] text-slate-600">PIN Adjustment</Label>
                      <Input
                        type="number"
                        placeholder="+/- PINs"
                        value={topUpAmount || ""}
                        onChange={(e) => setTopUpAmount(parseInt(e.target.value) || 0)}
                        className="h-8 text-xs font-mono font-semibold"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-[10px] text-slate-600">Reason Note (Audit Trail)</Label>
                      <Input
                        placeholder="e.g. Corporate Renewal Top-up"
                        value={topUpReason}
                        onChange={(e) => setTopUpReason(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Tab 3: Audit Ledger */}
              <TabsContent value="ledger" className="space-y-3">
                <div className="border border-slate-200 p-3 bg-slate-50/50 space-y-2 rounded-md">
                  <span className="text-xs font-bold text-slate-900 block">
                    PIN Quota Adjustments & Audit Trail
                  </span>
                  <p className="text-[11px] text-slate-500">
                    Chronological record of manual quota changes and top-ups issued by SuperAdmin
                  </p>
                </div>

                {(!subConfig.statementAdjustments || subConfig.statementAdjustments.length === 0) ? (
                  <div className="text-center py-8 text-xs text-slate-400 border border-dashed border-slate-200 rounded-md">
                    No custom PIN adjustments recorded yet for this organization.
                  </div>
                ) : (
                  <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-md">
                    <table className="w-full text-[11px] text-left">
                      <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                        <tr>
                          <th className="py-2 px-3">Date</th>
                          <th className="py-2 px-3">Reason</th>
                          <th className="py-2 px-3 text-center">Change</th>
                          <th className="py-2 px-3 text-right">By</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {subConfig.statementAdjustments.map((adj) => (
                          <tr key={adj.id} className="hover:bg-slate-50">
                            <td className="py-1.5 px-3 text-slate-500 font-mono">{adj.date}</td>
                            <td className="py-1.5 px-3 text-slate-800 font-medium">{adj.reason}</td>
                            <td className="py-1.5 px-3 text-center">
                              {adj.pinsChange > 0 ? (
                                <span className="px-1.5 py-0.5 bg-[#4152A4]/10 text-[#4152A4] border border-[#4152A4]/25 rounded font-bold font-mono text-[10px]">
                                  +{adj.pinsChange}
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded font-bold font-mono text-[10px]">
                                  {adj.pinsChange}
                                </span>
                              )}
                            </td>
                            <td className="py-1.5 px-3 text-right text-slate-500">{adj.initiatedBy}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}

          <DialogFooter className="border-t border-slate-200 pt-4 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSubOrg(null)}
              className="text-xs h-8 border-slate-200"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveSubscription}
              disabled={isSavingSub}
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-4 h-8 rounded"
            >
              {isSavingSub ? "Saving..." : "Save Subscription Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
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
            <Button variant="hero" onClick={handleUpdate} disabled={isUpdating} className="bg-[#4152A4] hover:bg-[#344287] text-white">
              {isUpdating ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!orgToDelete} onOpenChange={(open) => !open && setOrgToDelete(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Delete Organisation
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{orgToDelete?.name}</strong>? All linked users and data may be affected.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOrgToDelete(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? "Deleting..." : "Delete Permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

