import { GeneratedCurriculum, LearningPreferences } from './groqService.ts';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

GlobalWorkerOptions.workerSrc = pdfWorker;

interface ChunkInput {
  chunkId: string;
  pages: number[];
  text: string;
}

interface ChunkLLMResult {
  summary: string;
  keyPoints: string[];
  examQuestions: string[];
  recommendedVideoQueries: string[];
}

interface ChunkProcessedResult {
  chunkId: string;
  pages: number[];
  importantSentences: string[];
  keywords: string[];
  summary: string;
  keyPoints: string[];
  examQuestions: string[];
  recommendedVideoQueries: string[];
}

interface SectionProcessedResult {
  sectionId: string;
  title: string;
  pages: number[];
  chunkIds: string[];
  summary: string;
  keyPoints: string[];
  recommendedVideoQueries: string[];
}

export interface PdfPipelineResult {
  curriculum: GeneratedCurriculum;
  intermediate: {
    totalPages: number;
    totalChunks: number;
    chunks: ChunkProcessedResult[];
    sections: SectionProcessedResult[];
  };
}

interface ProcessPdfOptions {
  educationLevel: 'school' | 'college' | 'professional';
  preferences: LearningPreferences;
  onProgress?: (message: string) => void;
}

interface CallGroqOptions {
  model: string;
  temperature?: number;
  maxTokens?: number;
  retryCount?: number;
}

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const SMALL_MODEL = 'llama-3.1-8b-instant';
const LARGE_MODEL = 'llama-3.3-70b-versatile';

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'the', 'or', 'but', 'if', 'then', 'else', 'when', 'at', 'by', 'for', 'with', 'without', 'to', 'from',
  'in', 'on', 'of', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'as', 'it', 'its', 'this', 'that', 'these', 'those',
  'their', 'there', 'they', 'them', 'he', 'she', 'we', 'you', 'your', 'i', 'our', 'can', 'could', 'should', 'would', 'will',
  'do', 'does', 'did', 'done', 'not', 'no', 'yes', 'into', 'about', 'than', 'such', 'also', 'using', 'use', 'used', 'very',
  'more', 'most', 'some', 'any', 'all', 'each', 'other', 'another', 'between', 'over', 'under', 'up', 'down'
]);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const normalizeWhitespace = (value: string): string => value.replace(/\s+/g, ' ').trim();

const splitIntoSentences = (text: string): string[] => {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+(?=[A-Z0-9])/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 30);
};

const tokenize = (sentence: string): string[] => {
  return sentence
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));
};

const rankImportantSentences = (text: string) => {
  const sentences = splitIntoSentences(text);
  if (sentences.length <= 6) {
    const keywords = extractKeywords(text, 12);
    return {
      importantSentences: sentences,
      keywords,
      condensedText: sentences.join(' '),
    };
  }

  const tokensBySentence = sentences.map((sentence) => tokenize(sentence));
  const sentenceCount = sentences.length;

  const documentFrequency = new Map<string, number>();
  for (const tokens of tokensBySentence) {
    const unique = new Set(tokens);
    unique.forEach((token) => {
      documentFrequency.set(token, (documentFrequency.get(token) || 0) + 1);
    });
  }

  const scored = sentences.map((sentence, index) => {
    const tokens = tokensBySentence[index];
    if (!tokens.length) {
      return { sentence, score: 0, index };
    }

    const termFrequency = new Map<string, number>();
    for (const token of tokens) {
      termFrequency.set(token, (termFrequency.get(token) || 0) + 1);
    }

    let score = 0;
    termFrequency.forEach((tf, token) => {
      const df = documentFrequency.get(token) || 1;
      const idf = Math.log((sentenceCount + 1) / (df + 1)) + 1;
      score += (tf / tokens.length) * idf;
    });

    const positionBonus = 1 - index / sentenceCount;
    const lengthBonus = Math.min(sentence.length / 220, 1);
    return {
      sentence,
      score: score + positionBonus * 0.15 + lengthBonus * 0.1,
      index,
    };
  });

  const keepCount = Math.max(5, Math.min(Math.ceil(sentences.length * 0.3), 14));
  const selected = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, keepCount)
    .sort((a, b) => a.index - b.index)
    .map((entry) => entry.sentence);

  const keywords = extractKeywords(selected.join(' '), 12);

  return {
    importantSentences: selected,
    keywords,
    condensedText: selected.join(' '),
  };
};

const extractKeywords = (text: string, limit = 10): string[] => {
  const tokens = tokenize(text);
  const counts = new Map<string, number>();
  tokens.forEach((token) => counts.set(token, (counts.get(token) || 0) + 1));

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([token]) => token);
};

const chunkPages = (pages: { pageNumber: number; text: string }[]): ChunkInput[] => {
  const chunks: ChunkInput[] = [];
  const maxChunkChars = 4600;
  let currentText = '';
  let currentPages: number[] = [];
  let chunkCounter = 1;

  for (const page of pages) {
    const pageText = normalizeWhitespace(page.text);
    if (!pageText) {
      continue;
    }

    if (!currentText) {
      currentText = pageText;
      currentPages = [page.pageNumber];
      continue;
    }

    if ((currentText.length + pageText.length + 1) <= maxChunkChars) {
      currentText = `${currentText} ${pageText}`;
      currentPages.push(page.pageNumber);
      continue;
    }

    chunks.push({
      chunkId: `chunk_${chunkCounter++}`,
      pages: [...currentPages],
      text: currentText,
    });

    currentText = pageText;
    currentPages = [page.pageNumber];
  }

  if (currentText) {
    chunks.push({
      chunkId: `chunk_${chunkCounter}`,
      pages: [...currentPages],
      text: currentText,
    });
  }

  return chunks;
};

const splitChunksIntoSections = (chunks: ChunkInput[]): { sectionId: string; title: string; chunks: ChunkInput[]; pages: number[] }[] => {
  if (chunks.length === 0) {
    return [];
  }

  const sectionSize = Math.max(4, Math.ceil(chunks.length / 8));
  const sections: { sectionId: string; title: string; chunks: ChunkInput[]; pages: number[] }[] = [];

  for (let index = 0; index < chunks.length; index += sectionSize) {
    const sectionChunks = chunks.slice(index, index + sectionSize);
    const pages = sectionChunks.flatMap((chunk) => chunk.pages);
    const startPage = Math.min(...pages);
    const endPage = Math.max(...pages);

    sections.push({
      sectionId: `section_${sections.length + 1}`,
      title: `Section ${sections.length + 1} (Pages ${startPage}-${endPage})`,
      chunks: sectionChunks,
      pages,
    });
  }

  return sections;
};

const extractJson = <T>(content: string): T => {
  try {
    return JSON.parse(content) as T;
  } catch {
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/i);
    if (!jsonMatch) {
      throw new Error('Failed to parse JSON response from model');
    }
    return JSON.parse(jsonMatch[1]) as T;
  }
};

const callGroq = async (prompt: string, options: CallGroqOptions): Promise<string> => {
  if (!GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is not configured. Add VITE_GROQ_API_KEY to .env');
  }

  const retryCount = options.retryCount ?? 4;
  const temperature = options.temperature ?? 0.2;
  const maxTokens = options.maxTokens ?? 2048;

  for (let attempt = 0; attempt <= retryCount; attempt++) {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: options.model,
        messages: [{ role: 'user', content: prompt }],
        temperature,
        max_tokens: maxTokens,
        top_p: 0.9,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const message = data.choices?.[0]?.message?.content;
      if (!message) {
        throw new Error('Model returned empty content');
      }
      return message;
    }

    if (response.status === 429 || response.status >= 500) {
      if (attempt < retryCount) {
        const backoffMs = 800 * Math.pow(2, attempt);
        await sleep(backoffMs);
        continue;
      }
    }

    const errorPayload = await response.json().catch(() => ({}));
    const message = errorPayload?.error?.message || `Groq request failed with status ${response.status}`;
    throw new Error(message);
  }

  throw new Error('Groq request failed after retries');
};

const withConcurrency = async <T, R>(
  list: T[],
  worker: (item: T, index: number) => Promise<R>,
  concurrency = 2,
): Promise<R[]> => {
  const results: R[] = new Array(list.length);
  let cursor = 0;

  const runners = Array.from({ length: Math.max(1, concurrency) }, async () => {
    while (cursor < list.length) {
      const currentIndex = cursor;
      cursor += 1;
      results[currentIndex] = await worker(list[currentIndex], currentIndex);
      await sleep(300);
    }
  });

  await Promise.all(runners);
  return results;
};

const summarizeCondensedChunk = async (
  chunk: ChunkInput,
  condensedText: string,
  educationLevel: 'school' | 'college' | 'professional',
): Promise<ChunkLLMResult> => {
  const prompt = `You are processing one condensed textbook chunk.

Education level: ${educationLevel}
Pages: ${chunk.pages.join(', ')}

Important extracted content:
${condensedText}

Return ONLY valid JSON:
{
  "summary": "4-6 sentence concise summary",
  "keyPoints": ["point 1", "point 2", "point 3", "point 4"],
  "examQuestions": ["question 1", "question 2", "question 3"],
  "recommendedVideoQueries": ["query 1", "query 2"]
}

Rules:
- Keep keyPoints concrete and exam-focused.
- Questions should test understanding, not trivia.
- recommendedVideoQueries should be YouTube-searchable learning phrases.`;

  const responseText = await callGroq(prompt, {
    model: SMALL_MODEL,
    temperature: 0.2,
    maxTokens: 1400,
  });

  const parsed = extractJson<ChunkLLMResult>(responseText);

  return {
    summary: parsed.summary || '',
    keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints.slice(0, 8) : [],
    examQuestions: Array.isArray(parsed.examQuestions) ? parsed.examQuestions.slice(0, 5) : [],
    recommendedVideoQueries: Array.isArray(parsed.recommendedVideoQueries) ? parsed.recommendedVideoQueries.slice(0, 4) : [],
  };
};

const summarizeSection = async (
  sectionId: string,
  title: string,
  pages: number[],
  chunkResults: ChunkProcessedResult[],
): Promise<SectionProcessedResult> => {
  const compiled = chunkResults
    .map((chunk) => `Chunk ${chunk.chunkId} (pages ${chunk.pages.join(', ')}): ${chunk.summary}`)
    .join('\n');

  const prompt = `Aggregate chunk summaries into one section summary.

Section title: ${title}
Section pages: ${pages.join(', ')}

Chunk summaries:
${compiled}

Return ONLY valid JSON:
{
  "summary": "section summary in 5-8 sentences",
  "keyPoints": ["section point 1", "section point 2", "section point 3", "section point 4"],
  "recommendedVideoQueries": ["query 1", "query 2", "query 3"]
}`;

  const responseText = await callGroq(prompt, {
    model: SMALL_MODEL,
    temperature: 0.15,
    maxTokens: 1200,
  });

  const parsed = extractJson<{ summary: string; keyPoints: string[]; recommendedVideoQueries: string[] }>(responseText);

  return {
    sectionId,
    title,
    pages,
    chunkIds: chunkResults.map((chunk) => chunk.chunkId),
    summary: parsed.summary || '',
    keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints.slice(0, 8) : [],
    recommendedVideoQueries: Array.isArray(parsed.recommendedVideoQueries) ? parsed.recommendedVideoQueries.slice(0, 5) : [],
  };
};

const buildCurriculumFromSections = async (
  documentTitle: string,
  educationLevel: 'school' | 'college' | 'professional',
  preferences: LearningPreferences,
  sections: SectionProcessedResult[],
): Promise<GeneratedCurriculum> => {
  const sectionInput = sections
    .map((section) => `${section.title}\nSummary: ${section.summary}\nKey points: ${section.keyPoints.join('; ')}\nVideo queries: ${section.recommendedVideoQueries.join('; ')}`)
    .join('\n\n');

  const depthGuidance: Record<LearningPreferences['depth'], string> = {
    quick_overview: `Depth target: Quick Overview.
- Create only 1-2 modules total.
- Keep coverage short, essential, and high-signal.
- Avoid long explanations and exhaustive detail.`,
    structured_learning: `Depth target: Structured Learning.
- Create 4-6 modules total.
- Build understanding progressively from fundamentals to practical use.
- Keep moderate depth with clear structure.`,
    deep_mastery: `Depth target: Deep Mastery.
- Create 7-10 modules total.
- Focus on deep technical understanding and advanced applications.
- Include nuanced and expert-level subtopics where relevant.`,
  };

  const familiarityGuidance: Record<LearningPreferences['familiarity'], string> = {
    new_to_topic: `User familiarity: New to this topic.
- Include a short beginner foundation before advanced concepts.
- Explain key terms before using them deeply.`,
    some_experience: `User familiarity: Some experience.
- Keep beginner recap minimal.
- Move quickly to intermediate concepts and practical depth.`,
    already_comfortable: `User familiarity: Already comfortable.
- Skip basic introductions.
- Prioritize advanced topics, optimization, and deeper analysis.`,
  };

  const prompt = `You are an expert curriculum architect. Build a full learning path from processed textbook sections.

Document title: ${documentTitle}
Education level: ${educationLevel}
${depthGuidance[preferences.depth] || depthGuidance.structured_learning}
${familiarityGuidance[preferences.familiarity] || familiarityGuidance.new_to_topic}

Section summaries:
${sectionInput}

Return ONLY valid JSON with this exact structure:
{
  "title": "Learning path title",
  "description": "2-3 sentence overview",
  "totalEstimatedHours": 0,
  "modules": [
    {
      "id": "module_1",
      "title": "Module title",
      "description": "Module description",
      "summary": "Important concepts summary",
      "estimatedMinutes": 90,
      "subtopics": ["Subtopic 1", "Subtopic 2", "Subtopic 3"],
      "recommendedVideos": ["video search phrase 1", "video search phrase 2"]
    }
  ]
}

Rules:
- Include all major ideas from the section summaries.
- Keep module progression logical and complete.
- Respect selected depth and familiarity when choosing module count and complexity.
- recommendedVideos must be actionable YouTube search phrases.
- Use numeric values (not strings) for totalEstimatedHours and estimatedMinutes.`;

  const responseText = await callGroq(prompt, {
    model: LARGE_MODEL,
    temperature: 0.25,
    maxTokens: 3500,
  });

  const curriculum = extractJson<GeneratedCurriculum>(responseText);

  const normalizedModules = (curriculum.modules || []).map((module, index) => {
    const safeMinutes = Number(module.estimatedMinutes) || 75;
    const safeSubtopics = Array.isArray(module.subtopics) ? module.subtopics : [];

    return {
      ...module,
      id: module.id || `module_${index + 1}`,
      estimatedMinutes: safeMinutes,
      subtopics: safeSubtopics,
      recommendedVideos: Array.isArray(module.recommendedVideos) ? module.recommendedVideos.slice(0, 4) : [],
      summary: typeof module.summary === 'string' ? module.summary : module.description || '',
    };
  });

  const fallbackHours = Math.ceil(normalizedModules.reduce((sum, module) => sum + module.estimatedMinutes, 0) / 60);

  return {
    title: curriculum.title || documentTitle,
    description: curriculum.description || `Curriculum generated from ${documentTitle}`,
    totalEstimatedHours: Number(curriculum.totalEstimatedHours) || fallbackHours,
    educationLevel,
    modules: normalizedModules,
  };
};

const extractPdfPages = async (file: File): Promise<{ pageNumber: number; text: string }[]> => {
  const data = await file.arrayBuffer();
  const loadingTask = getDocument({ data });
  const pdf = await loadingTask.promise;
  const pages: { pageNumber: number; text: string }[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const textItems = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .filter(Boolean);

    const pageText = normalizeWhitespace(textItems.join(' '));
    pages.push({ pageNumber, text: pageText });
  }

  return pages;
};

export const pdfLearningPipeline = {
  async processPdf(file: File, options: ProcessPdfOptions): Promise<PdfPipelineResult> {
    const { educationLevel, preferences, onProgress } = options;

    if (!file || file.type !== 'application/pdf') {
      throw new Error('Please upload a valid PDF file.');
    }

    onProgress?.('Extracting text from all PDF pages...');
    const pages = await extractPdfPages(file);

    if (!pages.length) {
      throw new Error('Unable to read pages from this PDF.');
    }

    const pagesWithText = pages.filter((page) => page.text.length > 0);
    if (!pagesWithText.length) {
      throw new Error('PDF does not contain selectable text. Try an OCR-enabled PDF.');
    }

    onProgress?.(`Building chunks from ${pages.length} pages...`);
    const chunks = chunkPages(pagesWithText);

    if (!chunks.length) {
      throw new Error('Unable to build chunks from extracted PDF text.');
    }

    onProgress?.(`Locally ranking important sentences in ${chunks.length} chunks...`);
    const chunkRanked = chunks.map((chunk) => {
      const ranked = rankImportantSentences(chunk.text);
      return {
        chunk,
        importantSentences: ranked.importantSentences,
        keywords: ranked.keywords,
        condensedText: ranked.condensedText,
      };
    });

    onProgress?.('Sending condensed chunks to Groq in rate-limit-safe batches...');
    const chunkResults = await withConcurrency(chunkRanked, async (item) => {
      const llmResult = await summarizeCondensedChunk(item.chunk, item.condensedText, educationLevel);
      return {
        chunkId: item.chunk.chunkId,
        pages: item.chunk.pages,
        importantSentences: item.importantSentences,
        keywords: item.keywords,
        summary: llmResult.summary,
        keyPoints: llmResult.keyPoints,
        examQuestions: llmResult.examQuestions,
        recommendedVideoQueries: llmResult.recommendedVideoQueries,
      } satisfies ChunkProcessedResult;
    }, 2);

    onProgress?.('Aggregating chunks into section summaries...');
    const sections = splitChunksIntoSections(chunks);

    const sectionResults: SectionProcessedResult[] = [];
    for (const section of sections) {
      const result = await summarizeSection(
        section.sectionId,
        section.title,
        section.pages,
        chunkResults.filter((chunk) => section.chunks.some((sectionChunk) => sectionChunk.chunkId === chunk.chunkId)),
      );
      sectionResults.push(result);
    }

    onProgress?.('Generating final chapter/module curriculum...');
    const curriculum = await buildCurriculumFromSections(file.name.replace(/\.pdf$/i, ''), educationLevel, preferences, sectionResults);

    return {
      curriculum,
      intermediate: {
        totalPages: pages.length,
        totalChunks: chunkResults.length,
        chunks: chunkResults,
        sections: sectionResults,
      },
    };
  },
};
