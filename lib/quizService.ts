/**
 * Quiz Service
 * Generates AI-powered MCQ questions using Groq, scoped strictly to the
 * current module's title and subtopics.
 *
 * Model: openai/gpt-oss-120b
 */

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'openai/gpt-oss-120b';

export type QuizDifficulty = 'easy' | 'medium' | 'hard';
export type QuizType = 'mixed' | 'theory' | 'numerical';

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[]; // exactly 4 choices
  correctIndex: number; // 0–3
  explanation: string;
}

export interface QuizAttemptRecord {
  id?: string;
  moduleId: string;
  difficulty: QuizDifficulty;
  score: number;
  total: number;
  createdAt: string;
}

export const QUESTION_COUNTS: Record<QuizDifficulty, number> = {
  easy: 15,
  medium: 20,
  hard: 30,
};

export const ESTIMATED_MINUTES: Record<QuizDifficulty, number> = {
  easy: 8,
  medium: 12,
  hard: 20,
};

export const FINAL_QUESTION_COUNTS: Record<QuizDifficulty, number> = {
  easy: 20,
  medium: 30,
  hard: 40,
};

export const FINAL_ESTIMATED_MINUTES: Record<QuizDifficulty, number> = {
  easy: 10,
  medium: 15,
  hard: 25,
};

export interface QuizCurriculumModule {
  title: string;
  subtopics: string[];
}
// ─── Prompt Builder ──────────────────────────────────────────────────────────

const buildQuizPrompt = (
  moduleTitle: string,
  subtopics: string[],
  curriculumTitle: string,
  difficulty: QuizDifficulty,
  count: number,
  quizType: QuizType = 'mixed',
): string => {
  const difficultyGuidance: Record<QuizDifficulty, string> = {
    easy: `
- Questions should test basic recall and foundational understanding.
- Use simple language; avoid ambiguous wording.
- Distractors should be clearly wrong but plausible to a beginner.
- Focus on definitions, basic concepts, and simple applications.`,
    medium: `
- Questions should test applied understanding and moderate reasoning.
- Include scenario-based questions where a concept must be applied.
- Distractors should be plausible and require careful thought to rule out.
- Mix recall, conceptual understanding, and simple problem-solving.`,
    hard: `
- Questions should test deep mastery, edge cases, and nuanced understanding.
- Include complex scenarios, tradeoffs, and analysis questions.
- Distractors should be highly plausible and very close to correct answers.
- Challenge the learner with counterintuitive or advanced-level reasoning.`,
  };

  let quizTypeRules = '';
  if (quizType === 'theory') {
    quizTypeRules = `
QUIZ TYPE FOCUS: THEORY ONLY — STRICTLY ENFORCED
- Focus EXCLUSIVELY on conceptual understanding, definitions, laws, principles, and theoretical implications.
- Do NOT include ANY questions that require numerical calculations, formula substitution, or solving equations for a numerical value.
- Questions should ask about "what", "why", "which", "how does", "what happens when" — NOT "calculate", "find the value", or "solve for".
- All four options must be textual/conceptual descriptions, NOT numbers or mathematical expressions.`;
  } else if (quizType === 'numerical') {
    quizTypeRules = `
QUIZ TYPE FOCUS: NUMERICAL / CALCULATION-BASED — STRICTLY ENFORCED
- EVERY SINGLE QUESTION must be a numerical calculation problem. This is NON-NEGOTIABLE.
- Each question MUST require the student to apply a specific formula, equation, or mathematical procedure to compute a numerical answer.
- The question text MUST include given numerical values (e.g., mass, velocity, concentration, dimensions, coefficients) and ask the student to calculate, find, determine, or compute a specific numerical result.
- ALL FOUR OPTIONS must be numerical values (with appropriate units) or mathematical expressions. Do NOT include any purely textual/conceptual options.
- Do NOT ask definitional, conceptual, or "which of the following" theory-style questions.
- Think about what kinds of real numerical problems can be formed from each subtopic: identify key formulas, pick realistic input values, compute the answer, and create plausible wrong numerical distractors by using common mistakes (wrong formula, sign error, unit conversion error, etc.).
- Examples of GOOD numerical question stems: "Calculate the force...", "Find the wavelength...", "Determine the pH of...", "What is the velocity after...", "Compute the area of...", "If a 5 kg object is...", "A solution with molarity 0.1M..."
- Examples of BAD questions (do NOT generate these): "What is Newton's first law?", "Which principle states...", "Define the term...", "What is the SI unit of..."
- Ensure the math is solvable by hand or with basic arithmetic but requires applying the correct formula or principle.`;
  } else if (quizType === 'mixed') {
    quizTypeRules = `
QUIZ TYPE FOCUS: MIXED (THEORY + NUMERICAL) — STRICTLY ENFORCED
- Generate a BALANCED MIX of both theory-based AND numerical calculation-based questions.
- Approximately HALF the questions should be conceptual/theory (definitions, principles, reasoning) and the OTHER HALF should be numerical/calculation-based (requiring formula application and computing a numerical answer).
- For the numerical questions: the question MUST include given numerical values and ask the student to calculate/find/compute a specific number. All four options for numerical questions must be numerical values with units.
- For the theory questions: focus on conceptual understanding, definitions, and reasoning. Options should be textual.
- Alternate between theory and numerical questions throughout the quiz for variety.`;
  }

  const subtopicList = subtopics.length > 0
    ? subtopics.map((s, i) => `  ${i + 1}. ${s}`).join('\n')
    : '  (General module topics)';

  return `You are an expert educational quiz designer. Generate exactly ${count} multiple-choice questions (MCQs) for the following module.

SCOPE RULES — STRICTLY ENFORCED:
- Questions MUST be based ONLY on the module topics listed below.
- Do NOT include questions about other modules or unrelated subjects.
- Every question must be directly answerable from the module's subtopics.

MODULE CONTEXT:
- Course: "${curriculumTitle}"
- Module: "${moduleTitle}"
- Subtopics covered:
${subtopicList}

DIFFICULTY: ${difficulty.toUpperCase()}
${difficultyGuidance[difficulty]}
${quizTypeRules}

OUTPUT FORMAT — Return ONLY valid JSON, no other text:
{
  "questions": [
    {
      "id": "q_1",
      "question": "Clear, concise question text?",
      "options": [
        "Option A text",
        "Option B text",
        "Option C text",
        "Option D text"
      ],
      "correctIndex": 0,
      "explanation": "Brief explanation of why the correct answer is right and why the others are wrong (2-4 sentences)."
    }
  ]
}

IMPORTANT RULES:
- Generate EXACTLY ${count} questions, no more, no less.
- Each question must have EXACTLY 4 options (A, B, C, D).
- correctIndex must be 0, 1, 2, or 3 (the index of the correct option in the array).
- Shuffle the position of the correct answer across questions (don't always put it first).
- Explanation must be helpful and educationally sound.
- IDs must be in format "q_1", "q_2", ..., "q_${count}".
- Do NOT wrap the JSON in markdown code blocks.
- Return ONLY the raw JSON object.`;
};

const buildFinalQuizPrompt = (
  modules: QuizCurriculumModule[],
  curriculumTitle: string,
  difficulty: QuizDifficulty,
  count: number,
  quizType: QuizType = 'mixed',
): string => {
  const difficultyGuidance: Record<QuizDifficulty, string> = {
    easy: `
- Questions should test basic recall and foundational understanding across all modules.
- Use simple language; avoid ambiguous wording.
- Distractors should be clearly wrong but plausible to a beginner.`,
    medium: `
- Questions should test applied understanding and moderate reasoning.
- Include scenario-based questions where concepts from different modules might intersect.
- Distractors should be plausible and require careful thought to rule out.`,
    hard: `
- Questions should test deep mastery, edge cases, and nuanced understanding.
- Include complex scenarios, tradeoffs, and analysis questions drawing from the entire course.
- Challenge the learner with advanced-level reasoning.`,
  };

  let quizTypeRules = '';
  if (quizType === 'theory') {
    quizTypeRules = `
QUIZ TYPE FOCUS: THEORY ONLY — STRICTLY ENFORCED
- Focus EXCLUSIVELY on conceptual understanding, definitions, laws, principles, and theoretical implications.
- Do NOT include ANY questions that require numerical calculations, formula substitution, or solving equations for a numerical value.
- Questions should ask about "what", "why", "which", "how does", "what happens when" — NOT "calculate", "find the value", or "solve for".
- All four options must be textual/conceptual descriptions, NOT numbers or mathematical expressions.`;
  } else if (quizType === 'numerical') {
    quizTypeRules = `
QUIZ TYPE FOCUS: NUMERICAL / CALCULATION-BASED — STRICTLY ENFORCED
- EVERY SINGLE QUESTION must be a numerical calculation problem. This is NON-NEGOTIABLE.
- Each question MUST require the student to apply a specific formula, equation, or mathematical procedure to compute a numerical answer.
- The question text MUST include given numerical values (e.g., mass, velocity, concentration, dimensions, coefficients) and ask the student to calculate, find, determine, or compute a specific numerical result.
- ALL FOUR OPTIONS must be numerical values (with appropriate units) or mathematical expressions. Do NOT include any purely textual/conceptual options.
- Do NOT ask definitional, conceptual, or "which of the following" theory-style questions.
- Think about what kinds of real numerical problems can be formed from each subtopic: identify key formulas, pick realistic input values, compute the answer, and create plausible wrong numerical distractors by using common mistakes (wrong formula, sign error, unit conversion error, etc.).
- Examples of GOOD numerical question stems: "Calculate the force...", "Find the wavelength...", "Determine the pH of...", "What is the velocity after...", "Compute the area of..."
- Examples of BAD questions (do NOT generate these): "What is Newton's first law?", "Which principle states...", "Define the term..."
- Ensure the math is solvable by hand or with basic arithmetic but requires applying the correct formula or principle.`;
  } else if (quizType === 'mixed') {
    quizTypeRules = `
QUIZ TYPE FOCUS: MIXED (THEORY + NUMERICAL) — STRICTLY ENFORCED
- Generate a BALANCED MIX of both theory-based AND numerical calculation-based questions.
- Approximately HALF the questions should be conceptual/theory (definitions, principles, reasoning) and the OTHER HALF should be numerical/calculation-based (requiring formula application and computing a numerical answer).
- For the numerical questions: the question MUST include given numerical values and ask the student to calculate/find/compute a specific number. All four options for numerical questions must be numerical values with units.
- For the theory questions: focus on conceptual understanding, definitions, and reasoning. Options should be textual.
- Alternate between theory and numerical questions throughout the quiz for variety.`;
  }

  const modulesList = modules.map((m, i) => {
    const subtopicList = m.subtopics.map(s => `    - ${s}`).join('\n');
    return `  Module ${i + 1}: ${m.title}\n${subtopicList}`;
  }).join('\n\n');

  return `You are an expert educational quiz designer. Generate a FINAL COURSE EXAM consisting of exactly ${count} multiple-choice questions (MCQs) covering the entire course.

SCOPE RULES — STRICTLY ENFORCED:
- Questions MUST be based ONLY on the modules and topics listed below.
- Ensure a fair distribution of questions across all the modules.
- Every question must be directly answerable from the subtopics provided.

COURSE CONTEXT:
- Course: "${curriculumTitle}"
- Modules and Subtopics covered:
${modulesList}

DIFFICULTY: ${difficulty.toUpperCase()}
${difficultyGuidance[difficulty]}
${quizTypeRules}

OUTPUT FORMAT — Return ONLY valid JSON, no other text:
{
  "questions": [
    {
      "id": "q_1",
      "question": "Clear, concise question text?",
      "options": [
        "Option A text",
        "Option B text",
        "Option C text",
        "Option D text"
      ],
      "correctIndex": 0,
      "explanation": "Brief explanation of why the correct answer is right and why the others are wrong (2-4 sentences)."
    }
  ]
}

IMPORTANT RULES:
- Generate EXACTLY ${count} questions, no more, no less.
- Each question must have EXACTLY 4 options (A, B, C, D).
- correctIndex must be 0, 1, 2, or 3 (the index of the correct option in the array).
- Shuffle the position of the correct answer across questions.
- Explanation must be helpful and educationally sound.
- IDs must be in format "q_1", "q_2", ..., "q_${count}".
- Do NOT wrap the JSON in markdown code blocks.
- Return ONLY the raw JSON object.`;
};

const buildFeedbackPrompt = (
  score: number,
  total: number,
  difficulty: QuizDifficulty,
  questions: QuizQuestion[],
  userAnswers: number[],
  moduleTitle?: string,
  timeTakenSeconds?: number | null
): string => {
  const percentage = (score / total) * 100;

  // Format the mistakes for the prompt
  const mistakes = questions.filter((q, i) => userAnswers[i] !== q.correctIndex).map((q, i) => {
    const originalIndex = questions.indexOf(q);
    const userAnswer = userAnswers[originalIndex] !== undefined && userAnswers[originalIndex] !== null ? q.options[userAnswers[originalIndex]] : "Skipped";
    const correctAnswer = q.options[q.correctIndex];
    return `Question: ${q.question}\nUser Answer: ${userAnswer}\nCorrect Answer: ${correctAnswer}\nTopic/Explanation: ${q.explanation}`;
  }).slice(0, 10); // Limit to 10 mistakes to avoid massive prompts

  const contextStr = moduleTitle ? `module "${moduleTitle}"` : `entire course`;
  const timeTakenStr = timeTakenSeconds ? `\nTime Taken: ${Math.floor(timeTakenSeconds / 60)} minutes and ${timeTakenSeconds % 60} seconds.` : '';

  return `You are an encouraging but honest AI educational tutor. A student has just completed a quiz on the ${contextStr} at the "${difficulty.toUpperCase()}" difficulty level.

Performance: ${score} out of ${total} correct (${percentage.toFixed(1)}%).${timeTakenStr}

${mistakes.length > 0 ? `Here are some of the questions they got wrong (up to 10):\n${mistakes.join('\n\n')}\n` : `They got a perfect score!\n`}

INSTRUCTIONS:
1. Provide a short, clear paragraph (2-4 sentences) giving honest feedback on their performance. If a time taken is provided, mention it briefly. Highlight only the main points. Keep it concise.
2. Specifically mention which topics or concepts they need to focus more on based on the questions they got wrong.
3. If they got more than 50% wrong (even on 'easy' difficulty), give honest, constructive feedback indicating that they should seriously review the material before moving forward.
4. Keep the tone encouraging but realistic. Acknowledge the difficulty level they opted for.
5. Return ONLY the plain text feedback, no markdown headings or conversational filler.`;
};

// ─── System Message Builder ──────────────────────────────────────────────────

const buildSystemMessage = (quizType: QuizType): string => {
  if (quizType === 'numerical') {
    return `You are a quiz generator that ONLY creates numerical calculation-based MCQ questions. Every question you generate MUST require mathematical computation. The question must provide numerical values and ask the student to calculate a result. All four answer options MUST be numbers (with units where appropriate). You must NEVER generate conceptual, definitional, or theory-based questions. If a subtopic does not naturally lend itself to numerical problems, create word problems that use realistic numerical data from that topic. This constraint is absolute and non-negotiable.`;
  }
  if (quizType === 'theory') {
    return `You are a quiz generator that ONLY creates theory and conceptual MCQ questions. Every question must test understanding of concepts, definitions, principles, or reasoning. You must NEVER include questions that require numerical calculations or computing a specific numerical answer. All answer options must be textual descriptions, not numbers.`;
  }
  // mixed
  return `You are a quiz generator that creates a balanced mix of theory-based and numerical calculation-based MCQ questions. Approximately half should be conceptual/theory questions and the other half should be numerical problems requiring calculation. For numerical questions, provide given values and ask students to compute a result with numerical answer options. For theory questions, test conceptual understanding with textual answer options.`;
};

// ─── Main Service ─────────────────────────────────────────────────────────────

export const quizService = {
  /**
   * Generate MCQ questions for a module using Groq AI.
   * Questions are strictly scoped to the module's subtopics.
   */
  async generateQuestions(
    moduleTitle: string,
    subtopics: string[],
    curriculumTitle: string,
    difficulty: QuizDifficulty,
    quizType: QuizType = 'mixed',
  ): Promise<QuizQuestion[]> {
    if (!GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY is not configured. Add VITE_GROQ_API_KEY to your .env file.');
    }

    const count = QUESTION_COUNTS[difficulty];
    const prompt = buildQuizPrompt(moduleTitle, subtopics, curriculumTitle, difficulty, count, quizType);
    const systemMessage = buildSystemMessage(quizType);

    return this.fetchFromGroq(prompt, true, systemMessage, quizType);
  },

  /**
   * Generate a final course quiz covering all modules.
   */
  async generateFinalQuestions(
    modules: QuizCurriculumModule[],
    curriculumTitle: string,
    difficulty: QuizDifficulty,
    quizType: QuizType = 'mixed',
  ): Promise<QuizQuestion[]> {
    if (!GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY is not configured. Add VITE_GROQ_API_KEY to your .env file.');
    }

    const count = FINAL_QUESTION_COUNTS[difficulty];
    const prompt = buildFinalQuizPrompt(modules, curriculumTitle, difficulty, count, quizType);
    const systemMessage = buildSystemMessage(quizType);

    return this.fetchFromGroq(prompt, true, systemMessage, quizType);
  },

  /**
   * Generate personalized feedback after a quiz.
   */
  async generateFeedback(
    score: number,
    total: number,
    difficulty: QuizDifficulty,
    questions: QuizQuestion[],
    userAnswers: number[],
    moduleTitle?: string,
    timeTakenSeconds?: number | null
  ): Promise<string> {
    if (!GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY is not configured.');
    }

    const prompt = buildFeedbackPrompt(score, total, difficulty, questions, userAnswers, moduleTitle, timeTakenSeconds);

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 1024,
        top_p: 0.9,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate feedback');
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || "Great effort! Review the questions you missed to improve.";
  },

  /**
   * Internal helper to fetch and parse JSON from Groq
   */
  async fetchFromGroq(prompt: string, parseJson: boolean = false, systemMessage?: string, quizType?: QuizType): Promise<any> {
    const messages: { role: string; content: string }[] = [];
    if (systemMessage) {
      messages.push({ role: 'system', content: systemMessage });
    }
    messages.push({ role: 'user', content: prompt });

    // Use lower temperature for numerical quizzes to get more precise/deterministic calculations
    const temperature = quizType === 'numerical' ? 0.3 : 0.6;

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        temperature,
        max_tokens: 8192,
        top_p: 0.9,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(
        `Groq API error ${response.status}: ${(err as any)?.error?.message || 'Unknown error'}`,
      );
    }

    const data = await response.json();
    const content: string = data.choices?.[0]?.message?.content || '';

    if (!content) {
      throw new Error('No content received from Groq API');
    }

    if (!parseJson) return content;

    // Parse JSON — handle potential markdown wrapper
    let parsed: { questions: QuizQuestion[] };
    try {
      parsed = JSON.parse(content);
    } catch {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Failed to parse quiz JSON from Groq response');
      }
    }

    const questions = Array.isArray(parsed?.questions) ? parsed.questions : [];

    if (questions.length === 0) {
      throw new Error('No questions returned from AI');
    }

    // Validate and sanitize each question
    return questions.map((q, i): QuizQuestion => ({
      id: q.id || `q_${i + 1}`,
      question: String(q.question || '').trim(),
      options: Array.isArray(q.options) && q.options.length === 4
        ? q.options.map((o: unknown) => String(o).trim())
        : ['Option A', 'Option B', 'Option C', 'Option D'],
      correctIndex: typeof q.correctIndex === 'number' && q.correctIndex >= 0 && q.correctIndex <= 3
        ? q.correctIndex
        : 0,
      explanation: String(q.explanation || 'No explanation provided.').trim(),
    }));
  }
};
