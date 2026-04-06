import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { saveNotebook, addQuestionsToNotebook, getNotebooks } from "@/lib/storage";
import { Question, Notebook } from "@/types/quiz";
import { Upload, Loader2 } from "lucide-react";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onQuestionsLoaded: (questions: Question[], notebookId: string) => void;
}

export const UploadModal = ({ isOpen, onClose, onQuestionsLoaded }: UploadModalProps) => {
  const { toast } = useToast();
  const [notebookName, setNotebookName] = useState("");
  const [rawText, setRawText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [existingNotebooks, setExistingNotebooks] = useState<Notebook[]>([]);
  const [selectedNotebook, setSelectedNotebook] = useState<string>("new");

  const loadNotebooks = async () => {
    const nbs = await getNotebooks();
    setExistingNotebooks(nbs);
  };

  useState(() => {
    if (isOpen) loadNotebooks();
  });

  const parseQuestions = (text: string): Omit<Question, "id" | "notebookId">[] => {
    const questions: Omit<Question, "id" | "notebookId">[] = [];
    // Simple parser: expects format like:
    // Matéria: X
    // 1. Question text
    // A) option
    // B) option
    // C) option
    // D) option
    // Resposta: A
    const blocks = text.split(/\n(?=\d+[\.\)]\s)/);
    let currentSubject = "Geral";

    for (const block of blocks) {
      const subjectMatch = block.match(/(?:Mat[ée]ria|Assunto|Subject):\s*(.+)/i);
      if (subjectMatch) currentSubject = subjectMatch[1].trim();

      const questionMatch = block.match(/\d+[\.\)]\s*(.+?)(?=\n[A-E][\)\.])/s);
      if (!questionMatch) continue;

      const questionText = questionMatch[1].trim();
      const optionMatches = [...block.matchAll(/([A-E])[\)\.\-]\s*(.+)/g)];
      if (optionMatches.length < 2) continue;

      const options = optionMatches.map(m => m[2].trim());
      const answerMatch = block.match(/(?:Resposta|Gabarito|Answer|Correta):\s*([A-E])/i);
      const correctAnswer = answerMatch ? answerMatch[1].charCodeAt(0) - 65 : 0;

      const explanationMatch = block.match(/(?:Explicação|Explanation):\s*(.+)/is);

      questions.push({
        question: questionText,
        options,
        correctAnswer,
        subject: currentSubject,
        explanation: explanationMatch?.[1]?.trim(),
      });
    }
    return questions;
  };

  const handleImport = async () => {
    if (!rawText.trim()) {
      toast({ title: "Erro", description: "Cole o conteúdo das questões.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const parsed = parseQuestions(rawText);
      if (parsed.length === 0) {
        toast({ title: "Erro", description: "Não foi possível identificar questões no texto. Verifique o formato.", variant: "destructive" });
        setIsLoading(false);
        return;
      }

      let notebookId: string;
      const questionsWithIds: Question[] = parsed.map((q, i) => ({
        ...q,
        id: crypto.randomUUID(),
        notebookId: "",
      }));

      if (selectedNotebook === "new") {
        const name = notebookName.trim() || `Caderno ${new Date().toLocaleDateString("pt-BR")}`;
        notebookId = await saveNotebook(name, questionsWithIds);
      } else {
        notebookId = selectedNotebook;
        await addQuestionsToNotebook(notebookId, questionsWithIds);
      }

      toast({ title: "Sucesso!", description: `${parsed.length} questões importadas.` });
      onQuestionsLoaded(questionsWithIds, notebookId);
      setRawText("");
      setNotebookName("");
      onClose();
    } catch (err) {
      console.error(err);
      toast({ title: "Erro", description: "Falha ao importar questões.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" /> Importar Questões
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Salvar em</Label>
            <Select value={selectedNotebook} onValueChange={setSelectedNotebook}>
              <SelectTrigger><SelectValue placeholder="Novo caderno" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="new">+ Novo caderno</SelectItem>
                {existingNotebooks.map(nb => (
                  <SelectItem key={nb.id} value={nb.id}>{nb.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedNotebook === "new" && (
            <div>
              <Label>Nome do caderno</Label>
              <Input placeholder="Ex: Biologia - Cap. 5" value={notebookName} onChange={(e) => setNotebookName(e.target.value)} />
            </div>
          )}

          <div>
            <Label>Cole as questões abaixo</Label>
            <Textarea
              placeholder={`Matéria: Biologia\n\n1. Qual é a função do ribossomo?\nA) Síntese de proteínas\nB) Produção de energia\nC) Armazenamento\nD) Transporte\nResposta: A`}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              rows={12}
              className="font-mono text-sm"
            />
          </div>

          <Button onClick={handleImport} disabled={isLoading} className="w-full gradient-primary">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
            Importar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
