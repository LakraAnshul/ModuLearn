# Step-by-Step Environment Setup Guide

## 📋 Pre-Setup Checklist
- ✅ You have a Groq account (or can create one for free)
- ✅ You have your Groq API key (or know where to get it)
- ✅ You can edit files in your project root
- ✅ You can restart your development server

---

## 🔑 Step 1: Get Your Groq API Key (2 minutes)

### Option A: New to Groq
1. Go to **https://console.groq.com/**
2. Click **"Sign Up"** (free tier available)
3. Complete registration with email
4. Check your email for verification link
5. Log in to console
6. Go to **API Keys** section
7. Click **"Create New API Key"**
8. Copy the key (looks like: `gsk_...`)

### Option B: Already Have Groq Account
1. Go to **https://console.groq.com/**
2. Log in with your credentials
3. Go to **API Keys** section
4. Copy your existing key or create a new one

### ⚠️ Important Security Note
✅ Keep your API key secret!  
✅ Never share it or commit it to Git!  
✅ We store it in `.env` which is in `.gitignore`

---

## 📄 Step 2: Create/Update `.env` File (1 minute)

### Option A: Using a Text Editor
1. Open your project root folder in your editor
2. Create a new file named `.env` (if it doesn't exist)
3. Add this line:
```env
VITE_GROQ_API_KEY=gsk_your_actual_key_here
```
4. Replace `gsk_your_actual_key_here` with your actual key
5. **Save the file**

### Option B: Using Terminal/Command Line
```bash
# Navigate to your project root
cd c:\Users\anshul\Documents\GitHub\modulearn

# Create .env file with your key
echo VITE_GROQ_API_KEY=gsk_your_actual_key_here > .env

# Verify it was created
type .env
```

### ✅ Final `.env` File Should Look Like:
```env
VITE_GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**That's it!** No other environment variables needed unless you want to customize.

---

## 🔄 Step 3: Restart Development Server (1 minute)

### If Dev Server is Running:
1. Go to your terminal where `npm run dev` is running
2. Press **`Ctrl + C`** to stop it
3. Run `npm run dev` again
4. Wait for "Local: http://localhost:5173/" message

### If Dev Server is Not Running:
```bash
# In your project root
npm run dev
```

**Wait 10-30 seconds for the dev server to start.**

---

## ✅ Step 4: Test the Setup (2 minutes)

### Test in Your Browser:

**Step 1:** Navigate to http://localhost:5173/app/create
- You should see the "Create New Path" page
- No error messages in the browser console

**Step 2:** Enter a test topic
- Example: "Python Basics"
- Make sure it's at least 5 characters

**Step 3:** Click "Generate Path"
- Should show loading spinner
- You should see a message like "Generating with Groq AI..."

**Step 4:** Wait for results
- Takes 10-30 seconds usually
- Should show the curriculum on `/app/structure`
- Displays modules, duration, and topics

### ✅ Success Indicators:
- ✅ No red error boxes
- ✅ Curriculum appears after 10-30 seconds
- ✅ Shows module titles, subtopics, and duration
- ✅ Can click modules to expand and see subtopics

### ❌ If Something Goes Wrong:

**Issue:** "GROQ_API_KEY is not configured"
```
Solution:
1. Check .env file exists in root directory (not in backend/)
2. Make sure you added VITE_GROQ_API_KEY=gsk_...
3. Restart dev server (Ctrl+C and npm run dev)
4. Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)
```

**Issue:** "Network Error" or timeout
```
Solution:
1. Check internet connection
2. Check Groq status at https://status.groq.com/
3. Try again in a few seconds
4. Check that API key is correct
```

**Issue:** "Failed to parse curriculum JSON"
```
Solution:
1. Try a different, clearer topic
2. Make sure topic is in English
3. Try something like "React Hooks" instead of complex topics
```

---

## 🔍 Verification Checklist

Before considering setup complete:

- [ ] `.env` file exists in project root
- [ ] `.env` contains `VITE_GROQ_API_KEY=gsk_...`
- [ ] Dev server has been restarted
- [ ] Can access http://localhost:5173/app/create
- [ ] Can enter a topic (5+ characters)
- [ ] "Generate Path" button is clickable
- [ ] Loading spinner appears when clicked
- [ ] Curriculum appears after 10-30 seconds
- [ ] Can see modules with titles and subtopics
- [ ] Can expand modules to see details
- [ ] No red error messages anywhere

---

## 📊 What Should Happen

### Timeline:
```
1. User enters topic (instant)
2. Clicks "Generate Path" (instant)
3. Loading spinner appears (immediately)
4. Browser screen shows "Generating with Groq AI..." (0 seconds)
5. Groq API processes request (5-30 seconds)
6. Response received and parsed (1-2 seconds)
7. /app/structure page loads (<1 second)
8. Curriculum displays beautifully (instant)
```

---

## 🎯 Expected Output Example

After generating a path for "React Hooks":

```
Title: React Hooks: From Basics to Advanced Patterns
Description: Master React Hooks including useState, useEffect, ...

Total Duration: 8.5 hours
Total Modules: 7
Education Level: college

Module 1: Introduction to React Hooks
├─ useState Fundamentals (25 mins)
├─ Props vs State Review (20 mins)
└─ First Custom Hook (30 mins)

Module 2: Side Effects with useEffect
├─ Understanding useEffect (30 mins)
├─ Dependency Arrays (25 mins)
└─ Cleanup Functions (20 mins)

[... more modules ...]
```

---

## 🚀 Next Steps After Setup

Once verified as working:

1. **Try Different Topics**
   - "Machine Learning Fundamentals"
   - "Web Design Principles"
   - "Quantum Physics Basics"

2. **Test Module Refinement**
   - Click the edit (pencil) icon on any module
   - Wait 3-8 seconds for AI to add more details

3. **Explore StructurePath Features**
   - Click modules to expand/collapse
   - Try adding new modules with the "+" button
   - Try deleting modules with the trash icon

4. **Test on Different Users**
   - School student (Grade 9, 10, etc.)
   - College student (CSE, Economics, etc.)
   - Professional (no grade/course)

---

## 🐛 Debugging Tips

### To Check if API Key is Recognized:
1. Open browser Console (F12 or Cmd+Option+I)
2. Go to `/app/create`
3. Try to generate
4. Look for error messages in console
5. If you see API key in error, it's being used

### To Monitor API Calls:
1. Open Network tab in Developer Tools
2. Filter for "groq" or "api"
3. Watch for request to https://api.groq.com
4. Check response status (should be 200)

### To Test API Key Directly (Advanced):
```javascript
// In browser console, replace with your actual key:
const key = "gsk_your_key_here";

fetch('https://api.groq.com/openai/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${key}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'llama-3.3-70b-versatile',
    messages: [{role: 'user', content: 'test'}],
    max_tokens: 10,
  })
}).then(r => r.json()).then(d => console.log('Success:', d));
```

---

## ⚙️ Optional Customizations

### Use Different Groq Model:
1. Open `backend/groqService.ts`
2. Find line: `const MODEL = 'llama-3.3-70b-versatile';`
3. Change to: `const MODEL = 'llama-3.1-8b-instant';` (faster but lower quality)
4. Save and restart dev server

### Adjust Model Behavior:
1. Look for `temperature: 0.7` in groqService.ts
2. Lower value (0.1-0.5) = More consistent results
3. Higher value (0.8-1.0) = More creative results

### Change Prompt Instructions:
1. Open `backend/groqService.ts`
2. Edit the `getPrompt()` function
3. Customize instructions for different levels
4. Save and try generating again

---

## 🎓 Learning Resources

While waiting for API response, learn more about:

- **Groq Models**: https://console.groq.com/docs/models
- **API Documentation**: https://console.groq.com/docs
- **Rate Limiting**: https://console.groq.com/docs/rate-limiting
- **API Playground**: https://console.groq.com/playground

---

## 📞 Troubleshooting Checklist

If things aren't working, go through this list:

1. **Check `.env` file exists**
   ```bash
   # Windows
   dir .env
   
   # Mac/Linux
   ls -la .env
   ```

2. **Verify file content**
   ```bash
   # Windows
   type .env
   
   # Mac/Linux
   cat .env
   ```

3. **Check Docker/Environment variables**
   - Make sure no conflicting settings
   - Env variables should only be in .env file

4. **Restart everything**
   - Stop dev server
   - Close browser tab
   - Run `npm run dev` again
   - Open fresh browser tab to localhost:5173

5. **Check Groq API Status**
   - Visit https://status.groq.com/
   - Make sure all systems are operational

6. **Check Browser Console**
   - Press F12
   - Go to Console tab
   - Look for any error messages
   - Take a screenshot to share if asking for help

---

## ✨ You're All Set!

Once you see a generated curriculum, you know the setup is complete. 🎉

**Time to celebrate:** You've successfully set up AI-powered curriculum generation!

---

**Questions?** Check:
1. `/backend/README.md` - Technical details
2. `/SETUP_GROQ.md` - Quick reference
3. This file - Detailed setup steps
4. Groq Console - API status and usage

**Happy learning!** 🚀
