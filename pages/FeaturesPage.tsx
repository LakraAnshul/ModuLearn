
import React from 'react';
import Navbar from '../components/Navbar.tsx';
import Footer from '../components/Footer.tsx';
import { Book, Cpu, Zap, Share2, BarChart3, Users, PlayCircle, ShieldCheck } from 'lucide-react';

const features = [
  {
    icon: <Cpu className="text-peach" />,
    title: "AI-Powered Structuring",
    desc: "Our advanced models analyze your PDFs and text to extract the most important concepts and organize them logically."
  },
  {
    icon: <Zap className="text-peach" />,
    title: "Instant Flashcards",
    desc: "Automatically generate active recall cards for any topic, helping you memorize complex facts in minutes."
  },
  {
    icon: <PlayCircle className="text-peach" />,
    title: "Integrated Video Hub",
    desc: "Stop searching YouTube. We bring relevant educational videos directly into your chapter context."
  },
  {
    icon: <BarChart3 className="text-peach" />,
    title: "Progress Visualization",
    desc: "Track every step of your journey with detailed analytics on completion and quiz performance."
  },
  {
    icon: <Share2 className="text-peach" />,
    title: "Collaborative Paths",
    desc: "Share your structured learning modules with classmates or study groups in one click."
  },
  {
    icon: <Book className="text-peach" />,
    title: "Offline Reading",
    desc: "Download your modules and study on the go, even without an active internet connection."
  },
  {
    icon: <Users className="text-peach" />,
    title: "Expert Curation",
    desc: "Verified experts contribute to high-quality public modules available in our global library."
  },
  {
    icon: <ShieldCheck className="text-peach" />,
    title: "Personalized Tutoring",
    desc: "Context-aware AI assistance that can explain difficult paragraphs in multiple ways."
  }
];

const FeaturesPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 transition-colors duration-200">
      <Navbar />
      <div className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-24">
          <span className="text-peach font-bold uppercase tracking-widest text-xs mb-4 block">Capabilities</span>
          <h1 className="text-5xl md:text-6xl font-extrabold text-zinc-900 dark:text-white mb-6">Built for deep learning</h1>
          <p className="text-zinc-500 dark:text-zinc-400 max-w-2xl mx-auto text-lg leading-relaxed">
            ModuLearn provides all the tools you need to master any subject, from complex technical documentation to literature.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((f, i) => (
            <div key={i} className="group p-8 bg-zinc-50 dark:bg-zinc-900 rounded-[32px] hover:bg-white dark:hover:bg-zinc-800 hover:shadow-2xl hover:shadow-zinc-200 dark:hover:shadow-none transition-all border border-transparent hover:border-zinc-100 dark:hover:border-zinc-700">
              <div className="w-14 h-14 bg-white dark:bg-zinc-800 rounded-2xl flex items-center justify-center shadow-sm mb-8 group-hover:scale-110 transition-transform">
                {f.icon}
              </div>
              <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-4">{f.title}</h3>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default FeaturesPage;
