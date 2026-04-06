import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { getStorageInfo, clearAllData } from "@/lib/storage";
import { Database, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface StorageInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StorageInfoModal = ({ isOpen, onClose }: StorageInfoModalProps) => {
  const { toast } = useToast();
  const [info, setInfo] = useState({ notebooksCount: 0, questionsCount: 0, answeredCount: 0 });

  useEffect(() => {
    if (isOpen) getStorageInfo().then(setInfo);
  }, [isOpen]);

  const handleClear = async () => {
    if (confirm("Tem certeza que deseja apagar TODOS os seus dados? Esta ação não pode ser desfeita.")) {
      await clearAllData();
      toast({ title: "Dados apagados" });
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Database className="h-5 w-5" /> Dados Armazenados</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between"><span>Cadernos:</span><strong>{info.notebooksCount}</strong></div>
          <div className="flex justify-between"><span>Questões:</span><strong>{info.questionsCount}</strong></div>
          <div className="flex justify-between"><span>Respondidas:</span><strong>{info.answeredCount}</strong></div>
        </div>
        <Button variant="destructive" className="w-full mt-4" onClick={handleClear}>
          <Trash2 className="h-4 w-4 mr-2" /> Apagar Todos os Dados
        </Button>
      </DialogContent>
    </Dialog>
  );
};
