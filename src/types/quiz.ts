export interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  userAnswer?: number;
  subject: string;
  notebookId: string;
  explanation?: string;
  passage?: string;
  note?: string;
}

export interface Notebook {
  id: string;
  name: string;
  questionCount: number;
  createdAt: string;
  userId?: string;
  sourceId?: string;
}

export interface SubjectStats {
  subject: string;
  correct: number;
  total: number;
  percentage: number;
}
