import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { motion, AnimatePresence } from 'motion/react';
import { UserPlus, KeyRound, CheckCircle, AlertCircle, Users, ChevronDown, Pause, Play, Trash2, Clock } from 'lucide-react';
import SelectField from '../SelectField';
import { useConfirmDialog } from '../ConfirmDialog';
import { formatDateTime } from '../../lib/format';

type Profile = {
  id: string;
  username: string;
  custom_id: string;
  full_name: string;
  role: 'user' | 'admin';
  status: 'active' | 'paused';
  created_at: string;
};

async function authHeader() {
  const { data: { session } } = await supabase.auth.getSession();
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` };
}

export default function AdminUsers() {
  const [subTab, setSubTab] = useState<'create' | 'list'>('create');

  const tabs = [
    { id: 'create', label: 'إنشاء حساب', icon: UserPlus },
    { id: 'list', label: 'الحسابات', icon: Users },
  ];

  return (
    <div>
      <div className="flex p-1.5 glass-card rounded-[2rem] gap-1 mb-6 w-fit">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = subTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSubTab(tab.id as 'create' | 'list')}
              className={`relative px-5 py-2.5 rounded-full font-bold text-sm transition-colors flex items-center gap-2 ${isActive ? 'text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-white/20 dark:hover:bg-black/20'}`}
            >
              {isActive && (
                <motion.div
                  layoutId="usersSubTabIndicator"
                  className="absolute inset-0 bg-primary rounded-full shadow-md"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-2">
                <Icon size={16} />
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>

      {subTab === 'create' ? <CreateUserForm /> : <UsersList />}
    </div>
  );
}

async function nextCustomId() {
  const { count } = await supabase.from('profiles').select('id', { count: 'exact', head: true });
  return String((count || 0) + 1);
}

function CreateUserForm() {
  const [username, setUsername] = useState('');
  const [customId, setCustomId] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });

  useEffect(() => {
    nextCustomId().then(setCustomId);
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg({ text: '', type: '' });

    if (!/^[a-zA-Z0-9_-]{3,30}$/.test(username)) {
      setMsg({ text: 'اسم المستخدم يجب أن يكون 3-30 حرف وأرقام ورموز (- , _) فقط بدون مسافات', type: 'error' });
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: await authHeader(),
        body: JSON.stringify({ username, customId, fullName, password, role })
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'فشل في إنشاء الحساب');

      setMsg({ text: 'تم إنشاء الحساب بنجاح', type: 'success' });
      setUsername('');
      setCustomId(await nextCustomId());
      setFullName('');
      setPassword('');
      setRole('user');
      setTimeout(() => setMsg({ text: '', type: '' }), 4000);
    } catch (err: any) {
      setMsg({ text: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 sm:p-8 rounded-[2rem] max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
          <UserPlus size={24} />
        </div>
        <h3 className="text-xl font-bold">إنشاء حساب جديد</h3>
      </div>

      <AnimatePresence>
        {msg.text && (
          <motion.div
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className={`mb-6 p-4 rounded-2xl flex items-center gap-3 font-bold border ${msg.type === 'success' ? 'bg-green-500/10 text-green-600 border-green-500/20' : 'bg-red-500/10 text-red-600 border-red-500/20'}`}
          >
            {msg.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
            {msg.text}
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleCreateUser} className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-300 ml-1">اسم المستخدم</label>
            <input type="text" required value={username} onChange={e => setUsername(e.target.value)} className="glass-input w-full p-3.5 rounded-2xl" dir="ltr" placeholder="john_doe" />
            <p className="text-xs text-gray-500 mt-2 ml-1">بدون مسافات، حروف وأرقام فقط</p>
          </div>
          <div>
            <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-300 ml-1">المعرف (ID)</label>
            <input type="text" required value={customId} onChange={e => setCustomId(e.target.value)} className="glass-input w-full p-3.5 rounded-2xl font-mono text-primary font-bold" dir="ltr" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-300 ml-1">الاسم الكامل</label>
          <input type="text" required value={fullName} onChange={e => setFullName(e.target.value)} className="glass-input w-full p-3.5 rounded-2xl" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-300 ml-1">كلمة المرور</label>
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="glass-input w-full p-3.5 rounded-2xl" dir="ltr" />
          </div>
          <div>
            <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-300 ml-1">الصلاحيات</label>
            <SelectField value={role} onChange={setRole}>
              <option value="user">موظف (إدخال ديون)</option>
              <option value="admin">مدير (إدارة كاملة)</option>
            </SelectField>
          </div>
        </div>
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }} type="submit" disabled={loading} className="w-full bg-primary text-white p-4 rounded-2xl font-bold shadow-lg shadow-primary/20 mt-2">
          {loading ? 'جاري الإنشاء...' : 'إنشاء الحساب'}
        </motion.button>
      </form>
    </motion.div>
  );
}

function UsersList() {
  const { confirm } = useConfirmDialog();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMsg, setResetMsg] = useState<{ id: string, text: string, type: string } | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<{ id: string, text: string } | null>(null);

  const fetchUsers = async () => {
    const { data } = await supabase.from('profiles').select('*').order('username', { ascending: true });
    setUsers(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
    supabase.auth.getUser().then(({ data: { user } }) => setCurrentUserId(user?.id || null));
  }, []);

  const openReset = (id: string) => {
    setEditingId(id);
    setNewPassword('');
    setResetMsg(null);
  };

  const handleToggleStatus = async (user: Profile) => {
    const nextStatus = user.status === 'active' ? 'paused' : 'active';
    setActionLoadingId(user.id);
    setActionError(null);
    try {
      const res = await fetch('/api/admin/toggle-user-status', {
        method: 'POST',
        headers: await authHeader(),
        body: JSON.stringify({ uid: user.id, status: nextStatus })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل تغيير الحالة');
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: nextStatus } : u));
    } catch (err: any) {
      setActionError({ id: user.id, text: err.message });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (user: Profile) => {
    const ok = await confirm({
      title: 'حذف الحساب',
      message: `هل أنت متأكد من حذف حساب "${user.full_name}"؟ لا يمكن التراجع عن هذا الإجراء.`,
      confirmText: 'حذف',
      variant: 'danger',
    });
    if (!ok) return;
    setActionLoadingId(user.id);
    setActionError(null);
    try {
      const res = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: await authHeader(),
        body: JSON.stringify({ uid: user.id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل حذف الحساب');
      setUsers(prev => prev.filter(u => u.id !== user.id));
    } catch (err: any) {
      setActionError({ id: user.id, text: err.message });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleResetPassword = async (e: React.FormEvent, user: Profile) => {
    e.preventDefault();
    setResetLoading(true);
    setResetMsg(null);

    try {
      const res = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: await authHeader(),
        body: JSON.stringify({ identifier: user.username, newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل التعيين');

      setResetMsg({ id: user.id, text: 'تم تغيير كلمة المرور بنجاح', type: 'success' });
      setNewPassword('');
      setTimeout(() => { setEditingId(null); setResetMsg(null); }, 2000);
    } catch (err: any) {
      setResetMsg({ id: user.id, text: err.message, type: 'error' });
    } finally {
      setResetLoading(false);
    }
  };

  if (loading) return (
    <div className="flex justify-center p-10">
      <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent"></div>
    </div>
  );

  return (
    <div className="space-y-3">
      {users.map(user => (
        <motion.div key={user.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card rounded-3xl overflow-hidden">
          <div className={`p-4 sm:p-5 flex flex-wrap items-center gap-3 ${user.status === 'paused' ? 'opacity-50' : ''}`}>
            <div className="flex-1 min-w-[160px]">
              <div className="font-extrabold text-gray-900 dark:text-white">{user.full_name}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 font-mono" dir="ltr">@{user.username} · #{user.custom_id}</div>
              <div className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1 mt-0.5" dir="ltr">
                <Clock size={11} />
                {formatDateTime(user.created_at)}
              </div>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${user.role === 'admin' ? 'bg-primary/10 text-primary' : 'bg-gray-200/50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300'}`}>
              {user.role === 'admin' ? 'مدير' : 'موظف'}
            </span>
            {user.status === 'paused' && (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">
                متوقف
              </span>
            )}
            <motion.button
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={() => editingId === user.id ? setEditingId(null) : openReset(user.id)}
              className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300 bg-white/40 dark:bg-white/5 px-4 py-2 rounded-xl hover:bg-white/70 dark:hover:bg-white/10"
            >
              <KeyRound size={16} />
              <span className="hidden sm:inline">إعادة تعيين كلمة المرور</span>
              <ChevronDown size={14} className={`transition-transform ${editingId === user.id ? 'rotate-180' : ''}`} />
            </motion.button>
            {user.id !== currentUserId && (
              <>
                <motion.button
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  disabled={actionLoadingId === user.id}
                  onClick={() => handleToggleStatus(user)}
                  title={user.status === 'active' ? 'إيقاف الحساب' : 'تفعيل الحساب'}
                  className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300 bg-white/40 dark:bg-white/5 px-3 py-2 rounded-xl hover:bg-white/70 dark:hover:bg-white/10 disabled:opacity-50"
                >
                  {user.status === 'active' ? <Pause size={16} /> : <Play size={16} />}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  disabled={actionLoadingId === user.id}
                  onClick={() => handleDelete(user)}
                  title="حذف الحساب"
                  className="flex items-center gap-2 text-sm font-bold text-red-500 bg-red-500/10 px-3 py-2 rounded-xl hover:bg-red-500/20 disabled:opacity-50"
                >
                  <Trash2 size={16} />
                </motion.button>
              </>
            )}
          </div>

          {actionError?.id === user.id && (
            <div className="mx-4 sm:mx-5 mb-4 p-3 rounded-xl flex items-center gap-2 text-sm font-bold bg-red-500/10 text-red-600">
              <AlertCircle size={16} />
              {actionError.text}
            </div>
          )}

          <AnimatePresence>
            {editingId === user.id && (
              <motion.div
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                className="border-t border-white/40 dark:border-white/5 p-4 sm:p-5 bg-white/20 dark:bg-black/10"
              >
                {resetMsg?.id === user.id && (
                  <div className={`mb-3 p-3 rounded-xl flex items-center gap-2 text-sm font-bold ${resetMsg.type === 'success' ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'}`}>
                    {resetMsg.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                    {resetMsg.text}
                  </div>
                )}
                <form onSubmit={(e) => handleResetPassword(e, user)} className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="password" required autoFocus
                    value={newPassword} onChange={e => setNewPassword(e.target.value)}
                    placeholder="كلمة المرور الجديدة"
                    className="glass-input flex-1 p-3 rounded-xl" dir="ltr"
                  />
                  <button type="submit" disabled={resetLoading} className="bg-gray-800 dark:bg-gray-700 text-white px-5 py-3 rounded-xl font-bold disabled:opacity-50">
                    {resetLoading ? '...' : 'تغيير'}
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      ))}

      {users.length === 0 && (
        <div className="py-16 text-center text-gray-400">
          <Users size={48} className="mx-auto mb-4 opacity-20" />
          <p className="font-medium">لا يوجد حسابات</p>
        </div>
      )}
    </div>
  );
}
