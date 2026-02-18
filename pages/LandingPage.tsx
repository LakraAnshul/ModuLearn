import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Star, ArrowRight, Play, BookOpen, Layers, Linkedin } from 'lucide-react';
import Navbar from '../components/Navbar.tsx';
import Footer from '../components/Footer.tsx';
import { 
  MainIllustration, 
  ReadingIllustration,
  SuccessIllustration,
  RobotIllustration,
  IdeaIllustration
} from '../components/Illustrations.tsx';

const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 transition-colors duration-200">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-16 pb-24 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center">
          <div className="z-10 relative">
            <div className="absolute -top-20 -left-10 w-40 h-40 opacity-20 dark:opacity-10 pointer-events-none hidden lg:block">
              <IdeaIllustration className="text-zinc-400" />
            </div>
            <h1 className="text-5xl lg:text-[72px] leading-[1.1] font-extrabold text-zinc-900 dark:text-white mb-6 tracking-tight">
              Your ultimate <br /> 
              destination for <br />
              <span className="text-zinc-400">limitless learning</span>
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 text-lg mb-10 max-w-lg leading-relaxed">
              The only authoring platform designed to unlock learner potential and streamline content production from any source material.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/signup" className="bg-peach text-white px-8 py-4 rounded-xl font-bold flex items-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-peach/20">
                Get Started <ChevronRight size={20} />
              </Link>
            </div>
          </div>

          <div className="relative flex justify-center items-center">
            <div className="absolute -top-12 -right-12 w-64 h-64 bg-peach/10 rounded-full blur-3xl animate-pulse" />
            <div className="relative z-10 w-full max-w-lg aspect-square flex items-center justify-center">
              {/* @ts-ignore */}
              <dotlottie-wc
                src="https://lottie.host/56e59482-8bce-4d5e-9d5a-08a050360d43/9t8bB93mjw.lottie"
                style={{ width: '100%', height: '100%' }}
                autoplay
                loop
              />
              <div className="absolute -bottom-6 -right-6 bg-white dark:bg-zinc-900 p-4 rounded-2xl shadow-xl border border-zinc-100 dark:border-zinc-800 animate-bounce hidden md:block">
                <Star className="text-peach fill-peach" size={24} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 border-y border-zinc-100 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="flex flex-col items-center md:items-start">
              <div className="flex -space-x-2 mb-3">
                {[1,2,3,4].map(i => (
                  <img key={i} src={`https://i.pravatar.cc/150?u=${i}`} className="w-8 h-8 rounded-full border-2 border-white dark:border-zinc-900" alt="Avatar" />
                ))}
                <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 border-2 border-white dark:border-zinc-900 flex items-center justify-center text-[10px] font-bold">+12k</div>
              </div>
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Happy Students</p>
            </div>
            <div className="text-center md:text-left">
              <h3 className="text-3xl font-extrabold text-zinc-900 dark:text-white">140+</h3>
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Modules Generated</p>
            </div>
            <div className="text-center md:text-left">
              <h3 className="text-3xl font-extrabold text-zinc-900 dark:text-white">120+</h3>
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Expert Curators</p>
            </div>
            <div className="text-center md:text-left">
              <h3 className="text-3xl font-extrabold text-zinc-900 dark:text-white">32+</h3>
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Web & Mobile Apps</p>
            </div>
          </div>
        </div>
      </section>

      {/* Dark Highlight Section */}
      <section className="bg-zinc-950 py-24 my-16">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-20 items-center">
          <div className="order-2 md:order-1 relative">
             <div className="w-full aspect-square flex items-center justify-center">
               {/* @ts-ignore */}
               <dotlottie-wc
                 src="https://lottie.host/60127b74-67ec-44c8-a4cb-e6767fd2efdb/k3d8eQm51W.lottie"
                 style={{ width: '100%', height: '100%' }}
                 autoplay
                 loop
               />
             </div>
          </div>
          <div className="order-1 md:order-2 text-white">
            <h2 className="text-4xl md:text-5xl font-extrabold mb-8 leading-tight">
              Concentrate on your passion, <br />
              we'll care of everything.
            </h2>
            <p className="text-zinc-400 text-lg mb-12 leading-relaxed max-w-lg">
              We convert complex materials into easy-to-use learning tools, allowing you to focus on the knowledge and not the logistics of organizing chapters or quizzes.
            </p>
            <Link to="/signup" className="bg-peach text-white px-8 py-4 rounded-xl font-bold inline-flex items-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-peach/20">
              Join our team <ChevronRight size={20} />
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-[#fafafa] dark:bg-zinc-900 transition-colors">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-extrabold text-zinc-900 dark:text-white mb-4">Learn practical skills online</h2>
            <p className="text-zinc-500 dark:text-zinc-400 max-w-2xl mx-auto">Advance your career at your own pace with our platform's curated courses designed to fit your busy lifestyle.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-zinc-800 text-white rounded-[32px] p-10 flex flex-col justify-between h-[500px] shadow-2xl group overflow-hidden">
              <div className="relative z-10">
                <Layers size={40} className="text-zinc-400 mb-8 group-hover:text-peach transition-colors" />
                <h3 className="text-2xl font-bold mb-6">Structured Chapters</h3>
                <p className="text-zinc-400 leading-relaxed">
                  We automatically break down any text or PDF into logical, easy-to-digest chapters and subtopics.
                </p>
              </div>
              <div className="absolute -bottom-20 -right-20 w-80 h-80 opacity-10 group-hover:opacity-20 transition-opacity">
                <RobotIllustration />
              </div>
              <div className="mt-auto relative z-10">
                 <span className="text-6xl font-black text-zinc-700">2026</span>
              </div>
            </div>

            <div className="bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-[32px] p-10 h-[500px] flex flex-col group relative overflow-hidden">
              <BookOpen size={40} className="text-zinc-500 mb-8 group-hover:text-peach transition-colors" />
              <h3 className="text-2xl font-bold mb-4">Interactive Quizzes</h3>
              <p className="text-zinc-600 dark:text-zinc-400 mb-8">AI-generated assessments that adapt to your knowledge level automatically.</p>
              <div className="absolute -right-10 bottom-20 w-48 h-48 opacity-10">
                <IdeaIllustration />
              </div>
              <div className="mt-auto grid grid-cols-2 gap-2">
                <div className="h-2 bg-zinc-300 dark:bg-zinc-700 rounded-full overflow-hidden relative">
                  <div className="w-[80%] h-full bg-peach animate-pulse"></div>
                </div>
                <div className="h-2 bg-zinc-300 dark:bg-zinc-700 rounded-full"></div>
              </div>
            </div>

            <div className="bg-zinc-100 dark:bg-zinc-950 text-zinc-900 dark:text-white rounded-[32px] p-10 h-[500px] flex flex-col group border border-transparent dark:border-zinc-800 relative overflow-hidden">
              <Play size={40} className="text-zinc-500 mb-8 group-hover:text-peach transition-colors" />
              <h3 className="text-2xl font-bold mb-4">Smart Recs</h3>
              <p className="text-zinc-600 dark:text-zinc-400">Video recommendations from YouTube and Coursera that match your current chapter perfectly.</p>
              <div className="absolute -right-20 -bottom-20 w-64 h-64 opacity-5 group-hover:opacity-10 transition-opacity">
                <SuccessIllustration />
              </div>
              <div className="mt-auto border-t border-zinc-200 dark:border-zinc-800 pt-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-white dark:bg-zinc-800 flex items-center justify-center shadow-sm group-hover:rotate-12 transition-transform">
                    <ArrowRight size={24} className="text-peach" />
                  </div>
                  <span className="font-bold">Discover More</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-20 items-center">
          <div>
            <h2 className="text-4xl font-extrabold mb-8 dark:text-white">What our students <br />say about us</h2>
            <p className="text-zinc-500 dark:text-zinc-400 italic text-xl leading-relaxed mb-10">
              "I've been a student of ModuLearn for quite some time. The platform features some of the most renowned professional curators. It truly revolutionizes the future of learning technology."
            </p>
            <div className="flex gap-4">
              <button className="w-12 h-12 rounded-full border border-zinc-200 dark:border-zinc-800 flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors">
                <ArrowRight className="rotate-180" size={20} />
              </button>
              <button className="w-12 h-12 rounded-full bg-zinc-900 dark:bg-white dark:text-zinc-950 text-white flex items-center justify-center hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors shadow-lg">
                <ArrowRight size={20} />
              </button>
            </div>
          </div>
          <div className="relative">
            <div className="w-full h-[500px] flex items-center justify-center">
              {/* @ts-ignore */}
              <dotlottie-wc
                src="https://lottie.host/f0da80a8-9296-4968-9bb3-3faee361ee90/eskwtBe47f.lottie"
                style={{ width: '100%', height: '100%' }}
                autoplay
                loop
              />
            </div>
            <div className="absolute -bottom-10 -left-10 bg-peach p-8 rounded-[32px] text-white shadow-2xl max-w-xs transition-transform hover:-translate-y-2">
              <h4 className="font-bold text-xl mb-1">Marcus Lee</h4>
              <p className="text-white/80 text-sm font-medium">Product Designer @ Meta</p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default LandingPage;