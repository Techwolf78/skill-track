import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Brain,
  MessageSquare,
  AlertCircle,
  Building2,
  User,
} from "lucide-react";
import { CustomFieldsSection, CustomFieldItem } from "@/components/candidates/CustomFieldsSection";
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
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import {
  useCandidatesPageQuery,
  useOrganisationsQuery,
  useCreateCandidateMutation,
  useDeleteCandidateMutation,
} from "@/hooks/use-query-hooks";
import { Candidate } from "@/lib/candidate-service";
import { BulkUploadCandidates } from "../Admin/BulkUploadCandidates";
import { EditCandidateDialog } from "../Admin/EditCandidateDialog";
import { DeleteConfirmDialog } from "../Admin/DeleteConfirmDialog";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { formatDate, getTodayDateString } from "@/lib/date-utils";

interface CandidateInsightData {
  totalTests?: number;
  totalEvals?: number;
  overallPercentile?: number;
  commPercentile?: number;
  lastComputed?: string;
  strongTopics?: string[] | string;
  weakTopics?: string[] | string;
  improvementAreas?: string[] | string;
}

function CandidateInsightsSection({ candidateId, onInsightsLoaded }: { candidateId: string; onInsightsLoaded?: (totalTests: number) => void }) {
  const [insights, setInsights] = useState<CandidateInsightData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchInsights() {
      setLoading(true);
      setError(null);
      try {
        const response = await apiClient.get(`/candidates/${candidateId}/insights`);
        const data: CandidateInsightData = response.data?.data ?? response.data;
        setInsights(data);
        if (data && typeof data.totalTests === "number" && onInsightsLoaded) {
          onInsightsLoaded(data.totalTests);
        }
      } catch (err: unknown) {
        console.error("Failed to load insights:", err);
        setError("No insights generated for this candidate yet.");
      } finally {
        setLoading(false);
      }
    }
    fetchInsights();
  }, [candidateId, onInsightsLoaded]);

  if (loading) {
    return (
      <div className="mt-4 pt-4 border-t border-slate-200 flex items-center justify-center py-6 gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-slate-800" />
        <span className="text-xs text-slate-500">Loading talent insights...</span>
      </div>
    );
  }

  if (error || !insights) {
    return (
      <div className="mt-4 pt-4 border-t border-slate-200 py-4 text-center">
        <Brain className="w-7 h-7 text-slate-300 mx-auto mb-2" />
        <p className="text-xs font-medium text-slate-600">{error || "No talent insights computed yet."}</p>
        <p className="text-[10px] text-slate-400 mt-1 max-w-xs mx-auto">
          Insights are automatically generated nightly once candidate test submissions are evaluated.
        </p>
      </div>
    );
  }

  const parseList = (raw: unknown): string[] => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw.map(String);
    if (typeof raw === "string") {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed.map(String);
      } catch {
        // Fallback split string on comma
      }
      return raw.split(",").map(s => s.trim()).filter(Boolean);
    }
    return [];
  };

  const strongList = parseList(insights.strongTopics);
  const weakList = parseList(insights.weakTopics);
  const improvementList = parseList(insights.improvementAreas);

  return (
    <div className="mt-5 pt-5 border-t border-slate-200 space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Brain className="w-4 h-4 text-[#4152A4]" />
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">Talent & Cognitive Analytics</h4>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Metric 1: Overall Percentile */}
        <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-1 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Assessment Percentile</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black font-mono text-slate-900">
              {typeof insights.overallPercentile === "number" ? Math.round(insights.overallPercentile) : "N/A"}
            </span>
            {typeof insights.overallPercentile === "number" && <span className="text-xs font-bold text-slate-500">%ile</span>}
          </div>
          <p className="text-[10px] text-slate-400 leading-relaxed">
            Overall benchmark performance across national assessments.
          </p>
        </div>

        {/* Metric 2: Communication Rating */}
        <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-1 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Communication Score</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black font-mono text-slate-900">
              {typeof insights.commPercentile === "number" ? Math.round(insights.commPercentile) : "N/A"}
            </span>
            {typeof insights.commPercentile === "number" && <span className="text-xs font-bold text-slate-500">%ile</span>}
          </div>
          {improvementList.length > 0 && (
            <div className="mt-2 pt-1.5 border-t border-slate-100 text-[10px]">
              <span className="text-slate-700 italic">"{improvementList[0]}"</span>
            </div>
          )}
        </div>

        {/* Strong vs Weak Skills */}
        <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-2.5 shadow-2xs">
          <div className="space-y-1 text-left">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">Key Strengths</span>
            <div className="flex flex-wrap gap-1">
              {strongList.length > 0 ? (
                strongList.map((topic, i) => (
                  <span key={i} className="px-1.5 py-0.5 bg-[#4152A4]/10 text-[#4152A4] border border-[#4152A4]/25 text-[9px] font-semibold rounded">
                    {topic}
                  </span>
                ))
              ) : (
                <span className="text-[10px] text-slate-400 italic">No strong topics identified yet.</span>
              )}
            </div>
          </div>

          <div className="space-y-1 pt-1.5 border-t border-slate-100 text-left">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">Weak Areas</span>
            <div className="flex flex-wrap gap-1">
              {weakList.length > 0 ? (
                weakList.map((topic, i) => (
                  <span key={i} className="px-1.5 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 text-[9px] font-medium rounded">
                    {topic}
                  </span>
                ))
              ) : (
                <span className="text-[10px] text-slate-400 italic">No weak topics identified yet.</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Students() {
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [testsCountMap, setTestsCountMap] = useState<Record<string, number>>({});

  // ----- Server-side pagination state (page is 0-indexed for backend) -----
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(15);

  const [selectedOrganisation, setSelectedOrganisation] = useState<string>("all");

  const {
    data: pageData,
    isLoading: candidatesLoading,
    isError: candidatesError,
    error: candidatesErrorObj,
    refetch: refetchCandidates,
  } = useCandidatesPageQuery(
    page,
    pageSize,
    debouncedSearch,
    selectedOrganisation !== "all" ? selectedOrganisation : undefined
  );

  const { data: organisations = [], isLoading: orgsLoading, refetch: refetchOrgs } = useOrganisationsQuery();
  const loading = candidatesLoading || orgsLoading;

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);

  useEffect(() => {
    if (searchParams.get("action") === "bulk-upload") {
      setIsBulkUploadOpen(true);
    }
  }, [searchParams]);

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [candidateToDelete, setCandidateToDelete] = useState<Candidate | null>(null);

  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

  const fetchData = useCallback(() => {
    refetchCandidates();
    refetchOrgs();
  }, [refetchCandidates, refetchOrgs]);

  // Debounce search: wait 400ms before filtering and resetting to page 0
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(0);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset page to 0 when org filter changes
  useEffect(() => {
    setPage(0);
  }, [selectedOrganisation]);

  // Server-filtered candidates on the current page
  const candidates = pageData?.content ?? [];

  // Backend pagination metadata
  const totalElements = pageData?.totalElements ?? 0;
  const totalPages = pageData?.totalPages ?? 1;
  const isFirstPage = pageData?.first ?? true;
  const isLastPage = pageData?.last ?? true;

  // Display range
  const pageStart = totalElements === 0 ? 0 : page * pageSize + 1;
  const pageEnd = Math.min(page * pageSize + pageSize, totalElements);

  const [customFields, setCustomFields] = useState<CustomFieldItem[]>([]);

  const handleAddCandidate = async () => {
    setEmailError(null);
    if (!formData.name.trim()) {
      toast({ title: "Error", description: "Name is required", variant: "destructive" });
      return;
    }
    if (!formData.email.trim()) {
      setEmailError("Email is required");
      return;
    }
    if (!formData.password.trim()) {
      toast({ title: "Error", description: "Password is required", variant: "destructive" });
      return;
    }
    if (!formData.organisationId) {
      toast({ title: "Error", description: "Organisation is required", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const extraFieldsMap: Record<string, string> = {};
      Object.entries(formData.extraFields).forEach(([k, v]) => {
        if (v.trim()) extraFieldsMap[k] = v.trim();
      });
      customFields.forEach(cf => {
        if (cf.key.trim() && cf.value.trim()) {
          extraFieldsMap[cf.key.trim()] = cf.value.trim();
        }
      });

      await createCandidateMutation.mutateAsync({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        phoneNumber: formData.phoneNumber || undefined,
        organisationId: formData.organisationId,
        extraFields: Object.keys(extraFieldsMap).length > 0 ? extraFieldsMap : undefined,
      });

      toast({ title: "Success", description: "Candidate created successfully" });
      setIsAddDialogOpen(false);
      setFormData({
        name: "", email: "", password: "", phoneNumber: "", organisationId: "",
        extraFields: { college: "", course: "", year: "", skills: "", city: "" }
      });
      setCustomFields([]);
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      const msg = err.response?.data?.message || "";
      if (msg.toLowerCase().includes("email")) {
        setEmailError(msg);
      } else {
        toast({ title: "Error", description: msg || "Failed to create candidate", variant: "destructive" });
      }
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
        description: err.response?.data?.message || "Failed to delete candidate. This action is restricted by the backend.", 
        variant: "destructive" 
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleExportCandidates = () => {
    if (candidates.length === 0) {
      toast({
        title: "No Data",
        description: "No candidates to export.",
        variant: "destructive",
      });
      return;
    }

    const formattedData = candidates.map((c) => ({
      Name: c.user.name || "N/A",
      Email: c.user.email,
      Phone: c.user.phoneNumber || "N/A",
      Organisation: c.organisation.name,
      Role: c.user.role || "CANDIDATE",
      "Created Date": c.createdAt ? formatDate(c.createdAt) : "N/A",
    }));

    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    worksheet["!autofilter"] = { ref: "A1:F1" };

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Candidates");

    const colWidths = Object.keys(formattedData[0]).map((key) => {
      const maxLength = Math.max(
        key.length,
        ...formattedData.map((row) => String(row[key as keyof typeof row]).length),
      );
      return { wch: maxLength + 2 };
    });
    worksheet["!cols"] = colWidths;

    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const file = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const date = getTodayDateString();
    saveAs(file, `Candidates_${date}.xlsx`);
  };

  const getInitials = (name: string) => {
    return name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "U";
  };

  const formatExtraFields = (extraFields?: Record<string, unknown>) => {
    if (!extraFields) return null;
    const entries = Object.entries(extraFields);
    if (entries.length === 0) return null;
    return (
      <div className="mt-3 pt-3 border-t border-slate-200">
        <p className="text-xs font-semibold text-slate-700 mb-2">Additional Information</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          {entries.map(([key, value]) => (
            <div key={key} className="bg-white border border-slate-200 rounded p-2">
              <span className="text-slate-500 font-medium block text-[10px] uppercase tracking-wider">{key}</span>
              <span className="text-slate-900 font-semibold">{String(value)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="p-8 space-y-6 animate-fade-in font-sans">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold text-slate-900">Candidates</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage student candidate records across all partner organisations
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCandidates}
            className="h-9 text-xs font-medium border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded"
          >
            <Download className="w-4 h-4 mr-1.5 text-slate-500" />
            Export
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsBulkUploadOpen(true)}
            className="h-9 text-xs font-medium border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded"
          >
            <Upload className="w-4 h-4 mr-1.5 text-slate-500" />
            Bulk Upload
          </Button>
          <Button
            variant="default"
            onClick={() => setIsAddDialogOpen(true)}
            className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold h-9 px-4 rounded"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add Candidate
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search candidates by name, email or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-10 text-xs border-slate-200 focus-visible:ring-slate-400"
          />
        </div>
        <Select value={selectedOrganisation} onValueChange={setSelectedOrganisation}>
          <SelectTrigger className="w-64 h-10 text-xs border-slate-200 bg-white">
            <SelectValue placeholder="All Organisations" />
          </SelectTrigger>
          <SelectContent className="text-xs">
            <SelectItem value="all">All Organisations</SelectItem>
            {organisations.map(org => (
              <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Candidates Table */}
      <div className="rounded-lg border border-slate-200/90 bg-white overflow-hidden shadow-2xs">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/80 hover:bg-slate-50/80 border-b border-slate-200">
              <TableHead className="text-[11.5px] font-bold text-slate-700 py-3 uppercase tracking-wider pl-4">Candidate</TableHead>
              <TableHead className="text-[11.5px] font-bold text-slate-700 py-3 uppercase tracking-wider">Contact</TableHead>
              <TableHead className="text-[11.5px] font-bold text-slate-700 py-3 uppercase tracking-wider">Organisation</TableHead>
              <TableHead className="text-[11.5px] font-bold text-slate-700 py-3 uppercase tracking-wider">Role</TableHead>
              <TableHead className="text-[11.5px] font-bold text-slate-700 py-3 uppercase tracking-wider text-center">Tests</TableHead>
              <TableHead className="text-[11.5px] font-bold text-slate-700 py-3 uppercase tracking-wider text-right pr-4">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-20 text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs">Fetching candidate database...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : candidatesError ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-20">
                  <div className="flex flex-col items-center justify-center gap-2 text-rose-600">
                    <AlertCircle className="w-7 h-7" />
                    <p className="font-semibold text-xs">Failed to load candidates from server.</p>
                    <p className="text-[11px] text-slate-500">
                      {(candidatesErrorObj as { message?: string })?.message || "Server connection error"}
                    </p>
                    <Button variant="outline" size="sm" onClick={() => refetchCandidates()} className="mt-2 text-xs h-8 border-slate-200">
                      Retry Connection
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : candidates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-20 text-muted-foreground text-xs">
                  {debouncedSearch || selectedOrganisation !== "all"
                    ? "No candidates match the current filters on this page."
                    : "No candidates found."}
                </TableCell>
              </TableRow>
            ) : candidates.map((candidate) => (
              <React.Fragment key={candidate.id}>
                <TableRow
                  className="hover:bg-slate-50/50 border-b border-slate-100 transition-colors cursor-pointer group"
                  onClick={() => setExpandedRow(expandedRow === candidate.id ? null : candidate.id)}
                >
                  <TableCell className="pl-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-md bg-slate-900 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-2xs">
                        {getInitials(candidate.user.name)}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 leading-tight flex items-center gap-1">
                          {candidate.user.name}
                          {expandedRow === candidate.id ? (
                            <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                          )}
                        </p>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                          {candidate.user.email}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-0.5 text-xs">
                      <div className="flex items-center gap-1.5 text-slate-600 font-mono text-[11px]">
                        <Mail className="w-3 h-3 text-slate-400" />
                        {candidate.user.email}
                      </div>
                      {candidate.user.phoneNumber && (
                        <div className="flex items-center gap-1.5 text-slate-500 font-mono text-[11px]">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {candidate.user.phoneNumber}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-xs font-medium text-slate-800">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      <span>{candidate.organisation.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-semibold rounded inline-flex items-center gap-1">
                      {candidate.user.role || "CANDIDATE"}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    {(testsCountMap[candidate.id] ?? 0) > 0 ? (
                      <span className="px-2 py-0.5 bg-[#4152A4]/10 text-[#4152A4] border border-[#4152A4]/25 rounded font-mono font-bold text-xs inline-block">
                        {testsCountMap[candidate.id]}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded font-mono text-xs inline-block">
                        0
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right pr-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-slate-800 rounded">
                          <MoreVertical className="w-3.5 h-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="text-xs w-36">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCandidate(candidate);
                            setIsEditDialogOpen(true);
                          }}
                        >
                          <Edit2 className="w-3.5 h-3.5 mr-2 text-slate-500" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive font-medium"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCandidateToDelete(candidate);
                            setIsDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
                {expandedRow === candidate.id && (
                  <TableRow className="bg-slate-50/60 border-b border-slate-200">
                    <TableCell colSpan={6} className="py-4 px-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-3 bg-white border border-slate-200 rounded-md">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Account Details</p>
                          <p className="text-xs text-slate-700">User ID: <span className="font-mono text-slate-500">{candidate.user.id}</span></p>
                          <p className="text-xs text-slate-700 mt-1">Candidate ID: <span className="font-mono text-slate-500">{candidate.id}</span></p>
                        </div>
                        <div className="p-3 bg-white border border-slate-200 rounded-md">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Metadata</p>
                          <p className="text-xs text-slate-700">Created: <span className="font-mono text-slate-500">{candidate.createdAt ? new Date(candidate.createdAt).toLocaleDateString("en-GB") : "N/A"}</span></p>
                          <div className="text-xs text-slate-700 mt-1 flex items-center">
                            Stale Record: <span className="ml-1.5 px-2 py-0.5 rounded text-[10px] font-semibold border bg-slate-100 text-slate-700 border-slate-200">{candidate.stale ? "Yes" : "No"}</span>
                          </div>
                        </div>
                        <div className="p-3 bg-white border border-slate-200 rounded-md">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Organisation Info</p>
                          <p className="text-xs text-slate-700">Org Name: <span className="font-semibold text-slate-900">{candidate.organisation.name}</span></p>
                          <p className="text-xs text-slate-700 mt-1">Org ID: <span className="font-mono text-slate-500">{candidate.organisation.id}</span></p>
                        </div>
                      </div>
                      {formatExtraFields(candidate.extraFields)}
                      <CandidateInsightsSection 
                        candidateId={candidate.id} 
                        onInsightsLoaded={(count) => {
                          if (testsCountMap[candidate.id] !== count) {
                            setTestsCountMap(prev => ({ ...prev, [candidate.id]: count }));
                          }
                        }} 
                      />
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-3.5 rounded-lg border border-slate-200/90 shadow-2xs text-xs text-slate-600">
        <div className="flex items-center gap-3 text-slate-500">
          <span>
            Showing{" "}
            <strong className="text-slate-900 font-semibold">{pageStart}</strong>
            {" "}to{" "}
            <strong className="text-slate-900 font-semibold">{pageEnd}</strong>
            {" "}of{" "}
            <strong className="text-slate-900 font-semibold">{totalElements}</strong> candidates
            {(debouncedSearch || selectedOrganisation !== "all") && (
              <span className="ml-1 text-slate-400 font-mono">(filtered)</span>
            )}
          </span>

          <div className="flex items-center gap-1.5 ml-2">
            <span className="hidden sm:inline text-slate-500">Rows per page:</span>
            <Select
              value={String(pageSize)}
              onValueChange={(val) => {
                setPageSize(Number(val));
                setPage(0);
              }}
            >
              <SelectTrigger className="h-8 w-20 text-xs border-slate-200 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="text-xs">
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="15">15</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(0)}
            disabled={isFirstPage || loading}
            className="h-8 w-8 p-0 border-slate-200 text-slate-700 hover:bg-slate-50"
            title="First Page"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={isFirstPage || loading}
            className="h-8 w-8 p-0 border-slate-200 text-slate-700 hover:bg-slate-50"
            title="Previous Page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <span className="px-2 font-medium text-slate-800">
            Page {page + 1} of {totalPages}
          </span>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={isLastPage || loading}
            className="h-8 w-8 p-0 border-slate-200 text-slate-700 hover:bg-slate-50"
            title="Next Page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(totalPages - 1)}
            disabled={isLastPage || loading}
            className="h-8 w-8 p-0 border-slate-200 text-slate-700 hover:bg-slate-50"
            title="Last Page"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Add Candidate Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white text-slate-900 p-6">
          <DialogHeader className="border-b border-slate-100 pb-3">
            <DialogTitle className="text-base font-bold text-slate-900">Add New Candidate</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Create a new candidate record and assign to an organisation.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Full Name*</label>
                <Input
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="h-9 text-xs border-slate-200"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Email Address*</label>
                <Input
                  type="email"
                  placeholder="john@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="h-9 text-xs border-slate-200"
                />
                {emailError ? <p className="text-[11px] text-rose-600">{emailError}</p> : null}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Password*</label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="h-9 text-xs border-slate-200"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Phone Number</label>
                <Input
                  placeholder="+91 1234567890"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  className="h-9 text-xs border-slate-200"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Organisation*</label>
              <Select value={formData.organisationId} onValueChange={(v) => setFormData({ ...formData, organisationId: v })}>
                <SelectTrigger className="h-9 text-xs border-slate-200"><SelectValue placeholder="Select Organisation" /></SelectTrigger>
                <SelectContent className="text-xs">
                  {organisations.map(org => <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-3 border-t border-slate-100 pt-3">
              <h4 className="font-semibold text-xs text-slate-800">Additional Information</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-600">College</label>
                  <Input
                    value={formData.extraFields.college}
                    onChange={(e) => setFormData({ ...formData, extraFields: { ...formData.extraFields, college: e.target.value } })}
                    className="h-9 text-xs border-slate-200"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-600">Course</label>
                  <Input
                    value={formData.extraFields.course}
                    onChange={(e) => setFormData({ ...formData, extraFields: { ...formData.extraFields, course: e.target.value } })}
                    className="h-9 text-xs border-slate-200"
                  />
                </div>
              </div>
              <CustomFieldsSection customFields={customFields} onChange={setCustomFields} />
            </div>
            <div className="flex justify-end gap-2.5 mt-4 border-t border-slate-100 pt-3">
              <Button
                variant="outline"
                onClick={() => setIsAddDialogOpen(false)}
                className="h-9 text-xs border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </Button>
              <Button
                variant="default"
                onClick={handleAddCandidate}
                disabled={submitting}
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold h-9"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Plus className="w-4 h-4 mr-1.5" />}
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
          isSuperAdmin={true}
        />
      )}
      {isEditDialogOpen && selectedCandidate && (
        <EditCandidateDialog 
          open={isEditDialogOpen} 
          onOpenChange={setIsEditDialogOpen} 
          candidate={selectedCandidate} 
          onSuccess={fetchData} 
          isSuperAdmin={true}
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
