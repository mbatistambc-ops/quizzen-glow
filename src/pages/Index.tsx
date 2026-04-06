import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UploadModal } from "@/components/UploadModal";
import { ImageImportModal } from "@/components/ImageImportModal";
import { ManageQuestionsModal } from "@/components/ManageQuestionsModal";
import { QuestionCard } from "@/components/QuestionCard";
import { PerformanceCharts } from "@/components/PerformanceCharts";
import { StorageInfoModal } from "@/components/StorageInfoModal";
import { Question, SubjectStats, Notebook } from "@/types/quiz";
import {
  calculateSubjectStats, updateQuestionAnswer, loadNotebookQuestions,
  getNotebookById, getNotebookSubjects, getNotebooks,
  duplicateSharedNotebook, duplicateSharedSimulado
} from "@/lib/storage";
import { useAuth } from "@/hooks/useAuth";
import { SimuladoTab } from "@/components/SimuladoTab";
import { ChatTab } from "@/components/chat/ChatTab";
import { NotesTab } from "@/components/NotesTab";
import { ProfileMenu } from "@/components/ProfileMenu";
import { NotificationBell } from "@/components/NotificationBell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Filter, ChevronLeft, ChevronRight, Upload, BarChart3, BookOpen,
  GraduationCap, CheckCircle2, Loader2, ArrowLeftRight, ClipboardList,
  MessageCircle, PenLine
} from "lucide-react";

const Index = () => {
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isManageQuestionsOpen, setIsManageQuestionsOpen] = useState(false);
  const [isStorageModalOpen, setIsStorageModalOpen] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [stats, setStats] = useState<SubjectStats[]>([]);
  const [activeTab, setActiveTab] = useState("quiz");
  const [isQuizComplete, setIsQuizComplete] = useState(false);
  const [currentNotebookId, setCurrentNotebookId] = useState("");
  const [currentNotebookName, setCurrentNotebookName] = useState("");
  const [sessionResults, setSessionResults] = useState<{ correct: number; total: number } | null>(null);
  const [allNotebookQuestions, setAllNotebookQuestions] = useState<Question[]>([]);
  const [notebookSubjects, setNotebookSubjects] = useState<string[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [availableNotebooks, setAvailableNotebooks] = useState<Notebook[]>([]);
  const [availableSimulados, setAvailableSimulados] = useState<{ id: string; name: string }[]>([]);

  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  const refreshStats = async () => {
    if (!user) return;
    const loadedStats = await calculateSubjectStats();
    setStats(loadedStats);
  };

  const refreshNotebooks = async () => {
    const nbs = await getNotebooks();
    setAvailableNotebooks(nbs);
  };

  const refreshSimulados = async () => {
    const { data } = await supabase.from("simulados").select("id, name").eq("user_id", user?.id || "");
    setAvailableSimulados(data || []);
  };

  useEffect(() => {
    if (user) { refreshStats(); refreshNotebooks(); refreshSimulados(); }
  }, [user]);

  const handleQuestionsLoaded = async (loadedQuestions: Question[], notebookId: string) => {
    const dbQuestions = await loadNotebookQuestions(notebookId);
    const notebook = await getNotebookById(notebookId);
    const subjects = await getNotebookSubjects(notebookId);
    setAllNotebookQuestions(dbQuestions);
    setNotebookSubjects(subjects);
    setSelectedSubjects(subjects);
    setQuestions(dbQuestions);
    setCurrentNotebookName(notebook?.name || "");
    const firstUnanswered = dbQuestions.findIndex(q => q.userAnswer === undefined);
    setCurrentQuestionIndex(firstUnanswered >= 0 ? firstUnanswered : 0);
    setIsQuizComplete(false);
    setSessionResults(null);
    setCurrentNotebookId(notebookId);
    setActiveTab("quiz");
    refreshNotebooks();
  };

  const handleOpenNotebook = async (notebookId: string, loadedQuestions: Question[]) => {
    const subjects = await getNotebookSubjects(notebookId);
    const notebook = await getNotebookById(notebookId);
    setAllNotebookQuestions(loadedQuestions);
    setNotebookSubjects(subjects);
    setSelectedSubjects(subjects);
    setQuestions(loadedQuestions);
    setCurrentNotebookId(notebookId);
    setCurrentNotebookName(notebook?.name || "");
    const firstUnanswered = loadedQuestions.findIndex(q => q.userAnswer === undefined);
    setCurrentQuestionIndex(firstUnanswered >= 0 ? firstUnanswered : 0);
    const allAnswered = loadedQuestions.every(q => q.userAnswer !== undefined);
    if (allAnswered) {
      const correctCount = loadedQuestions.filter(q => q.userAnswer === q.correctAnswer).length;
      setSessionResults({ correct: correctCount, total: loadedQuestions.length });
      setIsQuizComplete(true);
    } else {
      setIsQuizComplete(false);
      setSessionResults(null);
    }
    setActiveTab("quiz");
  };

  useEffect(() => {
    if (allNotebookQuestions.length > 0 && selectedSubjects.length > 0) {
      const filtered = allNotebookQuestions.filter(q => selectedSubjects.includes(q.subject));
      setQuestions(filtered);
      const firstUnanswered = filtered.findIndex(q => q.userAnswer === undefined);
      setCurrentQuestionIndex(firstUnanswered >= 0 ? firstUnanswered : 0);
      setIsQuizComplete(false);
      setSessionResults(null);
    }
  }, [selectedSubjects]);

  const toggleSubject = (subject: string) => {
    setSelectedSubjects(prev => {
      if (prev.includes(subject)) {
        if (prev.length === 1) return prev;
        return prev.filter(s => s !== subject);
      }
      return [...prev, subject];
    });
  };

  const handleAnswer = async (answerIndex: number) => {
    const currentQuestion = questions[currentQuestionIndex];
    await updateQuestionAnswer(currentQuestion.id, answerIndex);
    const updatedQuestions = [...questions];
    updatedQuestions[currentQuestionIndex].userAnswer = answerIndex;
    setQuestions(updatedQuestions);
    refreshStats();
    sendLiveProgress(updatedQuestions);
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      const correctCount = questions.filter(q => q.userAnswer === q.correctAnswer).length;
      refreshStats();
      setIsQuizComplete(true);
      setSessionResults({ correct: correctCount, total: questions.length });
    }
  };

  const sendLiveProgress = async (qs: Question[]) => {
    if (!currentNotebookId) return;
    try {
      const { data: shares } = await supabase.from("shares").select("*").eq("copied_content_id", currentNotebookId).eq("content_type", "notebook");
      if (!shares || shares.length === 0) return;
      const answered = qs.filter(q => q.userAnswer !== undefined);
      const correct = answered.filter(q => q.userAnswer === q.correctAnswer).length;
      const wrong = answered.length - correct;
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const userName = currentUser?.user_metadata?.name || currentUser?.email || "Usuário";
      for (const share of shares) {
        const { data: existing } = await supabase.from("notifications").select("id").eq("related_share_id", share.id).eq("type", "progress").eq("user_id", share.owner_id).maybeSingle();
        const message = `${userName} — ${currentNotebookName}: ${correct} acerto${correct !== 1 ? "s" : ""}, ${wrong} erro${wrong !== 1 ? "s" : ""} (${answered.length}/${qs.length})`;
        if (existing) {
          await supabase.from("notifications").update({ message, read: false, created_at: new Date().toISOString() }).eq("id", existing.id);
        } else {
          await supabase.from("notifications").insert({ user_id: share.owner_id, title: "Progresso em tempo real", message, type: "progress", related_share_id: share.id });
        }
      }
    } catch { /* silently fail */ }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) setCurrentQuestionIndex(currentQuestionIndex - 1);
  };

  const handleNewQuiz = () => {
    setQuestions([]); setAllNotebookQuestions([]); setNotebookSubjects([]);
    setSelectedSubjects([]); setCurrentQuestionIndex(0); setIsQuizComplete(false);
    setSessionResults(null); setCurrentNotebookId(""); setCurrentNotebookName("");
    setIsModalOpen(true);
  };

  const handleContinueStudying = () => {
    const firstUnanswered = questions.findIndex(q => q.userAnswer === undefined);
    setCurrentQuestionIndex(firstUnanswered >= 0 ? firstUnanswered : 0);
    setIsQuizComplete(false);
    setSessionResults(null);
  };

  const handleNotebooksDeleted = (deletedIds: string[]) => {
    if (currentNotebookId && deletedIds.includes(currentNotebookId)) {
      setQuestions([]); setAllNotebookQuestions([]); setNotebookSubjects([]);
      setSelectedSubjects([]); setCurrentQuestionIndex(0); setIsQuizComplete(false);
      setSessionResults(null); setCurrentNotebookId(""); setCurrentNotebookName("");
    }
  };

  const handleSignOut = async () => { await signOut(); navigate("/auth"); };

  const handleFilterBySubject = async (subject: string) => {
    for (const nb of availableNotebooks) {
      const qs = await loadNotebookQuestions(nb.id);
      const subjectQs = qs.filter(q => q.subject === subject);
      if (subjectQs.length > 0) {
        const subjects = await getNotebookSubjects(nb.id);
        const notebook = await getNotebookById(nb.id);
        setAllNotebookQuestions(qs); setNotebookSubjects(subjects);
        setSelectedSubjects([subject]); setQuestions(subjectQs);
        setCurrentNotebookId(nb.id); setCurrentNotebookName(notebook?.name || "");
        setCurrentQuestionIndex(0); setIsQuizComplete(false); setSessionResults(null);
        setActiveTab("quiz"); return;
      }
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center">
                <GraduationCap className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold leading-tight">Sistema de Questões</h1>
                <p className="text-xs text-muted-foreground hidden sm:block">Monitore seu desempenho</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => setIsModalOpen(true)} className="gradient-primary flex-1 sm:flex-none" size="sm">
                <Upload className="h-4 w-4 mr-1" /> Importar
              </Button>
              <NotificationBell />
              <ProfileMenu onStorageInfo={() => setIsStorageModalOpen(true)} onSignOut={handleSignOut} />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={async (tab) => {
          setActiveTab(tab);
          if (tab === "quiz" && currentNotebookId) {
            const freshQuestions = await loadNotebookQuestions(currentNotebookId);
            const subjects = await getNotebookSubjects(currentNotebookId);
            setAllNotebookQuestions(freshQuestions); setNotebookSubjects(subjects);
            const filtered = freshQuestions.filter(q => selectedSubjects.length > 0 ? selectedSubjects.includes(q.subject) : true);
            setQuestions(filtered);
            if (!selectedSubjects.length) setSelectedSubjects(subjects);
          }
        }} className="space-y-6">
          <TabsList className="grid grid-cols-5 w-full max-w-lg mx-auto">
            <TabsTrigger value="quiz" className="text-xs gap-1"><BookOpen className="h-4 w-4" /><span className="hidden sm:inline">Quiz</span></TabsTrigger>
            <TabsTrigger value="notes" className="text-xs gap-1"><PenLine className="h-4 w-4" /><span className="hidden sm:inline">Notas</span></TabsTrigger>
            <TabsTrigger value="simulados" className="text-xs gap-1"><ClipboardList className="h-4 w-4" /><span className="hidden sm:inline">Sim.</span></TabsTrigger>
            <TabsTrigger value="stats" className="text-xs gap-1"><BarChart3 className="h-4 w-4" /><span className="hidden sm:inline">Desemp.</span></TabsTrigger>
            <TabsTrigger value="chat" className="text-xs gap-1"><MessageCircle className="h-4 w-4" /><span className="hidden sm:inline">Chat</span></TabsTrigger>
          </TabsList>

          <TabsContent value="quiz" className="space-y-4">
            {/* Notebook selector & subject filter */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <BookOpen className="h-4 w-4" />
                  {currentNotebookName ? (
                    <span className="font-medium text-foreground">{currentNotebookName}</span>
                  ) : (
                    <span>Selecione um caderno</span>
                  )}
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1">
                      <ArrowLeftRight className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Trocar</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 max-h-72 overflow-y-auto" align="start">
                    <h4 className="font-semibold text-sm mb-2">Cadernos</h4>
                    <div className="space-y-1">
                      {availableNotebooks.length === 0 ? (
                        <p className="text-xs text-muted-foreground">Nenhum caderno disponível</p>
                      ) : (
                        availableNotebooks.map(nb => (
                          <button
                            key={nb.id}
                            onClick={async () => {
                              const qs = await loadNotebookQuestions(nb.id);
                              handleOpenNotebook(nb.id, qs);
                            }}
                            className={cn(
                              "w-full text-left px-2 py-2 rounded-md text-sm hover:bg-muted transition-colors",
                              nb.id === currentNotebookId && "bg-primary/10 font-medium"
                            )}
                          >
                            <span className="block">{nb.name}</span>
                            <span className="text-xs text-muted-foreground">{nb.questionCount} questões</span>
                          </button>
                        ))
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {notebookSubjects.length > 0 && questions.length > 0 && (
                <div className="flex items-center gap-2 ml-auto">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-1">
                        <Filter className="h-3.5 w-3.5" />
                        Matérias ({selectedSubjects.length}/{notebookSubjects.length})
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56" align="end">
                      <div className="space-y-2">
                        {notebookSubjects.map(subject => (
                          <label key={subject} className="flex items-center gap-2 text-sm cursor-pointer">
                            <Checkbox checked={selectedSubjects.includes(subject)} onCheckedChange={() => toggleSubject(subject)} />
                            {subject}
                          </label>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                  {currentNotebookId && (
                    <Button variant="outline" size="sm" onClick={() => setIsManageQuestionsOpen(true)}>
                      <ClipboardList className="h-3.5 w-3.5 mr-1" /> Gerenciar
                    </Button>
                  )}
                </div>
              )}
            </div>

            {questions.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mb-6">
                    <GraduationCap className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold">Nenhuma questão carregada</h3>
                  <p className="text-muted-foreground text-sm mt-2 max-w-sm">
                    Importe um arquivo ou acesse um caderno existente para começar a estudar.
                  </p>
                  <Button onClick={() => setIsModalOpen(true)} size="lg" className="gradient-primary mt-6">
                    <Upload className="h-5 w-5 mr-2" /> Importar Questões
                  </Button>
                </CardContent>
              </Card>
            ) : isQuizComplete && sessionResults ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <CheckCircle2 className="h-8 w-8 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold">Quiz Concluído!</h2>
                  <div className="flex items-center gap-3 mt-4">
                    <span className="text-lg font-semibold">{sessionResults.correct} / {sessionResults.total} acertos</span>
                    <Badge className={sessionResults.correct / sessionResults.total >= 0.7
                      ? "bg-green-500 text-white text-lg px-4 py-2"
                      : "bg-yellow-500 text-white text-lg px-4 py-2"
                    }>
                      {Math.round((sessionResults.correct / sessionResults.total) * 100)}%
                    </Badge>
                  </div>
                  <p className="text-muted-foreground text-sm mt-3">Seus resultados foram salvos!</p>
                  <div className="flex gap-3 mt-6 flex-wrap justify-center">
                    <Button variant="outline" onClick={handleContinueStudying}>
                      <BookOpen className="h-4 w-4 mr-2" /> Revisar
                    </Button>
                    <Button onClick={handleNewQuiz} className="gradient-primary">
                      <Upload className="h-4 w-4 mr-2" /> Novo Quiz
                    </Button>
                    <Button variant="outline" onClick={() => setActiveTab("stats")}>
                      <BarChart3 className="h-4 w-4 mr-2" /> Desempenho
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={handlePrevious} disabled={currentQuestionIndex === 0}>
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <div className="flex-1">
                  <QuestionCard
                    question={questions[currentQuestionIndex]}
                    questionNumber={currentQuestionIndex + 1}
                    totalQuestions={questions.length}
                    onAnswer={handleAnswer}
                    onNext={handleNext}
                    onPrevious={handlePrevious}
                  />
                </div>
                <Button variant="ghost" size="icon" onClick={handleNext} disabled={currentQuestionIndex >= questions.length - 1}>
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="notes"><NotesTab /></TabsContent>
          <TabsContent value="simulados"><SimuladoTab onRefresh={() => { refreshSimulados(); }} /></TabsContent>
          <TabsContent value="stats"><PerformanceCharts stats={stats} onFilterBySubject={handleFilterBySubject} /></TabsContent>
          <TabsContent value="chat">
            <ChatTab
              notebooks={availableNotebooks.map(nb => ({ id: nb.id, name: nb.name }))}
              simulados={availableSimulados}
              onOpenSharedContent={async (type, id) => {
                try {
                  if (type === "notebook" || type === "subject") {
                    const myNotebookId = await duplicateSharedNotebook(id);
                    const qs = await loadNotebookQuestions(myNotebookId);
                    if (qs.length > 0) { handleOpenNotebook(myNotebookId, qs); }
                    else { toast({ title: "Conteúdo indisponível", variant: "destructive" }); }
                  } else if (type === "simulado") {
                    await duplicateSharedSimulado(id);
                    await refreshSimulados();
                    setActiveTab("simulados");
                  }
                } catch (err: any) {
                  toast({ title: "Erro", description: "Não foi possível abrir o conteúdo compartilhado.", variant: "destructive" });
                }
              }}
            />
          </TabsContent>
        </Tabs>
      </main>

      <UploadModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onQuestionsLoaded={handleQuestionsLoaded} />
      <ImageImportModal isOpen={isImageModalOpen} onClose={() => setIsImageModalOpen(false)} onQuestionsLoaded={handleQuestionsLoaded} />
      <ManageQuestionsModal
        isOpen={isManageQuestionsOpen}
        onClose={() => setIsManageQuestionsOpen(false)}
        onNotebooksDeleted={handleNotebooksDeleted}
        onOpenNotebook={async (notebookId, qs) => {
          handleOpenNotebook(notebookId, qs);
        }}
      />
      <StorageInfoModal isOpen={isStorageModalOpen} onClose={() => setIsStorageModalOpen(false)} />
    </div>
  );
};

export default Index;
