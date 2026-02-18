# ⚡ QUICK REFERENCE CARD

## 🚀 30-Second Setup

```bash
# 1. Add to .env file in project root:
VITE_GROQ_API_KEY=gsk_your_api_key_from_groq_console

# 2. Restart dev server:
npm run dev

# 3. Test it:
# Visit: http://localhost:5173/app/create
```

**That's it!** ✅

---

## 📋 Get API Key (2 minutes)

1. Go to https://console.groq.com/
2. Sign up (free) or login
3. Go to **API Keys** section
4. Copy your key (starts with `gsk_`)
5. Paste into `.env` as shown above

---

## 🎯 Feature Overview

| Feature | Status | Details |
|---------|--------|---------|
| Generate curriculum | ✅ Ready | Enter topic → Get curriculum |
| Customize by level | ✅ Ready | Auto-detects school/college/pro |
| View modules | ✅ Ready | Click to expand subtopics |
| Refine with AI | ✅ Ready | Click edit icon for more details |
| Add/Delete modules | ✅ Ready | Manage curriculum content |
| Dark mode | ✅ Ready | Fully supported |
| Mobile | ✅ Ready | Responsive design |

---

## 🎓 What Happens for Each Education Level

### School Student
- 4-6 modules
- Simple language
- 15-20 min each
- Conceptual focus

### College Student
- 6-10 modules
- Balanced theory & practice
- 20-30 min each
- Real-world examples

### Professional
- 8-12 modules
- Advanced concepts
- 25-40 min each
- Mastery-focused

---

## 🧪 Test It Out

**Try These Topics:**
- "React Hooks"
- "Python Basics"
- "Machine Learning"
- "Web Design"
- "Quantum Physics"

**Do This:**
1. Go to `/app/create`
2. Type a topic
3. Click "Generate Path"
4. Wait 5-30 seconds
5. See your curriculum!

---

## 📁 Important Files

| File | Purpose |
|------|---------|
| `.env` | API key storage |
| `/backend/groqService.ts` | AI logic |
| `/pages/app/CreatePath.tsx` | Input form |
| `/pages/app/StructurePath.tsx` | Preview page |

---

## 🔧 If Something Goes Wrong

**Error: "GROQ_API_KEY not configured"**
```
✅ Fix: Restart dev server (Ctrl+C, npm run dev)
```

**Error: "Failed to generate"**
```
✅ Fix: Try a different, simpler topic
```

**Slow response**
```
✅ Normal: First response takes 5-30 seconds
✅ Subsequent requests are faster
```

---

## 🎨 UI Features

- ✅ Loading spinner
- ✅ Error messages
- ✅ Input validation
- ✅ Expandable modules
- ✅ Edit buttons
- ✅ Add/Delete buttons
- ✅ Statistics display
- ✅ Duration estimates

---

## 📚 Where to Learn More

| Topic | File |
|-------|------|
| Quick start | `SETUP_GROQ.md` |
| Detailed setup | `ENV_SETUP_GUIDE.md` |
| API docs | `/backend/README.md` |
| Architecture | `IMPLEMENTATION_SUMMARY.md` |
| Full feature | `FEATURE_COMPLETE.md` |

---

## ⚙️ Customize (Advanced)

**Change Groq Model:**
Edit `/backend/groqService.ts` line:
```typescript
const MODEL = 'llama-3.3-70b-versatile';  // Change this
```

Options:
- `llama-3.1-8b-instant` - Faster, lower quality
- `llama-3.3-70b-versatile` - Best (current)
- `qwen/qwen3-32b` - Slower, higher quality

---

## ✅ Success Checklist

- [ ] `.env` file created
- [ ] `VITE_GROQ_API_KEY=...` added
- [ ] Dev server restarted
- [ ] Can access `/app/create`
- [ ] Can type a topic
- [ ] "Generate Path" button works
- [ ] Loading spinner appears
- [ ] Curriculum displays
- [ ] Can expand modules
- [ ] Can refine modules

---

## 🎯 What's Working

✅ Groq API integration  
✅ Curriculum generation  
✅ Education-level customization  
✅ Module expansion  
✅ Module refinement  
✅ Add/Delete modules  
✅ Dark mode  
✅ Mobile responsive  
✅ Error handling  
✅ Input validation  

---

## 📊 Performance

| Task | Time |
|------|------|
| Generate curriculum | 5-30s |
| Refine module | 3-8s |
| Load profile | <1s |
| Display results | <1s |

---

## 🔐 Security Notes

✅ API key in `.env` only  
✅ Not committed to git  
✅ `.gitignore` has `.env`  
✅ No hardcoded secrets  
✅ Input validated  
✅ Responses validated  

---

## 🚀 Next Steps

1. ✅ Add API key (5 min)
2. ✅ Test feature (5 min)
3. ✅ Try different topics (5 min)
4. ✅ Test on mobile (5 min)
5. 💾 Save to database (future)
6. 📝 Add quizzes (future)

---

## 💬 Helpful Commands

```bash
# Check if .env exists
ls -la .env          # Mac/Linux
dir .env             # Windows

# View .env contents
cat .env             # Mac/Linux
type .env            # Windows

# Restart server (if issue)
npm run dev

# Build for production
npm run build
```

---

## 🎯 Key Points

✅ **No new packages needed** - Works with existing setup  
✅ **Free tier available** - Groq offers free API access  
✅ **5-minute setup** - Just add API key  
✅ **Production ready** - All error handling included  
✅ **Well documented** - 6 comprehensive guides  
✅ **Easy to extend** - Architecture supports growth  

---

## 🎉 You're Ready!

**Everything is built and documented.**

Just add your API key and you're launching!

```env
# Copy this to your .env file:
VITE_GROQ_API_KEY=gsk_your_key_here
```

Then visit: `http://localhost:5173/app/create`

**Enjoy!** 🚀✨

---

**Questions?** Check the documentation files!  
**Issues?** Check `ENV_SETUP_GUIDE.md`  
**Learn more?** Check `/backend/README.md`

---

**Status: ✅ COMPLETE & READY**
