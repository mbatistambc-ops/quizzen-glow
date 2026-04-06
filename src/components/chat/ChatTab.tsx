import { Card, CardContent } from "@/components/ui/card";
import { MessageCircle } from "lucide-react";

interface ChatTabProps {
  notebooks?: { id: string; name: string }[];
  simulados?: { id: string; name: string }[];
  onOpenSharedContent?: (type: string, id: string) => void;
}

export const ChatTab = ({ notebooks, simulados, onOpenSharedContent }: ChatTabProps) => {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <MessageCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold">Chat</h3>
        <p className="text-muted-foreground text-sm mt-1">Sistema de chat em desenvolvimento.</p>
      </CardContent>
    </Card>
  );
};
