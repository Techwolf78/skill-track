// src/pages/Test/TestAccess.tsx
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, Clock, Calendar, AlertCircle } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";

export default function TestAccess() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [testData, setTestData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      validateToken();
    }
  }, [token]);

const validateToken = async () => {
  try {
    setLoading(true);
    // First, validate the token and get invitation
    const response = await apiClient.get(`/candidate-invitations/validate/${token}`);
    const invitation = response.data?.data || response.data;
    console.log("Invitation data:", invitation);
    
    // Now fetch the schedule details to get test info
    if (invitation.scheduleId) {
      const scheduleResponse = await apiClient.get(`/test-schedules/${invitation.scheduleId}`);
      const schedule = scheduleResponse.data?.data || scheduleResponse.data;
      console.log("Schedule data:", schedule);
      
      // Fetch test details
      if (schedule.testId) {
        const testResponse = await apiClient.get(`/tests/${schedule.testId}`);
        const test = testResponse.data?.data || testResponse.data;
        console.log("Test data:", test);
        
        setTestData({
          valid: true,
          invitationId: invitation.id,
          candidateId: invitation.candidateId,  // Added candidateId
          testId: test.id,
          testTitle: test.title,
          durationMins: test.durationMins,
          scheduleId: schedule.id,
          endTime: schedule.endTime,
          token: token
        });
      } else {
        throw new Error("Test not found");
      }
    } else {
      throw new Error("Schedule not found");
    }
    
    setError(null);
  } catch (error: any) {
    console.error("Token validation error:", error);
    const errorMsg = error.response?.data?.message || error.response?.data?.data?.message || "Invalid or expired invitation link";
    setError(errorMsg);
    setTestData(null);
  } finally {
    setLoading(false);
  }
};

  const startTest = async () => {
    if (!testData?.testId || !testData?.scheduleId || !testData?.candidateId) {
      toast({
        title: "Error",
        description: "Missing test, schedule, or candidate information",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log("Creating test session with:", {
        testId: testData.testId,
        scheduleId: testData.scheduleId,
        candidateId: testData.candidateId,
      });

      const response = await apiClient.post("/test-sessions", {
        testId: testData.testId,
        scheduleId: testData.scheduleId,
        candidateId: testData.candidateId,
      });

      const session = response.data?.data || response.data;
      console.log("Test session created:", session);
      toast({ title: "Success", description: "Starting your test..." });

      // Navigate to the actual test interface
      navigate(`/test/${testData.testId}/session/${session.id}`);
    } catch (error: any) {
      console.error("Failed to start test:", error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to start test",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !testData) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" />
              <CardTitle>Invalid Invitation</CardTitle>
            </div>
            <CardDescription>
              {error || "This test invitation is invalid or has expired"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/")} className="w-full">
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <Card className="max-w-lg w-full">
        <CardHeader>
          <CardTitle className="text-2xl">{testData.testTitle}</CardTitle>
          <CardDescription>
            You have been invited to take this assessment
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">Duration</span>
              </div>
              <span className="font-semibold">
                {testData.durationMins} minutes
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">Available until</span>
              </div>
              <span className="font-semibold">
                {testData.endTime
                  ? new Date(testData.endTime).toLocaleString()
                  : "N/A"}
              </span>
            </div>
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-950/20 p-3 rounded-lg text-sm">
            <p className="text-yellow-800 dark:text-yellow-300">
              ⚠️ Please ensure you have a stable internet connection. Once
              started, the test cannot be paused.
            </p>
          </div>

          <Button onClick={startTest} className="w-full" size="lg">
            Start Test
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
