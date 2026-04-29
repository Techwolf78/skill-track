// src/pages/Admin/EditCandidateDialog.tsx
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/lib/api-client";
import { Loader2, AlertCircle } from "lucide-react";
import type { Candidate } from "@/lib/candidate-service";

interface EditCandidateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidate: Candidate | null;
  onSuccess: () => void;
}

export function EditCandidateDialog({ open, onOpenChange, candidate, onSuccess }: EditCandidateDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phoneNumber: "",
    college: "",
    course: "",
    year: "",
    city: "",
    skills: "",
  });
  const { toast } = useToast();

  // Populate form when candidate changes
  useEffect(() => {
    if (candidate) {
      setFormData({
        name: candidate.user.name || "",
        phoneNumber: candidate.user.phoneNumber || "",
        college: (candidate.extraFields?.college as string) || "",
        course: (candidate.extraFields?.course as string) || "",
        year: (candidate.extraFields?.year as string) || "",
        city: (candidate.extraFields?.city as string) || "",
        skills: Array.isArray(candidate.extraFields?.skills) 
          ? (candidate.extraFields?.skills as string[]).join(", ")
          : (candidate.extraFields?.skills as string) || "",
      });
    }
  }, [candidate]);

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast({ title: "Error", description: "Name is required", variant: "destructive" });
      return;
    }

    if (!candidate) return;

    setLoading(true);
    try {
      // Prepare extra fields
      const extraFields: Record<string, unknown> = {};
      if (formData.college) extraFields.college = formData.college;
      if (formData.course) extraFields.course = formData.course;
      if (formData.year) extraFields.year = formData.year;
      if (formData.city) extraFields.city = formData.city;
      if (formData.skills) {
        extraFields.skills = formData.skills.split(",").map(s => s.trim());
      }

      await apiClient.patch(`/candidates/${candidate.id}`, {
        name: formData.name,
        phoneNumber: formData.phoneNumber || undefined,
        extraFields: Object.keys(extraFields).length > 0 ? extraFields : undefined,
      });

      toast({ title: "Success", description: "Candidate updated successfully" });
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Failed to update candidate:", error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to update candidate",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Candidate</DialogTitle>
          <DialogDescription>
            Update candidate information
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Basic Information */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-primary">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Full Name *</Label>
                <Input
                  placeholder="Enter candidate name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <Label>Phone Number</Label>
                <Input
                  placeholder="Enter phone number"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <Label>Email</Label>
                <Input
                  value={candidate?.user.email || ""}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground mt-1">Email cannot be changed</p>
              </div>
            </div>
          </div>

          {/* Additional Information */}
          <div className="space-y-3 pt-2">
            <h3 className="text-sm font-semibold text-primary">Additional Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>College</Label>
                <Input
                  placeholder="e.g., Pune University"
                  value={formData.college}
                  onChange={(e) => setFormData({ ...formData, college: e.target.value })}
                />
              </div>
              <div>
                <Label>Course</Label>
                <Input
                  placeholder="e.g., MCA"
                  value={formData.course}
                  onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                />
              </div>
              <div>
                <Label>Year</Label>
                <Input
                  placeholder="e.g., Final Year"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                />
              </div>
              <div>
                <Label>City</Label>
                <Input
                  placeholder="e.g., Pune"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <Label>Skills (comma separated)</Label>
                <Input
                  placeholder="e.g., Java, Spring Boot, React"
                  value={formData.skills}
                  onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}