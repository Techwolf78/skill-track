import { useState, useEffect } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
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
  Download,
  MoreVertical,
  Mail,
  Phone,
  Shield,
  ShieldCheck,
  User,
  Building2,
  Trash2,
  AlertTriangle,
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
import { userService, type UserResponse } from "@/lib/user-service";
import {
  organisationService,
  type OrganisationResponse,
} from "@/lib/organisation-service";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

export default function Users() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [viewUser, setViewUser] = useState<UserResponse | null>(null);

  // Add User Form State
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phoneNumber: "",
    role: "TRAINER",
    organisation_id: "",
  });

  // Edit User Form State
  const [editUser, setEditUser] = useState<UserResponse | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const [editForm, setEditForm] = useState({
    name: "",
    phoneNumber: "",
  });

  useEffect(() => {
    if (editUser) {
      setEditForm({
        name: editUser.name || "",
        phoneNumber: editUser.phoneNumber || "",
      });
    }
  }, [editUser]);

  // Delete User State
  const [userToDelete, setUserToDelete] = useState<UserResponse | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [organisations, setOrganisations] = useState<OrganisationResponse[]>(
    [],
  );

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: userService.getUsers,
  });

  useEffect(() => {
    const fetchOrgs = async () => {
      try {
        const orgs = await organisationService.getOrganisations();
        setOrganisations(orgs);
      } catch (error) {
        console.error("Failed to fetch organisations:", error);
      }
    };
    if (isAddUserOpen) fetchOrgs();
  }, [isAddUserOpen]);

  const filteredUsers = (users as UserResponse[]).filter((user) => {
    // Exclude CANDIDATE role completely
    if (user.role === "CANDIDATE") return false;

    const matchesSearch =
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = roleFilter === "all" || user.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.organisation_id) {
      toast({
        title: "Missing Information",
        description: "Please select an organisation for the user.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await userService.createUser(
        {
          name: formData.name,
          email: formData.email,
          password: formData.password || "Password@123", // Default if blank
          phoneNumber: formData.phoneNumber,
          organisation_id: formData.organisation_id,
        },
        formData.role,
      );

      toast({
        title: "User Created",
        description: `${formData.name} has been added as ${formData.role}.`,
      });

      setIsAddUserOpen(false);
      setFormData({
        name: "",
        email: "",
        password: "",
        phoneNumber: "",
        role: "TRAINER",
        organisation_id: "",
      });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    } catch (error: unknown) {
      let errorMessage = "Failed to create user.";
      if (axios.isAxiosError(error)) {
        errorMessage = error.response?.data?.message || error.message;
      }
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;

    setIsUpdating(true);
    try {
      await userService.patchUser(editUser.id, {
        name: editForm.name,
        phoneNumber: editForm.phoneNumber,
      });

      toast({
        title: "User Updated",
        description: "Profile updated successfully.",
      });

      setEditUser(null);
      queryClient.invalidateQueries({ queryKey: ["users"] });
    } catch (error: unknown) {
      let errorMessage = "Failed to update user.";
      if (axios.isAxiosError(error)) {
        errorMessage = error.response?.data?.message || error.message;
      }
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    try {
      await userService.deleteUser(userToDelete.id);
      toast({
        title: "User Deleted",
        description: `${userToDelete.name} has been removed from the system.`,
      });
      setUserToDelete(null);
      queryClient.invalidateQueries({ queryKey: ["users"] });
    } catch (error: unknown) {
      let errorMessage = "Failed to delete user.";
      if (axios.isAxiosError(error)) {
        errorMessage = error.response?.data?.message || error.message;
      }
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExportUsers = () => {
    if (filteredUsers.length === 0) {
      toast({
        title: "No Data",
        description: "No users match current filters.",
        variant: "destructive",
      });
      return;
    }

    // Format data nicely
    const formattedData = filteredUsers.map((user) => ({
      Name: user.name || "N/A",
      Email: user.email,
      Role: user.role,
      Organisation: user.organisation?.name || "Global / None",
      Phone: user.phoneNumber || "N/A",
      Provider: user.provider || "LOCAL",
      "Joined Date": new Date(user.createdAt).toISOString().split("T")[0],
    }));

    if (formattedData.length === 0) {
      toast({
        title: "No Data",
        description: "No users match current filters.",
        variant: "destructive",
      });
      return;
    }

    // Convert JSON → worksheet
    const worksheet = XLSX.utils.json_to_sheet(formattedData);

    // Add header styling (basic)
    worksheet["!autofilter"] = { ref: "A1:G1" };

    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Users");

    // Auto column width (important for "nicely formatted")
    const colWidths = Object.keys(formattedData[0]).map((key) => {
      const maxLength = Math.max(
        key.length,
        ...formattedData.map(
          (row) => String(row[key as keyof typeof row]).length,
        ),
      );
      return { wch: maxLength + 2 };
    });
    worksheet["!cols"] = colWidths;

    // Generate file
    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });

    const file = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const date = new Date().toISOString().split("T")[0];

    saveAs(file, `Users_${date}.xlsx`);
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "SUPERADMIN":
        return <ShieldCheck className="w-4 h-4 text-primary" />;
      case "ADMIN":
        return <Shield className="w-4 h-4 text-accent" />;
      default:
        return <User className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "SUPERADMIN":
        return "default";
      case "ADMIN":
        return "secondary";
      case "TRAINER":
        return "outline";
      default:
        return "outline";
    }
  };

  return (
    <div className="p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold">System Users</h1>
          <p className="text-muted-foreground mt-1">
            Manage administrators, trainers, and other platform users
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleExportUsers}>
            <Download className="w-4 h-4 mr-2" />
            Export Users
          </Button>

          <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
            <DialogTrigger asChild>
              <Button variant="hero">
                <Plus className="w-4 h-4 mr-2" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <form onSubmit={handleCreateUser}>
                <DialogHeader>
                  <DialogTitle>Add System User</DialogTitle>
                  <DialogDescription>
                    Create a new user account with specific permissions.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        placeholder="John Doe"
                        required
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="john@example.com"
                        required
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="role">User Role</Label>
                      <Select
                        value={formData.role}
                        onValueChange={(val) =>
                          setFormData({ ...formData, role: val })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SUPERADMIN">
                            Super Admin
                          </SelectItem>
                          <SelectItem value="ADMIN">Admin</SelectItem>
                          <SelectItem value="TRAINER">Trainer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="org">Organisation</Label>
                      <Select
                        value={formData.organisation_id}
                        onValueChange={(val) =>
                          setFormData({ ...formData, organisation_id: val })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Org" />
                        </SelectTrigger>
                        <SelectContent>
                          {organisations.map((org) => (
                            <SelectItem key={org.id} value={org.id}>
                              {org.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        placeholder="+91..."
                        value={formData.phoneNumber}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            phoneNumber: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pass">Temporary Password</Label>
                      <Input
                        id="pass"
                        type="password"
                        placeholder="Leave blank for default"
                        value={formData.password}
                        onChange={(e) =>
                          setFormData({ ...formData, password: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAddUserOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" variant="hero" disabled={isSubmitting}>
                    {isSubmitting ? "Creating..." : "Create User"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search users by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-11"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-48 h-11">
            <SelectValue placeholder="Filter by Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="SUPERADMIN">Super Admin</SelectItem>
            <SelectItem value="ADMIN">Admin</SelectItem>
            <SelectItem value="TRAINER">Trainer</SelectItem>
            {/* Remove STUDENT/CANDIDATE option */}
          </SelectContent>
        </Select>
      </div>

      {/* Users Table */}
      <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold py-4">User</TableHead>
              <TableHead className="font-semibold">Role</TableHead>
              <TableHead className="font-semibold">Organisation</TableHead>
              <TableHead className="font-semibold">Contact Info</TableHead>
              <TableHead className="font-semibold">Joined Date</TableHead>
              <TableHead className="font-semibold text-right">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-20 text-muted-foreground"
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    <span>Fetching user database...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-20 text-muted-foreground"
                >
                  No users found matching your criteria.
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow
                  key={user.id}
                  className="hover:bg-muted/30 transition-colors group"
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-bold shadow-sm">
                        {user.name
                          ? user.name
                              .split(" ")
                              .map((n: string) => n[0])
                              .join("")
                              .toUpperCase()
                          : "U"}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground group-hover:text-primary transition-colors">
                          {user.name || "Anonymous User"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getRoleIcon(user.role)}
                      <Badge variant={getRoleBadgeVariant(user.role)}>
                        {user.role}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-medium">
                      {user.organisation?.name || "Global / None"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Mail className="w-3 h-3" />
                        {user.email}
                      </div>
                      {user.phoneNumber && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Phone className="w-3 h-3" />
                          {user.phoneNumber}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="hover:bg-primary/10"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem onClick={() => setViewUser(user)}>
                          View Details
                        </DropdownMenuItem>

                        <DropdownMenuItem onClick={() => setEditUser(user)}>
                          Edit Profile
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          className="text-destructive font-medium"
                          onClick={() => setUserToDelete(user)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete User
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!userToDelete}
        onOpenChange={(open) => !open && setUserToDelete(null)}
      >
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Confirm Deletion
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <strong>{userToDelete?.name}</strong>? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              All associated data, including test results and profile
              information, will be permanently removed from the system.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUserToDelete(null)}>
              Keep User
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteUser}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete Permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Profile Dialog */}
      <Dialog
        open={!!editUser}
        onOpenChange={(open) => !open && setEditUser(null)}
      >
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={handleUpdateUser}>
            <DialogHeader>
              <DialogTitle>Edit Profile</DialogTitle>
              <DialogDescription>
                Update user profile information. Some fields are locked.
              </DialogDescription>
            </DialogHeader>

            {editUser && (
              <div className="space-y-4 py-4">
                {/* Name */}
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input
                    value={editForm.name}
                    onChange={(e) =>
                      setEditForm({ ...editForm, name: e.target.value })
                    }
                    required
                  />
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <Input
                    value={editForm.phoneNumber}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        phoneNumber: e.target.value,
                      })
                    }
                    placeholder="+91..."
                  />
                </div>

                <div className="space-y-2 opacity-60 col-span-2">
                  <Label>Organisation</Label>
                  <Input
                    value={editUser.organisation?.name || "Global / None"}
                    disabled
                  />
                </div>

                {/* Locked Fields */}
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="space-y-2 opacity-60">
                    <Label>Email</Label>
                    <Input value={editUser.email} disabled />
                  </div>

                  <div className="space-y-2 opacity-60">
                    <Label>Role</Label>
                    <Input value={editUser.role} disabled />
                    <p className="text-xs text-muted-foreground">
                      Role cannot be changed
                    </p>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditUser(null)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="hero" disabled={isUpdating}>
                {isUpdating ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View User Details Dialog */}
      <Dialog
        open={!!viewUser}
        onOpenChange={(open) => !open && setViewUser(null)}
      >
        <DialogContent className="sm:max-w-[650px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>
              Complete profile and account information.
            </DialogDescription>
          </DialogHeader>

          {viewUser && (
            <div className="space-y-6 py-4">
              {/* Profile Header */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-primary flex items-center justify-center text-lg font-bold text-primary-foreground shadow">
                  {viewUser.name
                    ?.split(" ")
                    .map((n: string) => n[0])
                    .join("")
                    .toUpperCase() || "U"}
                </div>
                <div>
                  <h3 className="text-xl font-semibold">
                    {viewUser.name || "Anonymous User"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {viewUser.email}
                  </p>
                </div>
              </div>

              {/* Core Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg border bg-muted/40">
                  <p className="text-xs text-muted-foreground mb-1">User ID</p>
                  <p className="text-xs font-mono break-all">{viewUser.id}</p>
                </div>

                <div className="p-4 rounded-lg border bg-muted/40">
                  <p className="text-xs text-muted-foreground mb-1">Role</p>
                  <div className="flex items-center gap-2">
                    {getRoleIcon(viewUser.role)}
                    <Badge variant={getRoleBadgeVariant(viewUser.role)}>
                      {viewUser.role}
                    </Badge>
                  </div>
                </div>

                <div className="p-4 rounded-lg border bg-muted/40">
                  <p className="text-xs text-muted-foreground mb-1">
                    Organisation
                  </p>
                  <p className="text-sm font-medium">
                    {viewUser.organisation?.name || "Global / None"}
                  </p>
                </div>

                <div className="p-4 rounded-lg border bg-muted/40">
                  <p className="text-xs text-muted-foreground mb-1">Provider</p>
                  <Badge variant="outline">
                    {viewUser.provider || "LOCAL"}
                  </Badge>
                </div>
              </div>

              {/* Contact Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg border bg-muted/40">
                  <p className="text-xs text-muted-foreground mb-1">Email</p>
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    {viewUser.email}
                  </div>
                </div>

                <div className="p-4 rounded-lg border bg-muted/40">
                  <p className="text-xs text-muted-foreground mb-1">
                    Phone Number
                  </p>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    {viewUser.phoneNumber || "Not Provided"}
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg border bg-muted/40">
                  <p className="text-xs text-muted-foreground mb-1">
                    Created At
                  </p>
                  <p className="text-sm">
                    {new Date(viewUser.createdAt).toLocaleString()}
                  </p>
                </div>

                <div className="p-4 rounded-lg border bg-muted/40">
                  <p className="text-xs text-muted-foreground mb-1">
                    Last Updated
                  </p>
                  <p className="text-sm">
                    {new Date(viewUser.updatedAt).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* System Notice */}
              <div className="p-4 rounded-lg bg-muted flex items-start gap-3">
                <Shield className="w-5 h-5 text-primary mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  This user’s role and authentication provider are fixed after
                  account creation and cannot be modified.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewUser(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
