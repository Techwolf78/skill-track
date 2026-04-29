import { StatsCard } from "@/components/dashboard/StatsCard";
import { RecentTestsTable } from "@/components/dashboard/RecentTestsTable";
import { Button } from "@/components/ui/button";
import {
  Users,
  FileQuestion,
  ClipboardCheck,
  Plus,
  TrendingUp,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function AdminDashboard() {
  const navigate = useNavigate();

  return (
    <div className="p-8 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back! Here's an overview of your assessments.
          </p>
        </div>
        <Button
          variant="hero"
          size="lg"
          onClick={() => navigate("/admin/tests/create")}
        >
          <Plus className="w-5 h-5" />
          Create Test
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Candidates"
          value="142"
          subtitle="Active in your org"
          icon={Users}
          variant="default"
          trend={{ value: 8, positive: true }}
        />
        <StatsCard
          title="Questions"
          value="89"
          subtitle="In question bank"
          icon={FileQuestion}
          variant="accent"
        />
        <StatsCard
          title="Tests Created"
          value="12"
          subtitle="This month"
          icon={ClipboardCheck}
          variant="success"
        />
        <StatsCard
          title="Submissions"
          value="547"
          subtitle="Total test submissions"
          icon={ClipboardCheck}
          variant="warning"
          trend={{ value: 15, positive: true }}
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentTestsTable />
        </div>

        <div className="space-y-6">
          {/* Quick Actions Card */}
          <div className="rounded-xl border bg-card p-6">
            <h3 className="font-heading font-semibold text-lg mb-4">
              Quick Actions
            </h3>
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start gap-3"
                onClick={() => navigate("/admin/questions")}
              >
                <Plus className="w-4 h-4" />
                Add New Question
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-3"
                onClick={() => navigate("/admin/candidates")}
              >
                <Users className="w-4 h-4" />
                Manage Candidates
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-3"
                onClick={() => navigate("/admin/tests")}
              >
                <ClipboardCheck className="w-4 h-4" />
                View All Tests
              </Button>
            </div>
          </div>

          {/* Performance Overview */}
          <div className="rounded-xl border bg-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-semibold text-lg">Performance</h3>
              <TrendingUp className="w-5 h-5 text-success" />
            </div>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Average Score</span>
                  <span className="font-semibold">68%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-primary rounded-full"
                    style={{ width: "68%" }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Completion Rate</span>
                  <span className="font-semibold">85%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-accent rounded-full"
                    style={{ width: "85%" }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Pass Rate</span>
                  <span className="font-semibold">62%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-success rounded-full"
                    style={{ width: "62%" }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
