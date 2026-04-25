import { useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { organisationService, type OrganisationResponse } from "@/lib/data-service";
import { useToast } from "@/hooks/use-toast";

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

  const { data: organisations = [], isLoading } = useQuery({
    queryKey: ["organisations"],
    queryFn: organisationService.getOrganisations,
  });

  const filteredOrgs = (organisations as OrganisationResponse[]).filter((org) =>
    org.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await organisationService.createOrganisation({ name: newOrgName, logoUrl: newOrgLogo || undefined });
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

  return (
    <div className="p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold">Organisations</h1>
          <p className="text-muted-foreground mt-1">
            Manage partner organisations and academies
          </p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button variant="hero">
              <Plus className="w-4 h-4 mr-2" />
              Add Organisation
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[420px]">
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>Add Organisation</DialogTitle>
                <DialogDescription>Create a new partner organisation.</DialogDescription>
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
                <Button type="submit" variant="hero" disabled={isSubmitting}>
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
          className="pl-10 h-11"
        />
      </div>

      {/* Organisation Cards Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-muted-foreground">Loading organisations...</span>
          </div>
        </div>
      ) : filteredOrgs.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Building2 className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">No organisations found</p>
          <p className="text-sm mt-1">Create one using the button above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOrgs.map((org) => (
            <Card key={org.id} className="card-hover group">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center shadow-primary">
                    {org.logoUrl ? (
                      <img src={org.logoUrl} alt={org.name} className="w-8 h-8 rounded-lg object-cover" />
                    ) : (
                      <Building2 className="w-6 h-6 text-primary-foreground" />
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => {
                        setEditingOrg(org);
                        setEditName(org.name);
                        setEditLogo(org.logoUrl || "");
                      }}>
                        <Pencil className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive font-medium"
                        onClick={() => setOrgToDelete(org)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <CardTitle className="mt-3 text-lg">{org.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-xs text-muted-foreground border-t pt-4">
                  <Calendar className="w-3 h-3" />
                  <span>Created {new Date(org.createdAt).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

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
            <Button variant="hero" onClick={handleUpdate} disabled={isUpdating}>
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
