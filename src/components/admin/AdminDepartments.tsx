import { useState, useEffect, type FormEvent } from 'react';
import { supabase } from '../../supabase';
import { motion, AnimatePresence } from 'motion/react';
import { Building2, Plus, Trash2 } from 'lucide-react';
import { useConfirmDialog } from '../ConfirmDialog';

export default function AdminDepartments() {
  const { confirm, notify } = useConfirmDialog();
  const [departments, setDepartments] = useState<string[]>([]);
  const [newDept, setNewDept] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchDepartments = async () => {
      const { data } = await supabase.from('settings').select('value').eq('key', 'departments').single();
      setDepartments(data?.value || []);
      setLoading(false);
    };
    fetchDepartments();
  }, []);

  const saveDepartments = async (next: string[]) => {
    setSaving(true);
    try {
      const { error } = await supabase.from('settings').update({ value: next }).eq('key', 'departments');
      if (error) throw error;
      setDepartments(next);
    } catch (err: any) {
      notify({ title: 'خطأ', message: err.message, variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    const name = newDept.trim();
    if (!name) return;
    if (departments.some(d => d.toLowerCase() === name.toLowerCase())) {
      notify({ message: 'هذا القسم موجود بالفعل', variant: 'error' });
      return;
    }
    await saveDepartments([...departments, name]);
    setNewDept('');
  };

  const handleDelete = async (name: string) => {
    const ok = await confirm({
      title: 'حذف القسم',
      message: `هل أنت متأكد من حذف قسم "${name}"؟ لن يؤثر هذا على السجلات السابقة.`,
      confirmText: 'حذف',
      variant: 'danger',
    });
    if (!ok) return;
    await saveDepartments(departments.filter(d => d !== name));
  };

  if (loading) return (
    <div className="flex justify-center p-10">
      <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent"></div>
    </div>
  );

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5 rounded-[1.5rem]">
        <div className="flex items-center gap-2.5 mb-5 border-b border-gray-200/50 dark:border-gray-800/50 pb-4">
          <div className="p-2 bg-primary/10 rounded-xl text-primary">
            <Building2 size={20} />
          </div>
          <h3 className="text-base font-extrabold text-gray-900 dark:text-white">إدارة الأقسام</h3>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          الأقسام المضافة هنا تظهر للموظفين كقائمة اختيار عند تسجيل دين جديد، ولا يمكنهم إضافة أقسام جديدة بأنفسهم.
        </p>

        <form onSubmit={handleAdd} className="flex gap-2 mb-5">
          <input
            type="text"
            value={newDept}
            onChange={e => setNewDept(e.target.value)}
            placeholder="اسم القسم الجديد"
            className="glass-input flex-1 p-3.5 rounded-2xl"
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="submit"
            disabled={saving || !newDept.trim()}
            className="bg-primary text-white px-5 py-3.5 rounded-2xl font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
          >
            <Plus size={18} />
            إضافة
          </motion.button>
        </form>

        {departments.length === 0 ? (
          <div className="py-10 text-center text-gray-400">
            <Building2 size={40} className="mx-auto mb-3 opacity-20" />
            <p className="font-medium text-sm">لا توجد أقسام مضافة بعد</p>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {departments.map(dept => (
                <motion.div
                  key={dept}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-gray-50/50 dark:bg-gray-800/20 border border-white/40 dark:border-white/5"
                >
                  <span className="font-bold text-gray-800 dark:text-gray-200">{dept}</span>
                  <button
                    onClick={() => handleDelete(dept)}
                    title="حذف"
                    className="text-red-500 bg-red-500/10 p-2 rounded-xl hover:bg-red-500/20 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    </div>
  );
}
