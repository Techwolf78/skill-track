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
  CheckCircle2,
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
import { apiClient } from "@/lib/api-client";
import { BulkUploadCandidates } from "./BulkUploadCandidates";
import { EditCandidateDialog } from "./EditCandidateDialog";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";

import { useAuth } from "@/lib/auth-context";

export default function AdminCandidates() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  // Add state for edit dialog
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(
    null,
  );
  // Add state for delete dialog (add with other state declarations)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [candidateToDelete, setCandidateToDelete] = useState<Candidate | null>(
    null,
  );
  const [deleting, setDeleting] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
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
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  // Fetch candidates only (organisations come from candidate data)
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const unfilteredData = await candidateService.getCandidates();
      
      // Log each candidate's organization ID for debugging
      unfilteredData.forEach(c => {
        console.log(`Candidate: ${c.user.name}, Org ID: ${c.organisation?.id}, Org Name: ${c.organisation?.name}`);
      });
      
      // Get organisation ID from user context
      const orgId = user?.organisationData?.id || (user as any)?.organisationId;
      
      console.log("Admin Dashboard - Current User Org ID:", orgId);
      
      // Filter candidates that belong to the current admin's organisation
      const filteredData = orgId 
        ? unfilteredData.filter(c => c.organisation.id === orgId)
        : unfilteredData;
        
      console.log(`Filtered ${filteredData.length} candidates for org ${orgId}`);
      setCandidates(filteredData);
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast({
        title: "Error",
        description: "Failed to load candidates",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Extract unique organisations from candidates for the dropdown
  const organisations = Array.from(
    new Map(
      candidates.map((c) => [c.organisation.id, c.organisation]),
    ).values(),
  );

  const filteredCandidates = candidates.filter(
    (candidate) =>
      candidate.user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      candidate.user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      candidate.user.phoneNumber
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()),
  );

  // Email validation function - called only when adding
  const validateEmail = (email: string): string | null => {
    if (!email.trim()) {
      return "Email is required";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return "Invalid email format";
    }

    // Check if email exists in candidates
    const emailExists = candidates.some(
      (c) => c.user.email.toLowerCase() === email.toLowerCase(),
    );

    if (emailExists) {
      return "Email already exists. Please use a different email.";
    }

    return null;
  };

  const handleAddCandidate = async () => {
    // Clear previous email error
    setEmailError(null);

    // Validate name
    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Name is required",
        variant: "destructive",
      });
      return;
    }

    // Validate email
    const emailValidationError = validateEmail(formData.email);
    if (emailValidationError) {
      setEmailError(emailValidationError);
      toast({
        title: "Validation Error",
        description: emailValidationError,
        variant: "destructive",
      });
      return;
    }

    // Validate password
    if (!formData.password.trim() || formData.password.length < 8) {
      toast({
        title: "Validation Error",
        description: "Password must be at least 8 characters",
        variant: "destructive",
      });
      return;
    }

    // Validate organisation
    if (!formData.organisationId) {
      toast({
        title: "Validation Error",
        description: "Please select an organisation",
        variant: "destructive",
      });
      return;
    }

    // Prepare extraFields (only include non-empty values)
    const extraFields: Record<string, unknown> = {};
    if (formData.extraFields.college)
      extraFields.college = formData.extraFields.college;
    if (formData.extraFields.course)
      extraFields.course = formData.extraFields.course;
    if (formData.extraFields.year) extraFields.year = formData.extraFields.year;
    if (formData.extraFields.city) extraFields.city = formData.extraFields.city;
    if (formData.extraFields.skills) {
      extraFields.skills = formData.extraFields.skills
        .split(",")
        .map((s) => s.trim());
    }

    setSubmitting(true);
    try {
      await candidateService.createCandidate({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        phoneNumber: formData.phoneNumber || undefined,
        organisationId: formData.organisationId,
        extraFields:
          Object.keys(extraFields).length > 0 ? extraFields : undefined,
      });

      toast({
        title: "Success",
        description: "Candidate added successfully",
      });

      // Reset form
      setFormData({
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
      setEmailError(null);
      setIsAddDialogOpen(false);
      fetchData(); // Refresh the list
    } catch (error: any) {
      console.error("Failed to create candidate:", error);

      // Check if error is due to duplicate email
      const errorMessage = error.response?.data?.message || error.message;
      if (errorMessage?.includes("Email already exists")) {
        setEmailError(errorMessage);
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: errorMessage || "Failed to add candidate",
          variant: "destructive",
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Add handler for edit
  const handleEditClick = (candidate: Candidate) => {
    setSelectedCandidate(candidate);
    setIsEditDialogOpen(true);
  };

  // Add delete handler function (add with other handlers)
  const handleDeleteClick = (candidate: Candidate) => {
    setCandidateToDelete(candidate);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!candidateToDelete) return;

    setDeleting(true);
    try {
      await candidateService.deleteCandidate(candidateToDelete.id);

      toast({
        title: "Success",
        description: "Candidate deleted successfully",
      });

      // Refresh the list
      fetchData();
      setIsDeleteDialogOpen(false);
      setCandidateToDelete(null);
    } catch (error: any) {
      console.error("Failed to delete candidate:", error);
      toast({
        title: "Error",
        description:
          error.response?.data?.message || "Failed to delete candidate",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const formatExtraFields = (extraFields?: Record<string, unknown>) => {
    if (!extraFields) return null;
    const entries = Object.entries(extraFields);
    if (entries.length === 0) return null;

    return (
      <div className="mt-3 pt-3 border-t border-border">
        <p className="text-xs font-semibold text-muted-foreground mb-2">
          Additional Info:
        </p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {entries.map(([key, value]) => (
            <div key={key}>
              <span className="text-muted-foreground">{key}:</span>{" "}
              <span className="text-foreground">
                {Array.isArray(value) ? value.join(", ") : String(value)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold">Candidates</h1>
          <p className="text-muted-foreground mt-1">
            Manage candidates in your organization
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" onClick={() => setIsBulkUploadOpen(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Bulk Upload
          </Button>
          <Button
            variant="hero"
            onClick={() => {
              setEmailError(null);
              setIsAddDialogOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Candidate
          </Button>
        </div>
      </div>

      {/* Search */}
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

      {/* Candidates Table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold w-[30%]">Candidate</TableHead>
              <TableHead className="font-semibold">Contact</TableHead>
              <TableHead className="font-semibold">Email</TableHead>
              <TableHead className="font-semibold text-center">
                Tests Taken
              </TableHead>
              <TableHead className="font-semibold text-center">
                Avg Score
              </TableHead>
              <TableHead className="font-semibold text-right">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    <span className="text-muted-foreground">
                      Loading candidates...
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredCandidates.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center py-10 text-muted-foreground"
                >
                  {searchTerm
                    ? "No candidates match your search."
                    : "No candidates found. Click 'Add Candidate' to get started."}
                </TableCell>
              </TableRow>
            ) : (
              filteredCandidates.map((candidate) => (
                <React.Fragment key={candidate.id}>
                  <TableRow className="hover:bg-muted/30 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center">
                          <span className="text-sm font-semibold text-primary-foreground">
                            {getInitials(candidate.user.name || "User")}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">
                            {candidate.user.name || "Unnamed User"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            ID: {candidate.id.slice(0, 8)}
                          </p>
                          {candidate.extraFields &&
                            Object.keys(candidate.extraFields).length > 0 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs mt-1"
                                onClick={() =>
                                  setExpandedRow(
                                    expandedRow === candidate.id
                                      ? null
                                      : candidate.id,
                                  )
                                }
                              >
                                {expandedRow === candidate.id ? (
                                  <ChevronUp className="w-3 h-3 mr-1" />
                                ) : (
                                  <ChevronDown className="w-3 h-3 mr-1" />
                                )}
                                {expandedRow === candidate.id
                                  ? "Show Less"
                                  : "Show More"}
                              </Button>
                            )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {candidate.user.phoneNumber ? (
                        <div className="flex items-center gap-1 text-sm">
                          <Phone className="w-4 h-4 text-muted-foreground" />
                          {candidate.user.phoneNumber}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        {candidate.user.email}
                      </div>
                    </TableCell>

                    <TableCell className="text-center">
                      <Badge variant="secondary">0 Tests</Badge>
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">
                      -
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleEditClick(candidate)}
                          >
                            <Edit2 className="w-4 h-4 mr-2" />
                            Edit Candidate
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDeleteClick(candidate)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Candidate
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                  {expandedRow === candidate.id && candidate.extraFields && (
                    <TableRow className="bg-muted/20">
                      <TableCell colSpan={7} className="p-4">
                        {formatExtraFields(candidate.extraFields)}
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add Candidate Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Candidate</DialogTitle>
            <DialogDescription>
              Create a new candidate in your organization
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Basic Info Section */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-primary">
                Basic Information
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Full Name *</label>
                  <Input
                    placeholder="Enter candidate name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Email *</label>
                  <div className="relative">
                    <Input
                      type="email"
                      placeholder="Enter candidate email"
                      value={formData.email}
                      onChange={(e) => {
                        setFormData({ ...formData, email: e.target.value });
                        setEmailError(null); // Clear error when user types
                      }}
                      className={
                        emailError ? "border-destructive pr-10" : "pr-10"
                      }
                    />
                    {emailError && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <AlertCircle className="w-4 h-4 text-destructive" />
                      </div>
                    )}
                  </div>
                  {emailError && (
                    <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {emailError}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium">Password *</label>
                  <Input
                    type="password"
                    placeholder="Minimum 8 characters"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Phone Number</label>
                  <Input
                    placeholder="Enter phone number"
                    value={formData.phoneNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, phoneNumber: e.target.value })
                    }
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium">Organisation *</label>
                  <select
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={formData.organisationId}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        organisationId: e.target.value,
                      })
                    }
                  >
                    <option value="">Select Organisation</option>
                    {organisations.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Extra Fields Section */}
            <div className="space-y-3 pt-2">
              <h3 className="text-sm font-semibold text-primary">
                Additional Information (Optional)
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">College</label>
                  <Input
                    placeholder="e.g., Pune University"
                    value={formData.extraFields.college}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        extraFields: {
                          ...formData.extraFields,
                          college: e.target.value,
                        },
                      })
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Course</label>
                  <Input
                    placeholder="e.g., MCA"
                    value={formData.extraFields.course}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        extraFields: {
                          ...formData.extraFields,
                          course: e.target.value,
                        },
                      })
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Year</label>
                  <Input
                    placeholder="e.g., Final Year"
                    value={formData.extraFields.year}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        extraFields: {
                          ...formData.extraFields,
                          year: e.target.value,
                        },
                      })
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">City</label>
                  <Input
                    placeholder="e.g., Pune"
                    value={formData.extraFields.city}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        extraFields: {
                          ...formData.extraFields,
                          city: e.target.value,
                        },
                      })
                    }
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium">
                    Skills (comma separated)
                  </label>
                  <Input
                    placeholder="e.g., Java, Spring Boot, React"
                    value={formData.extraFields.skills}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        extraFields: {
                          ...formData.extraFields,
                          skills: e.target.value,
                        },
                      })
                    }
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setIsAddDialogOpen(false);
                setEmailError(null);
                setFormData({
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
              }}
            >
              Cancel
            </Button>
            <Button
              variant="hero"
              onClick={handleAddCandidate}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Candidate"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* ✅ ADD BULK UPLOAD COMPONENT HERE */}
      <BulkUploadCandidates
        open={isBulkUploadOpen}
        onOpenChange={setIsBulkUploadOpen}
        onSuccess={fetchData}
      />
      {/* Edit Candidate Dialog */}
      <EditCandidateDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        candidate={selectedCandidate}
        onSuccess={fetchData}
      />
      {/* Delete Confirm Dialog */}
      <DeleteConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        candidateName={candidateToDelete?.user.name || ""}
        onConfirm={handleDeleteConfirm}
        loading={deleting}
      />
    </div>
  );
}
