
import React from 'react';
import { Link } from 'react-router-dom';
import { Github, Twitter, Linkedin, Instagram } from 'lucide-react';
import logo from './logo.svg';

const Footer: React.FC = () => {
  return (
    <footer className="bg-zinc-950 text-white pt-20 pb-10">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 pb-16 border-b border-zinc-800">
          <div className="space-y-6">
            <Link to="/" className="flex items-center gap-2">
              <img src={logo} alt="ModuLearn" className="w-6 h-6 object-contain" />
              <span className="text-xl font-bold">ModuLearn</span>
            </Link>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Transforming the way we learn. From massive books to manageable modules. Start your journey today.
            </p>
            <div className="flex gap-4">
              <Link to="#" className="p-2 bg-zinc-900 rounded-full hover:bg-zinc-800 transition-colors"><Twitter size={18} /></Link>
              <Link to="#" className="p-2 bg-zinc-900 rounded-full hover:bg-zinc-800 transition-colors"><Linkedin size={18} /></Link>
              <Link to="#" className="p-2 bg-zinc-900 rounded-full hover:bg-zinc-800 transition-colors"><Instagram size={18} /></Link>
              <Link to="#" className="p-2 bg-zinc-900 rounded-full hover:bg-zinc-800 transition-colors"><Github size={18} /></Link>
            </div>
          </div>

          <div>
            <h4 className="font-bold mb-6">Product</h4>
            <ul className="space-y-4 text-zinc-400 text-sm">
              <li><Link to="/features" className="hover:text-white transition-colors">Features</Link></li>
              <li><Link to="/app/create" className="hover:text-white transition-colors">Create Module</Link></li>
              <li><Link to="#" className="hover:text-white transition-colors">Integrations</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-6">Company</h4>
            <ul className="space-y-4 text-zinc-400 text-sm">
              <li><Link to="#" className="hover:text-white transition-colors">About Us</Link></li>
              <li><Link to="#" className="hover:text-white transition-colors">Careers</Link></li>
              <li><Link to="#" className="hover:text-white transition-colors">Contact</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-6">Legal</h4>
            <ul className="space-y-4 text-zinc-400 text-sm">
              <li><Link to="#" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link to="#" className="hover:text-white transition-colors">Terms of Service</Link></li>
              <li><Link to="#" className="hover:text-white transition-colors">Cookie Policy</Link></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-zinc-500 text-xs">
          <p>© 2024 ModuLearn. All rights reserved.</p>
          <p>Made with passion for lifelong learners.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
