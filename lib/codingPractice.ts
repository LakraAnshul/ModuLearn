export type SupportedProgrammingLanguage =
  | 'python'
  | 'javascript'
  | 'typescript'
  | 'java'
  | 'cpp'
  | 'c';

export interface CodingContext {
  isCodingTopic: boolean;
  lockedLanguage: SupportedProgrammingLanguage | null;
  languageCandidates: SupportedProgrammingLanguage[];
}

export interface CodingChallenge {
  id: string;
  title: string;
  prompt: string;
  constraints: string[];
  testCases: CodingTestCase[];
}

export interface CodingQuestionSet {
  title: string;
  starterCode: string;
  questions: CodingChallenge[];
}

export interface CodingTestCase {
  id: string;
  input: string;
  expectedOutput: string;
  visibility: 'public' | 'hidden';
  label: string;
}

export interface PracticeLanguageOption {
  value: SupportedProgrammingLanguage;
  label: string;
  monacoLanguage: string;
}

const LANGUAGE_OPTIONS: PracticeLanguageOption[] = [
  { value: 'python', label: 'Python', monacoLanguage: 'python' },
  { value: 'javascript', label: 'JavaScript', monacoLanguage: 'javascript' },
  { value: 'typescript', label: 'TypeScript', monacoLanguage: 'typescript' },
  { value: 'java', label: 'Java', monacoLanguage: 'java' },
  { value: 'cpp', label: 'C++', monacoLanguage: 'cpp' },
  { value: 'c', label: 'C', monacoLanguage: 'c' },
];

const LANGUAGE_KEYWORDS: Record<SupportedProgrammingLanguage, string[]> = {
  python: ['python', 'py', 'pandas', 'numpy', 'django', 'flask'],
  javascript: ['javascript', 'js', 'node', 'react', 'vue', 'angular'],
  typescript: ['typescript', 'ts', 'type safety'],
  java: ['java', 'spring', 'jvm', 'object oriented java'],
  cpp: ['c++', 'cpp', 'stl'],
  c: ['language c', 'ansi c', 'pointer in c', 'c programming'],
};

const CODING_TOPIC_KEYWORDS = [
  'algorithm',
  'data structure',
  'dsa',
  'programming',
  'coding',
  'code',
  'software',
  'debug',
  'api',
  'backend',
  'frontend',
  'database',
  'web development',
  'devops',
  'oop',
  'recursion',
  'dynamic programming',
  'array',
  'linked list',
  'tree',
  'graph',
  'react',
  'python',
  'java',
  'javascript',
  'typescript',
  'c++',
  'c language',
  'node',
  'sql',
];

type ChallengeTemplateType =
  | 'sum_two_numbers'
  | 'max_in_array'
  | 'reverse_string'
  | 'nth_fibonacci'
  | 'conditional_sign'
  | 'loop_even_count'
  | 'function_min_of_three';

const normalize = (value: string): string => value.toLowerCase().trim();

const includesKeyword = (corpus: string, keyword: string): boolean => {
  const cleanKeyword = normalize(keyword);
  if (!cleanKeyword) return false;
  return corpus.includes(cleanKeyword);
};

export const getPracticeLanguageOptions = (): PracticeLanguageOption[] => LANGUAGE_OPTIONS;

export const detectCodingContext = (
  mainTopic: string,
  moduleTitle: string,
  subtopics: string[] = []
): CodingContext => {
  const corpus = normalize([mainTopic, moduleTitle, ...subtopics].join(' | '));

  const languageCandidates = (Object.keys(LANGUAGE_KEYWORDS) as SupportedProgrammingLanguage[]).filter((language) => {
    return LANGUAGE_KEYWORDS[language].some((keyword) => includesKeyword(corpus, keyword));
  });

  const isCodingTopic =
    languageCandidates.length > 0 || CODING_TOPIC_KEYWORDS.some((keyword) => includesKeyword(corpus, keyword));

  const lockedLanguage = languageCandidates.length === 1 ? languageCandidates[0] : null;

  return {
    isCodingTopic,
    lockedLanguage,
    languageCandidates,
  };
};

const STARTER_TEMPLATES: Record<SupportedProgrammingLanguage, string> = {
  python: `def solve():
    import sys
    data = sys.stdin.read().strip().split()
    # Parse input from data and print your answer
    print("TODO")

if __name__ == "__main__":
    solve()
`,
  javascript: `function solve(input) {
  const data = input.trim().split(/\\s+/);
  // Parse input from data and return your answer
  return "TODO";
}

const fs = require("fs");
const input = fs.readFileSync(0, "utf8");
const output = solve(input);
if (output !== undefined) {
  process.stdout.write(String(output));
}
`,
  typescript: `function solve(input: string): string {
  const data = input.trim().split(/\\s+/);
  // Parse input from data and return your answer
  return "TODO";
}

const fs = require("fs");
const input = fs.readFileSync(0, "utf8");
const output = solve(input);
if (output !== undefined) {
  process.stdout.write(String(output));
}
`,
  java: `import java.io.*;
import java.util.*;

public class Main {
  public static void main(String[] args) throws Exception {
    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
    StringBuilder sb = new StringBuilder();
    String line;
    while ((line = br.readLine()) != null) {
      sb.append(line).append("\\n");
    }
    String input = sb.toString().trim();
    // Parse input and print your answer
    System.out.print("TODO");
  }
}
`,
  cpp: `#include <bits/stdc++.h>
using namespace std;

int main() {
  ios::sync_with_stdio(false);
  cin.tie(nullptr);

  // Parse input and print your answer
  cout << "TODO";
  return 0;
}
`,
  c: `#include <stdio.h>

int main() {
  // Parse input and print your answer
  printf("TODO");
  return 0;
}
`,
};

const CHALLENGE_LIBRARY: Record<
  ChallengeTemplateType,
  {
    title: string;
    prompt: string;
    constraints: string[];
    tests: CodingTestCase[];
  }
> = {
  sum_two_numbers: {
    title: 'Warm-up: Sum Two Numbers',
    prompt:
      'Read two integers a and b from input and print their sum. Input format: one line with two space-separated integers.',
    constraints: [
      'Use integer arithmetic.',
      'Print only the final sum.',
      'Handle negative values as well.',
    ],
    tests: [
      { id: 'pub-1', input: '2 3', expectedOutput: '5', visibility: 'public', label: 'Simple positive numbers' },
      { id: 'pub-2', input: '-5 7', expectedOutput: '2', visibility: 'public', label: 'Includes negative number' },
      { id: 'hid-1', input: '1000 2500', expectedOutput: '3500', visibility: 'hidden', label: 'Large values check' },
    ],
  },
  max_in_array: {
    title: 'Array Practice: Maximum Element',
    prompt:
      'Given n and then n integers, print the maximum element. Input format: first line n, second line has n space-separated integers.',
    constraints: [
      'n >= 1',
      'Work in O(n) time.',
      'Print only the maximum value.',
    ],
    tests: [
      { id: 'pub-1', input: '5\n1 9 3 7 2', expectedOutput: '9', visibility: 'public', label: 'Mixed values' },
      { id: 'pub-2', input: '4\n-3 -2 -8 -1', expectedOutput: '-1', visibility: 'public', label: 'All negative values' },
      { id: 'hid-1', input: '1\n42', expectedOutput: '42', visibility: 'hidden', label: 'Single element edge case' },
    ],
  },
  reverse_string: {
    title: 'String Practice: Reverse Input',
    prompt: 'Read one line string input and print its reverse exactly.',
    constraints: [
      'Preserve spaces and characters.',
      'Do not add extra text.',
      'Print only the reversed string.',
    ],
    tests: [
      { id: 'pub-1', input: 'hello', expectedOutput: 'olleh', visibility: 'public', label: 'Basic word' },
      { id: 'pub-2', input: 'code challenge', expectedOutput: 'egnellahc edoc', visibility: 'public', label: 'String with space' },
      { id: 'hid-1', input: 'A', expectedOutput: 'A', visibility: 'hidden', label: 'Single character edge case' },
    ],
  },
  nth_fibonacci: {
    title: 'Recursion/DP Practice: Nth Fibonacci',
    prompt:
      'Read integer n and print the nth Fibonacci number where F(0)=0 and F(1)=1. Prefer iterative solution for performance.',
    constraints: [
      'Use 0-indexed Fibonacci definition.',
      'Handle n up to at least 40 quickly.',
      'Print only the number.',
    ],
    tests: [
      { id: 'pub-1', input: '0', expectedOutput: '0', visibility: 'public', label: 'Base case n=0' },
      { id: 'pub-2', input: '7', expectedOutput: '13', visibility: 'public', label: 'Standard mid value' },
      { id: 'hid-1', input: '10', expectedOutput: '55', visibility: 'hidden', label: 'Hidden verification case' },
    ],
  },
  conditional_sign: {
    title: 'Conditionals Practice: Sign Classifier',
    prompt:
      'Read an integer n and print POSITIVE if n > 0, NEGATIVE if n < 0, and ZERO if n = 0.',
    constraints: [
      'Use conditional logic (if/else or equivalent).',
      'Output must be exactly one of: POSITIVE, NEGATIVE, ZERO.',
      'Print only the classification.',
    ],
    tests: [
      { id: 'pub-1', input: '5', expectedOutput: 'POSITIVE', visibility: 'public', label: 'Positive number' },
      { id: 'pub-2', input: '-8', expectedOutput: 'NEGATIVE', visibility: 'public', label: 'Negative number' },
      { id: 'hid-1', input: '0', expectedOutput: 'ZERO', visibility: 'hidden', label: 'Zero edge case' },
    ],
  },
  loop_even_count: {
    title: 'Loops Practice: Count Evens in Range',
    prompt:
      'Read two integers a and b (a <= b), and print how many even numbers are in the inclusive range [a, b].',
    constraints: [
      'Use iterative logic (for/while loop).',
      'Handle negative and positive ranges.',
      'Print only the final count.',
    ],
    tests: [
      { id: 'pub-1', input: '1 10', expectedOutput: '5', visibility: 'public', label: 'Standard range' },
      { id: 'pub-2', input: '-2 3', expectedOutput: '3', visibility: 'public', label: 'Range crossing zero' },
      { id: 'hid-1', input: '6 6', expectedOutput: '1', visibility: 'hidden', label: 'Single number range' },
    ],
  },
  function_min_of_three: {
    title: 'Functions Practice: Minimum of Three',
    prompt:
      'Read three integers a, b, c and print the smallest value. Structure your solution using a reusable function.',
    constraints: [
      'Use a function/method for comparison logic.',
      'Handle duplicate values correctly.',
      'Print only the minimum value.',
    ],
    tests: [
      { id: 'pub-1', input: '3 7 2', expectedOutput: '2', visibility: 'public', label: 'Distinct values' },
      { id: 'pub-2', input: '5 5 9', expectedOutput: '5', visibility: 'public', label: 'Duplicate minimum' },
      { id: 'hid-1', input: '-1 -7 -3', expectedOutput: '-7', visibility: 'hidden', label: 'All negative values' },
    ],
  },
};

export const getStarterTemplate = (language: SupportedProgrammingLanguage): string => {
  return STARTER_TEMPLATES[language] || STARTER_TEMPLATES.python;
};

const TEMPLATE_SEQUENCE: ChallengeTemplateType[] = [
  'conditional_sign',
  'loop_even_count',
  'function_min_of_three',
  'max_in_array',
  'reverse_string',
  'nth_fibonacci',
  'sum_two_numbers',
];

const detectPreferredTemplateTypes = (
  mainTopic: string,
  moduleTitle: string,
  subtopics: string[],
  selectedTopic: string | null,
): ChallengeTemplateType[] => {
  const corpus = normalize([mainTopic, moduleTitle, selectedTopic || '', ...subtopics].join(' | '));
  const ranked: ChallengeTemplateType[] = [];

  const pushUnique = (template: ChallengeTemplateType) => {
    if (!ranked.includes(template)) {
      ranked.push(template);
    }
  };

  if (/(if|else|conditional|branch|decision)/.test(corpus)) {
    pushUnique('conditional_sign');
  }
  if (/(loop|iteration|for loop|while|repeat)/.test(corpus)) {
    pushUnique('loop_even_count');
  }
  if (/(function|method|procedure|callable)/.test(corpus)) {
    pushUnique('function_min_of_three');
  }
  if (/(fibonacci|recursion|dynamic programming|dp)/.test(corpus)) {
    pushUnique('nth_fibonacci');
  }
  if (/(string|text|palindrome|character)/.test(corpus)) {
    pushUnique('reverse_string');
  }
  if (/(array|list|sorting|search|maximum|max|min)/.test(corpus)) {
    pushUnique('max_in_array');
  }

  TEMPLATE_SEQUENCE.forEach(pushUnique);
  return ranked;
};

const chooseTemplateForTopic = (
  mainTopic: string,
  moduleTitle: string,
  topic: string,
  topicIndex: number,
  usedTemplates: Set<ChallengeTemplateType>,
): ChallengeTemplateType => {
  const preferred = detectPreferredTemplateTypes(mainTopic, moduleTitle, [topic], topic);

  const unusedPreferred = preferred.find((template) => !usedTemplates.has(template));
  if (unusedPreferred) {
    return unusedPreferred;
  }

  // If all preferred types were used, rotate by topic index to diversify repeats.
  return TEMPLATE_SEQUENCE[topicIndex % TEMPLATE_SEQUENCE.length];
};

export const shouldShowCodingPractice = (
  mainTopic: string,
  moduleTitle: string,
  subtopics: string[],
  moduleIndex: number
): boolean => {
  const context = detectCodingContext(mainTopic, moduleTitle, subtopics);
  if (!context.isCodingTopic) {
    return false;
  }

  const corpus = normalize([moduleTitle, ...subtopics].join(' | '));
  const introKeywords = ['introduction', 'intro', 'overview', 'fundamentals', 'basics', 'getting started'];
  const practiceKeywords = ['implementation', 'hands-on', 'exercise', 'problem', 'practice', 'build', 'project', 'coding'];

  const hasIntroSignal = introKeywords.some((keyword) => includesKeyword(corpus, keyword));
  const hasPracticeSignal = practiceKeywords.some((keyword) => includesKeyword(corpus, keyword));

  if (hasIntroSignal && !hasPracticeSignal && moduleIndex === 0) {
    return false;
  }

  if (hasIntroSignal && !hasPracticeSignal && subtopics.length <= 2) {
    return false;
  }

  return true;
};

export const buildCodingQuestionSetForModule = (
  mainTopic: string,
  moduleTitle: string,
  subtopics: string[],
  language: SupportedProgrammingLanguage
): CodingQuestionSet => {
  const normalizedTopics = (subtopics && subtopics.length ? subtopics : [moduleTitle]).filter(Boolean);
  const usedTemplates = new Set<ChallengeTemplateType>();

  const questions: CodingChallenge[] = normalizedTopics.map((topic, index) => {
    const templateType = chooseTemplateForTopic(mainTopic, moduleTitle, topic, index, usedTemplates);
    usedTemplates.add(templateType);
    const template = CHALLENGE_LIBRARY[templateType];

    return {
      id: `q_${index + 1}`,
      title: `${template.title}`,
      prompt: `${template.prompt}\n\nTopic focus: ${topic}. Context: ${mainTopic} -> ${moduleTitle}.`,
      constraints: template.constraints,
      testCases: template.tests,
    };
  });

  return {
    title: `Practice: ${moduleTitle}`,
    starterCode: getStarterTemplate(language),
    questions,
  };
};
