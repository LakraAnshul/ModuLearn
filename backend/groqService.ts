/**
 * Groq API Service
 * Handles curriculum generation using Groq's language models
 * Model: llama-3.3-70b-versatile (best balance of speed, accuracy & output quality)
 */

export interface CurriculumModule {
  id: string;
  title: string;
  description: string;
  summary?: string;
  estimatedMinutes: number;
  subtopics: string[];
  recommendedVideos?: string[];
}

export interface GeneratedCurriculum {
  title: string;
  description: string;
  totalEstimatedHours: number;
  educationLevel: string;
  modules: CurriculumModule[];
}

export type LearningDepth = 'quick_overview' | 'structured_learning' | 'deep_mastery';
export type TopicFamiliarity = 'new_to_topic' | 'some_experience' | 'already_comfortable';

export interface LearningPreferences {
  depth: LearningDepth;
  familiarity: TopicFamiliarity;
}

export interface ExplainTopicOptions {
  educationLevel: string;
  preferences?: LearningPreferences;
  schoolClass?: string;
  course?: string;
  field?: string;
  domain?: string;
  moduleDescription?: string;
  moduleSubtopics?: string[];
}

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Best model for this use case: speed + accuracy + output quality
const MODEL = 'llama-3.3-70b-versatile';

const getDepthLabel = (depth: LearningDepth): string => {
  const labels: Record<LearningDepth, string> = {
    quick_overview: 'Quick overview',
    structured_learning: 'Structured learning',
    deep_mastery: 'Deep mastery',
  };
  return labels[depth] || labels.structured_learning;
};

const getFamiliarityLabel = (familiarity: TopicFamiliarity): string => {
  const labels: Record<TopicFamiliarity, string> = {
    new_to_topic: 'Beginner (new to topic)',
    some_experience: 'Intermediate (some experience)',
    already_comfortable: 'Advanced (already comfortable)',
  };
  return labels[familiarity] || labels.new_to_topic;
};

const inferTopicDomain = (mainTopic: string, moduleName: string, topicName: string, domainHint?: string): 'coding' | 'biology' | 'math' | 'business' | 'general' => {
  const corpus = `${domainHint || ''} ${mainTopic} ${moduleName} ${topicName}`.toLowerCase();

  const codingSignals = [
    'react', 'python', 'javascript', 'typescript', 'java', 'c++', 'coding', 'programming', 'algorithm', 'dsa', 'data structure',
    'api', 'backend', 'frontend', 'full stack', 'sql', 'node', 'html', 'css', 'git', 'oop', 'debug', 'compiler',
  ];
  if (codingSignals.some((word) => corpus.includes(word))) return 'coding';

  const biologySignals = [
    'biology', 'human body', 'anatomy', 'cell', 'genetics', 'physiology', 'ecology', 'microbiology', 'botany', 'zoology',
    'organ', 'neuron', 'dna',
  ];
  if (biologySignals.some((word) => corpus.includes(word))) return 'biology';

  const mathSignals = [
    'math', 'mathematics', 'algebra', 'calculus', 'geometry', 'trigonometry', 'probability', 'statistics', 'equation',
    'matrix', 'linear algebra', 'integration', 'derivative',
  ];
  if (mathSignals.some((word) => corpus.includes(word))) return 'math';

  const businessSignals = [
    'business', 'finance', 'marketing', 'economics', 'management', 'strategy', 'product', 'sales', 'operations', 'accounting',
  ];
  if (businessSignals.some((word) => corpus.includes(word))) return 'business';

  return 'general';
};

const getDomainInstructions = (domain: 'coding' | 'biology' | 'math' | 'business' | 'general'): string => {
  if (domain === 'coding') {
    return `Domain focus: Coding / software topic.
    - Include one short pseudocode example in a fenced code block using triple backticks.
    - Explain what each pseudocode step does in plain language.
    - Add one practical debugging or implementation tip.
    - Mention common mistakes and how to avoid them.`;
  }

  if (domain === 'biology') {
    return `Domain focus: Biology / life sciences topic.
    - Use mechanism-based explanations (what, where, how, why).
    - Include one short real-world or clinical connection.
    - Clarify difficult biological terms before deeper details.
    - Include one memory aid or analogy.`;
  }

  if (domain === 'math') {
    return `Domain focus: Mathematics topic.
    - Build from intuition to formula and then worked reasoning.
    - Include one compact step-by-step solved mini-example.
    - Highlight the most common conceptual error.
    - Include when to use this idea in real problems.`;
  }

  if (domain === 'business') {
    return `Domain focus: Business / management topic.
    - Connect concepts to decisions, tradeoffs, and outcomes.
    - Include one practical scenario or case-style example.
    - Mention one metric/KPI relevant to the concept.
    - Provide an actionable checklist for application.`;
  }

  return `Domain focus: General academic topic.
  - Keep structure clear and learner-friendly.
  - Include one relatable real-world example.
  - Highlight key terms and practical takeaways.`;
};

const getExplanationPrompt = (
  topicName: string,
  moduleName: string,
  mainTopic: string,
  options: ExplainTopicOptions,
): string => {
  const safePreferences: LearningPreferences = {
    depth: options.preferences?.depth || 'structured_learning',
    familiarity: options.preferences?.familiarity || 'new_to_topic',
  };

  const domain = inferTopicDomain(mainTopic, moduleName, topicName, options.domain || options.field || options.course);

  const learnerLevelLabel = options.educationLevel === 'school'
    ? `School learner${options.schoolClass ? ` (Class ${options.schoolClass})` : ''}`
    : options.educationLevel === 'professional'
      ? 'Professional learner'
      : 'College learner';

  const learnerContextLine = [
    learnerLevelLabel,
    options.course ? `Course: ${options.course}` : null,
    options.field ? `Field: ${options.field}` : null,
    options.domain ? `Domain interest: ${options.domain}` : null,
  ].filter(Boolean).join(' | ');

  const levelGuidance = {
    school: 'Use simple language, intuitive analogies, and low jargon unless needed.',
    college: 'Balance conceptual understanding with technical detail and practical examples.',
    professional: 'Keep a high signal-to-noise ratio with applied depth and implementation realities.',
  };

  const familiarityGuidance: Record<TopicFamiliarity, string> = {
    new_to_topic: 'Start from first principles. Define core terms before using them.',
    some_experience: 'Skip long basics and move quickly to meaningful understanding and application.',
    already_comfortable: 'Prioritize advanced insights, edge cases, optimization, and nuanced tradeoffs.',
  };

  const depthGuidance: Record<LearningDepth, string> = {
    quick_overview: 'Keep the response concise and high-value. Focus on essentials and practical orientation.',
    structured_learning: 'Provide a structured explanation from concept to examples to practice guidance.',
    deep_mastery: 'Go deep. Include advanced detail, patterns, pitfalls, and mastery-level guidance.',
  };

  const moduleSubtopics = Array.isArray(options.moduleSubtopics) && options.moduleSubtopics.length
    ? options.moduleSubtopics.slice(0, 6).join(', ')
    : 'Not provided';

  return `You are an elite adaptive tutor. Generate a focused explanation that matches the learner profile and topic context.

Main Topic: "${mainTopic}"
Module: "${moduleName}"
Specific Topic: "${topicName}"
Detected Domain Type: ${domain}
Learner Profile: ${learnerContextLine}
Familiarity: ${getFamiliarityLabel(safePreferences.familiarity)}
Depth Preference: ${getDepthLabel(safePreferences.depth)}
Module Description: ${options.moduleDescription || 'Not provided'}
Module Subtopics: ${moduleSubtopics}

Adaptation rules:
- ${levelGuidance[(options.educationLevel as 'school' | 'college' | 'professional')] || levelGuidance.college}
- ${familiarityGuidance[safePreferences.familiarity]}
- ${depthGuidance[safePreferences.depth]}
- ${getDomainInstructions(domain)}

Output format requirements (important):
- Do NOT return JSON.
- Start with a heading line using "## ".
- Add a short "Why this matters" paragraph.
- Add a "Core idea" section in plain language.
- Add bullet points with "- " for key concepts.
- Add numbered steps using "1. " for how to approach/apply the topic.
- Add one line with "> " as a key tip.
- Use **bold** only for truly important terms.
- Keep the explanation engaging, readable, and not boring.

If domain type is coding:
- Include a "Pseudo-code" section with a short fenced code block using triple backticks.
- The opening triple backticks must be on their own line, and the closing triple backticks must be on their own line.
- Explain the pseudocode in 2-4 bullets.

If domain type is non-coding:
- Include one concrete real-world scenario.

Keep it tailored and personal to the learner profile above.`;
};

const getPrompt = (
  topic: string,
  educationLevel: string,
  preferences: LearningPreferences,
): string => {
  const levelInstructions: { [key: string]: string } = {
    'school': `For school students (grades 8-12):
      - Match language and examples to school students
      - Keep terminology simple and practical
      - Use simple, relatable examples
      - Focus on conceptual understanding`,
    'college': `For college/university students:
      - Match language and rigor to college-level learners
      - Balance conceptual clarity and technical depth
      - Include practical applications and real-world examples
      - Focus on both theory and implementation`,
    'professional': `For professionals seeking advanced knowledge:
      - Match language and rigor to professional audience
      - Use advanced terminology where appropriate
      - Include industry best practices and advanced concepts
      - Focus on practical implementation and mastery`
  };

  const depthInstructions: Record<LearningDepth, string> = {
    quick_overview: `Depth target: Quick Overview.
      - Create only 1-2 modules total.
      - Keep modules concise and to-the-point.
      - Cover only essential ideas and key takeaways.
      - Avoid deep dives or exhaustive detail.
      - Keep each module roughly 10-20 minutes.`,
    structured_learning: `Depth target: Structured Learning.
      - Create 4-6 modules total.
      - Build understanding step-by-step from core concepts to practical usage.
      - Add moderate depth, but avoid excessive specialization.
      - Keep each module roughly 20-35 minutes.`,
    deep_mastery: `Depth target: Deep Mastery.
      - Create 7-10 modules total with strong progression.
      - Go deep into advanced details, tradeoffs, and practical mastery.
      - Include nuanced or expert-level subtopics where relevant.
      - Keep each module roughly 30-50 minutes.`
  };

  const familiarityInstructions: Record<TopicFamiliarity, string> = {
    new_to_topic: `User familiarity: New to this topic.
      - Start with fundamentals and essential context first.
      - Include a beginner-friendly orientation before advanced parts.
      - Define core terms before using them in depth.`,
    some_experience: `User familiarity: Some experience.
      - Keep intro brief and skip long basic explanations.
      - Move quickly to intermediate understanding and practical usage.
      - Include focused refreshers only where needed.`,
    already_comfortable: `User familiarity: Already comfortable.
      - Skip introductory and basic modules.
      - Focus primarily on advanced concepts, optimization, and edge cases.
      - Prioritize deep application over foundational recap.`
  };

  const instructions = levelInstructions[educationLevel] || levelInstructions['school'];
  const depthInstruction = depthInstructions[preferences.depth] || depthInstructions.structured_learning;
  const familiarityInstruction = familiarityInstructions[preferences.familiarity] || familiarityInstructions.new_to_topic;

  return `You are an expert curriculum designer. Create a comprehensive, well-structured learning path for the following topic:

Topic: "${topic}"

${instructions}
${depthInstruction}
${familiarityInstruction}

IMPORTANT: Return ONLY valid JSON with this exact structure, no additional text:
{
  "title": "Complete topic title",
  "description": "Brief overview of what students will learn (2-3 sentences)",
  "totalEstimatedHours": estimated total hours as number,
  "modules": [
    {
      "id": "module_1",
      "title": "Module Title",
      "description": "What students will learn in this module (1-2 sentences)",
      "estimatedMinutes": estimated duration,
      "subtopics": ["Subtopic 1", "Subtopic 2", "Subtopic 3"]
    }
  ]
}

Ensure:
- Module IDs are in format "module_1", "module_2", etc.
- All numerical values are actual numbers (not strings)
- Subtopics are practical, specific, and action-oriented
- Progression is logical and builds on previous modules
- Estimated times are realistic for the education level
- Respect both selected depth and familiarity when deciding module count and complexity`;
};

export const groqService = {
  /**
   * Generate a structured curriculum based on topic and education level
   * Uses Groq's llama-3.3-70b-versatile model for best results
   */
  async generateCurriculum(
    topic: string,
    educationLevel: 'school' | 'college' | 'professional',
    preferences?: LearningPreferences,
  ): Promise<GeneratedCurriculum> {
    if (!GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY is not configured. Add VITE_GROQ_API_KEY to .env');
    }

    if (!topic || topic.trim().length < 5) {
      throw new Error('Topic must be at least 5 characters long');
    }

    const safePreferences: LearningPreferences = {
      depth: preferences?.depth || 'structured_learning',
      familiarity: preferences?.familiarity || 'new_to_topic',
    };

    try {
      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            {
              role: 'user',
              content: getPrompt(topic, educationLevel, safePreferences),
            },
          ],
          temperature: 0.7, // Balanced between creativity and consistency
          max_tokens: 4096, // Sufficient for detailed curriculum
          top_p: 0.9,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Groq API Error:', error);
        throw new Error(`Groq API error: ${error.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;

      if (!content) {
        throw new Error('No content received from Groq API');
      }

      // Parse JSON response
      let curriculum: GeneratedCurriculum;
      try {
        curriculum = JSON.parse(content);
      } catch (parseError) {
        // Try to extract JSON if it's wrapped in markdown code blocks
        const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/);
        if (jsonMatch) {
          curriculum = JSON.parse(jsonMatch[1]);
        } else {
          throw new Error('Failed to parse curriculum JSON response');
        }
      }

      // Validate and enrich the response
      curriculum.educationLevel = educationLevel;
      
      // Ensure modules have proper IDs
      curriculum.modules = curriculum.modules.map((module, index) => ({
        ...module,
        id: module.id || `module_${index + 1}`,
      }));

      return curriculum;
    } catch (error) {
      console.error('Curriculum generation error:', error);
      throw error;
    }
  },

  /**
   * Refine/Regenerate a specific module with more detail
   */
  async refineModule(
    moduleName: string,
    topic: string,
    educationLevel: string
  ): Promise<CurriculumModule> {
    if (!GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY is not configured');
    }

    try {
      const prompt = `Create a detailed module structure for:
      
Module: "${moduleName}"
Main Topic: "${topic}"
Education Level: ${educationLevel}

Return ONLY valid JSON with this exact structure (no additional text):
{
  "id": "module_detailed",
  "title": "Complete module title",
  "description": "Detailed description of what will be covered",
  "estimatedMinutes": estimated duration,
  "subtopics": [
    "Detailed subtopic 1",
    "Detailed subtopic 2",
    "Detailed subtopic 3",
    "Detailed subtopic 4",
    "Detailed subtopic 5"
  ]
}`;

      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 2048,
          top_p: 0.9,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to refine module');
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;
      
      let module: CurriculumModule;
      try {
        module = JSON.parse(content);
      } catch {
        const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/);
        if (jsonMatch) {
          module = JSON.parse(jsonMatch[1]);
        } else {
          throw new Error('Failed to parse module JSON');
        }
      }

      return module;
    } catch (error) {
      console.error('Module refinement error:', error);
      throw error;
    }
  },

  /**
   * Generate a detailed explanation for a specific topic
   */
  async explainTopic(
    topicName: string,
    moduleName: string,
    mainTopic: string,
    options: ExplainTopicOptions
  ): Promise<string> {
    if (!GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY is not configured');
    }

    try {
      const prompt = getExplanationPrompt(topicName, moduleName, mainTopic, options);

      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 2048,
          top_p: 0.9,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate topic explanation');
      }

      const data = await response.json();
      const explanation = data.choices[0]?.message?.content;

      if (!explanation) {
        throw new Error('No explanation received from Groq API');
      }

      return explanation.trim();
    } catch (error) {
      console.error('Topic explanation error:', error);
      throw error;
    }
  },
};
