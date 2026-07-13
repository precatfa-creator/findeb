import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import type { User } from '@supabase/supabase-js';
import { supabase } from './supabase';

import Login from './components/Login';
import AdminPanel from './components/AdminPanel';
import UserPanel from './components/UserPanel';
import Navbar from './components/Navbar';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async (currentUser: User) => {
      setUser(currentUser);
      try {
        const { data: profile } = await supabase.from('profiles').select('role, full_name').eq('id', currentUser.id).single();
        setRole(profile?.role || 'user');
        setFullName(profile?.full_name || null);
      } catch (e) {
        console.error(e);
        setRole('user');
      }
      setLoading(false);
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadProfile(session.user);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        loadProfile(session.user);
      } else {
        setUser(null);
        setRole(null);
        setFullName(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen text-primary font-bold">جاري التحميل...</div>;
  }

  return (
    <BrowserRouter>
      {user && <Navbar fullName={fullName} role={role} />}
      <div className="max-w-7xl mx-auto p-4">
        <Routes>
          <Route path="/" element={!user ? <Login /> : (role === 'admin' ? <Navigate to="/admin" /> : <Navigate to="/user" />)} />
          <Route path="/admin" element={user && role === 'admin' ? <AdminPanel /> : <Navigate to="/" />} />
          <Route path="/user" element={user && role !== 'admin' ? <UserPanel fullName={fullName} /> : <Navigate to="/" />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
