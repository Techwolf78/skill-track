import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function AdminDashboard() {
  const navigate = useNavigate();

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
    </div>
  );
}
