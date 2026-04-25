import { useState, useEffect } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate, Link } from "react-router-dom";
import { Shield, CheckCircle2, Building2, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { authService } from "@/lib/auth-service";
import { organisationService, OrganisationResponse } from "@/lib/data-service";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const features = [
  "Create your Admin profile",
  "Manage Assessments",
  "Onboard Students",
  "Real-time Analytics",
];

export default function Register() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("ADMIN");
  const [showPassword, setShowPassword] = useState(false);
  const [organisationId, setOrganisationId] = useState("");
  const [organisations, setOrganisations] = useState<OrganisationResponse[]>([]);
  
  // New Organisation States
  const [newOrgName, setNewOrgName] = useState("");
  const [isAddingOrg, setIsAddingOrg] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const fetchOrganisations = async () => {
    try {
      const data = await organisationService.getOrganisations();
      setOrganisations(data);
    } catch (error) {
      console.error("Failed to fetch organisations:", error);
    }
  };

  useEffect(() => {
    fetchOrganisations();
  }, []);

  const handleOrgCreate = async () => {
    if (!newOrgName) return;
    setIsAddingOrg(true);
    try {
      const newOrg = await organisationService.createOrganisation({ name: newOrgName });
      toast({
        title: "Organisation Created",
        description: `${newOrg.name} has been added.`,
      });
      await fetchOrganisations();
      setOrganisationId(newOrg.id);
      setIsDialogOpen(false);
      setNewOrgName("");
    } catch (error: unknown) {
      let errorMessage = "Could not create organisation.";
      if (axios.isAxiosError(error)) {
        errorMessage = error.response?.data?.message || error.message;
      }
      toast({
        title: "Creation Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsAddingOrg(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organisationId) {
      toast({
        title: "Selection Required",
        description: "Please select an organisation.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      await authService.register({
        name,
        email,
        password,
        role,
        organisation_id: organisationId,
      });
      
      toast({
        title: "Registration Successful",
        description: "Your account has been created. Please login.",
      });
      
      navigate("/login");
    } catch (error: unknown) {
      console.error("Registration failed:", error);
      let errorMessage = "Registration failed. Please try again.";
      if (axios.isAxiosError(error)) {
        errorMessage = error.response?.data?.message || error.response?.data || error.message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast({
        title: "Registration Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Hero */}
      <motion.div 
        className="hidden lg:flex lg:w-1/2 bg-gradient-hero p-12 flex-col justify-between relative overflow-hidden"
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent rounded-full blur-3xl" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center shadow-primary">
              <span className="text-2xl font-bold text-primary-foreground">R</span>
            </div>
            <span className="font-heading font-bold text-2xl text-white">RxOne</span>
          </div>
          <p className="text-white/60 text-sm">Skill Assessment Platform</p>
        </div>

        <div className="relative z-10 space-y-8">
          <div>
            <h1 className="text-4xl lg:text-5xl font-heading font-bold text-white leading-tight">
              Join RxOne.
              <br />
              <span className="text-gradient-primary">Empower Growth.</span>
            </h1>
            <p className="text-white/70 mt-4 text-lg max-w-md">
              The complete toolkit for modern educators and talent hunters.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {features.map((feature, index) => (
              <motion.div
                key={feature}
                className="flex items-center gap-3 text-white/80"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
              >
                <CheckCircle2 className="w-6 h-6 text-primary" />
                <span className="text-lg">{feature}</span>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-8 text-white/40 text-sm">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            <span>Enterprise Grade Security</span>
          </div>
        </div>
      </motion.div>

      {/* Right Panel - Register Form */}
      <motion.div 
        className="flex-1 flex items-center justify-center p-8 bg-background"
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <div className="w-full max-w-md space-y-8">
          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-heading font-bold">Create Account</h2>
            <p className="text-muted-foreground mt-2">Get started with RxOne platform today</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                placeholder="John Doe"
                className="h-11"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="john@example.com"
                className="h-11"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="organisation">Organisation</Label>
                  <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                      <button type="button" className="text-xs text-primary font-medium flex items-center hover:underline">
                        <Plus className="w-3 h-3 mr-1" /> Add New
                      </button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Organisation</DialogTitle>
                        <DialogDescription>
                          Create a new organisation to link your account to.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Organisation Name</Label>
                          <Input 
                            placeholder="e.g. Acme Corp" 
                            value={newOrgName}
                            onChange={(e) => setNewOrgName(e.target.value)}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button 
                          variant="hero" 
                          onClick={handleOrgCreate}
                          disabled={isAddingOrg}
                        >
                          {isAddingOrg ? "Creating..." : "Create Organisation"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
                <Select value={organisationId} onValueChange={setOrganisationId}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select Organisation" />
                  </SelectTrigger>
                  <SelectContent>
                    {organisations.length === 0 ? (
                      <SelectItem value="none" disabled>No organisations found</SelectItem>
                    ) : (
                      organisations.map((org) => (
                        <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Account Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="SUPERADMIN">Super Admin</SelectItem>
                  <SelectItem value="TRAINER">Trainer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="h-11 pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <Button 
              type="submit" 
              variant="hero" 
              size="lg" 
              className="w-full h-12 text-lg mt-4"
              disabled={isLoading}
            >
              {isLoading ? "Creating Account..." : "Register Now"}
            </Button>

            <p className="text-center text-muted-foreground mt-4">
              Already have an account?{" "}
              <Link to="/login" className="text-primary font-semibold hover:underline">
                Sign In
              </Link>
            </p>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
