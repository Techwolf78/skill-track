import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock, Trophy, ArrowLeft, Loader2, FileText } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiClient } from "@/lib/api-client";

interface TestResult {
  id: string;
  testSessionId: string;
  candidateId: string;
  totalScore: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
  evaluatedAt: string;
  reportBucketLink?: string;
}

export default function TestResults() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session");
  const [results, setResults] = useState<TestResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (sessionId) {
      fetchResults();
    } else {
      setError("No session ID provided");
      setLoading(false);
    }
  }, [sessionId]);

  const fetchResults = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/test-results/session/${sessionId}`);
      setResults(response.data?.data || response.data);
    } catch (err: any) {
      console.error("Failed to fetch results:", err);
      setError(err.response?.data?.message || "Failed to load test results");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4">Calculating Results...</h2>
        </div>
      </div>
    );
  }

  if (error || !results) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-6">
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Error</h2>
            <p className="text-muted-foreground mb-6">{error || "Could not load results"}</p>
            <Button onClick={() => navigate("/")}>Go Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="text-3xl font-heading font-bold mb-2">Test Completed!</h1>
          <p className="text-muted-foreground">Python Fundamentals Test - CSE 2024</p>
        </motion.div>

        {/* Score Overview */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
            <CardHeader className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Trophy className="w-6 h-6 text-primary" />
                <CardTitle className="text-2xl">Your Score</CardTitle>
              </div>
              <div className="flex flex-col items-center">
                <div className="text-6xl font-bold text-primary mb-2">
                  {results.percentage.toFixed(1)}%
                </div>
                <Badge variant={results.passed ? "default" : "destructive"} className="text-sm px-4 py-1">
                  {results.passed ? "PASSED" : "FAILED"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center max-w-2xl mx-auto">
                <div className="bg-background/50 p-4 rounded-xl border border-primary/10">
                  <div className="text-3xl font-bold text-primary">{results.totalScore}</div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mt-1">Total Score</div>
                </div>
                <div className="bg-background/50 p-4 rounded-xl border border-primary/10">
                  <div className="text-3xl font-bold text-muted-foreground">{results.maxScore}</div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mt-1">Max Score</div>
                </div>
                <div className="bg-background/50 p-4 rounded-xl border border-primary/10">
                  <div className="text-3xl font-bold text-orange-600">
                    {new Date(results.evaluatedAt).toLocaleDateString()}
                  </div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mt-1">Evaluated At</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {results.reportBucketLink && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center"
          >
            <Button variant="outline" asChild>
              <a href={results.reportBucketLink} target="_blank" rel="noopener noreferrer">
                <FileText className="w-4 h-4 mr-2" />
                Download Detailed Report
              </a>
            </Button>
          </motion.div>
        )}

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex gap-4 justify-center"
        >
          <Button onClick={() => navigate("/login")} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Login
          </Button>
          <Button onClick={() => navigate("/")} variant="default">
            Take Another Test
          </Button>
        </motion.div>
      </div>
    </div>
  );
}