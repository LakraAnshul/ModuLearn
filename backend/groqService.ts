/**
 * Groq API Service
 * Handles curriculum generation using Groq's language models
 * Model: llama-3.3-70b-versatile (best balance of speed, accuracy & output quality)
 */

export interface CurriculumModule {
  id: string;
  title: string;
  description: string;
  estimatedMinutes: number;
  subtopics: string[];
}

export interface GeneratedCurriculum {
  title: string;
  description: string;
  totalEstimatedHours: number;
  educationLevel: string;
  modules: CurriculumModule[];
}

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Best model for this use case: speed + accuracy + output quality
const MODEL = 'llama-3.3-70b-versatile';

const getPrompt = (topic: string, educationLevel: string): string => {
  const levelInstructions: { [key: string]: string } = {
    'school': `For school students (grades 8-12):
      - Create 4-6 chapters max
      - Each chapter should have 2-3 subtopics
      - Use simple, relatable examples
      - Focus on conceptual understanding
      - Each subtopic: 15-20 minutes`,
    'college': `For college/university students:
      - Create 6-10 chapters
      - Each chapter should have 3-4 subtopics with depth
      - Include practical applications and real-world examples
      - Focus on both theory and implementation
      - Each subtopic: 20-30 minutes`,
    'professional': `For professionals seeking advanced knowledge:
      - Create 8-12 chapters with complex progression
      - Each chapter should have 4-5 in-depth subtopics
      - Include industry best practices and advanced concepts
      - Focus on practical implementation and mastery
      - Each subtopic: 25-40 minutes`
  };

  const instructions = levelInstructions[educationLevel] || levelInstructions['school'];

  return `You are an expert curriculum designer. Create a comprehensive, well-structured learning path for the following topic:

Topic: "${topic}"

${instructions}

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
- Estimated times are realistic for the education level`;
};

export const groqService = {
  /**
   * Generate a structured curriculum based on topic and education level
   * Uses Groq's llama-3.3-70b-versatile model for best results
   */
  async generateCurriculum(
    topic: string,
    educationLevel: 'school' | 'college' | 'professional'
  ): Promise<GeneratedCurriculum> {
    if (!GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY is not configured. Add VITE_GROQ_API_KEY to .env');
    }

    if (!topic || topic.trim().length < 5) {
      throw new Error('Topic must be at least 5 characters long');
    }

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
              content: getPrompt(topic, educationLevel),
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
    educationLevel: string
  ): Promise<string> {
    if (!GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY is not configured');
    }

    try {
      const levelGuidance = {
        'school': 'Explain in simple, easy-to-understand language suitable for high school students. Use analogies and real-world examples.',
        'college': 'Provide a comprehensive explanation with appropriate technical depth suitable for college students. Include relevant examples and applications.',
        'professional': 'Provide an advanced, detailed explanation with technical accuracy suitable for professionals. Include industry applications and best practices.'
      };

      const prompt = `You are an educational expert. Provide a detailed, easy-to-understand explanation for the following:

Main Topic: "${mainTopic}"
Module: "${moduleName}"
Specific Topic: "${topicName}"
Education Level: ${educationLevel}

${levelGuidance[educationLevel] || levelGuidance['college']}

Provide ONLY the explanation text, no JSON or markdown formatting. Make it comprehensive, clear, and engaging.`;

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
