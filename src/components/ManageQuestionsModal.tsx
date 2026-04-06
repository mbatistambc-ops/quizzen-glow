import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { loadNotebookQuestions, deleteNotebook, getNotebooks } from "@/lib/storage";
import { Notebook } from "@/types/quiz";
import { Trash2, BookOpen, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ManageQuestionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNotebooksDeleted: (deletedIds: string[]) => void;
  onOpenNotebook: (notebookId: string, questions: any[]) => void;
}

export const ManageQuestionsModal = ({ isOpen, onClose, onNotebooksDeleted, onOpenNotebook }: ManageQuestionsModalProps) => {
  const { toast } = useToast();
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      getNotebooks().then(nbs => { setNotebooks(nbs); setLoading(false); });
    }
  }, [isOpen]);

  const handleDelete = async (id: string) => {
    await deleteNotebook(id);
    setNotebooks(prev => prev.filter(n => n.id !== id));
    onNotebooksDeleted([id]);
    toast({ title: "Caderno excluído" });
  };

  const handleOpen = async (nb: Notebook) => {
    const qs = await loadNotebookQuestions(nb.id);
    onOpenNotebook(nb.id, qs);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gerenciar Cadernos</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : notebooks.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">Nenhum caderno encontrado.</p>
        ) : (
          <div className="space-y-2">
            {notebooks.map(nb => (
              <div key={nb.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                <button onClick={() => handleOpen(nb)} className="flex-1 text-left">
                  <p className="font-medium text-sm">{nb.name}</p>
                  <Badge variant="secondary" className="text-xs mt-1">{nb.questionCount} questões</Badge>
                </button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(nb.id)} className="text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
