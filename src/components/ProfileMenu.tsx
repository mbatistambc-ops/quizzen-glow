import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { User, LogOut, Database, Moon, Sun } from "lucide-react";
import { useState } from "react";

interface ProfileMenuProps {
  onStorageInfo: () => void;
  onSignOut: () => void;
}

export const ProfileMenu = ({ onStorageInfo, onSignOut }: ProfileMenuProps) => {
  const [darkMode, setDarkMode] = useState(() => document.documentElement.classList.contains("dark"));

  const toggleDarkMode = () => {
    document.documentElement.classList.toggle("dark");
    setDarkMode(!darkMode);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon">
          <User className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48" align="end">
        <div className="space-y-1">
          <Button variant="ghost" className="w-full justify-start text-sm" onClick={toggleDarkMode}>
            {darkMode ? <Sun className="h-4 w-4 mr-2" /> : <Moon className="h-4 w-4 mr-2" />}
            {darkMode ? "Modo claro" : "Modo escuro"}
          </Button>
          <Button variant="ghost" className="w-full justify-start text-sm" onClick={onStorageInfo}>
            <Database className="h-4 w-4 mr-2" /> Dados
          </Button>
          <Button variant="ghost" className="w-full justify-start text-sm text-destructive" onClick={onSignOut}>
            <LogOut className="h-4 w-4 mr-2" /> Sair
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};
