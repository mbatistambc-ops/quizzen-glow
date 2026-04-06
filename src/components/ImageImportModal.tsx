import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera } from "lucide-react";

interface ImageImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onQuestionsLoaded: (questions: any[], notebookId: string) => void;
}

export const ImageImportModal = ({ isOpen, onClose }: ImageImportModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" /> Importar por Imagem
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Camera className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-sm">Funcionalidade de importação por imagem em breve.</p>
          <Button variant="outline" onClick={onClose} className="mt-4">Fechar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
