import { CodingTestCase, SupportedProgrammingLanguage } from './codingPractice.ts';

interface Judge0SubmissionResponse {
  stdout?: string | null;
  stderr?: string | null;
  compile_output?: string | null;
  message?: string | null;
  time?: string | null;
  memory?: number | null;
  status?: {
    id: number;
    description: string;
  };
}

export interface RunCodeResult {
  output: string;
  status: string;
  executionTime: string | null;
  memoryKb: number | null;
}

export interface TestCaseRunResult {
  testCaseId: string;
  label: string;
  visibility: 'public' | 'hidden';
  passed: boolean;
  status: string;
  output: string;
  executionTime: string | null;
  memoryKb: number | null;
}

export interface RunTestSuiteResult {
  total: number;
  passed: number;
  failed: number;
  results: TestCaseRunResult[];
}

const DEFAULT_JUDGE0_URL = 'https://ce.judge0.com';

const LANGUAGE_ID_MAP: Record<SupportedProgrammingLanguage, number> = {
  python: 71,
  javascript: 63,
  typescript: 74,
  java: 62,
  cpp: 54,
  c: 50,
};

const getJudge0BaseUrl = (): string => {
  const configured = import.meta.env.VITE_JUDGE0_API_URL;
  if (typeof configured === 'string' && configured.trim()) {
    return configured.trim().replace(/\/$/, '');
  }
  return DEFAULT_JUDGE0_URL;
};

const getJudge0Headers = (): HeadersInit => {
  const baseUrl = getJudge0BaseUrl();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Optional support for RapidAPI-hosted Judge0.
  if (baseUrl.includes('rapidapi.com')) {
    const rapidApiKey = import.meta.env.VITE_RAPIDAPI_KEY;
    const rapidApiHost = import.meta.env.VITE_RAPIDAPI_HOST || 'judge0-ce.p.rapidapi.com';

    if (!rapidApiKey) {
      throw new Error('VITE_RAPIDAPI_KEY is required for RapidAPI Judge0 endpoint.');
    }

    headers['X-RapidAPI-Key'] = rapidApiKey;
    headers['X-RapidAPI-Host'] = rapidApiHost;
  }

  return headers;
};

const parseJudge0Output = (response: Judge0SubmissionResponse): string => {
  const segments = [
    response.stdout?.trim(),
    response.stderr?.trim(),
    response.compile_output?.trim(),
    response.message?.trim(),
  ].filter(Boolean);

  return segments.length ? segments.join('\n\n') : 'No output returned.';
};

const runJudge0Submission = async (
  sourceCode: string,
  languageId: number,
  stdin = '',
  expectedOutput?: string
): Promise<Judge0SubmissionResponse> => {
  const baseUrl = getJudge0BaseUrl();
  const response = await fetch(`${baseUrl}/submissions?base64_encoded=false&wait=true`, {
    method: 'POST',
    headers: getJudge0Headers(),
    body: JSON.stringify({
      language_id: languageId,
      source_code: sourceCode,
      stdin,
      expected_output: expectedOutput,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Code execution failed (${response.status}): ${body || 'Unknown error'}`);
  }

  return (await response.json()) as Judge0SubmissionResponse;
};

export const runCodeWithJudge0 = async (
  sourceCode: string,
  language: SupportedProgrammingLanguage,
  stdin = ''
): Promise<RunCodeResult> => {
  const languageId = LANGUAGE_ID_MAP[language];
  if (!languageId) {
    throw new Error(`Unsupported language: ${language}`);
  }

  const payload = await runJudge0Submission(sourceCode, languageId, stdin);
  return {
    output: parseJudge0Output(payload),
    status: payload.status?.description || 'Unknown',
    executionTime: payload.time || null,
    memoryKb: payload.memory ?? null,
  };
};

export const runCodeAgainstTestCases = async (
  sourceCode: string,
  language: SupportedProgrammingLanguage,
  testCases: CodingTestCase[]
): Promise<RunTestSuiteResult> => {
  const languageId = LANGUAGE_ID_MAP[language];
  if (!languageId) {
    throw new Error(`Unsupported language: ${language}`);
  }

  const suiteResults: TestCaseRunResult[] = [];

  for (const testCase of testCases) {
    const payload = await runJudge0Submission(sourceCode, languageId, testCase.input, testCase.expectedOutput);
    const statusId = payload.status?.id || 0;
    const passed = statusId === 3;

    suiteResults.push({
      testCaseId: testCase.id,
      label: testCase.label,
      visibility: testCase.visibility,
      passed,
      status: payload.status?.description || 'Unknown',
      output: parseJudge0Output(payload),
      executionTime: payload.time || null,
      memoryKb: payload.memory ?? null,
    });
  }

  const passedCount = suiteResults.filter((result) => result.passed).length;
  return {
    total: suiteResults.length,
    passed: passedCount,
    failed: suiteResults.length - passedCount,
    results: suiteResults,
  };
};
