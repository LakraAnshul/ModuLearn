# ModuLearn Backend - Groq AI Integration

This folder contains backend services for the ModuLearn application, currently focused on AI-powered curriculum generation using the Groq API.

## 📋 Overview

The backend services handle:
- **Curriculum Generation**: Convert user topics into structured learning paths using Groq's LLMs
- **Module Refinement**: Enhance module content with additional details and depth
- **Structured Output**: Generate JSON curricula that match the app's data models

## 🚀 Getting Started

### 1. Set Up Environment Variables

Create a `.env` file in the root directory of the project:

```bash
# Groq API Configuration (REQUIRED)
VITE_GROQ_API_KEY=your_groq_api_key_here

# Supabase Configuration (Already configured)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional: Google Gemini API
VITE_GOOGLE_GENAI_API_KEY=your_google_api_key
```

### 2. Get Your Groq API Key

1. Go to [Groq Console](https://console.groq.com/)
2. Sign up or log in to your account
3. Navigate to **API Keys** section
4. Create a new API key
5. Copy the key and paste it in your `.env` file as `VITE_GROQ_API_KEY`

### 3. Verify Installation

The Groq service is already installed. Check that your imports work:

```typescript
import { groqService, GeneratedCurriculum } from '../../backend/groqService.ts';
```

## 📁 File Structure

```
backend/
├── groqService.ts          # Main Groq API service
└── README.md              # This file
```

## 🤖 Available Models

The service uses **`llama-3.3-70b-versatile`** by default, which offers:
- **Context Window**: 131,072 tokens
- **Max Completion**: 32,768 tokens
- **Latency**: Ultra-fast inference
- **Quality**: Excellent for structured outputs

This model was chosen because it's optimized for:
✅ Curriculum generation
✅ Structured JSON outputs
✅ Multi-level education customization
✅ Fast response times

## 📚 API Reference

### `groqService.generateCurriculum(topic, educationLevel)`

Generates a complete learning curriculum based on a topic and education level.

**Parameters:**
- `topic` (string): The subject or topic to create a curriculum for
- `educationLevel` ('school' | 'college' | 'professional'): Target education level

**Returns:**
```typescript
{
  title: string;
  description: string;
  totalEstimatedHours: number;
  educationLevel: string;
  modules: [
    {
      id: string;
      title: string;
      description: string;
      estimatedMinutes: number;
      subtopics: string[];
    }
  ];
}
```

**Example:**
```typescript
const curriculum = await groqService.generateCurriculum(
  'React Hooks and State Management',
  'college'
);
```

### `groqService.refineModule(moduleName, topic, educationLevel)`

Enhances an existing module with more detailed subtopics.

**Parameters:**
- `moduleName` (string): The name of the module to refine
- `topic` (string): The main topic context
- `educationLevel` (string): The education level

**Returns:** Enhanced `CurriculumModule` with more detailed subtopics

## 🎯 Education Level Customization

The service automatically tailors curriculum based on the user's education level:

### 📘 School Level
- 4-6 modules focused on conceptual understanding
- Simpler language and relatable examples
- 15-20 minute estimated modules
- Foundation building

### 🎓 College Level
- 6-10 modules with deeper theory
- Practical applications included
- 20-30 minute estimated modules
- Balanced theory and practice

### 💼 Professional Level
- 8-12 modules with advanced concepts
- Industry best practices
- 25-40 minute estimated modules
- Mastery-focused content

## 🔧 Configuration

To change the model, edit `groqService.ts`:

```typescript
const MODEL = 'your-preferred-model-id';
```

### Alternative Models (from available list)

**Fast & Efficient:**
- `llama-3.1-8b-instant` - Fastest, good quality
- `groq/compound-mini` - Lightweight, fast

**Balanced (Recommended):**
- `llama-3.3-70b-versatile` (Current) - Best overall

**Advanced:**
- `qwen/qwen3-32b` - Very capable for complex tasks
- `moonshotai/kimi-k2-instruct` - Excellent for detailed outputs

## ⚠️ Error Handling

The service includes built-in error handling for:
- Missing API key
- Network failures
- Invalid JSON responses
- API rate limits
- Malformed inputs

All errors are logged to the console with detailed messages.

## 🚦 Rate Limiting

Groq's rate limits depend on your plan. The service respects these limits:
- Requests per minute (RPM)
- Tokens per minute (TPM)

Check your [Groq Console](https://console.groq.com/) for your specific limits.

## 📝 Example Usage in Components

```typescript
import { groqService } from '../../backend/groqService.ts';

// In your React component:
const handleGeneratePathClick = async () => {
  try {
    const curriculum = await groqService.generateCurriculum(
      'Machine Learning Fundamentals',
      'college'
    );
    // Use the generated curriculum...
    console.log(curriculum);
  } catch (error) {
    console.error('Failed to generate curriculum:', error.message);
  }
};
```

## 🔐 Security Best Practices

1. **Never commit your API key** to version control
2. **Keep `.env` in `.gitignore`** (already configured)
3. **Use environment variables** for all sensitive data
4. **Rotate API keys regularly** via Groq Console
5. **Monitor API usage** in your Console dashboard

## 🐛 Troubleshooting

### "GROQ_API_KEY is not configured" Error
- Ensure you have copied `VITE_GROQ_API_KEY` to your `.env` file
- Restart your dev server after updating `.env`
- Check that the file is in the project root, not in `backend/`

### Slow Response Times
- The model is working correctly; Groq sometimes takes 5-30s for complex requests
- Consider breaking large topics into smaller subtopics
- Use `llama-3.1-8b-instant` for faster (but less detailed) responses

### Invalid JSON in Response
- This usually means the prompt was misunderstood
- Check if the topic is clear and specific
- Try refining your topic description

### Rate Limit Exceeded
- Check your plan in [Groq Console](https://console.groq.com/)
- Reduce the number of concurrent requests
- Consider using a more efficient model

## 📚 Further Resources

- [Groq API Documentation](https://console.groq.com/docs)
- [Groq Playground](https://console.groq.com/playground) - Test models interactively
- [Available Models](https://console.groq.com/docs/models) - Full model list
- [Rate Limiting Guide](https://console.groq.com/docs/rate-limiting)

## 🎨 UI/UX Integration

The curriculum generation is integrated into:
- **CreatePath.tsx** - Input form with education level detection
- **StructurePath.tsx** - Visualization and editing of generated curriculum
- **Database** - Saving curricula for later access

## 💡 Future Enhancements

Potential features for the backend:
- [ ] PDF parsing for content extraction
- [ ] URL content scraping and analysis
- [ ] Real-time streaming responses
- [ ] Multi-language curriculum generation
- [ ] Personalized difficulty adjustment
- [ ] Quiz generation from modules
- [ ] Assessment-based curriculum refinement

---

**Last Updated:** February 17, 2026
**Groq Model Used:** llama-3.3-70b-versatile
