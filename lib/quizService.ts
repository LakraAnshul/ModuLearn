/**
 * Quiz Service
 * Generates AI-powered MCQ questions using Groq, scoped strictly to the
 * current module's title and subtopics.
 *
 * Model: llama-3.3-70b-versatile
 */

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';

export type QuizDifficulty = 'easy' | 'medium' | 'hard';

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

// ─── Prompt Builder ──────────────────────────────────────────────────────────

const buildQuizPrompt = (
  moduleTitle: string,
  subtopics: string[],
  curriculumTitle: string,
  difficulty: QuizDifficulty,
  count: number,
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
  ): Promise<QuizQuestion[]> {
    if (!GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY is not configured. Add VITE_GROQ_API_KEY to your .env file.');
    }

    const count = QUESTION_COUNTS[difficulty];
    const prompt = buildQuizPrompt(moduleTitle, subtopics, curriculumTitle, difficulty, count);

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.6,
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
  },
};
