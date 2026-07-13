import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { Settings2, CheckCircle, Save, Download, AlertTriangle, Trash2 } from 'lucide-react';
import { useConfirmDialog } from '../ConfirmDialog';

const RESET_KEYWORD = 'حذف';

async function authHeader() {
  const { data: { session } } = await supabase.auth.getSession();
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` };
}

export default function AdminSettings() {
  const [delayTolerance, setDelayTolerance] = useState<number>(5);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase.from('settings').select('value').eq('key', 'app').single();
      if (data?.value?.delayTolerance !== undefined) {
        setDelayTolerance(data.value.delayTolerance);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg('');
    try {
      const { error } = await supabase.from('settings').update({ value: { delayTolerance } }).eq('key', 'app');
      if (error) throw error;
      setMsg('تم حفظ الإعدادات بنجاح');
      setTimeout(() => setMsg(''), 4000);
    } catch (err) {
      setMsg('خطأ في الحفظ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5 rounded-[1.5rem]">
        <div className="flex items-center gap-2.5 mb-5 border-b border-gray-200/50 dark:border-gray-800/50 pb-4">
          <div className="p-2 bg-gray-200/50 dark:bg-gray-800/50 rounded-xl text-gray-800 dark:text-gray-200">
            <Settings2 size={20} />
          </div>
          <h3 className="text-base font-extrabold text-gray-900 dark:text-white">إعدادات النظام</h3>
        </div>

        <AnimatePresence>
          {msg && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -10 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -10 }}
              className="mb-5 p-3 bg-green-500/10 border border-green-500/20 text-green-700 dark:text-green-400 rounded-xl flex items-center gap-2 font-bold text-sm"
            >
              <CheckCircle size={18} className="text-green-500" />
              {msg}
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="glass-card p-4 rounded-2xl border border-white/40 dark:border-white/5 bg-gray-50/50 dark:bg-gray-800/20">
            <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-300 ml-1">سماحية التأخير (بالأيام)</label>
            <input
              type="number"
              min="0"
              required
              value={delayTolerance}
              onChange={e => setDelayTolerance(Number(e.target.value))}
              className="glass-input w-full p-3 rounded-xl text-base font-bold"
              dir="ltr"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 font-medium">
              عدد الأيام بعد تاريخ الاستلام لاعتبار الدين متأخراً في حال لم يتم السداد.
            </p>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.95 }}
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white p-3 rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? 'جاري الحفظ...' : (
              <>
                <Save size={18} />
                حفظ الإعدادات
              </>
            )}
          </motion.button>
        </form>
      </motion.div>

      <BackupCard />
      <DangerZoneCard />
    </div>
  );
}

function BackupCard() {
  const [loading, setLoading] = useState(false);
  const { notify } = useConfirmDialog();

  const handleBackup = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('debts').select('*').order('created_at', { ascending: false });
      if (error) throw error;

      const rows = (data || []).map(d => ({
        'اسم الموظف': d.employee_name,
        'قيمة الدين (د.ل.)': d.amount,
        'المستلم': d.recipient,
        'القسم': d.department,
        'بإذن من': d.authorized_by,
        'السبب': d.reason,
        'تاريخ الاستلام': d.receipt_date ? format(new Date(d.receipt_date), 'yyyy-MM-dd HH:mm') : '',
        'الحالة': d.status === 'paid' ? 'تم السداد' : d.status === 'cancelled' ? 'ملغي' : 'قيد الانتظار',
        'تاريخ السداد': d.payment_date ? format(new Date(d.payment_date), 'yyyy-MM-dd HH:mm') : '',
        'تاريخ الإلغاء': d.cancelled_at ? format(new Date(d.cancelled_at), 'yyyy-MM-dd HH:mm') : '',
        'تاريخ التسجيل': d.created_at ? format(new Date(d.created_at), 'yyyy-MM-dd HH:mm') : '',
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      ws['!dir'] = 'rtl';
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'سجل الديون');
      XLSX.writeFile(wb, `نسخة_احتياطية_${format(new Date(), 'yyyy-MM-dd_HHmm')}.xlsx`);
    } catch (err: any) {
      notify({ title: 'فشل النسخ الاحتياطي', message: err.message, variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5 rounded-[1.5rem]">
      <div className="flex items-center gap-2.5 mb-3">
        <div className="p-2 bg-primary/10 rounded-xl text-primary">
          <Download size={18} />
        </div>
        <h3 className="text-sm font-extrabold text-gray-900 dark:text-white">نسخة احتياطية</h3>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
        تنزيل ملف Excel يحتوي على كامل سجل الديون (بما فيها المسددة والملغاة).
      </p>
      <motion.button
        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
        onClick={handleBackup}
        disabled={loading}
        className="w-full bg-gray-800 dark:bg-gray-700 text-white p-3 rounded-xl hover:bg-gray-700 dark:hover:bg-gray-600 transition flex items-center justify-center gap-2 font-bold text-sm shadow-lg disabled:opacity-50"
      >
        <Download size={16} />
        {loading ? 'جاري التجهيز...' : 'تنزيل نسخة احتياطية (Excel)'}
      </motion.button>
    </motion.div>
  );
}

function DangerZoneCard() {
  const { confirm, notify } = useConfirmDialog();
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    const ok = await confirm({
      title: 'إعادة تعيين النظام بالكامل',
      message: 'سيتم حذف جميع سجلات الديون وجميع حسابات الموظفين نهائياً، وإعادة الإعدادات للوضع الافتراضي. تبقى حسابات المدراء فقط. لا يمكن التراجع عن هذا الإجراء.',
      confirmText: 'تأكيد الحذف النهائي',
      variant: 'danger',
    });
    if (!ok) return;

    setLoading(true);
    try {
      const res = await fetch('/api/admin/factory-reset', {
        method: 'POST',
        headers: await authHeader(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشلت إعادة التعيين');

      await notify({ title: 'تمت إعادة التعيين', message: 'تم حذف جميع البيانات بنجاح. سيتم إعادة تحميل الصفحة.' });
      window.location.reload();
    } catch (err: any) {
      notify({ title: 'فشلت العملية', message: err.message, variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5 rounded-[1.5rem] border-2 border-red-500/20">
      <div className="flex items-center gap-2.5 mb-3">
        <div className="p-2 bg-red-500/10 rounded-xl text-red-500">
          <AlertTriangle size={18} />
        </div>
        <h3 className="text-sm font-extrabold text-red-600 dark:text-red-400">منطقة الخطر</h3>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">
        سيؤدي هذا إلى حذف <span className="font-bold text-red-500">جميع</span> سجلات الديون وحسابات الموظفين نهائياً وإعادة النظام لحالته الأولى، عدا حسابات المدراء. لا يمكن التراجع عن هذا الإجراء — يُنصح بأخذ نسخة احتياطية أولاً.
      </p>
      <label className="block text-xs font-bold mb-1.5 text-gray-700 dark:text-gray-300">
        اكتب "{RESET_KEYWORD}" للتأكيد
      </label>
      <input
        type="text"
        value={confirmText}
        onChange={e => setConfirmText(e.target.value)}
        className="glass-input w-full p-3 rounded-xl mb-3 text-sm"
        placeholder={RESET_KEYWORD}
      />
      <motion.button
        whileHover={{ scale: confirmText === RESET_KEYWORD ? 1.02 : 1 }}
        whileTap={{ scale: confirmText === RESET_KEYWORD ? 0.98 : 1 }}
        onClick={handleReset}
        disabled={confirmText !== RESET_KEYWORD || loading}
        className="w-full bg-red-500 text-white p-3 rounded-xl hover:bg-red-600 transition flex items-center justify-center gap-2 font-bold text-sm shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Trash2 size={16} />
        {loading ? 'جاري الحذف...' : 'إعادة تعيين النظام بالكامل'}
      </motion.button>
    </motion.div>
  );
}
