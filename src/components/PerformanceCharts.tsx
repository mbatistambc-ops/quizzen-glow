import { SubjectStats } from "@/types/quiz";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { TrendingUp, Target } from "lucide-react";

interface PerformanceChartsProps {
  stats: SubjectStats[];
  onFilterBySubject?: (subject: string) => void;
}

export const PerformanceCharts = ({ stats, onFilterBySubject }: PerformanceChartsProps) => {
  if (stats.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Target className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">Sem dados de desempenho</h3>
          <p className="text-muted-foreground text-sm mt-1">Responda questões para ver seus gráficos aqui.</p>
        </CardContent>
      </Card>
    );
  }

  const totalCorrect = stats.reduce((a, s) => a + s.correct, 0);
  const totalQuestions = stats.reduce((a, s) => a + s.total, 0);
  const overallPercentage = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

  const getBarColor = (percentage: number) => {
    if (percentage >= 70) return "hsl(142, 76%, 36%)";
    if (percentage >= 50) return "hsl(38, 92%, 50%)";
    return "hsl(0, 84%, 60%)";
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold">{totalCorrect}/{totalQuestions}</p>
            <p className="text-sm text-muted-foreground">Acertos totais</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold">{overallPercentage}%</p>
            <p className="text-sm text-muted-foreground">Taxa de acerto</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold">{stats.length}</p>
            <p className="text-sm text-muted-foreground">Matérias estudadas</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-5 w-5" /> Desempenho por Matéria
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={Math.max(200, stats.length * 50)}>
            <BarChart data={stats} layout="vertical" margin={{ left: 20, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
              <YAxis
                type="category"
                dataKey="subject"
                width={120}
                tick={{ fontSize: 12, cursor: onFilterBySubject ? "pointer" : "default" }}
                onClick={(e: any) => onFilterBySubject?.(e.value)}
              />
              <Tooltip formatter={(value: number) => [`${value}%`, "Acerto"]} />
              <Bar dataKey="percentage" radius={[0, 6, 6, 0]} maxBarSize={30}>
                {stats.map((entry, index) => (
                  <Cell key={index} fill={getBarColor(entry.percentage)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {stats.map((stat) => (
          <Card
            key={stat.subject}
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => onFilterBySubject?.(stat.subject)}
          >
            <CardContent className="pt-4 pb-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium text-sm">{stat.subject}</p>
                  <p className="text-xs text-muted-foreground">{stat.correct}/{stat.total} acertos</p>
                </div>
                <span className={`text-lg font-bold ${stat.percentage >= 70 ? "text-green-500" : stat.percentage >= 50 ? "text-yellow-500" : "text-destructive"}`}>
                  {stat.percentage}%
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
