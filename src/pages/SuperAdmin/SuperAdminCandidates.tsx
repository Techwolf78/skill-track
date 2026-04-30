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
import { candidateService, type Candidate } from "@/lib/candidate-service";
import { organisationService, type OrganisationResponse } from "@/lib/organisation-service";
import { BulkUploadCandidates } from "../Admin/BulkUploadCandidates";
import { EditCandidateDialog } from "../Admin/EditCandidateDialog";
import { DeleteConfirmDialog } from "../Admin/DeleteConfirmDialog";

export default function Students() {
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [organisations, setOrganisations] = useState<OrganisationResponse[]>([]);
  const [selectedOrganisation, setSelectedOrganisation] = useState<string>("all");
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
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

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [candidatesData, orgsData] = await Promise.all([
        candidateService.getCandidates(),
        organisationService.getOrganisations()
      ]);
      setCandidates(candidatesData);
      setOrganisations(orgsData);
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredCandidates = candidates.filter((candidate) => {
    const matchesSearch = 
      candidate.user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      candidate.user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      candidate.user.phoneNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesOrg = selectedOrganisation === "all" || candidate.organisation.id === selectedOrganisation;
    
    return matchesSearch && matchesOrg;
  });

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
    if (!formData.organisationId) {
      toast({ title: "Validation Error", description: "Please select an organisation", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const extraFields: any = {};
      Object.entries(formData.extraFields).forEach(([key, value]) => {
        if (value) extraFields[key] = value;
      });

      await candidateService.createCandidate({
        ...formData,
        extraFields: Object.keys(extraFields).length > 0 ? extraFields : undefined,
      });

      toast({ title: "Success", description: "Candidate added successfully" });
      setIsAddDialogOpen(false);
      setFormData({
        name: "", email: "", password: "", phoneNumber: "", organisationId: "",
        extraFields: { college: "", course: "", year: "", skills: "", city: "" }
      });
      fetchData();
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.response?.data?.message || "Failed to add candidate", 
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
      await candidateService.deleteCandidate(candidateToDelete.id);
      toast({ title: "Success", description: "Candidate deleted successfully" });
      setIsDeleteDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: "Failed to delete candidate", variant: "destructive" });
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
          <p className="text-muted-foreground mt-1">Manage candidates across all organisations</p>
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
            placeholder="Search candidates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedOrganisation} onValueChange={setSelectedOrganisation}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="All Organisations" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Organisations</SelectItem>
            {organisations.map(org => (
              <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold">Candidate</TableHead>
              <TableHead className="font-semibold">Contact</TableHead>
              <TableHead className="font-semibold">Organisation</TableHead>
              <TableHead className="font-semibold">Role</TableHead>
              <TableHead className="font-semibold text-center">Tests</TableHead>
              <TableHead className="font-semibold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-10"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></TableCell></TableRow>
            ) : filteredCandidates.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-10">No candidates found.</TableCell></TableRow>
            ) : filteredCandidates.map((candidate) => (
              <React.Fragment key={candidate.id}>
                <TableRow className="hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => setExpandedRow(expandedRow === candidate.id ? null : candidate.id)}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-semibold">
                        {getInitials(candidate.user.name)}
                      </div>
                      <div>
                        <p className="font-medium">{candidate.user.name}</p>
                        <p className="text-xs text-muted-foreground">{candidate.user.email}</p>
                      </div>
                      {expandedRow === candidate.id ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <span className="flex items-center gap-1 text-xs text-muted-foreground"><Mail className="w-3 h-3" />Email</span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground"><Phone className="w-3 h-3" />{candidate.user.phoneNumber || "N/A"}</span>
                    </div>
                  </TableCell>
                  <TableCell>{candidate.organisation.name}</TableCell>
                  <TableCell><Badge variant="outline">{candidate.user.role || "CANDIDATE"}</Badge></TableCell>
                  <TableCell className="text-center font-medium">0</TableCell>
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
                {expandedRow === candidate.id && (
                  <TableRow className="bg-muted/10">
                    <TableCell colSpan={6} className="py-4 px-8">
                      <div className="grid grid-cols-3 gap-8">
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Account Details</p>
                          <p className="text-sm">User ID: <span className="text-muted-foreground">{candidate.user.id}</span></p>
                          <p className="text-sm">Candidate ID: <span className="text-muted-foreground">{candidate.id}</span></p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Metadata</p>
                          <p className="text-sm">Created: <span className="text-muted-foreground">{candidate.createdAt ? new Date(candidate.createdAt).toLocaleDateString() : "N/A"}</span></p>
                          <p className="text-sm">Stale Data: <Badge variant={candidate.stale ? "destructive" : "secondary"} className="ml-2">{candidate.stale ? "Yes" : "No"}</Badge></p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Organisation Info</p>
                          <p className="text-sm">Org ID: <span className="text-muted-foreground">{candidate.organisation.id}</span></p>
                        </div>
                      </div>
                      {formatExtraFields(candidate.extraFields)}
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Candidate</DialogTitle>
            <DialogDescription>Create a new candidate record and assign to an organisation.</DialogDescription>
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
                {emailError && <p className="text-xs text-destructive">{emailError}</p>}
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
            <div className="space-y-2">
              <label className="text-sm font-medium">Organisation*</label>
              <Select value={formData.organisationId} onValueChange={(v) => setFormData({ ...formData, organisationId: v })}>
                <SelectTrigger><SelectValue placeholder="Select Organisation" /></SelectTrigger>
                <SelectContent>
                  {organisations.map(org => <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>)}
                </SelectContent>
              </Select>
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
        <DeleteConfirmDialog isOpen={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen} onConfirm={handleDeleteConfirm} deleting={deleting} title="Delete Candidate" description={`Are you sure you want to delete ${candidateToDelete.user.name}? This action cannot be undone.`} />
      )}
    </div>
  );
}
