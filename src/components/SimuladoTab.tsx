import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { getNotebooks, loadNotebookQuestions, getNotebookSubjects } from "@/lib/storage";
import { Notebook } from "@/types/quiz";
import { useToast } from "@/hooks/use-toast";
import { Play, Plus, Loader2, Clock, CheckCircle2 } from "lucide-react";

interface SimuladoTabProps {
  onRefresh?: () => void;
}

interface Simulado {
  id: string;
  name: string;
  status: string;
  total_questions: number;
  time_limit_minutes: number | null;
}

export const SimuladoTab = ({ onRefresh }: SimuladoTabProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [simulados, setSimulados] = useState<Simulado[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [selectedNotebook, setSelectedNotebook] = useState("");
  const [questionCount, setQuestionCount] = useState("10");

  const loadSimulados = async () => {
    if (!user) return;
    const { data } = await supabase.from("simulados").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setSimulados(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadSimulados();
    getNotebooks().then(setNotebooks);
  }, [user]);

  const handleCreate = async () => {
    if (!name.trim() || !selectedNotebook) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      const questions = await loadNotebookQuestions(selectedNotebook);
      const count = Math.min(parseInt(questionCount) || 10, questions.length);
      const shuffled = [...questions].sort(() => Math.random() - 0.5).slice(0, count);

      const { data: sim, error } = await supabase.from("simulados").insert({
        name: name.trim(), user_id: user!.id, total_questions: count, status: "draft"
      }).select("id").single();
      if (error) throw error;

      const rows = shuffled.map(q => ({
        simulado_id: sim.id, question: q.question, options: q.options,
        correct_answer: q.correctAnswer, subject: q.subject, source_question_id: q.id
      }));
      await supabase.from("simulado_questions").insert(rows);

      toast({ title: "Simulado criado!" });
      setName("");
      loadSimulados();
      onRefresh?.();
    } catch {
      toast({ title: "Erro ao criar simulado", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Plus className="h-5 w-5" /> Criar Simulado</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="Nome do simulado" value={name} onChange={e => setName(e.target.value)} />
          <Select value={selectedNotebook} onValueChange={setSelectedNotebook}>
            <SelectTrigger><SelectValue placeholder="Selecione o caderno" /></SelectTrigger>
            <SelectContent>
              {notebooks.map(nb => <SelectItem key={nb.id} value={nb.id}>{nb.name} ({nb.questionCount}q)</SelectItem>)}
            </SelectContent>
          </Select>
          <Input type="number" placeholder="Nº de questões" value={questionCount} onChange={e => setQuestionCount(e.target.value)} />
          <Button onClick={handleCreate} disabled={creating} className="w-full gradient-primary">
            {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
            Criar
          </Button>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : simulados.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">Nenhum simulado criado.</p>
      ) : (
        <div className="space-y-3">
          {simulados.map(sim => (
            <Card key={sim.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-4 pb-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{sim.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-xs">{sim.total_questions} questões</Badge>
                    <Badge variant={sim.status === "completed" ? "default" : "outline"} className="text-xs">
                      {sim.status === "completed" ? <><CheckCircle2 className="h-3 w-3 mr-1" />Concluído</> : sim.status}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
