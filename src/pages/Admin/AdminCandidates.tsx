import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Search,
  Upload,
  Download,
  MoreVertical,
  Mail,
  Phone,
  Edit2,
  Trash2,
  Loader2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Brain,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  X,
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Candidate } from "@/lib/candidate-service";
import { apiClient } from "@/lib/api-client";
import { BulkUploadCandidates } from "./BulkUploadCandidates";
import { EditCandidateDialog } from "./EditCandidateDialog";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import { useAuth } from "@/lib/auth-context";
import {
  useCandidatesQuery,
  useCreateCandidateMutation,
  useDeleteCandidateMutation,
} from "@/hooks/use-query-hooks";

function CandidateInsightsSection({ candidateId, onInsightsLoaded }: { candidateId: string; onInsightsLoaded?: (totalTests: number) => void }) {
  const [insights, setInsights] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchInsights() {
      setLoading(true);
      setError(null);
      try {
        const response = await apiClient.get(`/candidates/${candidateId}/insights`);
        const data = response.data?.data ?? response.data;
        setInsights(data);
        if (data && typeof data.totalTests === "number" && onInsightsLoaded) {
          onInsightsLoaded(data.totalTests);
        }
      } catch (err: any) {
        console.error("Failed to load insights:", err);
        setError("No insights generated for this candidate yet.");
      } finally {
        setLoading(false);
      }
    }
    fetchInsights();
  }, [candidateId]);

  if (loading) {
    return (
      <div className="mt-4 pt-4 border-t border-border flex items-center justify-center py-6 gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
        <span className="text-xs text-muted-foreground">Loading talent insights...</span>
      </div>
    );
  }

  if (error || !insights) {
    return (
      <div className="mt-4 pt-4 border-t border-border py-4 text-center">
        <Brain className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2 animate-pulse" />
        <p className="text-xs font-medium text-muted-foreground">{error || "No talent insights computed yet."}</p>
        <p className="text-[10px] text-muted-foreground/60 mt-1 max-w-xs mx-auto">
          Insights are automatically generated nightly at 2:00 AM once candidate test submissions are evaluated.
        </p>
      </div>
    );
  }

  const parseList = (raw: any): string[] => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if (typeof raw === "string") {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
      return raw.split(",").map(s => s.trim()).filter(Boolean);
    }
    return [];
  };

  const strongList = parseList(insights.strongTopics);
  const weakList = parseList(insights.weakTopics);
  const improvementList = parseList(insights.improvementAreas);

  return (
    <div className="mt-6 pt-6 border-t border-border space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Brain className="w-5 h-5 text-indigo-500 animate-pulse" />
        <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Talent & Cognitive Analytics</h4>
        <span className="text-[10px] text-muted-foreground ml-auto">
          Last computed: {insights.lastComputed ? new Date(insights.lastComputed).toLocaleDateString() : "N/A"}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Talent Percentile Gauge */}
        <div className="bg-card border rounded-md p-4 flex flex-col items-center justify-center text-center shadow-sm relative overflow-hidden bg-gradient-to-br from-card to-muted/20">
          <div className="relative h-20 w-20 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" className="stroke-muted" strokeWidth="6" fill="transparent" />
              <circle
                cx="50" cy="50" r="40"
                className="stroke-indigo-650 dark:stroke-indigo-500 transition-all duration-1000"
                strokeWidth="6"
                fill="transparent"
                strokeDasharray={251.2}
                strokeDashoffset={251.2 - (251.2 * (insights.overallPercentile || 0)) / 100}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute text-center flex flex-col">
              <span className="text-base font-bold font-mono text-indigo-600 dark:text-indigo-400">{Math.round(insights.overallPercentile || 0)}%</span>
            </div>
          </div>
          <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mt-2">Overall Percentile</span>
          <div className="flex gap-4 mt-3 text-xs w-full justify-around border-t pt-2">
            <div>
              <span className="text-muted-foreground block text-[9px] uppercase font-semibold">Tests</span>
              <span className="font-semibold text-sm">{insights.totalTests || 0}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[9px] uppercase font-semibold">Evaluations</span>
              <span className="font-semibold text-sm">{insights.totalEvals || 0}</span>
            </div>
          </div>
        </div>

        {/* Communication Skills */}
        <div className="bg-card border rounded-md p-4 flex flex-col justify-between shadow-sm bg-gradient-to-br from-card to-muted/20">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Communication Index</span>
              <MessageSquare className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-bold font-mono text-indigo-600 dark:text-indigo-400">{Math.round(insights.commPercentile || 0)}%</span>
              <span className="text-xs text-muted-foreground">percentile</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed">
              Analyzed based on commentary structure, syntax style patterns, and problem decomposition clarity.
            </p>
          </div>
          
          {improvementList.length > 0 && (
            <div className="mt-3 pt-2 border-t text-[10px] text-left">
              <span className="font-bold text-muted-foreground uppercase tracking-wider block text-[8px] mb-1">Growth Recommendation</span>
              <span className="text-foreground italic">"{improvementList[0]}"</span>
            </div>
          )}
        </div>

        {/* Strong vs Weak Skills */}
        <div className="bg-card border rounded-md p-4 space-y-3.5 shadow-sm bg-gradient-to-br from-card to-muted/20">
          <div className="space-y-1.5 text-left">
            <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block">Key Strengths</span>
            <div className="flex flex-wrap gap-1">
              {strongList.length > 0 ? (
                strongList.map((topic, i) => (
                  <Badge key={i} variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 text-[9px] py-0 px-1.5">
                    {topic}
                  </Badge>
                ))
              ) : (
                <span className="text-[10px] text-muted-foreground italic">No strong topics identified yet.</span>
              )}
            </div>
          </div>

          <div className="space-y-1.5 pt-2 border-t text-left">
            <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block">Weak Areas</span>
            <div className="flex flex-wrap gap-1">
              {weakList.length > 0 ? (
                weakList.map((topic, i) => (
                  <Badge key={i} variant="outline" className="bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20 text-[9px] py-0 px-1.5">
                    {topic}
                  </Badge>
                ))
              ) : (
                <span className="text-[10px] text-muted-foreground italic">No weak topics identified yet.</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminCandidates() {
  const [searchTerm, setSearchTerm] = useState("");
  const [testsCountMap, setTestsCountMap] = useState<Record<string, number>>({});
  const { data: unfilteredCandidates = [], isLoading: loading, refetch: refetchCandidates } = useCandidatesQuery();
  const { user } = useAuth();

  const userExtra = user as { organisationId?: string; organisationName?: string } | null;
  const orgId = user?.organisationData?.id || userExtra?.organisationId;

  // Filter candidates that belong to the current admin's organisation
  const candidates = orgId
    ? unfilteredCandidates.filter(c => c.organisation?.id === orgId)
    : unfilteredCandidates;

  const adminOrgName = user?.organisationData?.name || 
                       userExtra?.organisationName || 
                       candidates.find(c => c.organisation?.id === orgId)?.organisation?.name || 
                       "Your Organisation";

  const filteredCandidates = candidates.filter((candidate) => {
    return (
      candidate.user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      candidate.user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      candidate.user.phoneNumber?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [candidateToDelete, setCandidateToDelete] = useState<Candidate | null>(null);

  const [detailsCandidate, setDetailsCandidate] = useState<Candidate | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const currentDetailsIndex = detailsCandidate
    ? filteredCandidates.findIndex((c) => c.id === detailsCandidate.id)
    : -1;

  const handlePrevDetails = () => {
    if (currentDetailsIndex > 0) {
      setDetailsCandidate(filteredCandidates[currentDetailsIndex - 1]);
    }
  };

  const handleNextDetails = () => {
    if (currentDetailsIndex >= 0 && currentDetailsIndex < filteredCandidates.length - 1) {
      setDetailsCandidate(filteredCandidates[currentDetailsIndex + 1]);
    }
  };

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phoneNumber: "",
    organisationId: "",
    extraFields: {
      college: "",
      course: "",
      year: "",
      skills: "",
      city: "",
    },
  });

  const { toast } = useToast();

  const createCandidateMutation = useCreateCandidateMutation();
  const deleteCandidateMutation = useDeleteCandidateMutation();

  useEffect(() => {
    if (isAddDialogOpen && orgId) {
      setFormData(prev => ({
        ...prev,
        organisationId: orgId,
      }));
    }
  }, [isAddDialogOpen, orgId]);

  const fetchData = refetchCandidates;

  const handleAddCandidate = async () => {
    setEmailError(null);
    if (!formData.name.trim()) {
      toast({ title: "Validation Error", description: "Name is required", variant: "destructive" });
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setEmailError("Invalid email format");
      return;
    }
    if (!formData.password.trim() || formData.password.length < 8) {
      toast({ title: "Validation Error", description: "Password must be at least 8 characters", variant: "destructive" });
      return;
    }
    if (!formData.organisationId && orgId) {
      formData.organisationId = orgId;
    }
    if (!formData.organisationId) {
      toast({ title: "Validation Error", description: "Organisation ID is missing", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const extraFields: Record<string, string> = {};
      Object.entries(formData.extraFields).forEach(([key, value]) => {
        if (value) extraFields[key] = value;
      });

      await createCandidateMutation.mutateAsync({
        ...formData,
        extraFields: Object.keys(extraFields).length > 0 ? extraFields : undefined,
      });

      toast({ title: "Success", description: "Candidate added successfully" });
      setIsAddDialogOpen(false);
      setFormData({
        name: "", email: "", password: "", phoneNumber: "", organisationId: orgId || "",
        extraFields: { college: "", course: "", year: "", skills: "", city: "" }
      });
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      toast({ 
        title: "Error", 
        description: err.response?.data?.message || "Failed to add candidate", 
        variant: "destructive" 
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!candidateToDelete) return;
    setDeleting(true);
    try {
      await deleteCandidateMutation.mutateAsync(candidateToDelete.id);
      toast({ title: "Success", description: "Candidate deleted successfully" });
      setIsDeleteDialogOpen(false);
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      toast({ 
        title: "Delete Failed", 
        description: err.response?.data?.message || "Failed to delete candidate. This action is restricted by the backend (e.g. if the candidate has active test sessions, submissions, or invitations).", 
        variant: "destructive" 
      });
    } finally {
      setDeleting(false);
    }
  };

  const getInitials = (name: string) => {
    return name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "U";
  };

  const formatExtraFields = (extraFields?: Record<string, unknown>) => {
    if (!extraFields) return null;
    const entries = Object.entries(extraFields);
    if (entries.length === 0) return null;
    return (
      <div className="mt-3 pt-3 border-t border-border">
        <p className="text-xs font-semibold text-muted-foreground mb-2">Additional Info:</p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {entries.map(([key, value]) => (
            <div key={key}>
              <span className="text-muted-foreground">{key}:</span>{" "}
              <span className="text-foreground">{String(value)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold">Candidates</h1>
          <p className="text-muted-foreground mt-1">Manage candidates in your organisation</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline"><Download className="w-4 h-4 mr-2" />Export</Button>
          <Button variant="outline" onClick={() => setIsBulkUploadOpen(true)}><Upload className="w-4 h-4 mr-2" />Bulk Upload</Button>
          <Button variant="hero" onClick={() => setIsAddDialogOpen(true)}><Plus className="w-4 h-4 mr-2" />Add Candidate</Button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search candidates by name, email or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="rounded-md border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold">Candidate</TableHead>
              <TableHead className="font-semibold">Contact</TableHead>
              <TableHead className="font-semibold">Organisation</TableHead>
              <TableHead className="font-semibold text-center">Tests</TableHead>
              <TableHead className="font-semibold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-10"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></TableCell></TableRow>
            ) : filteredCandidates.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-10">No candidates found.</TableCell></TableRow>
            ) : filteredCandidates.map((candidate) => (
              <React.Fragment key={candidate.id}>
                <TableRow className="hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => setDetailsCandidate(candidate)}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-semibold">
                        {getInitials(candidate.user.name)}
                      </div>
                      <div>
                        <p className="font-medium">{candidate.user.name}</p>
                        <p className="text-xs text-muted-foreground">{candidate.user.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <span className="flex items-center gap-1 text-xs text-muted-foreground"><Mail className="w-3 h-3" />Email</span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground"><Phone className="w-3 h-3" />{candidate.user.phoneNumber || "N/A"}</span>
                    </div>
                  </TableCell>
                  <TableCell>{candidate.organisation.name}</TableCell>
                  <TableCell className="text-center font-medium">{testsCountMap[candidate.id] ?? 0}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setSelectedCandidate(candidate); setIsEditDialogOpen(true); }}><Edit2 className="w-4 h-4 mr-2" />Edit</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); setCandidateToDelete(candidate); setIsDeleteDialogOpen(true); }}><Trash2 className="w-4 h-4 mr-2" />Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Candidate Details Dialog */}
      <Dialog open={!!detailsCandidate} onOpenChange={(open) => !open && setDetailsCandidate(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 gap-0 [&>button]:hidden">
          {/* Custom Header Bar */}
          <div className="flex items-center justify-between px-6 py-4 border-b bg-card sticky top-0 z-50">
            {/* Navigation Arrows */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => { e.stopPropagation(); handlePrevDetails(); }}
                disabled={currentDetailsIndex <= 0}
                className="h-8 w-8 rounded-md"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => { e.stopPropagation(); handleNextDetails(); }}
                disabled={currentDetailsIndex === -1 || currentDetailsIndex >= filteredCandidates.length - 1}
                className="h-8 w-8 rounded-md"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Close Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => { e.stopPropagation(); setDetailsCandidate(null); }}
              className="h-8 w-8 rounded-md"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Modal Content */}
          {detailsCandidate && (
            <div className="p-8 space-y-6">
              {/* Candidate Info Header */}
              <div className="flex items-center justify-between border-b pb-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground text-xl font-semibold">
                    {getInitials(detailsCandidate.user.name)}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold font-heading">{detailsCandidate.user.name}</h2>
                  </div>
                </div>
                <div>
                  <Badge variant="secondary" className="text-sm px-3 py-1">
                    {detailsCandidate.organisation.name}
                  </Badge>
                </div>
              </div>

              {/* Quick Details Grid */}
              <div className="grid grid-cols-2 gap-4 border-t pt-4">
                <div>
                  <span className="text-xs text-muted-foreground block">Phone Number</span>
                  <span className="text-sm font-medium">{detailsCandidate.user.phoneNumber || "N/A"}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Email Address</span>
                  <span className="text-sm font-medium">{detailsCandidate.user.email}</span>
                </div>
              </div>

              {/* Additional Data */}
              {formatExtraFields(detailsCandidate.extraFields)}

              {/* Talent & Cognitive Analytics */}
              <CandidateInsightsSection 
                candidateId={detailsCandidate.id} 
                onInsightsLoaded={(count) => {
                  if (testsCountMap[detailsCandidate.id] !== count) {
                    setTestsCountMap(prev => ({ ...prev, [detailsCandidate.id]: count }));
                  }
                }} 
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Candidate</DialogTitle>
            <DialogDescription>Create a new candidate record in {adminOrgName}.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Full Name*</label>
                <Input placeholder="John Doe" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email Address*</label>
                <Input type="email" placeholder="john@example.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                {emailError ? <p className="text-xs text-destructive">{emailError}</p> : null}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Password*</label>
                <Input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Phone Number</label>
                <Input placeholder="+91 1234567890" value={formData.phoneNumber} onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })} />
              </div>
            </div>
            <div className="space-y-4 border-t pt-4">
              <h4 className="font-medium text-sm">Additional Information</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">College</label>
                  <Input value={formData.extraFields.college} onChange={(e) => setFormData({ ...formData, extraFields: { ...formData.extraFields, college: e.target.value } })} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Course</label>
                  <Input value={formData.extraFields.course} onChange={(e) => setFormData({ ...formData, extraFields: { ...formData.extraFields, course: e.target.value } })} />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
              <Button variant="hero" onClick={handleAddCandidate} disabled={submitting}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                Add Candidate
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {isBulkUploadOpen && (
        <BulkUploadCandidates 
          open={isBulkUploadOpen} 
          onOpenChange={setIsBulkUploadOpen} 
          onSuccess={fetchData} 
        />
      )}
      {isEditDialogOpen && selectedCandidate && (
        <EditCandidateDialog 
          open={isEditDialogOpen} 
          onOpenChange={setIsEditDialogOpen} 
          candidate={selectedCandidate} 
          onSuccess={fetchData} 
        />
      )}
      {isDeleteDialogOpen && candidateToDelete && (
        <DeleteConfirmDialog 
          open={isDeleteDialogOpen} 
          onOpenChange={setIsDeleteDialogOpen} 
          candidateName={candidateToDelete.user.name || ""} 
          onConfirm={handleDeleteConfirm} 
          loading={deleting} 
        />
      )}
    </div>
  );
}
