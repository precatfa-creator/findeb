import React, { useState } from 'react';
import { supabase } from '../supabase';
import { motion } from 'motion/react';
import { Shield, ArrowRight } from 'lucide-react';

export default function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login-helper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier })
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'فشل تسجيل الدخول');
      }

      const { error: signInErr } = await supabase.auth.signInWithPassword({ email: data.email, password });
      if (signInErr) throw signInErr;
    } catch (err: any) {
      setError('بيانات الدخول غير صحيحة');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[85vh] p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, type: "spring", bounce: 0.4 }}
        className="glass-card w-full max-w-md p-8 sm:p-10 rounded-[2rem]"
      >
        <div className="flex justify-center mb-6">
          <motion.div 
            initial={{ rotate: -180, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            transition={{ duration: 0.8, type: "spring" }}
            className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary to-[#ff4b82] flex items-center justify-center shadow-lg shadow-primary/30"
          >
            <Shield size={40} className="text-white" />
          </motion.div>
        </div>
        
        <h1 className="text-3xl font-extrabold text-center mb-2 text-gray-900 dark:text-white tracking-tight">مرحباً بك</h1>
        <p className="text-center text-gray-500 dark:text-gray-400 mb-8 font-medium">سجل دخولك لنظام المالية</p>
        
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-50/80 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-2xl text-center text-sm font-bold border border-red-100 dark:border-red-800/50 backdrop-blur-md"
          >
            {error}
          </motion.div>
        )}
        
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-300 ml-1">اسم المستخدم أو المعرف (ID)</label>
            <input 
              type="text" 
              required
              value={identifier}
              onChange={e => setIdentifier(e.target.value)}
              className="glass-input w-full p-4 rounded-2xl text-gray-900 dark:text-white"
              dir="ltr"
              placeholder="username"
            />
          </div>
          <div>
            <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-300 ml-1">كلمة المرور</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="glass-input w-full p-4 rounded-2xl text-gray-900 dark:text-white"
              dir="ltr"
              placeholder="••••••••"
            />
          </div>
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.95 }}
            type="submit" 
            disabled={loading}
            className="w-full bg-primary text-white p-4 rounded-2xl font-bold shadow-xl shadow-primary/20 hover:shadow-primary/40 transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
          >
            {loading ? 'جاري الدخول...' : (
              <>
                تسجيل الدخول
                <ArrowRight size={20} />
              </>
            )}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
}
