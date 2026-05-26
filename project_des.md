# ModuLearn: AI-Powered Learning Path Builder

## Overview
ModuLearn is an advanced, AI-driven educational platform designed to transform raw information into structured, personalized learning experiences. Whether starting from a broad topic, an academic PDF, or a web URL, ModuLearn synthesizes the content and generates a customized curriculum tailored to the user's preferred learning depth and familiarity level.

The platform goes beyond static syllabus generation by providing a highly interactive, rich learning interface equipped with dynamic visualizations, curated multimedia content, integrated coding environments, AI-generated assessments, and a persistent AI chatbot to guide the learning journey.

## Core Workflows and Pipelines

### 1. Multi-Source Curriculum Generation
ModuLearn can ingest knowledge from three distinct sources:
- **Topic Mode**: Users input a broad subject or specific topic (e.g., "Quantum Computing" or "French Revolution").
- **PDF Mode**: Users upload documents. The system parses the PDF, chunks the text, summarizes the content, synthesizes sections, and generates a curriculum based on the document's actual contents.
- **URL Mode**: Users provide a web link. The system extracts the textual content (handling both direct and proxied requests), normalizes the data, and constructs a curriculum based on the article or web page.

### 2. Adaptive Learning Profiles
Curricula are not one-size-fits-all. The generation engine adapts based on:
- **Learning Depth**: Quick Overview, Structured Learning, or Deep Mastery.
- **Familiarity Level**: Beginner, Intermediate, or Advanced.
- **User Profile**: Adjustments based on whether the user is a school student, college student, or working professional.

### 3. Path Structuring and Visualization
Before committing to a path, users can:
- Review the generated modules and subtopics.
- Use AI to refine or rewrite specific modules.
- Add or remove modules manually.
- Generate and download a visual Mindmap of their entire learning path.

## The Interactive Learning Experience

Once a learning path is saved, users enter the Learning Interface, a comprehensive dashboard equipped with numerous tools to facilitate active learning.

### Dynamic Content & Visualizations
- **AI Explanations**: Deep dive into any subtopic with on-demand, AI-generated explanations and summaries.
- **BioDigital 3D Anatomy Viewer**: For biology and medical topics, the platform seamlessly embeds the BioDigital Human viewer, automatically matching the topic to the appropriate 3D anatomical model for interactive exploration.
- **Curated YouTube Resources**: Recommends highly relevant YouTube videos. Crucially, it provides specific timestamp jumps so learners can skip directly to the exact moment the relevant subtopic is discussed.

### Integrated Coding Workspace
For computer science and programming topics, ModuLearn provides a built-in IDE:
- **Monaco Editor**: A robust, VS Code-like code editor directly in the browser.
- **Judge0 Execution Engine**: Allows users to write, run, and test code against predefined test cases without leaving the platform.
- **Attempt Tracking**: Tracks coding attempts and performance for continuous improvement.

### Advanced Assessment and Active Recall (New)
To ensure knowledge retention, ModuLearn includes a powerful, AI-driven assessment suite:
- **Module Quizzes**: Automatically generates Multiple Choice Questions (MCQs) and Numerical quizzes tailored specifically to the contents of the current module.
- **Flashcards**: Automatically extracts key concepts and definitions into interactive flashcards, promoting active recall and spaced repetition.
- **Cumulative Final Quiz**: Synthesizes all course content into a comprehensive final examination spanning multiple modules.
- **Intelligent Feedback System**: Provides AI-driven, difficulty-aware feedback based on quiz performance. It identifies knowledge gaps and offers constructive, honest feedback—especially for performance under passing thresholds—helping users understand *why* they got a question wrong.

### Persistent AI Teaching Assistant (New)
- **Context-Aware AI Chatbot**: A floating chatbot powered by Groq and the `llama-3.3-70b-versatile` model is available across the platform.
- **Context Injection**: The chatbot is aware of the user's profile, the specific course they are taking, their current module progress, and their quiz performance, allowing for highly contextual and personalized tutoring.
- **Persistent Memory**: Chat sessions and message history are saved securely in Supabase, allowing learners to pick up conversations exactly where they left off.

## Tech Stack and Architecture

ModuLearn is built on a modern, robust, and scalable technology stack:

### Frontend
- **Framework**: React 19 with TypeScript for strong typing and component-driven UI.
- **Routing**: React Router (hash-based routing for static hosting compatibility).
- **Styling**: Tailwind CSS for responsive, utility-first design.
- **Build Tool**: Vite for fast bundling and HMR.
- **Visualizations**: Recharts for data, jsMind for mindmaps, html2canvas for exports.
- **PDF Processing**: `pdfjs-dist` for client-side PDF parsing.

### Backend & AI Services
- **AI Engine**: Groq API (primarily using high-speed Llama 3 models) for curriculum generation, quizzes, and chatbot interactions. Google GenAI is used for specific fallback flows.
- **Database & Auth**: Supabase. Handles Google OAuth, email/password auth, and stores user profiles, learning paths, modules, progress, quiz attempts, and chat history.
- **Code Execution**: Judge0 API (via RapidAPI or self-hosted) for secure, sandboxed code execution.
- **3D Engine**: BioDigital Human API for anatomy visualization.
- **Video Integration**: YouTube Data API for video discovery and timestamping.
