import { useState, useEffect } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Eye,
  EyeOff,
  Pencil,
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
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { useOrganisationsQuery } from "@/hooks/use-query-hooks";
import { formatDate, getTodayDateString } from "@/lib/date-utils";

export default function Users() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [viewUser, setViewUser] = useState<UserResponse | null>(null);

  // Add User Form State
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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

  const { data: organisations = [] } = useOrganisationsQuery();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users", roleFilter],
    queryFn: () =>
      userService.getUsers({
        excludeRole: "CANDIDATE",
        role: roleFilter !== "all" ? roleFilter : undefined,
        size: 1000,
      }),
  });

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

    const formattedData = filteredUsers.map((user) => ({
      Name: user.name || "N/A",
      Email: user.email,
      Role: user.role,
      Organisation: user.organisation?.name || "Global / None",
      Phone: user.phoneNumber || "N/A",
      Provider: user.provider || "LOCAL",
      "Joined Date": formatDate(user.createdAt),
    }));

    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    worksheet["!autofilter"] = { ref: "A1:G1" };

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Users");

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

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });

    const file = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const date = getTodayDateString();
    saveAs(file, `Users_${date}.xlsx`);
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "SUPERADMIN":
        return (
          <span className="px-2 py-0.5 bg-slate-900 text-white text-[10px] font-semibold rounded inline-flex items-center gap-1 shadow-2xs">
            <ShieldCheck className="w-3 h-3 text-white" />
            Super Admin
          </span>
        );
      case "ADMIN":
        return (
          <span className="px-2 py-0.5 bg-slate-100 text-slate-800 border border-slate-200 text-[10px] font-semibold rounded inline-flex items-center gap-1">
            <Shield className="w-3 h-3 text-slate-600" />
            Admin
          </span>
        );
      case "TRAINER":
        return (
          <span className="px-2 py-0.5 bg-slate-50 text-slate-600 border border-slate-200 text-[10px] font-medium rounded inline-flex items-center gap-1">
            <User className="w-3 h-3 text-slate-400" />
            Trainer
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 bg-slate-50 text-slate-600 border border-slate-200 text-[10px] font-medium rounded">
            {role}
          </span>
        );
    }
  };

  return (
    <div className="p-8 space-y-6 animate-fade-in font-sans">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold text-slate-900">Users</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage administrators, trainers, and other platform users
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportUsers}
            className="h-9 text-xs font-medium border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded"
          >
            <Download className="w-4 h-4 mr-1.5 text-slate-500" />
            Export Users
          </Button>

          <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
            <DialogTrigger asChild>
              <Button
                variant="default"
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold h-9 px-4 rounded"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px] bg-white text-slate-900 p-6">
              <form onSubmit={handleCreateUser}>
                <DialogHeader className="border-b border-slate-100 pb-3">
                  <DialogTitle className="text-base font-bold text-slate-900">Add System User</DialogTitle>
                  <DialogDescription className="text-xs text-slate-500">
                    Create a new user account with specific role permissions.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="name" className="text-xs font-semibold text-slate-700">Full Name</Label>
                      <Input
                        id="name"
                        placeholder="John Doe"
                        required
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        className="h-9 text-xs border-slate-200"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="email" className="text-xs font-semibold text-slate-700">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="john@example.com"
                        required
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                        className="h-9 text-xs border-slate-200"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="role" className="text-xs font-semibold text-slate-700">User Role</Label>
                      <Select
                        value={formData.role}
                        onValueChange={(val) =>
                          setFormData({ ...formData, role: val })
                        }
                      >
                        <SelectTrigger className="h-9 text-xs border-slate-200">
                          <SelectValue placeholder="Select Role" />
                        </SelectTrigger>
                        <SelectContent className="text-xs">
                          <SelectItem value="SUPERADMIN">Super Admin</SelectItem>
                          <SelectItem value="ADMIN">Admin</SelectItem>
                          <SelectItem value="TRAINER">Trainer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="org" className="text-xs font-semibold text-slate-700">Organisation</Label>
                      <Select
                        value={formData.organisation_id}
                        onValueChange={(val) =>
                          setFormData({ ...formData, organisation_id: val })
                        }
                      >
                        <SelectTrigger className="h-9 text-xs border-slate-200">
                          <SelectValue placeholder="Select Org" />
                        </SelectTrigger>
                        <SelectContent className="text-xs">
                          {organisations.map((org) => (
                            <SelectItem key={org.id} value={org.id}>
                              {org.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="phone" className="text-xs font-semibold text-slate-700">Phone Number</Label>
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
                        className="h-9 text-xs border-slate-200"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="pass" className="text-xs font-semibold text-slate-700">Temporary Password</Label>
                      <div className="relative">
                        <Input
                          id="pass"
                          type={showPassword ? "text" : "password"}
                          placeholder="Leave blank for default"
                          value={formData.password}
                          onChange={(e) =>
                            setFormData({ ...formData, password: e.target.value })
                          }
                          className="pr-9 h-9 text-xs border-slate-200"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors focus:outline-none"
                          tabIndex={-1}
                        >
                          {showPassword ? (
                            <EyeOff className="w-3.5 h-3.5" />
                          ) : (
                            <Eye className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <DialogFooter className="border-t border-slate-100 pt-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAddUserOpen(false)}
                    className="h-9 text-xs border-slate-200 text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold h-9"
                  >
                    {isSubmitting ? "Creating..." : "Create User"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search users by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-10 text-xs border-slate-200 focus-visible:ring-slate-400"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-44 h-10 text-xs border-slate-200 bg-white">
            <SelectValue placeholder="Filter by Role" />
          </SelectTrigger>
          <SelectContent className="text-xs">
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="SUPERADMIN">Super Admin</SelectItem>
            <SelectItem value="ADMIN">Admin</SelectItem>
            <SelectItem value="TRAINER">Trainer</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Users Table */}
      <div className="rounded-lg border border-slate-200/90 bg-white overflow-hidden shadow-2xs">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/80 hover:bg-slate-50/80 border-b border-slate-200">
              <TableHead className="text-[11.5px] font-bold text-slate-700 py-3 uppercase tracking-wider pl-4">User</TableHead>
              <TableHead className="text-[11.5px] font-bold text-slate-700 py-3 uppercase tracking-wider">Role</TableHead>
              <TableHead className="text-[11.5px] font-bold text-slate-700 py-3 uppercase tracking-wider">Organisation</TableHead>
              <TableHead className="text-[11.5px] font-bold text-slate-700 py-3 uppercase tracking-wider">Contact Info</TableHead>
              <TableHead className="text-[11.5px] font-bold text-slate-700 py-3 uppercase tracking-wider">Joined Date</TableHead>
              <TableHead className="text-[11.5px] font-bold text-slate-700 py-3 uppercase tracking-wider text-right pr-4">
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
                    <div className="w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs">Fetching user database...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-20 text-muted-foreground text-xs"
                >
                  No users found matching your criteria.
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow
                  key={user.id}
                  className="hover:bg-slate-50/50 border-b border-slate-100 transition-colors group"
                >
                  <TableCell className="pl-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-md bg-slate-900 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-2xs">
                        {user.name
                          ? user.name
                              .split(" ")
                              .map((n: string) => n[0])
                              .join("")
                              .toUpperCase()
                          : "U"}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 leading-tight">
                          {user.name || "Anonymous User"}
                        </p>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                          {user.email}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getRoleBadge(user.role)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-xs font-medium text-slate-800">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      <span>{user.organisation?.name || "Global / None"}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-0.5 text-xs">
                      <div className="flex items-center gap-1.5 text-slate-600 font-mono text-[11px]">
                        <Mail className="w-3 h-3 text-slate-400" />
                        {user.email}
                      </div>
                      {user.phoneNumber && (
                        <div className="flex items-center gap-1.5 text-slate-500 font-mono text-[11px]">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {user.phoneNumber}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-slate-500 font-mono">
                      {new Date(user.createdAt).toLocaleDateString("en-GB")}
                    </span>
                  </TableCell>
                  <TableCell className="text-right pr-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-slate-400 hover:text-slate-800 rounded"
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="text-xs w-36">
                        <DropdownMenuItem onClick={() => setViewUser(user)}>
                          <Eye className="w-3.5 h-3.5 mr-2 text-slate-500" />
                          View Details
                        </DropdownMenuItem>

                        <DropdownMenuItem onClick={() => setEditUser(user)}>
                          <Pencil className="w-3.5 h-3.5 mr-2 text-slate-500" />
                          Edit Profile
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          className="text-destructive font-medium"
                          onClick={() => setUserToDelete(user)}
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-2" />
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
        <DialogContent className="sm:max-w-[420px] bg-white text-slate-900 p-6">
          <DialogHeader className="border-b border-slate-100 pb-3">
            <DialogTitle className="flex items-center gap-2 text-rose-600 text-base font-bold">
              <AlertTriangle className="w-5 h-5" />
              Confirm Deletion
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Are you sure you want to delete{" "}
              <strong className="text-slate-900">{userToDelete?.name}</strong>? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-3">
            <p className="text-xs text-slate-500">
              All associated data, including test results and profile
              information, will be permanently removed from the system.
            </p>
          </div>
          <DialogFooter className="border-t border-slate-100 pt-3">
            <Button
              variant="outline"
              onClick={() => setUserToDelete(null)}
              className="h-9 text-xs border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteUser}
              disabled={isDeleting}
              className="h-9 text-xs font-semibold"
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
        <DialogContent className="sm:max-w-[480px] bg-white text-slate-900 p-6">
          <form onSubmit={handleUpdateUser}>
            <DialogHeader className="border-b border-slate-100 pb-3">
              <DialogTitle className="text-base font-bold text-slate-900">Edit Profile</DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Update user profile information. System role and email are locked.
              </DialogDescription>
            </DialogHeader>

            {editUser && (
              <div className="space-y-3.5 py-4">
                {/* Name */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Full Name</Label>
                  <Input
                    value={editForm.name}
                    onChange={(e) =>
                      setEditForm({ ...editForm, name: e.target.value })
                    }
                    required
                    className="h-9 text-xs border-slate-200"
                  />
                </div>

                {/* Phone */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Phone Number</Label>
                  <Input
                    value={editForm.phoneNumber}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        phoneNumber: e.target.value,
                      })
                    }
                    placeholder="+91..."
                    className="h-9 text-xs border-slate-200"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-500">Organisation</Label>
                  <Input
                    value={editUser.organisation?.name || "Global / None"}
                    disabled
                    className="h-9 text-xs bg-slate-50 border-slate-200 text-slate-600"
                  />
                </div>

                {/* Locked Fields */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-500">Email Address</Label>
                    <Input
                      value={editUser.email}
                      disabled
                      className="h-9 text-xs bg-slate-50 border-slate-200 text-slate-600 font-mono text-[11px]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-500">Role</Label>
                    <Input
                      value={editUser.role}
                      disabled
                      className="h-9 text-xs bg-slate-50 border-slate-200 text-slate-600"
                    />
                  </div>
                </div>
              </div>
            )}

            <DialogFooter className="border-t border-slate-100 pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditUser(null)}
                className="h-9 text-xs border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isUpdating}
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold h-9"
              >
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
        <DialogContent className="sm:max-w-[540px] bg-white text-slate-900 p-6 max-h-[85vh] overflow-y-auto">
          <DialogHeader className="border-b border-slate-100 pb-3">
            <DialogTitle className="text-base font-bold text-slate-900">User Details</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Complete profile and account information.
            </DialogDescription>
          </DialogHeader>

          {viewUser && (
            <div className="space-y-4 py-3">
              {/* Profile Header */}
              <div className="flex items-center gap-3 p-3 bg-slate-50/75 border border-slate-200/80 rounded-md">
                <div className="w-11 h-11 rounded-md bg-slate-900 flex items-center justify-center text-sm font-bold text-white shadow-2xs shrink-0">
                  {viewUser.name
                    ?.split(" ")
                    .map((n: string) => n[0])
                    .join("")
                    .toUpperCase() || "U"}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {viewUser.name || "Anonymous User"}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    {viewUser.email}
                  </p>
                </div>
              </div>

              {/* Core Info */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-md border border-slate-200/80 bg-slate-50/60">
                  <p className="text-[11px] text-slate-500 mb-0.5">User ID</p>
                  <p className="text-xs font-mono font-semibold text-slate-800 break-all">{viewUser.id}</p>
                </div>

                <div className="p-3 rounded-md border border-slate-200/80 bg-slate-50/60">
                  <p className="text-[11px] text-slate-500 mb-1">Role</p>
                  <div>
                    {getRoleBadge(viewUser.role)}
                  </div>
                </div>

                <div className="p-3 rounded-md border border-slate-200/80 bg-slate-50/60">
                  <p className="text-[11px] text-slate-500 mb-0.5">Organisation</p>
                  <p className="text-xs font-semibold text-slate-800">
                    {viewUser.organisation?.name || "Global / None"}
                  </p>
                </div>

                <div className="p-3 rounded-md border border-slate-200/80 bg-slate-50/60">
                  <p className="text-[11px] text-slate-500 mb-0.5">Provider</p>
                  <span className="px-2 py-0.5 bg-white border border-slate-200 text-slate-700 text-[10px] font-mono font-medium rounded">
                    {viewUser.provider || "LOCAL"}
                  </span>
                </div>
              </div>

              {/* Contact Info */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-md border border-slate-200/80 bg-slate-50/60">
                  <p className="text-[11px] text-slate-500 mb-0.5">Email</p>
                  <div className="flex items-center gap-1.5 text-xs font-mono text-slate-700">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    {viewUser.email}
                  </div>
                </div>

                <div className="p-3 rounded-md border border-slate-200/80 bg-slate-50/60">
                  <p className="text-[11px] text-slate-500 mb-0.5">Phone Number</p>
                  <div className="flex items-center gap-1.5 text-xs font-mono text-slate-700">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    {viewUser.phoneNumber || "Not Provided"}
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-md border border-slate-200/80 bg-slate-50/60">
                  <p className="text-[11px] text-slate-500 mb-0.5">Created At</p>
                  <p className="text-xs font-mono text-slate-700">
                    {new Date(viewUser.createdAt).toLocaleString()}
                  </p>
                </div>

                <div className="p-3 rounded-md border border-slate-200/80 bg-slate-50/60">
                  <p className="text-[11px] text-slate-500 mb-0.5">Last Updated</p>
                  <p className="text-xs font-mono text-slate-700">
                    {new Date(viewUser.updatedAt).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* System Notice */}
              <div className="p-3 rounded-md bg-slate-50 border border-slate-200/70 flex items-start gap-2.5">
                <Shield className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  This user’s role and authentication provider are fixed after
                  account creation and cannot be modified.
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="border-t border-slate-100 pt-3">
            <Button
              variant="outline"
              onClick={() => setViewUser(null)}
              className="h-9 text-xs border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
