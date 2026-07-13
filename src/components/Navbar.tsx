import { supabase } from '../supabase';
import { LogOut, User, Moon, Sun, Wallet } from 'lucide-react';
import { useEffect, useState } from 'react';
import { motion } from 'motion/react';

export default function Navbar({ fullName, role }: { fullName: string | null, role: string | null }) {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(t => t === 'light' ? 'dark' : 'light');
  };

  return (
    <nav className="glass-panel sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-xl sm:text-2xl font-extrabold text-primary flex items-center gap-3 tracking-tight"
        >
          <motion.div
            whileHover={{ rotate: 15, scale: 1.1 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <Wallet size={28} className="text-primary" />
          </motion.div>
          نظام ديون المالية
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3 sm:gap-5"
        >
          <motion.button 
            whileHover={{ scale: 1.1, rotate: 10 }}
            whileTap={{ scale: 0.9 }}
            onClick={toggleTheme} 
            className="p-2.5 rounded-full glass-card hover:bg-white/80 dark:hover:bg-black/60 transition-colors shadow-sm"
          >
            {theme === 'light' ? <Moon size={20} className="text-gray-700" /> : <Sun size={20} className="text-yellow-400" />}
          </motion.button>
          
          <div className="hidden sm:flex items-center gap-2 glass-card px-4 py-2 rounded-full shadow-sm border border-white/40 dark:border-white/5">
            <motion.div whileHover={{ scale: 1.1 }}>
              <User size={18} className="text-primary" />
            </motion.div>
            <span className="text-sm font-bold text-gray-800 dark:text-gray-200">
              {fullName || 'مستخدم'} <span className="opacity-60 text-xs font-normal">({role === 'admin' ? 'مدير' : 'موظف'})</span>
            </span>
          </div>
          
          <motion.button 
            whileHover={{ scale: 1.05, backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
            whileTap={{ scale: 0.95 }}
            onClick={() => supabase.auth.signOut()}
            className="flex items-center gap-2 text-red-500 hover:text-red-600 px-4 py-2.5 rounded-2xl transition-all font-bold"
          >
            <motion.div whileHover={{ x: -3 }}>
              <LogOut size={20} />
            </motion.div>
            <span className="text-sm hidden sm:inline">خروج</span>
          </motion.button>
        </motion.div>
      </div>
    </nav>
  );
}
