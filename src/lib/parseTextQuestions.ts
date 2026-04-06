/**
 * Robust question parser for Brazilian exam formats.
 * Supports multiple strategies to detect questions, options, and answers.
 */

export interface ParsedQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  subject: string;
  explanation?: string;
  passage?: string;
}

export interface ParseResult {
  questions: ParsedQuestion[];
  warnings: string[];
  strategy: string;
}

// ─── Utility functions ───────────────────────────────────────────────

function cleanText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Remove page numbers like "Página 1 de 10", "pág. 3", etc.
    .replace(/(?:p[áa]gina?\s*\d+\s*(?:de\s*\d+)?)/gi, '')
    // Remove CPF patterns
    .replace(/\d{3}\.\d{3}\.\d{3}-\d{2}/g, '')
    // Remove excessive blank lines
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}

function extractAnswerKey(text: string): Map<number, number> {
  const answerMap = new Map<number, number>();

  // Pattern: GABARITO section with answers like "1-A 2-B 3-C" or "1. A  2. B"
  const gabaritoMatch = text.match(/(?:GABARITO|RESPOSTAS|ANSWERS|CHAVE DE RESPOSTAS?)[:\s]*\n?([\s\S]*?)(?:\n\n|\z)/i);
  if (gabaritoMatch) {
    const gabText = gabaritoMatch[1];
    // Match patterns: "1-A", "1.A", "1) A", "1 A", "01-A", "01. A"
    const entries = [...gabText.matchAll(/(\d{1,3})\s*[\.\-\)\s]\s*([A-Ea-e])/g)];
    for (const entry of entries) {
      const num = parseInt(entry[1]);
      const letter = entry[2].toUpperCase();
      answerMap.set(num, letter.charCodeAt(0) - 65);
    }
  }

  // Also try inline pattern across whole text: "Gabarito: A" or "Resposta: B"
  // (handled per-question in strategies)

  return answerMap;
}

function parseLetterToIndex(letter: string): number {
  return letter.toUpperCase().charCodeAt(0) - 65;
}

// ─── Strategy 1: Numbered questions with lettered options ────────────

function strategy1_numbered(text: string, globalAnswers: Map<number, number>): ParseResult {
  const questions: ParsedQuestion[] = [];
  const warnings: string[] = [];

  // Split on question numbers: "1.", "1)", "01.", "01)", "1 -", etc.
  // Requires the number to be at the start of a line or after blank lines
  const blocks = text.split(/(?:^|\n)(?=\s*\d{1,3}\s*[\.\)\-]\s)/);

  let currentSubject = "Geral";

  for (const block of blocks) {
    if (!block.trim()) continue;

    // Check for subject headers
    const subjectMatch = block.match(/(?:Mat[ée]ria|Assunto|Subject|Disciplina|[ÁA]rea)[:]\s*(.+)/i);
    if (subjectMatch) {
      currentSubject = subjectMatch[1].trim();
    }

    // Extract question number
    const numMatch = block.match(/^\s*(\d{1,3})\s*[\.\)\-]\s*/);
    if (!numMatch) continue;
    const questionNum = parseInt(numMatch[1]);

    // Find options - letters A-E followed by ) or . or -
    const optionPattern = /(?:^|\n)\s*([A-Ea-e])\s*[\)\.\-]\s*(.+?)(?=(?:\n\s*[A-Ea-e]\s*[\)\.\-])|(?:\n\s*(?:Resposta|Gabarito|Answer|Correta|Explicação|Explanation))|$)/gs;
    const optionMatches = [...block.matchAll(optionPattern)];

    if (optionMatches.length < 2) continue;

    // Extract question text (between number and first option)
    const firstOptionIdx = block.search(/(?:^|\n)\s*[Aa]\s*[\)\.\-]\s/m);
    if (firstOptionIdx < 0) continue;

    let questionText = block.substring(numMatch[0].length, firstOptionIdx).trim();
    if (!questionText || questionText.length < 5) continue;

    // Check for passage/text block (common in ENEM-style questions)
    let passage: string | undefined;
    const passageMatch = questionText.match(/^((?:Texto|Leia|Observe|Considere|Analise|Com base|De acordo|Segundo|O texto|A charge|A imagem|A tirinha|A figura|O gr[áa]fico)[\s\S]*?\n\n)([\s\S]+)$/i);
    if (passageMatch) {
      passage = passageMatch[1].trim();
      questionText = passageMatch[2].trim();
    }

    const options = optionMatches.map(m => m[2].trim());

    // Find inline answer
    let correctAnswer = 0;
    const inlineAnswer = block.match(/(?:Resposta|Gabarito|Answer|Correta|Alternativa correta)\s*[:]\s*([A-Ea-e])/i);
    if (inlineAnswer) {
      correctAnswer = parseLetterToIndex(inlineAnswer[1]);
    } else if (globalAnswers.has(questionNum)) {
      correctAnswer = globalAnswers.get(questionNum)!;
    }

    // Clamp answer to valid range
    if (correctAnswer >= options.length) correctAnswer = 0;

    // Extract explanation
    let explanation: string | undefined;
    const explMatch = block.match(/(?:Explicação|Explanation|Justificativa|Comentário)\s*[:]\s*([\s\S]+?)$/i);
    if (explMatch) {
      explanation = explMatch[1].trim();
    }

    questions.push({
      question: questionText,
      options,
      correctAnswer,
      subject: currentSubject,
      explanation,
      passage,
    });
  }

  return { questions, warnings, strategy: "numbered" };
}

// ─── Strategy 2: Questions separated by "QUESTÃO" keyword ────────────

function strategy2_questaoKeyword(text: string, globalAnswers: Map<number, number>): ParseResult {
  const questions: ParsedQuestion[] = [];
  const warnings: string[] = [];

  // Split on "QUESTÃO N" or "Questão N" patterns
  const blocks = text.split(/(?:^|\n)(?=\s*(?:QUEST[ÃA]O|Quest[ãa]o)\s*\d{1,3})/i);

  let currentSubject = "Geral";

  for (const block of blocks) {
    if (!block.trim()) continue;

    const subjectMatch = block.match(/(?:Mat[ée]ria|Assunto|Disciplina)[:]\s*(.+)/i);
    if (subjectMatch) currentSubject = subjectMatch[1].trim();

    const numMatch = block.match(/(?:QUEST[ÃA]O|Quest[ãa]o)\s*(\d{1,3})/i);
    if (!numMatch) continue;
    const questionNum = parseInt(numMatch[1]);

    const optionPattern = /(?:^|\n)\s*\(?([A-Ea-e])\)?\s*[\)\.\-]?\s*(.+?)(?=(?:\n\s*\(?[A-Ea-e]\)?[\)\.\-]?\s)|(?:\n\s*(?:Resposta|Gabarito|Answer|Correta))|$)/gs;
    const optionMatches = [...block.matchAll(optionPattern)];

    if (optionMatches.length < 2) continue;

    const firstOptionIdx = block.search(/\n\s*\(?[Aa]\)?\s*[\)\.\-]?\s/);
    if (firstOptionIdx < 0) continue;

    const afterKeyword = block.indexOf('\n', numMatch.index || 0);
    let questionText = block.substring(afterKeyword >= 0 ? afterKeyword : numMatch[0].length, firstOptionIdx).trim();
    if (!questionText || questionText.length < 5) continue;

    const options = optionMatches.map(m => m[2].trim());

    let correctAnswer = 0;
    const inlineAnswer = block.match(/(?:Resposta|Gabarito|Answer|Correta)\s*[:]\s*([A-Ea-e])/i);
    if (inlineAnswer) {
      correctAnswer = parseLetterToIndex(inlineAnswer[1]);
    } else if (globalAnswers.has(questionNum)) {
      correctAnswer = globalAnswers.get(questionNum)!;
    }
    if (correctAnswer >= options.length) correctAnswer = 0;

    let explanation: string | undefined;
    const explMatch = block.match(/(?:Explicação|Explanation|Justificativa|Comentário)\s*[:]\s*([\s\S]+?)$/i);
    if (explMatch) explanation = explMatch[1].trim();

    questions.push({ question: questionText, options, correctAnswer, subject: currentSubject, explanation });
  }

  return { questions, warnings, strategy: "questao_keyword" };
}

// ─── Strategy 3: Parenthesized options like (A) (B) (C) ─────────────

function strategy3_parenthesizedOptions(text: string, globalAnswers: Map<number, number>): ParseResult {
  const questions: ParsedQuestion[] = [];
  const warnings: string[] = [];

  const blocks = text.split(/(?:^|\n)(?=\s*\d{1,3}\s*[\.\)\-]\s)/);
  let currentSubject = "Geral";

  for (const block of blocks) {
    if (!block.trim()) continue;

    const subjectMatch = block.match(/(?:Mat[ée]ria|Assunto|Disciplina)[:]\s*(.+)/i);
    if (subjectMatch) currentSubject = subjectMatch[1].trim();

    const numMatch = block.match(/^\s*(\d{1,3})\s*[\.\)\-]\s*/);
    if (!numMatch) continue;
    const questionNum = parseInt(numMatch[1]);

    // Parenthesized options: (A) text, (B) text
    const optionPattern = /\(([A-Ea-e])\)\s*(.+?)(?=\([A-Ea-e]\)|(?:\n\s*(?:Resposta|Gabarito|Answer|Correta))|$)/gs;
    const optionMatches = [...block.matchAll(optionPattern)];

    if (optionMatches.length < 2) continue;

    const firstOptionIdx = block.search(/\([Aa]\)\s/);
    if (firstOptionIdx < 0) continue;

    let questionText = block.substring(numMatch[0].length, firstOptionIdx).trim();
    if (!questionText || questionText.length < 5) continue;

    const options = optionMatches.map(m => m[2].trim());

    let correctAnswer = 0;
    const inlineAnswer = block.match(/(?:Resposta|Gabarito|Answer|Correta)\s*[:]\s*\(?([A-Ea-e])\)?/i);
    if (inlineAnswer) {
      correctAnswer = parseLetterToIndex(inlineAnswer[1]);
    } else if (globalAnswers.has(questionNum)) {
      correctAnswer = globalAnswers.get(questionNum)!;
    }
    if (correctAnswer >= options.length) correctAnswer = 0;

    let explanation: string | undefined;
    const explMatch = block.match(/(?:Explicação|Explanation|Justificativa|Comentário)\s*[:]\s*([\s\S]+?)$/i);
    if (explMatch) explanation = explMatch[1].trim();

    questions.push({ question: questionText, options, correctAnswer, subject: currentSubject, explanation });
  }

  return { questions, warnings, strategy: "parenthesized" };
}

// ─── Strategy 4: Double-newline separated with flexible option detection ─

function strategy4_flexible(text: string, globalAnswers: Map<number, number>): ParseResult {
  const questions: ParsedQuestion[] = [];
  const warnings: string[] = [];

  // Try to split by double newline + number
  const blocks = text.split(/\n{2,}(?=\s*\d{1,3}\s*[\.\)\-\s])/);
  let currentSubject = "Geral";
  let questionCounter = 0;

  for (const block of blocks) {
    if (!block.trim()) continue;

    const subjectMatch = block.match(/(?:Mat[ée]ria|Assunto|Disciplina)[:]\s*(.+)/i);
    if (subjectMatch) currentSubject = subjectMatch[1].trim();

    // Try to find options with any of the patterns
    const optionPatterns = [
      /(?:^|\n)\s*([A-Ea-e])\s*[\)\.\-]\s*(.+)/gm,     // A) text, A. text, A- text
      /(?:^|\n)\s*\(([A-Ea-e])\)\s*(.+)/gm,              // (A) text
    ];

    let optionMatches: RegExpMatchArray[] = [];
    for (const pattern of optionPatterns) {
      const matches = [...block.matchAll(pattern)];
      if (matches.length >= 2 && matches.length > optionMatches.length) {
        optionMatches = matches;
      }
    }

    if (optionMatches.length < 2) continue;

    const numMatch = block.match(/^\s*(\d{1,3})\s*[\.\)\-\s]/);
    const questionNum = numMatch ? parseInt(numMatch[1]) : ++questionCounter;

    // Get question text (everything before first option)
    const firstOptPos = Math.min(...optionMatches.map(m => m.index || Infinity));
    const startPos = numMatch ? numMatch[0].length : 0;
    let questionText = block.substring(startPos, firstOptPos).trim();

    if (!questionText || questionText.length < 3) continue;

    const options = optionMatches.map(m => m[2].trim());

    let correctAnswer = 0;
    const inlineAnswer = block.match(/(?:Resposta|Gabarito|Answer|Correta)\s*[:]\s*\(?([A-Ea-e])\)?/i);
    if (inlineAnswer) {
      correctAnswer = parseLetterToIndex(inlineAnswer[1]);
    } else if (globalAnswers.has(questionNum)) {
      correctAnswer = globalAnswers.get(questionNum)!;
    }
    if (correctAnswer >= options.length) correctAnswer = 0;

    questions.push({ question: questionText, options, correctAnswer, subject: currentSubject });
  }

  return { questions, warnings, strategy: "flexible" };
}

// ─── Strategy 5: Line-by-line detection ──────────────────────────────

function strategy5_lineBased(text: string, globalAnswers: Map<number, number>): ParseResult {
  const questions: ParsedQuestion[] = [];
  const warnings: string[] = [];
  const lines = text.split('\n');

  let currentSubject = "Geral";
  let currentQuestion = "";
  let currentOptions: string[] = [];
  let currentAnswer = -1;
  let questionNum = 0;
  let inQuestion = false;
  let currentExplanation: string | undefined;

  const pushQuestion = () => {
    if (currentQuestion && currentOptions.length >= 2) {
      let answer = currentAnswer;
      if (answer < 0 && globalAnswers.has(questionNum)) {
        answer = globalAnswers.get(questionNum)!;
      }
      if (answer < 0 || answer >= currentOptions.length) answer = 0;

      questions.push({
        question: currentQuestion.trim(),
        options: currentOptions,
        correctAnswer: answer,
        subject: currentSubject,
        explanation: currentExplanation,
      });
    }
    currentQuestion = "";
    currentOptions = [];
    currentAnswer = -1;
    currentExplanation = undefined;
    inQuestion = false;
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Subject detection
    const subjectMatch = trimmed.match(/^(?:Mat[ée]ria|Assunto|Disciplina|Subject)\s*[:]\s*(.+)/i);
    if (subjectMatch) {
      currentSubject = subjectMatch[1].trim();
      continue;
    }

    // Answer/gabarito line
    const answerMatch = trimmed.match(/^(?:Resposta|Gabarito|Answer|Correta|Alternativa correta)\s*[:]\s*\(?([A-Ea-e])\)?/i);
    if (answerMatch) {
      currentAnswer = parseLetterToIndex(answerMatch[1]);
      continue;
    }

    // Explanation line
    const explMatch = trimmed.match(/^(?:Explicação|Explanation|Justificativa|Comentário)\s*[:]\s*(.+)/i);
    if (explMatch) {
      currentExplanation = explMatch[1].trim();
      continue;
    }

    // Option line: A) text, (A) text, a. text
    const optionMatch = trimmed.match(/^[\(]?([A-Ea-e])[\)\.\-]\s*(.+)/);
    if (optionMatch) {
      const letter = optionMatch[1].toUpperCase();
      const expectedLetter = String.fromCharCode(65 + currentOptions.length);

      if (letter === 'A' && currentOptions.length > 0) {
        // New set of options - push previous question
        pushQuestion();
      }

      if (letter === expectedLetter || currentOptions.length === 0) {
        currentOptions.push(optionMatch[2].trim());
      }
      continue;
    }

    // Question start: number followed by text
    const numMatch = trimmed.match(/^(\d{1,3})\s*[\.\)\-]\s*(.+)/);
    if (numMatch) {
      pushQuestion();
      questionNum = parseInt(numMatch[1]);
      currentQuestion = numMatch[2];
      inQuestion = true;
      continue;
    }

    // Continuation of question text
    if (inQuestion && currentOptions.length === 0) {
      currentQuestion += '\n' + trimmed;
    }
  }

  // Don't forget the last question
  pushQuestion();

  return { questions, warnings, strategy: "line_based" };
}

// ─── Main export ─────────────────────────────────────────────────────

export function parseTextQuestions(rawText: string, defaultSubject?: string): ParseResult {
  const text = cleanText(rawText);
  const globalAnswers = extractAnswerKey(text);

  // Remove the answer key section from text for parsing
  const textWithoutKey = text.replace(/(?:GABARITO|RESPOSTAS|ANSWERS|CHAVE DE RESPOSTAS?)[:\s]*\n?[\s\S]*$/i, '').trim();
  const parseText = textWithoutKey || text;

  // Try strategies in order, pick the one with most questions
  const strategies = [
    () => strategy1_numbered(parseText, globalAnswers),
    () => strategy2_questaoKeyword(parseText, globalAnswers),
    () => strategy3_parenthesizedOptions(parseText, globalAnswers),
    () => strategy4_flexible(parseText, globalAnswers),
    () => strategy5_lineBased(parseText, globalAnswers),
  ];

  let bestResult: ParseResult = { questions: [], warnings: [], strategy: "none" };

  for (const strategy of strategies) {
    try {
      const result = strategy();
      if (result.questions.length > bestResult.questions.length) {
        bestResult = result;
      }
    } catch (e) {
      // Skip failed strategy
    }
  }

  // Apply default subject if specified
  if (defaultSubject) {
    bestResult.questions = bestResult.questions.map(q => ({
      ...q,
      subject: q.subject === "Geral" ? defaultSubject : q.subject,
    }));
  }

  if (bestResult.questions.length === 0) {
    bestResult.warnings.push("Nenhuma questão identificada. Verifique se o formato está correto.");
  }

  return bestResult;
}
