
import React from 'react';
import { Link } from 'react-router-dom';

const Navbar: React.FC = () => {
  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-zinc-100">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-xl font-extrabold tracking-tight">ModuLearn</span>
        </Link>
        
        <div className="hidden md:flex items-center gap-10">
          <Link to="/" className="text-zinc-600 hover:text-zinc-900 font-medium text-sm transition-colors">Home</Link>
          <Link to="/features" className="text-zinc-600 hover:text-zinc-900 font-medium text-sm transition-colors">Features</Link>
          <Link to="/#how-it-works" className="text-zinc-600 hover:text-zinc-900 font-medium text-sm transition-colors">How it Works</Link>
          <Link to="/login" className="text-zinc-600 hover:text-zinc-900 font-medium text-sm transition-colors">Login</Link>
        </div>

        <Link 
          to="/signup" 
          className="bg-zinc-900 text-white px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-zinc-800 transition-all shadow-sm"
        >
          Join Free
        </Link>
      </div>
    </nav>
  );
};

export default Navbar;
