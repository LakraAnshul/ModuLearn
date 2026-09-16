/**
 * Flashcard Service
 * Generates AI-powered flashcards using Groq, scoped to the current module's
 * title and subtopics. Each module gets 10–15 flashcards covering key concepts,
 * definitions, code snippets, and important remember-points.
 *
 * Model: openai/gpt-oss-120b
 */

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'openai/gpt-oss-120b';

export interface FlashcardItem {
  id: string;
  front: string;
  back: string;
}

// ─── Domain detection (lightweight) ──────────────────────────────────────────

const inferIsCoding = (curriculumTitle: string, moduleTitle: string, subtopics: string[]): boolean => {
  const corpus = `${curriculumTitle} ${moduleTitle} ${subtopics.join(' ')}`.toLowerCase();
  const signals = [
    'react', 'python', 'javascript', 'typescript', 'java', 'c++', 'c#',
    'coding', 'programming', 'algorithm', 'dsa', 'data structure',
    'api', 'backend', 'frontend', 'full stack', 'sql', 'node', 'html',
    'css', 'git', 'oop', 'debug', 'compiler', 'function', 'variable',
    'class', 'object', 'array', 'loop', 'recursion', 'sorting',
    'framework', 'library', 'database', 'rest', 'graphql',
  ];
  return signals.some((w) => corpus.includes(w));
};

// ─── Prompt Builder ──────────────────────────────────────────────────────────

const buildFlashcardPrompt = (
  moduleTitle: string,
  subtopics: string[],
  curriculumTitle: string,
  educationLevel: string,
  isCoding: boolean,
): string => {
  const subtopicList =
    subtopics.length > 0
      ? subtopics.map((s, i) => `  ${i + 1}. ${s}`).join('\n')
      : '  (General module topics)';

  const levelHint =
    educationLevel === 'school'
      ? 'The learner is a school student — keep language simple and relatable.'
      : educationLevel === 'professional'
        ? 'The learner is a professional — use precise, advanced terminology.'
        : 'The learner is a college student — balance clarity with technical depth.';

  const codingExtra = isCoding
    ? `
CODING-SPECIFIC RULES:
- At least 3–4 cards MUST include short code examples (2–6 lines) on either the front or back.
- Write code inline as plain text. Do NOT use markdown fenced code blocks (no triple backticks).
- Use \\n to represent newlines within code if needed.
- Include cards about syntax, common patterns, gotchas, and best practices.
- If a subtopic involves a small piece of code, create a card for it — even a single line of code is worth a card.`
    : '';

  return `You are an expert educational content creator specialising in spaced-repetition flashcards.

Generate a set of flashcards for the following module. The flashcards should capture EVERY important concept, definition, formula, pattern, and key remember-point from the module — even if the subtopic seems small.

MODULE CONTEXT:
- Course: "${curriculumTitle}"
- Module: "${moduleTitle}"
- Subtopics covered:
${subtopicList}

LEARNER LEVEL: ${educationLevel}
${levelHint}
${codingExtra}

CARD DESIGN RULES:
1. Generate between 10 and 15 flashcards (inclusive). Aim for 12–13 when possible.
2. The "front" is the question / prompt / concept name shown first.
3. The "back" is the answer / explanation / definition revealed on flip.
4. Keep fronts concise (1–2 sentences or a short code snippet).
5. Keep backs informative but scannable (2–5 sentences, or a code snippet with a brief explanation).
6. Cover ALL subtopics — at least one card per subtopic.
7. Include "remember this" style cards for tricky details, edge cases, and common mistakes.
8. Make cards self-contained — each card should make sense without needing context from other cards.
9. Use **bold** for key terms on the back side.

OUTPUT FORMAT — Return ONLY valid JSON, no other text:
{
  "flashcards": [
    {
      "id": "fc_1",
      "front": "Question or concept prompt",
      "back": "Answer or explanation"
    }
  ]
}

CRITICAL JSON RULES:
- Generate EXACTLY between 10 and 15 cards.
- IDs must be in format "fc_1", "fc_2", etc.
- Do NOT wrap the JSON in markdown code blocks.
- Do NOT use backticks (\`) anywhere inside string values.
- Do NOT use unescaped backslashes — if you must use a backslash (e.g. in code), write it as \\\\.
- Do NOT use literal newlines inside string values — use \\n instead.
- Do NOT use single quotes inside JSON — use only double quotes.
- Ensure all string values are properly escaped valid JSON strings.
- Return ONLY the raw JSON object.`;
};

// ─── JSON Sanitisation Helpers ───────────────────────────────────────────────

/**
 * Attempts to sanitise malformed JSON produced by LLMs.
 * Handles common issues: markdown wrappers, bad escape sequences,
 * unescaped control characters, and trailing commas.
 */
const sanitiseJsonString = (raw: string): string => {
  let s = raw.trim();

  // Strip markdown code-fence wrapper if present
  s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');

  // Fix invalid escape sequences that LLMs love to produce.
  // JSON only allows: \" \\ \/ \b \f \n \r \t \uXXXX
  // Everything else (e.g. \' \` \x41 \a \e \s \w \d \( \) etc.) is illegal.
  s = s.replace(/\\x([0-9a-fA-F]{2})/g, (_, hex) => {
    // Convert \xNN to \u00NN
    return `\\u00${hex}`;
  });
  s = s.replace(/\\(?!["\\/bfnrtu])/g, '\\\\');

  // Replace literal control characters (except \n \r \t which we handle next)
  // eslint-disable-next-line no-control-regex
  s = s.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '');

  // Remove trailing commas before } or ]
  s = s.replace(/,\s*([}\]])/g, '$1');

  return s;
};

/**
 * Robust JSON parser with multiple fallback strategies.
 */
const parseFlashcardJson = (content: string): { flashcards: FlashcardItem[] } => {
  // Strategy 1: Direct parse
  try {
    return JSON.parse(content);
  } catch { /* continue */ }

  // Strategy 2: Extract JSON object and sanitise
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  const candidate = jsonMatch ? jsonMatch[0] : content;

  // Strategy 3: Sanitise and parse
  const sanitised = sanitiseJsonString(candidate);
  try {
    return JSON.parse(sanitised);
  } catch { /* continue */ }

  // Strategy 4: Aggressive fix — replace ALL problematic characters inside string values
  // by doing a character-level scan
  try {
    const aggressive = sanitised
      // Remove any remaining non-printable chars
      // eslint-disable-next-line no-control-regex
      .replace(/[\x00-\x1f]/g, (ch) => {
        if (ch === '\n') return '\\n';
        if (ch === '\r') return '\\r';
        if (ch === '\t') return '\\t';
        return '';
      });
    return JSON.parse(aggressive);
  } catch { /* continue */ }

  throw new Error('Failed to parse flashcard JSON from Groq response');
};

// ─── Main Service ─────────────────────────────────────────────────────────────

export const flashcardService = {
  /**
   * Generate flashcards for a specific module using Groq AI.
   * Returns 10–15 flashcards covering the module's key concepts.
   */
  async generateFlashcards(
    moduleTitle: string,
    subtopics: string[],
    curriculumTitle: string,
    educationLevel: string,
  ): Promise<FlashcardItem[]> {
    if (!GROQ_API_KEY) {
      throw new Error(
        'GROQ_API_KEY is not configured. Add VITE_GROQ_API_KEY to your .env file.',
      );
    }

    const isCoding = inferIsCoding(curriculumTitle, moduleTitle, subtopics);
    const prompt = buildFlashcardPrompt(
      moduleTitle,
      subtopics,
      curriculumTitle,
      educationLevel,
      isCoding,
    );

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.65,
        max_tokens: 4096,
        top_p: 0.9,
        response_format: { type: 'json_object' },
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

    // Parse JSON with robust sanitisation for LLM output
    const parsed = parseFlashcardJson(content);

    const cards = Array.isArray(parsed?.flashcards) ? parsed.flashcards : [];

    if (cards.length === 0) {
      throw new Error('No flashcards returned from AI');
    }

    // Validate and sanitize each card
    return cards.slice(0, 15).map(
      (card, i): FlashcardItem => ({
        id: card.id || `fc_${i + 1}`,
        front: String(card.front || '').trim(),
        back: String(card.back || '').trim(),
      }),
    );
  },
};
