# 🚀 Quick Setup Guide - Create New Path Feature

## ⚡ 5-Minute Setup

### Step 1: Get Your Groq API Key
1. Visit https://console.groq.com/
2. Create an account or sign in
3. Go to **API Keys** section
4. Copy your API key

### Step 2: Add to Environment
Create a `.env` file in the **root directory** (same level as `package.json`):

```env
VITE_GROQ_API_KEY=paste_your_key_here
```

### Step 3: Restart Dev Server
```bash
npm run dev
```

**That's it!** 🎉

---

## 🎯 What You Get

### Feature: "Create New Path"

**Users can now:**
1. ✅ Enter any topic (e.g., "React Hooks", "Machine Learning", "Climate Science")
2. ✅ Get an AI-generated curriculum tailored to their education level
3. ✅ See modular breakdowns with:
   - Number of chapters/modules
   - Subtopics for each module
   - Estimated learning duration
   - Difficulty progression

### Smart Education-Based Customization

**For School Students:**
- Simpler language
- Conceptual focus
- 4-6 modules max
- 15-20 min per module

**For College Students:**
- Balanced theory & practice
- 6-10 modules
- 20-30 min per module
- Real-world examples

**For Professionals:**
- Advanced concepts
- Industry best practices
- 8-12 modules
- 25-40 min per module

---

## 📊 How It Works

### Flow:
```
User enters topic (CreatePath.tsx)
    ↓
Groq AI generates curriculum
    ↓
Shows preview (StructurePath.tsx)
    ↓
User can edit/refine modules
    ↓
Start learning with generated path
```

### Key Features:
- **AI Refinement**: Click the edit button to expand any module with more details
- **Module Management**: Add/remove/reorder modules
- **Duration Estimation**: Shows total hours and minutes
- **Error Handling**: Clear error messages if something goes wrong

---

## 🔑 Model Information

**Model Used:** `llama-3.3-70b-versatile`

**Why this model?**
- ✅ Fast response times (usually 5-30s)
- ✅ Excellent JSON structure outputs
- ✅ 131K+ token context window
- ✅ Best for education/curriculum tasks

---

## 🧪 Test It Out

### Example Topics to Try:
1. "React Hooks and State Management"
2. "Quantum Physics Fundamentals"
3. "Digital Marketing Strategies"
4. "Python Data Science Basics"
5. "Web Design Principles"

---

## 📁 Files Created/Modified

### New Files:
```
backend/
├── groqService.ts        # Groq API integration
└── README.md             # Detailed documentation

.env.example              # Environment variables template
```

### Updated Files:
```
pages/app/
├── CreatePath.tsx        # Now uses Groq API with user profile
└── StructurePath.tsx     # Shows generated curriculum with editing

package.json             # No new dependencies needed!
```

---

## ⚙️ Environment Variables

### Required:
```env
VITE_GROQ_API_KEY=groq_api_key_xxxx
```

### Optional:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key
```

---

## 🐛 Troubleshooting

### Issue: "GROQ_API_KEY is not configured"
**Solution:**
1. Check that `.env` file is in the **root** directory
2. Verify you copied the exact key from Groq Console
3. Restart your dev server (`npm run dev`)

### Issue: "Failed to generate path"
**Solutions:**
1. Check your internet connection
2. Visit https://status.groq.com/ to check API status
3. Try a simpler/shorter topic
4. Verify API key is still valid in Groq Console

### Issue: Slow responses
**Normal behavior:** First requests can take 5-30 seconds while the model loads.
Subsequent requests are faster.

### Issue: "No curriculum data received"
**Solution:** Make sure you're using the form on the `/app/create` page, not navigating directly to `/app/structure`.

---

## 🎨 UI Customization

The UI automatically matches your app's theme:
- ✅ Dark mode support
- ✅ Responsive design (mobile, tablet, desktop)
- ✅ Smooth animations and transitions
- ✅ Accessible color contrast

---

## 🔐 Data Privacy

- ✈️ Topics are sent to Groq's API for processing
- 🔒 No topics are stored on Groq's servers
- 💾 Generated curricula are only stored in your Supabase database
- ✅ Your API key is kept private in `.env`

---

## 📈 What's Next?

### Coming Soon:
- [ ] PDF upload for content extraction
- [ ] URL/link parsing
- [ ] Quiz generation from modules
- [ ] Estimated reading time calculation
- [ ] Progress tracking across modules
- [ ] Multi-language support

---

## 💬 API Call Details

When a user generates a path:

**Request:**
```
Topic: "React Hooks"
Education Level: "college"
```

**Response (Generated Curriculum):**
```json
{
  "title": "Mastering React Hooks",
  "description": "...",
  "totalEstimatedHours": 8,
  "modules": [
    {
      "id": "module_1",
      "title": "Introduction to Hooks",
      "description": "...",
      "estimatedMinutes": 45,
      "subtopics": ["What are Hooks?", "Motivation", "useState Basics"]
    },
    // ... more modules
  ]
}
```

---

## 📞 Support

For issues with:
- **Groq API**: Visit https://console.groq.com/help
- **This Implementation**: Check `/backend/README.md`
- **ModuLearn**: See main `README.md`

---

## ✅ Verification Checklist

Before you start:
- [ ] `.env` file created with `VITE_GROQ_API_KEY`
- [ ] Dev server restarted after adding `.env`
- [ ] Can navigate to `/app/create`
- [ ] Can enter a topic
- [ ] Can click "Generate Path"
- [ ] See loading spinner while generating
- [ ] See curriculum preview on success

---

**Ready to go!** 🚀 Visit `/app/create` and try generating your first learning path!
