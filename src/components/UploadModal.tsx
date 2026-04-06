import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { saveNotebook, addQuestionsToNotebook, getNotebooks } from "@/lib/storage";
import { parseTextQuestions } from "@/lib/parseTextQuestions";
import { Question, Notebook } from "@/types/quiz";
import { Upload, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

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
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [previewStrategy, setPreviewStrategy] = useState<string>("");
  const [importProgress, setImportProgress] = useState(0);
  const [importStatus, setImportStatus] = useState<"idle" | "parsing" | "saving" | "done" | "error">("idle");

  useEffect(() => {
    if (isOpen) {
      getNotebooks().then(setExistingNotebooks);
      setImportStatus("idle");
      setImportProgress(0);
      setPreviewCount(null);
    }
  }, [isOpen]);

  // Live preview: parse as user types/pastes
  useEffect(() => {
    if (!rawText.trim()) {
      setPreviewCount(null);
      setPreviewStrategy("");
      return;
    }
    const timeout = setTimeout(() => {
      const result = parseTextQuestions(rawText);
      setPreviewCount(result.questions.length);
      setPreviewStrategy(result.strategy);
    }, 500);
    return () => clearTimeout(timeout);
  }, [rawText]);

  const handleImport = async () => {
    if (!rawText.trim()) {
      toast({ title: "Erro", description: "Cole o conteúdo das questões.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    setImportStatus("parsing");
    setImportProgress(10);

    try {
      const result = parseTextQuestions(rawText);

      if (result.questions.length === 0) {
        toast({
          title: "Nenhuma questão encontrada",
          description: "Verifique se o formato está correto. Use numeração (1., 2.) e alternativas (A), B), etc).",
          variant: "destructive",
        });
        setImportStatus("error");
        setIsLoading(false);
        return;
      }

      setImportProgress(40);
      setImportStatus("saving");

      const questionsWithIds: Question[] = result.questions.map((q) => ({
        ...q,
        id: crypto.randomUUID(),
        notebookId: "",
      }));

      let notebookId: string;

      if (selectedNotebook === "new") {
        const name = notebookName.trim() || `Caderno ${new Date().toLocaleDateString("pt-BR")}`;
        notebookId = await saveNotebook(name, questionsWithIds);
      } else {
        notebookId = selectedNotebook;
        await addQuestionsToNotebook(notebookId, questionsWithIds);
      }

      setImportProgress(100);
      setImportStatus("done");

      toast({
        title: "Importação concluída! ✅",
        description: `${result.questions.length} questões importadas com sucesso (estratégia: ${result.strategy}).`,
      });

      onQuestionsLoaded(questionsWithIds, notebookId);

      // Small delay to show completion
      setTimeout(() => {
        setRawText("");
        setNotebookName("");
        setImportStatus("idle");
        setImportProgress(0);
        setPreviewCount(null);
        onClose();
      }, 800);
    } catch (err) {
      console.error(err);
      setImportStatus("error");
      toast({ title: "Erro", description: "Falha ao importar questões. Verifique o console.", variant: "destructive" });
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
          <DialogDescription>
            Cole o texto com questões numeradas e alternativas. O sistema detecta automaticamente o formato.
          </DialogDescription>
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
              placeholder={`1. Qual é a função do ribossomo?\nA) Síntese de proteínas\nB) Produção de energia\nC) Armazenamento\nD) Transporte\nResposta: A\n\n2. Próxima questão...\n\nOu inclua o GABARITO no final:\n1-A 2-B 3-C ...`}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              rows={12}
              className="font-mono text-sm"
            />
          </div>

          {/* Live preview feedback */}
          {previewCount !== null && (
            <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
              previewCount > 0
                ? "bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20"
                : "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border border-yellow-500/20"
            }`}>
              {previewCount > 0 ? (
                <CheckCircle2 className="h-4 w-4 shrink-0" />
              ) : (
                <AlertTriangle className="h-4 w-4 shrink-0" />
              )}
              <span>
                {previewCount > 0
                  ? `${previewCount} questão(ões) detectada(s)`
                  : "Nenhuma questão detectada ainda. Continue colando o texto."
                }
              </span>
            </div>
          )}

          {/* Import progress */}
          {importStatus !== "idle" && (
            <div className="space-y-2">
              <Progress value={importProgress} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">
                {importStatus === "parsing" && "Analisando texto..."}
                {importStatus === "saving" && "Salvando no banco de dados..."}
                {importStatus === "done" && "✅ Importação concluída!"}
                {importStatus === "error" && "❌ Erro na importação"}
              </p>
            </div>
          )}

          <Button onClick={handleImport} disabled={isLoading} className="w-full gradient-primary">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
            {previewCount && previewCount > 0 ? `Importar ${previewCount} questões` : "Importar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
