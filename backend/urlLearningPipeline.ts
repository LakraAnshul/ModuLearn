import { GeneratedCurriculum, LearningPreferences, groqService } from './groqService.ts';

export interface UrlPipelineResult {
  curriculum: GeneratedCurriculum;
  intermediate: {
    url: string;
    resolvedUrl: string;
    fetchStrategy: string;
    title: string;
    description: string;
    contentLength: number;
    preview: string;
  };
}

interface ProcessUrlOptions {
  educationLevel: 'school' | 'college' | 'professional';
  preferences: LearningPreferences;
  onProgress?: (message: string) => void;
}

interface ExtractedSource {
  resolvedUrl: string;
  fetchStrategy: string;
  title: string;
  description: string;
  content: string;
}

const normalizeWhitespace = (value: string): string => value.replace(/\s+/g, ' ').trim();

const truncate = (value: string, maxLength: number): string => {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength)}...`;
};

const ensureHttpUrl = (value: string): URL => {
  const trimmed = value.trim();
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const parsed = new URL(withProtocol);

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Only HTTP and HTTPS links are supported.');
  }

  return parsed;
};

const fetchWithTimeout = async (url: string, timeoutMs = 15000): Promise<Response> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        Accept: 'text/html,text/plain,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
  } finally {
    clearTimeout(timer);
  }
};

const extractFromHtml = (html: string, fallbackUrl: string): { title: string; description: string; content: string } => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  doc.querySelectorAll('script,style,noscript,svg,iframe,header,footer,nav,form,button,aside').forEach((node) => {
    node.remove();
  });

  const title = normalizeWhitespace(doc.querySelector('title')?.textContent || '');
  const description = normalizeWhitespace(
    doc.querySelector('meta[name="description"]')?.getAttribute('content') ||
      doc.querySelector('meta[property="og:description"]')?.getAttribute('content') ||
      ''
  );

  const candidates = Array.from(doc.querySelectorAll('article p, main p, p, li, h1, h2, h3'))
    .map((el) => normalizeWhitespace(el.textContent || ''))
    .filter((line) => line.length >= 45)
    .slice(0, 300);

  const fallbackText = normalizeWhitespace(doc.body?.textContent || '').slice(0, 12000);
  const combined = candidates.length > 0 ? candidates.join(' ') : fallbackText;

  const sourceHeading = title || new URL(fallbackUrl).hostname;
  const content = normalizeWhitespace(`${sourceHeading}. ${description}. ${combined}`);

  return { title, description, content };
};

const extractPlainText = (text: string, fallbackUrl: string): { title: string; description: string; content: string } => {
  const cleaned = normalizeWhitespace(
    text
      .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
      .replace(/[#>*_`~-]/g, ' ')
      .replace(/\n+/g, ' ')
  );

  const url = new URL(fallbackUrl);
  const fallbackTitle = `${url.hostname}${url.pathname !== '/' ? url.pathname : ''}`;

  return {
    title: truncate(fallbackTitle, 120),
    description: '',
    content: cleaned,
  };
};

const deriveTopic = (source: ExtractedSource): string => {
  const title = source.title.trim();
  if (title.length >= 5) {
    return title;
  }

  const url = new URL(source.resolvedUrl);
  const slug = decodeURIComponent(url.pathname.split('/').filter(Boolean).pop() || '')
    .replace(/[-_]+/g, ' ')
    .replace(/\.[a-z0-9]+$/i, '')
    .trim();

  if (slug.length >= 5) {
    return slug;
  }

  return url.hostname;
};

const extractSourceFromUrl = async (
  rawUrl: string,
  onProgress?: (message: string) => void,
): Promise<ExtractedSource> => {
  const parsed = ensureHttpUrl(rawUrl);
  const normalizedUrl = parsed.toString();

  const proxyCandidates = [
    {
      name: 'direct',
      url: normalizedUrl,
    },
    {
      name: 'allorigins',
      url: `https://api.allorigins.win/raw?url=${encodeURIComponent(normalizedUrl)}`,
    },
    {
      name: 'jina-reader',
      url: `https://r.jina.ai/http://${normalizedUrl.replace(/^https?:\/\//i, '')}`,
    },
  ];

  let lastError = 'Unable to read URL content.';

  for (const candidate of proxyCandidates) {
    try {
      onProgress?.(`Reading page content (${candidate.name})...`);
      const response = await fetchWithTimeout(candidate.url);

      if (!response.ok) {
        lastError = `${candidate.name} returned ${response.status}`;
        continue;
      }

      const contentType = (response.headers.get('content-type') || '').toLowerCase();
      const bodyText = await response.text();
      const resolvedUrl = response.url || normalizedUrl;

      if (!bodyText || bodyText.trim().length < 120) {
        lastError = `${candidate.name} returned too little content`;
        continue;
      }

      const extracted = contentType.includes('html') || /<html[\s>]/i.test(bodyText)
        ? extractFromHtml(bodyText, resolvedUrl)
        : extractPlainText(bodyText, resolvedUrl);

      if (extracted.content.length < 120) {
        lastError = `${candidate.name} content not usable`;
        continue;
      }

      return {
        resolvedUrl,
        fetchStrategy: candidate.name,
        title: extracted.title,
        description: extracted.description,
        content: extracted.content,
      };
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Unknown URL extraction error';
    }
  }

  throw new Error(`Could not extract readable content from this URL. ${lastError}`);
};

export const urlLearningPipeline = {
  async processUrl(rawUrl: string, options: ProcessUrlOptions): Promise<UrlPipelineResult> {
    const onProgress = options.onProgress;

    onProgress?.('Validating URL...');
    ensureHttpUrl(rawUrl);

    const extracted = await extractSourceFromUrl(rawUrl, onProgress);
    const topic = deriveTopic(extracted);

    onProgress?.('Generating AI curriculum from link content...');
    const curriculum = await groqService.generateCurriculum(
      `Build a structured learning path from this web resource.

Source title: ${extracted.title || topic}
Source URL: ${extracted.resolvedUrl}
Source description: ${extracted.description || 'N/A'}

Reference content excerpt:
${truncate(extracted.content, 7000)}

Constraints:
- Keep the curriculum focused on the source content.
- Use practical subtopics that can be learned progressively.
- Avoid generic filler modules not connected to the source.`,
      options.educationLevel,
  options.preferences,
    );

    return {
      curriculum,
      intermediate: {
        url: rawUrl,
        resolvedUrl: extracted.resolvedUrl,
        fetchStrategy: extracted.fetchStrategy,
        title: extracted.title || topic,
        description: extracted.description,
        contentLength: extracted.content.length,
        preview: truncate(extracted.content, 360),
      },
    };
  },
};
