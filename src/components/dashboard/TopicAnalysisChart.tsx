import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface TopicScore {
  topic: string;
  avgScore: number;
  difficulty: "Easy" | "Medium" | "Hard";
}

interface TopicAnalysisChartProps {
  data?: TopicScore[];
}

const defaultData: TopicScore[] = [
  { topic: "Data Structures", avgScore: 75, difficulty: "Medium" },
  { topic: "Algorithms", avgScore: 68, difficulty: "Hard" },
  { topic: "Python", avgScore: 82, difficulty: "Easy" },
  { topic: "Java", avgScore: 71, difficulty: "Medium" },
  { topic: "SQL", avgScore: 79, difficulty: "Medium" },
];

export function TopicAnalysisChart({ data = defaultData }: TopicAnalysisChartProps) {
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Easy":
        return "bg-green-100 text-green-700 hover:bg-green-100";
      case "Medium":
        return "bg-yellow-100 text-yellow-700 hover:bg-yellow-100";
      case "Hard":
        return "bg-red-100 text-red-700 hover:bg-red-100";
      default:
        return "bg-gray-100 text-gray-700 hover:bg-gray-100";
    }
  };

  const getProgressColor = (score: number) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <Card className="col-span-1 lg:col-span-2">
      <CardHeader>
        <CardTitle>Topic-wise Performance</CardTitle>
        <CardDescription>Average scores across different technical areas</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {data.map((item) => (
            <div key={item.topic} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{item.topic}</span>
                  <Badge variant="secondary" className={getDifficultyColor(item.difficulty)}>
                    {item.difficulty}
                  </Badge>
                </div>
                <span className="text-sm text-muted-foreground font-semibold">{item.avgScore}%</span>
              </div>
              <Progress value={item.avgScore} className="h-2" indicatorClassName={getProgressColor(item.avgScore)} />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
