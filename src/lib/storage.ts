import { supabase } from "@/integrations/supabase/client";
import { Question, Notebook, SubjectStats } from "@/types/quiz";
import { MOCK_USER_ID, isDevBypassActive } from "./devBypass";

export const getUserId = async (): Promise<string> => {
  if (isDevBypassActive()) return MOCK_USER_ID;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Usuário não autenticado");
  return session.user.id;
};

export const saveNotebook = async (name: string, questions: Question[]): Promise<string> => {
  const userId = await getUserId();
  const { data: notebook, error: nbError } = await supabase
    .from("notebooks")
    .insert({ name, user_id: userId, question_count: questions.length })
    .select("id").single();
  if (nbError || !notebook) throw nbError;

  const questionRows = questions.map(q => ({
    notebook_id: notebook.id, user_id: userId, question: q.question, options: q.options,
    correct_answer: q.correctAnswer, subject: q.subject, explanation: q.explanation,
    passage: q.passage, note: q.note
  }));
  const { error: qError } = await supabase.from("questions").insert(questionRows);
  if (qError) throw qError;
  return notebook.id;
};

export const addQuestionsToNotebook = async (notebookId: string, questions: Question[]): Promise<void> => {
  const userId = await getUserId();
  const questionRows = questions.map(q => ({
    notebook_id: notebookId, user_id: userId, question: q.question, options: q.options,
    correct_answer: q.correctAnswer, subject: q.subject, explanation: q.explanation,
    passage: q.passage, note: q.note
  }));
  const { error: qError } = await supabase.from("questions").insert(questionRows);
  if (qError) throw qError;
  const { count } = await supabase.from("questions").select("*", { count: 'exact', head: true }).eq("notebook_id", notebookId);
  await supabase.from("notebooks").update({ question_count: count || 0 }).eq("id", notebookId);
};

export const getNotebooks = async (): Promise<Notebook[]> => {
  const userId = await getUserId();
  const { data, error } = await supabase.from("notebooks").select("*").eq("user_id", userId).order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(nb => ({ id: nb.id, name: nb.name, questionCount: nb.question_count, createdAt: nb.created_at, userId: nb.user_id, sourceId: nb.source_id }));
};

export const getNotebookById = async (id: string): Promise<Notebook | null> => {
  const { data, error } = await supabase.from("notebooks").select("*").eq("id", id).single();
  if (error || !data) return null;
  return { id: data.id, name: data.name, questionCount: data.question_count, createdAt: data.created_at, userId: data.user_id, sourceId: data.source_id };
};

export const loadNotebookQuestions = async (notebookId: string): Promise<Question[]> => {
  const { data, error } = await supabase.from("questions").select("*").eq("notebook_id", notebookId).order("created_at", { ascending: true });
  if (error) throw error;
  return (data || []).map(q => ({ id: q.id, question: q.question, options: q.options as string[], correctAnswer: q.correct_answer, userAnswer: q.user_answer ?? undefined, subject: q.subject, notebookId: q.notebook_id, explanation: q.explanation ?? undefined, passage: q.passage ?? undefined, note: q.note ?? undefined }));
};

export const updateQuestionAnswer = async (questionId: string, answerIndex: number): Promise<void> => {
  await supabase.from("questions").update({ user_answer: answerIndex }).eq("id", questionId);
};

export const updateQuestionNote = async (questionId: string, note: string): Promise<void> => {
  await supabase.from("questions").update({ note: note || null }).eq("id", questionId);
};

export const updateQuestionPassage = async (questionId: string, passage: string): Promise<void> => {
  await supabase.from("questions").update({ passage: passage || null }).eq("id", questionId);
};

export const deleteNotebook = async (id: string): Promise<void> => {
  await supabase.from("questions").delete().eq("notebook_id", id);
  await supabase.from("notebooks").delete().eq("id", id);
};

export const calculateSubjectStats = async (): Promise<SubjectStats[]> => {
  const userId = await getUserId();
  const { data, error } = await supabase.from("questions").select("subject, user_answer, correct_answer").eq("user_id", userId);
  if (error) throw error;
  const statsMap = new Map<string, { correct: number; total: number }>();
  (data || []).forEach(q => {
    if (q.user_answer === null || q.user_answer === undefined) return;
    const current = statsMap.get(q.subject) || { correct: 0, total: 0 };
    current.total += 1;
    if (q.user_answer === q.correct_answer) current.correct += 1;
    statsMap.set(q.subject, current);
  });
  return Array.from(statsMap.entries()).map(([subject, s]) => ({ subject, correct: s.correct, total: s.total, percentage: s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0 }));
};

export const getNotebookSubjects = async (notebookId: string): Promise<string[]> => {
  const { data } = await supabase.from("questions").select("subject").eq("notebook_id", notebookId);
  return Array.from(new Set(data?.map(q => q.subject) || []));
};

export const getStorageInfo = async () => {
  const userId = await getUserId();
  const { count: nb } = await supabase.from("notebooks").select("*", { count: 'exact', head: true }).eq("user_id", userId);
  const { count: q } = await supabase.from("questions").select("*", { count: 'exact', head: true }).eq("user_id", userId);
  const { count: a } = await supabase.from("questions").select("*", { count: 'exact', head: true }).eq("user_id", userId).not("user_answer", "is", null);
  return { notebooksCount: nb || 0, questionsCount: q || 0, answeredCount: a || 0 };
};

export const clearAllData = async (): Promise<void> => {
  const userId = await getUserId();
  await supabase.from("questions").delete().eq("user_id", userId);
  await supabase.from("notebooks").delete().eq("user_id", userId);
};

export const duplicateSharedNotebook = async (shareId: string): Promise<string> => {
  const userId = await getUserId();
  const { data: share } = await supabase.from("shares").select("*").eq("id", shareId).single();
  if (!share) throw new Error("Compartilhamento não encontrado");
  
  const { data: srcNotebook } = await supabase.from("notebooks").select("*").eq("id", share.original_content_id).single();
  if (!srcNotebook) throw new Error("Caderno original não encontrado");
  
  const { data: newNb, error } = await supabase.from("notebooks").insert({
    name: `${srcNotebook.name} (cópia)`, user_id: userId, question_count: srcNotebook.question_count, source_id: srcNotebook.id
  }).select("id").single();
  if (error || !newNb) throw error;

  const { data: srcQuestions } = await supabase.from("questions").select("*").eq("notebook_id", srcNotebook.id);
  if (srcQuestions && srcQuestions.length > 0) {
    const rows = srcQuestions.map(q => ({
      notebook_id: newNb.id, user_id: userId, question: q.question, options: q.options,
      correct_answer: q.correct_answer, subject: q.subject, explanation: q.explanation, passage: q.passage
    }));
    await supabase.from("questions").insert(rows);
  }

  await supabase.from("shares").update({ copied_content_id: newNb.id, status: "accepted" }).eq("id", shareId);
  return newNb.id;
};

export const duplicateSharedSimulado = async (shareId: string): Promise<string> => {
  const userId = await getUserId();
  const { data: share } = await supabase.from("shares").select("*").eq("id", shareId).single();
  if (!share) throw new Error("Compartilhamento não encontrado");
  
  const { data: srcSim } = await supabase.from("simulados").select("*").eq("id", share.original_content_id).single();
  if (!srcSim) throw new Error("Simulado não encontrado");

  const { data: newSim, error } = await supabase.from("simulados").insert({
    name: `${srcSim.name} (cópia)`, user_id: userId, total_questions: srcSim.total_questions, time_limit_minutes: srcSim.time_limit_minutes
  }).select("id").single();
  if (error || !newSim) throw error;

  const { data: srcQs } = await supabase.from("simulado_questions").select("*").eq("simulado_id", srcSim.id);
  if (srcQs && srcQs.length > 0) {
    const rows = srcQs.map(q => ({
      simulado_id: newSim.id, question: q.question, options: q.options,
      correct_answer: q.correct_answer, subject: q.subject
    }));
    await supabase.from("simulado_questions").insert(rows);
  }

  await supabase.from("shares").update({ copied_content_id: newSim.id, status: "accepted" }).eq("id", shareId);
  return newSim.id;
};
