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
import { Loader2, AlertCircle, Building2 } from "lucide-react";
import type { Candidate } from "@/lib/candidate-service";
import { organisationService, type OrganisationResponse } from "@/lib/organisation-service";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { CustomFieldsSection, CustomFieldItem } from "@/components/candidates/CustomFieldsSection";

interface EditCandidateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidate: Candidate | null;
  onSuccess: () => void;
  isSuperAdmin?: boolean;
}

export function EditCandidateDialog({ open, onOpenChange, candidate, onSuccess, isSuperAdmin }: EditCandidateDialogProps) {
  const [loading, setLoading] = useState(false);
  const [organisations, setOrganisations] = useState<OrganisationResponse[]>([]);
  const [customFields, setCustomFields] = useState<CustomFieldItem[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    phoneNumber: "",
    organisationId: "",
  });
  const { toast } = useToast();

  // Fetch organisations if SuperAdmin
  useEffect(() => {
    if (isSuperAdmin && open) {
      organisationService.getOrganisations()
        .then(data => setOrganisations(data))
        .catch(err => console.error("Failed to fetch organisations", err));
    }
  }, [isSuperAdmin, open]);

  // Populate form when candidate changes
  useEffect(() => {
    if (candidate) {
      setFormData({
        name: candidate.user.name || "",
        phoneNumber: candidate.user.phoneNumber || "",
        organisationId: candidate.organisation?.id || "",
      });

      const loadedCustomFields: CustomFieldItem[] = [];
      if (candidate.extraFields) {
        Object.entries(candidate.extraFields).forEach(([k, v]) => {
          if (v !== undefined && v !== null) {
            const valStr = Array.isArray(v) ? v.join(", ") : String(v);
            loadedCustomFields.push({
              id: "cf_" + Math.random().toString(36).substring(2, 9),
              key: k,
              value: valStr,
            });
          }
        });
      }
      setCustomFields(loadedCustomFields);
    }
  }, [candidate]);

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      console.error("Validation Error: Name is required");
      return;
    }

    if (isSuperAdmin && !formData.organisationId) {
      console.error("Validation Error: Organisation is required");
      return;
    }

    if (!candidate) return;

    setLoading(true);
    try {
      // Prepare extra fields from customFields
      const extraFields: Record<string, unknown> = {};
      for (const item of customFields) {
        const k = item.key.trim();
        const v = item.value.trim();
        if (k && v) {
          extraFields[k] = v;
        }
      }

      const payload: {
        name: string;
        phoneNumber?: string;
        extraFields?: Record<string, unknown>;
        organisationId?: string;
      } = {
        name: formData.name,
        phoneNumber: formData.phoneNumber || undefined,
        extraFields,
      };

      if (isSuperAdmin) {
        payload.organisationId = formData.organisationId;
      }

      await apiClient.patch(`/candidates/${candidate.id}`, payload);

      toast({ title: "Success", description: "Candidate updated successfully" });
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to update candidate:", (error as { response?: { data?: { message?: string } } }).response?.data?.message || error);
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
              {isSuperAdmin && (
                <div className="col-span-2">
                  <Label>Organisation</Label>
                  <Select 
                    value={formData.organisationId} 
                    onValueChange={(v) => setFormData({ ...formData, organisationId: v })}
                    disabled
                  >
                    <SelectTrigger className="bg-muted">
                      <SelectValue placeholder="Select Organisation" />
                    </SelectTrigger>
                    <SelectContent>
                      {organisations.map(org => (
                        <SelectItem key={org.id} value={org.id}>
                          {org.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">Organisation cannot be changed after creation</p>
                </div>
              )}
            </div>
          </div>

          {/* Custom Fields */}
          <div>
            <CustomFieldsSection customFields={customFields} onChange={setCustomFields} />
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