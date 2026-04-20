export interface BioDigitalModelSelection {
  modelId: string;
  label: string;
  source: 'custom' | 'builtin';
}

const BUILTIN_MODEL_MAP: Array<{ keywords: string[]; modelId: string; label: string }> = [
  {
    keywords: ['heart', 'cardiac', 'cardio', 'coronary', 'circulation', 'blood vessel'],
    modelId: 'production/maleAdult/beating_heart_02',
    label: 'Beating Heart',
  },
  {
    keywords: ['anatomy', 'human body', 'biology', 'physiology', 'body systems', 'organs'],
    modelId: 'production/maleAdult/beating_heart_02',
    label: 'General Human Anatomy',
  },
];

const BIOLOGY_KEYWORDS = [
  'biology',
  'anatomy',
  'physiology',
  'organ',
  'cell',
  'gene',
  'dna',
  'respiratory',
  'cardio',
  'cardiac',
  'heart',
  'brain',
  'neuron',
  'skeletal',
  'muscle',
  'digestive',
  'immune',
  'hormone',
  'endocrine',
  'biochemistry',
  'genetics',
  'microbiology',
  'ecology',
  'botany',
  'zoology',
  'pathology',
  'medical',
  'disease',
];

const NON_BIOLOGY_KEYWORDS = [
  'python',
  'javascript',
  'react',
  'algorithm',
  'sql',
  'database',
  'backend',
  'frontend',
  'machine learning',
  'ai prompt',
  'typescript',
  'java',
  'c++',
  'node',
];

const normalize = (value: string) => value.trim().toLowerCase();

const parseTopicModelMapFromEnv = (): Record<string, string> => {
  const raw = import.meta.env.VITE_BIODIGITAL_TOPIC_MODEL_MAP;
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, string>;
    if (!parsed || typeof parsed !== 'object') {
      return {};
    }

    return Object.entries(parsed).reduce<Record<string, string>>((acc, [k, v]) => {
      if (typeof k === 'string' && typeof v === 'string' && k.trim() && v.trim()) {
        acc[normalize(k)] = v.trim();
      }
      return acc;
    }, {});
  } catch (err) {
    console.warn('Invalid VITE_BIODIGITAL_TOPIC_MODEL_MAP JSON:', err);
    return {};
  }
};

export const isLikelyBiologyTopic = (...parts: Array<string | null | undefined>): boolean => {
  const corpus = normalize(parts.filter(Boolean).join(' | '));
  if (!corpus) {
    return false;
  }

  const hasBiologySignal = BIOLOGY_KEYWORDS.some((keyword) => corpus.includes(keyword));
  if (!hasBiologySignal) {
    return false;
  }

  const hasStrongNonBiologySignal = NON_BIOLOGY_KEYWORDS.some((keyword) => corpus.includes(keyword));
  return !hasStrongNonBiologySignal || corpus.includes('bio');
};

export const resolveBioDigitalModel = (
  topic: string,
  moduleTitle: string,
  curriculumTitle: string,
): BioDigitalModelSelection | null => {
  const textCandidates = [topic, moduleTitle, curriculumTitle].map(normalize).filter(Boolean);
  const customMap = parseTopicModelMapFromEnv();

  for (const candidateText of textCandidates) {
    for (const [keyword, modelId] of Object.entries(customMap)) {
      if (candidateText.includes(keyword)) {
        return {
          modelId,
          label: `Custom match for "${keyword}"`,
          source: 'custom',
        };
      }
    }
  }

  const corpus = textCandidates.join(' | ');
  for (const entry of BUILTIN_MODEL_MAP) {
    if (entry.keywords.some((keyword) => corpus.includes(keyword))) {
      return {
        modelId: entry.modelId,
        label: entry.label,
        source: 'builtin',
      };
    }
  }

  if (!isLikelyBiologyTopic(topic, moduleTitle, curriculumTitle)) {
    return null;
  }

  const fallbackModelId = import.meta.env.VITE_BIODIGITAL_DEFAULT_MODEL_ID || 'production/maleAdult/beating_heart_02';
  return {
    modelId: fallbackModelId,
    label: 'Biology fallback model',
    source: 'builtin',
  };
};

export const buildBioDigitalViewerUrl = (modelId: string): string | null => {
  const developerKey = import.meta.env.VITE_BIODIGITAL_DEVELOPER_KEY;
  if (!developerKey) {
    return null;
  }

  const viewerBase = import.meta.env.VITE_BIODIGITAL_VIEWER_BASE_URL || 'https://human.biodigital.com/viewer/';
  const params = new URLSearchParams({
    id: modelId,
    dk: developerKey,
    'ui-info': 'false',
    'ui-help': 'false',
    'ui-tools': 'false',
    'ui-nav': 'true',
    'ui-reset': 'true',
    'ui-search': 'false',
    background: '245,247,250',
  });

  return `${viewerBase}?${params.toString()}`;
};
