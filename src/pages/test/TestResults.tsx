import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock, Trophy, ArrowLeft } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

interface TestResult {
  totalQuestions: number;
  answeredQuestions: number;
  correctAnswers: number;
  timeTaken: number;
  score: number;
  answers: Record<string, string>;
}

export default function TestResults() {
  const navigate = useNavigate();
  const location = useLocation();
  const [results, setResults] = useState<TestResult | null>(null);

  useEffect(() => {
    // Get results from navigation state or localStorage
    const testResults = location.state?.results;
    if (testResults) {
      setResults(testResults);
    } else {
      // Mock results for demonstration
      setResults({
        totalQuestions: 5,
        answeredQuestions: 4,
        correctAnswers: 3,
        timeTaken: 2340, // 39 minutes in seconds
        score: 75,
        answers: {
          "1": "O(log n)",
          "2": "List",
          "3": "def function_name():",
          "4": "Dictionary",
          "5": "Tuple"
        }
      });
    }
  }, [location.state]);

  if (!results) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Loading Results...</h2>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        </div>
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
              <div className="text-6xl font-bold text-primary mb-4">
                {results.score}%
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-green-600">{results.correctAnswers}</div>
                  <div className="text-sm text-muted-foreground">Correct</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-600">{results.totalQuestions - results.correctAnswers}</div>
                  <div className="text-sm text-muted-foreground">Incorrect</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600">{results.answeredQuestions}</div>
                  <div className="text-sm text-muted-foreground">Answered</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-600">{formatTime(results.timeTaken)}</div>
                  <div className="text-sm text-muted-foreground">Time Taken</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Detailed Results */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Question Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(results.answers).map(([questionId, answer], index) => (
                <div key={questionId} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant={index < results.correctAnswers ? "default" : "secondary"}>
                      Q{questionId}
                    </Badge>
                    <span className="font-medium">Question {questionId}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{answer}</span>
                    {index < results.correctAnswers ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600" />
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

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