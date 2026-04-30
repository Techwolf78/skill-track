import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface Performer {
  name: string;
  score: number;
  batch: string;
  rank: number;
}

const defaultPerformers: Performer[] = [
  { rank: 1, name: "Sneha Gupta", batch: "CSE 2025", score: 95 },
  { rank: 2, name: "Priya Patel", batch: "CSE 2024", score: 92 },
  { rank: 3, name: "Rahul Sharma", batch: "CSE 2024", score: 88 },
  { rank: 4, name: "Amit Kumar", batch: "IT 2024", score: 85 },
  { rank: 5, name: "Vikram Singh", batch: "MCA 2024", score: 82 },
];

export function TopPerformersCard({ performers = defaultPerformers }: { performers?: Performer[] }) {
  return (
    <Card className="col-span-1 lg:col-span-2">
      <CardHeader>
        <CardTitle>Top Performers</CardTitle>
        <CardDescription>Highest scoring candidates across assessments</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Rank</TableHead>
              <TableHead>Candidate</TableHead>
              <TableHead>Batch</TableHead>
              <TableHead className="text-right">Score</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {performers.map((item) => (
              <TableRow key={item.name}>
                <TableCell className="font-medium">
                  {item.rank === 1 && <Badge className="bg-yellow-500 hover:bg-yellow-600">1st</Badge>}
                  {item.rank === 2 && <Badge className="bg-slate-300 hover:bg-slate-400">2nd</Badge>}
                  {item.rank === 3 && <Badge className="bg-amber-600 hover:bg-amber-700">3rd</Badge>}
                  {item.rank > 3 && <span className="pl-3">{item.rank}th</span>}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8 text-[10px]">
                      <AvatarFallback>{item.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                    </Avatar>
                    <span>{item.name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{item.batch}</TableCell>
                <TableCell className="text-right font-bold text-primary">{item.score}%</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
