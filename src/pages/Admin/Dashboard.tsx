import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, UserPlus, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { userService } from "@/lib/user-service";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import axios from "axios";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phoneNumber: "",
    password: "",
  });

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const orgId = user?.organisationData?.id;

    if (!orgId) {
      console.error("Error: Your account is not associated with any organization.");
      return;
    }

    if (!formData.name || !formData.email) {
      console.error("Validation Error: Full Name and Email are required fields.");
      return;
    }

    setIsSubmitting(true);
    try {
      await userService.createUser(
        {
          name: formData.name,
          email: formData.email,
          password: formData.password || "Temp@123", // default temp password
          phoneNumber: formData.phoneNumber,
          organisation_id: orgId,
        },
        "ADMIN", // role is always ADMIN on the admin side
      );

      toast({
        title: "User Created",
        description: `${formData.name} has been added as an Admin successfully.`,
      });

      setIsAddUserOpen(false);
      setFormData({
        name: "",
        email: "",
        phoneNumber: "",
        password: "",
      });
    } catch (error: unknown) {
      let errorMessage = "Failed to create user.";
      if (axios.isAxiosError(error)) {
        errorMessage = error.response?.data?.message || error.message;
      }
      console.error("Failed to create user:", errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b">
        <div>
          <h1 className="text-3xl font-heading font-bold text-slate-900">Dashboard</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Overview of your recent assessments and candidate performances.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="h-11 rounded-md"
            onClick={() => setIsAddUserOpen(true)}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Add User
          </Button>
          <Button
            variant="hero"
            className="shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all duration-300 group h-11 rounded-md"
            onClick={() => navigate("/admin/tests")}
          >
            <Plus className="w-4 h-4 mr-2 group-hover:rotate-90 transition-transform duration-300" />
            Create Test
          </Button>
        </div>
      </div>

      {/* Coming Soon Placeholder */}
      <div className="flex flex-col items-center justify-center p-16 border border-dashed border-slate-200 rounded-md bg-slate-50/50 min-h-[350px]">
        <h2 className="text-2xl font-bold text-slate-700">Coming Soon</h2>
        <p className="text-slate-400 mt-2 text-sm text-center max-w-md">
          Dashboard analytics, activity feeds, and performance indicators are coming soon.
        </p>
      </div>

      {/* Add User Dialog */}
      <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add User</DialogTitle>
            <DialogDescription>
              Create a new administrator account for your organization.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateUser} className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="John Doe"
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="john@example.com"
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="phoneNumber">Phone Number</Label>
              <Input
                id="phoneNumber"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                placeholder="+91..."
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="password">Temporary Password</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Leave blank for default"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={() => setIsAddUserOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="hero"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create User"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
