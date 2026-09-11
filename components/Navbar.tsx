
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

const Navbar: React.FC = () => {
  const [open, setOpen] = useState(false);

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

        <div className="flex items-center gap-3">
          <Link
            to="/signup"
            className="bg-zinc-900 text-white px-5 sm:px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-zinc-800 transition-all shadow-sm"
          >
            Join Free
          </Link>
          <button
            onClick={() => setOpen(o => !o)}
            className="md:hidden p-2 -mr-2 text-zinc-700 hover:text-zinc-900 transition-colors"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
          >
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-zinc-100 bg-white/95 backdrop-blur-md">
          <div className="px-6 py-4 flex flex-col gap-1">
            <Link to="/" onClick={() => setOpen(false)} className="py-3 text-zinc-700 hover:text-zinc-900 font-medium transition-colors">Home</Link>
            <Link to="/features" onClick={() => setOpen(false)} className="py-3 text-zinc-700 hover:text-zinc-900 font-medium transition-colors">Features</Link>
            <Link to="/#how-it-works" onClick={() => setOpen(false)} className="py-3 text-zinc-700 hover:text-zinc-900 font-medium transition-colors">How it Works</Link>
            <Link to="/login" onClick={() => setOpen(false)} className="py-3 text-zinc-700 hover:text-zinc-900 font-medium transition-colors">Login</Link>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
