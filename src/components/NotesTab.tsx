import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PenLine, Save, Plus, Trash2 } from "lucide-react";

interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}

export const NotesTab = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [currentNote, setCurrentNote] = useState("");
  const [currentTitle, setCurrentTitle] = useState("");

  const handleSave = () => {
    if (!currentNote.trim()) return;
    setNotes(prev => [{
      id: crypto.randomUUID(),
      title: currentTitle.trim() || `Nota ${prev.length + 1}`,
      content: currentNote,
      createdAt: new Date().toISOString()
    }, ...prev]);
    setCurrentNote("");
    setCurrentTitle("");
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><PenLine className="h-5 w-5" /> Nova Anotação</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <input
            className="w-full px-3 py-2 border rounded-md bg-background text-sm"
            placeholder="Título (opcional)"
            value={currentTitle}
            onChange={e => setCurrentTitle(e.target.value)}
          />
          <Textarea placeholder="Escreva sua anotação..." value={currentNote} onChange={e => setCurrentNote(e.target.value)} rows={4} />
          <Button onClick={handleSave} className="gradient-primary" size="sm">
            <Save className="h-4 w-4 mr-2" /> Salvar
          </Button>
        </CardContent>
      </Card>

      {notes.length === 0 ? (
        <p className="text-center text-muted-foreground py-8 text-sm">Nenhuma anotação ainda.</p>
      ) : (
        notes.map(note => (
          <Card key={note.id}>
            <CardContent className="pt-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium text-sm">{note.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{new Date(note.createdAt).toLocaleDateString("pt-BR")}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setNotes(prev => prev.filter(n => n.id !== note.id))}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              <p className="text-sm mt-2 whitespace-pre-wrap">{note.content}</p>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};
