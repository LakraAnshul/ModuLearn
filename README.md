<div align="center">

# 🎓 ModuLearn

### AI-Powered Learning Path Generator

*Transform any topic into a structured, personalized learning curriculum powered by AI*

[![GitHub](https://img.shields.io/badge/GitHub-LakraAnshul%2FModuLearn-blue?logo=github)](https://github.com/LakraAnshul/ModuLearn)
[![React](https://img.shields.io/badge/React-19.2-61dafb?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6?logo=typescript)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-6.2-646cff?logo=vite)](https://vitejs.dev)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

</div>

---

## 🌟 About ModuLearn

**ModuLearn** is an innovative educational platform that leverages AI to create intelligent, personalized learning paths. Users can input any topic and receive a structured, modular curriculum tailored to their education level (school, college, or professional).

Whether you're a student looking to learn a new skill, a professional seeking advanced knowledge, or an educator designing courses, ModuLearn adapts to your needs with:

- 🤖 **AI-Generated Curricula** using Groq's high-performance language models
- 📊 **Progress Tracking** with detailed learning metrics
- 🎯 **Personalized Learning Paths** based on education level
- 🔄 **Dynamic Content** that adjusts to your pace
- 💾 **Persistent Storage** with Supabase authentication

---

## ✨ Key Features

### 🚀 Core Features
- **Intelligent Curriculum Generation** - AI creates custom learning paths in seconds
- **Multi-Level Education Support** - Tailored content for school, college, and professional learners
- **Modular Structure** - Break complex topics into manageable chapters and subtopics
- **Time Estimation** - Know exactly how long each module will take
- **User Authentication** - Secure login with Supabase
- **Progress Dashboard** - Track your learning journey with visual analytics

### 🔧 Technical Features
- **Real-time API Integration** - Groq API for blazing-fast responses
- **Responsive Design** - Works seamlessly on desktop, tablet, and mobile
- **Type-Safe** - Full TypeScript support for reliability
- **Modern UI** - Built with React and Tailwind CSS
- **Fast Performance** - Vite for instant hot module replacement

---

## 🛠️ Tech Stack

| Category | Technologies |
|----------|--------------|
| **Frontend** | React 19.2, TypeScript, Tailwind CSS |
| **Build Tool** | Vite 6.2 |
| **AI/ML** | Groq API (llama-3.3-70b-versatile), Google GenAI |
| **Backend** | Supabase (PostgreSQL, Authentication) |
| **Routing** | React Router v7 |
| **Visualization** | Recharts |
| **Icons** | Lucide React |

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** v16+ ([Download](https://nodejs.org))
- **npm** or **yarn** package manager
- **Git** for version control

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/LakraAnshul/ModuLearn.git
cd ModuLearn

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env

# 4. Configure your API keys in .env
# Edit .env and add your credentials:
# - VITE_GROQ_API_KEY (Get from https://console.groq.com)
# - VITE_YOUTUBE_API_KEY (Optional, for video content)
# - VITE_SUPABASE_URL (From your Supabase project)
# - VITE_SUPABASE_ANON_KEY (From your Supabase project)

# 5. Start development server
npm run dev
```

The app will be available at **http://localhost:5173**

---

## ⚙️ Configuration Guide

### Get Your Groq API Key

1. Visit [console.groq.com](https://console.groq.com)
2. Sign up (free tier available) or log in
3. Go to **API Keys** section
4. Create a new API key
5. Copy the key (starts with `gsk_`)
6. Add to your `.env` file

### Get Your Supabase Credentials

1. Visit [supabase.com](https://supabase.com)
2. Create a new project
3. Go to **Settings > API**
4. Copy `Project URL` and `Anon Key`
5. Add to your `.env` file

### Environment Variables Template

```env
# Groq API Configuration
VITE_GROQ_API_KEY=your_groq_api_key_here

# YouTube Data API (Optional)
VITE_YOUTUBE_API_KEY=your_youtube_api_key

# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Google Gemini API (Optional)
VITE_GOOGLE_GENAI_API_KEY=your_google_api_key
```

---

## 📦 Available Scripts

```bash
# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview
```

---

## 📂 Project Structure

```
ModuLearn/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── Navbar.tsx
│   │   ├── Footer.tsx
│   │   ├── Illustrations.tsx
│   │   └── app/
│   ├── pages/               # Page components
│   │   ├── LandingPage.tsx
│   │   ├── LoginPage.tsx
│   │   ├── SignupPage.tsx
│   │   ├── OnboardingPage.tsx
│   │   └── app/
│   │       ├── Dashboard.tsx
│   │       ├── CreatePath.tsx
│   │       ├── LearningInterface.tsx
│   │       ├── ProgressPage.tsx
│   │       └── SettingsPage.tsx
│   ├── backend/
│   │   └── groqService.ts   # Groq API integration
│   ├── lib/
│   │   ├── database.ts      # Database utilities
│   │   └── supabase.ts      # Supabase client
│   ├── App.tsx              # Root component
│   └── index.tsx            # Entry point
├── .env.example             # Environment variables template
├── vite.config.ts           # Vite configuration
├── tsconfig.json            # TypeScript configuration
└── package.json             # Project dependencies
```

---

## 🎯 How It Works

1. **User Input** - Enter any topic you want to learn
2. **AI Processing** - Groq API analyzes the topic and generates a curriculum
3. **Structured Output** - Receive a well-organized learning path with:
   - Multiple chapters/modules
   - Subtopics for each chapter
   - Estimated time per module
   - Difficulty progression
4. **Start Learning** - Begin your personalized learning journey
5. **Track Progress** - Monitor your advancement with built-in analytics

---

## 🔐 Security

- ✅ **API Keys Protected** - Never commit `.env` files to git
- ✅ **Secure Authentication** - Supabase authentication
- ✅ **Data Encryption** - Supabase provides encrypted storage
- ✅ **Environment Variables** - All secrets stored locally in `.env`

---

## 📝 Contributing

Contributions are welcome! Here's how to get started:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 💬 Support & Feedback

- 📧 **Email**: [Open an issue on GitHub](https://github.com/LakraAnshul/ModuLearn/issues)
- 🐛 **Report Bugs**: [GitHub Issues](https://github.com/LakraAnshul/ModuLearn/issues)
- ✨ **Request Features**: [GitHub Discussions](https://github.com/LakraAnshul/ModuLearn/discussions)

---

## 📚 Learning Resources

- [Groq API Documentation](https://console.groq.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vite Guide](https://vitejs.dev/guide/)

---

<div align="center">

### Built with ❤️ by [Anshul Lakra](https://github.com/LakraAnshul)

⭐ If you find this project helpful, please consider giving it a star!

</div>
