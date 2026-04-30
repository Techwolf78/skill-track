import { StatsCard } from "@/components/dashboard/StatsCard";
import { RecentTestsTable } from "@/components/dashboard/RecentTestsTable";
import { TopicAnalysisChart } from "@/components/dashboard/TopicAnalysisChart";
import { TopPerformersCard } from "@/components/dashboard/TopPerformersCard";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  FileQuestion,
  ClipboardCheck,
  Plus,
  TrendingUp,
  Activity,
  Send,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function AdminDashboard() {
  const navigate = useNavigate();

  return (
    <div className="p-8 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back! Here's an overview of your assessments.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select defaultValue="all">
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select Batch" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Batches</SelectItem>
              <SelectItem value="cse2024">CSE 2024</SelectItem>
              <SelectItem value="it2024">IT 2024</SelectItem>
              <SelectItem value="cse2025">CSE 2025</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="hero"
            size="lg"
            className="hidden md:flex"
            onClick={() => navigate("/admin/tests/create")}
          >
            <Plus className="w-5 h-5" />
            Create Test
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
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
          title="Live Now"
          value="3"
          subtitle="Tests in progress"
          icon={Activity}
          variant="warning"
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
          variant="default"
          trend={{ value: 15, positive: true }}
        />
      </div>

      {/* Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <TopicAnalysisChart />
        <TopPerformersCard />
      </div>

      {/* Quick Actions & Recent Activity */}
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
                variant="hero"
                className="w-full justify-start gap-3 md:hidden mb-2"
                onClick={() => navigate("/admin/tests/create")}
              >
                <Plus className="w-4 h-4" />
                Create Test
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-3"
                onClick={() => navigate("/admin/candidates?invite=true")}
              >
                <Send className="w-4 h-4" />
                Quick Invite Candidates
              </Button>
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
