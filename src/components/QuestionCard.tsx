import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Question } from "@/types/quiz";
import { ChevronLeft, ChevronRight, CheckCircle2, XCircle, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuestionCardProps {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  onAnswer: (answerIndex: number) => void;
  onNext: () => void;
  onPrevious: () => void;
}

export const QuestionCard = ({ question, questionNumber, totalQuestions, onAnswer, onNext, onPrevious }: QuestionCardProps) => {
  const [selectedAnswer, setSelectedAnswer] = useState<number | undefined>(question.userAnswer);
  const [showResult, setShowResult] = useState(question.userAnswer !== undefined);
  const [showExplanation, setShowExplanation] = useState(false);

  // Reset state when question changes
  useEffect(() => {
    setSelectedAnswer(question.userAnswer);
    setShowResult(question.userAnswer !== undefined);
    setShowExplanation(false);
  }, [question.id]);

  const handleSelectAnswer = (index: number) => {
    if (showResult) return;
    setSelectedAnswer(index);
    onAnswer(index);
    setShowResult(true);
  };

  const isCorrect = selectedAnswer === question.correctAnswer;

  return (
    <Card className="w-full max-w-3xl mx-auto shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <Badge variant="secondary" className="text-xs">{question.subject}</Badge>
          <span className="text-sm text-muted-foreground">{questionNumber} de {totalQuestions}</span>
        </div>
        {question.passage && (
          <div className="mt-3 p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground italic border-l-4 border-primary/30">
            {question.passage}
          </div>
        )}
        <p className="text-base font-medium mt-3 leading-relaxed">{question.question}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          {question.options.map((option, index) => (
            <button
              key={index}
              onClick={() => handleSelectAnswer(index)}
              disabled={showResult}
              className={cn(
                "w-full p-4 rounded-lg border-2 text-left transition-all text-sm flex items-start gap-3",
                showResult && index === question.correctAnswer && "border-green-500 bg-green-500/10",
                showResult && selectedAnswer === index && index !== question.correctAnswer && "border-destructive bg-destructive/10",
                !showResult && selectedAnswer === index && "border-primary bg-primary/10",
                !showResult && selectedAnswer !== index && "border-border/40 hover:bg-primary/5 hover:border-primary/30"
              )}
            >
              <span className="font-semibold text-muted-foreground shrink-0">{String.fromCharCode(65 + index)})</span>
              <span>{option}</span>
              {showResult && index === question.correctAnswer && <CheckCircle2 className="ml-auto shrink-0 h-5 w-5 text-green-500" />}
              {showResult && selectedAnswer === index && index !== question.correctAnswer && <XCircle className="ml-auto shrink-0 h-5 w-5 text-destructive" />}
            </button>
          ))}
        </div>

        {showResult && question.explanation && (
          <div className="mt-4">
            <Button variant="ghost" size="sm" onClick={() => setShowExplanation(!showExplanation)} className="gap-2">
              <Lightbulb className="h-4 w-4" />
              {showExplanation ? "Ocultar explicação" : "Ver explicação"}
            </Button>
            {showExplanation && (
              <div className="mt-2 p-3 bg-muted/50 rounded-lg text-sm">
                {question.explanation}
              </div>
            )}
          </div>
        )}

        {showResult && (
          <div className={cn("p-3 rounded-lg text-sm font-medium text-center", isCorrect ? "bg-green-500/10 text-green-700 dark:text-green-400" : "bg-destructive/10 text-destructive")}>
            {isCorrect ? "✅ Resposta correta!" : `❌ Resposta incorreta. A correta era: ${String.fromCharCode(65 + question.correctAnswer)}`}
          </div>
        )}

        <div className="flex justify-between pt-2">
          <Button variant="outline" onClick={onPrevious} disabled={questionNumber <= 1} size="sm">
            <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
          </Button>
          <Button onClick={onNext} size="sm" className="gradient-primary">
            {questionNumber === totalQuestions ? "Finalizar" : "Próxima"} <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
