import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { format, differenceInDays } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { PlusCircle, CheckCircle, Save, List, Clock, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import Combobox from './Combobox';
import { useConfirmDialog } from './ConfirmDialog';
import { formatLYD, formatDateTime } from '../lib/format';
import Pagination from './Pagination';

const PAGE_SIZE = 10;

type Debt = {
  id: string;
  amount: number;
  recipient: string;
  department: string;
  reason: string;
  receiptDate: string;
  authorizedBy: string;
  status: 'pending' | 'paid' | 'cancelled';
  paymentDate: string | null;
};

const mapDebt = (row: any): Debt => ({
  id: row.id,
  amount: row.amount,
  recipient: row.recipient,
  department: row.department,
  reason: row.reason,
  receiptDate: row.receipt_date,
  authorizedBy: row.authorized_by,
  status: row.status,
  paymentDate: row.payment_date,
});

export default function UserPanel({ fullName }: { fullName: string | null }) {
  const [tab, setTab] = useState<'new' | 'mine'>('new');
  const [refreshKey, setRefreshKey] = useState(0);

  const tabs = [
    { id: 'new', label: 'تسجيل دين جديد', icon: PlusCircle },
    { id: 'mine', label: 'سجل ديوني', icon: List },
  ];

  return (
    <div className="max-w-3xl mx-auto mt-6 sm:mt-10 px-2 sm:px-0">
      <div className="flex p-1.5 glass-card rounded-[2rem] gap-1 mb-6 w-fit">
        {tabs.map(t => {
          const Icon = t.icon;
          const isActive = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id as 'new' | 'mine')}
              className={`relative px-5 py-2.5 rounded-full font-bold text-sm transition-colors flex items-center gap-2 ${isActive ? 'text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-white/20 dark:hover:bg-black/20'}`}
            >
              {isActive && (
                <motion.div
                  layoutId="userSubTabIndicator"
                  className="absolute inset-0 bg-primary rounded-full shadow-md"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-2">
                <Icon size={16} />
                {t.label}
              </span>
            </button>
          );
        })}
      </div>

      {tab === 'new'
        ? <NewDebtForm fullName={fullName} onSubmitted={() => setRefreshKey(k => k + 1)} />
        : <MyDebtsList refreshKey={refreshKey} />}
    </div>
  );
}

function NewDebtForm({ fullName, onSubmitted }: { fullName: string | null, onSubmitted: () => void }) {
  const { notify } = useConfirmDialog();
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [department, setDepartment] = useState('');
  const [reason, setReason] = useState('');
  const [receiptDate, setReceiptDate] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [authorizedBy, setAuthorizedBy] = useState('');

  const [lists, setLists] = useState({ recipients: [], authorizers: [] });
  const [departments, setDepartments] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    const fetchLists = async () => {
      const [{ data: listsData }, { data: deptData }] = await Promise.all([
        supabase.from('settings').select('value').eq('key', 'lists').single(),
        supabase.from('settings').select('value').eq('key', 'departments').single(),
      ]);
      if (listsData) {
        setLists({
          recipients: listsData.value.recipients || [],
          authorizers: listsData.value.authorizers || []
        });
      }
      setDepartments(deptData?.value || []);
    };
    fetchLists();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in");

      const debtData = {
        user_id: user.id,
        employee_name: fullName,
        amount: Number(amount),
        recipient,
        department,
        reason,
        receipt_date: new Date(receiptDate).toISOString(),
        authorized_by: authorizedBy,
        status: 'pending'
      };

      const { error: insertErr } = await supabase.from('debts').insert(debtData);
      if (insertErr) throw insertErr;

      // Update lists
      const mergedLists = {
        recipients: [...new Set([...lists.recipients, recipient])],
        authorizers: [...new Set([...lists.authorizers, authorizedBy])]
      };
      const { error: listsErr } = await supabase.from('settings').update({ value: mergedLists }).eq('key', 'lists');
      if (listsErr) throw listsErr;

      setLists(mergedLists);
      onSubmitted();

      window.scrollTo({ top: 0, behavior: 'smooth' });
      setSuccessMsg('تم تسجيل الدين بنجاح');
      setAmount('');
      setRecipient('');
      setDepartment('');
      setReason('');
      setAuthorizedBy('');
      setReceiptDate(format(new Date(), "yyyy-MM-dd'T'HH:mm"));

      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      notify({ title: 'حدث خطأ', message: err.message, variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="glass-card rounded-[2.5rem] p-6 sm:p-10 relative overflow-hidden">
        {/* Subtle background glow effect */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -z-10 pointer-events-none"></div>

        <div className="flex items-center gap-3 mb-8 border-b border-gray-200/50 dark:border-gray-800/50 pb-6">
          <div className="p-3 bg-primary/10 rounded-2xl text-primary">
            <PlusCircle size={28} />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white">تسجيل دين جديد</h2>
        </div>

        <AnimatePresence>
          {successMsg && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -20 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -20 }}
              className="mb-8 p-4 bg-green-500/10 border border-green-500/20 text-green-700 dark:text-green-400 rounded-2xl flex items-center gap-3 font-bold"
            >
              <CheckCircle size={24} className="text-green-500" />
              {successMsg}
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="glass-card p-4 sm:p-6 rounded-3xl border border-white/40 dark:border-white/5 bg-gray-50/50 dark:bg-gray-800/20">
            <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-300 ml-1">اسم الموظف</label>
            <input
              type="text"
              value={fullName || ''}
              disabled
              className="glass-input w-full p-4 rounded-2xl text-gray-500 dark:text-gray-400 cursor-not-allowed opacity-70"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-card p-4 sm:p-6 rounded-3xl border border-white/40 dark:border-white/5 bg-gray-50/50 dark:bg-gray-800/20">
              <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-300 ml-1">قيمة الدين (د.ل.)</label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="glass-input w-full p-4 rounded-2xl text-2xl font-bold text-primary"
                dir="ltr"
                placeholder="0.00"
              />
            </div>
            <div className="glass-card p-4 sm:p-6 rounded-3xl border border-white/40 dark:border-white/5 bg-gray-50/50 dark:bg-gray-800/20">
              <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-300 ml-1">تاريخ الاستلام</label>
              <input
                type="datetime-local"
                required
                value={receiptDate}
                onChange={e => setReceiptDate(e.target.value)}
                className="glass-input w-full p-4 rounded-2xl font-bold text-gray-800 dark:text-gray-200"
                dir="ltr"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-card p-4 sm:p-6 rounded-3xl border border-white/40 dark:border-white/5 bg-gray-50/50 dark:bg-gray-800/20">
              <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-300 ml-1">المستلم</label>
              <Combobox
                value={recipient}
                onChange={setRecipient}
                options={lists.recipients}
                placeholder="اختر أو اكتب اسم المستلم"
              />
            </div>

            <div className="glass-card p-4 sm:p-6 rounded-3xl border border-white/40 dark:border-white/5 bg-gray-50/50 dark:bg-gray-800/20">
              <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-300 ml-1">القسم</label>
              <Combobox
                value={department}
                onChange={setDepartment}
                options={departments}
                placeholder="اختر القسم"
                allowCreate={false}
              />
            </div>
          </div>

          <div className="glass-card p-4 sm:p-6 rounded-3xl border border-white/40 dark:border-white/5 bg-gray-50/50 dark:bg-gray-800/20">
            <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-300 ml-1">بإذن من الإستاذ</label>
            <Combobox
              value={authorizedBy}
              onChange={setAuthorizedBy}
              options={lists.authorizers}
              placeholder="اختر أو اكتب الاسم"
            />
          </div>

          <div className="glass-card p-4 sm:p-6 rounded-3xl border border-white/40 dark:border-white/5 bg-gray-50/50 dark:bg-gray-800/20">
            <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-300 ml-1">السبب</label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="glass-input w-full p-4 rounded-2xl resize-none"
              placeholder="سبب استلام الدين..."
            ></textarea>
          </div>

          <div className="pt-6">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.95 }}
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white p-5 rounded-2xl font-bold text-lg shadow-xl shadow-primary/20 hover:shadow-primary/40 transition-all disabled:opacity-50 flex justify-center items-center gap-3"
            >
              {loading ? 'جاري الحفظ...' : (
                <>
                  <Save size={24} />
                  حفظ الدين
                </>
              )}
            </motion.button>
          </div>
        </form>
      </div>
    </motion.div>
  );
}

const STATUS_TABS = [
  { id: 'all', label: 'الكل' },
  { id: 'pending', label: 'قيد الانتظار' },
  { id: 'paid', label: 'تم السداد' },
  { id: 'delayed', label: 'متأخر' },
  { id: 'cancelled', label: 'ملغي' },
] as const;

function MyDebtsList({ refreshKey }: { refreshKey: number }) {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [delayTolerance, setDelayTolerance] = useState(5);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState<typeof STATUS_TABS[number]['id']>('all');

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [{ data: settings }, { data }] = await Promise.all([
        supabase.from('settings').select('value').eq('key', 'app').single(),
        supabase.from('debts').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      ]);

      if (settings?.value?.delayTolerance !== undefined) {
        setDelayTolerance(settings.value.delayTolerance);
      }
      setDebts((data || []).map(mapDebt));
      setLoading(false);
    };
    fetchData();
  }, [refreshKey]);

  useEffect(() => { setPage(1); }, [refreshKey, filterStatus]);

  const isDelayed = (receiptDate: string) => differenceInDays(new Date(), new Date(receiptDate)) > delayTolerance;

  const filteredDebts = debts.filter(d => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'delayed') return d.status === 'pending' && isDelayed(d.receiptDate);
    return d.status === filterStatus;
  });
  const totalPages = Math.max(1, Math.ceil(filteredDebts.length / PAGE_SIZE));
  const pageDebts = filteredDebts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalAmount = filteredDebts.reduce((sum, d) => sum + Number(d.amount || 0), 0);

  if (loading) return (
    <div className="flex justify-center p-10">
      <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent"></div>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex flex-wrap gap-2 mb-4">
        {STATUS_TABS.map(t => {
          const isActive = filterStatus === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setFilterStatus(t.id)}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-colors ${isActive ? 'bg-primary text-white shadow-md shadow-primary/20' : 'glass-card text-gray-600 dark:text-gray-300 hover:bg-white/30 dark:hover:bg-black/20'}`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="glass-card rounded-[2rem] overflow-hidden">
      {debts.length === 0 ? (
        <div className="py-16 text-center text-gray-400">
          <List size={48} className="mx-auto mb-4 opacity-20" />
          <p className="font-medium">لم تسجل أي ديون بعد</p>
        </div>
      ) : filteredDebts.length === 0 ? (
        <div className="py-16 text-center text-gray-400">
          <List size={48} className="mx-auto mb-4 opacity-20" />
          <p className="font-medium">لا توجد ديون مطابقة لهذا الفلتر</p>
        </div>
      ) : (
        <div className="overflow-x-auto hide-scrollbar">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200/50 dark:border-gray-800/50 text-gray-500 dark:text-gray-400 text-xs">
                <th className="text-right font-bold p-4">المستلم</th>
                <th className="text-right font-bold p-4">القسم</th>
                <th className="text-right font-bold p-4">المبلغ (د.ل.)</th>
                <th className="text-right font-bold p-4">تاريخ الاستلام</th>
                <th className="text-right font-bold p-4">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {pageDebts.map(debt => {
                const delayed = debt.status === 'pending' && isDelayed(debt.receiptDate);
                const statusConfig = debt.status === 'paid'
                  ? { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-500/10', label: 'تم السداد' }
                  : debt.status === 'cancelled'
                    ? { icon: XCircle, color: 'text-gray-500', bg: 'bg-gray-500/10', label: 'ملغي' }
                    : delayed
                      ? { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-500/10', label: 'متأخر' }
                      : { icon: Clock, color: 'text-yellow-500', bg: 'bg-yellow-500/10', label: 'قيد الانتظار' };
                const StatusIcon = statusConfig.icon;
                return (
                  <tr key={debt.id} className="border-b border-gray-100/50 dark:border-gray-800/30 hover:bg-white/30 dark:hover:bg-white/5">
                    <td className="p-4 font-bold text-gray-800 dark:text-gray-200">{debt.recipient}</td>
                    <td className="p-4 text-gray-600 dark:text-gray-400">{debt.department}</td>
                    <td className="p-4 font-black text-primary whitespace-nowrap" dir="rtl">{formatLYD(debt.amount)}</td>
                    <td className="p-4 text-gray-600 dark:text-gray-400 whitespace-nowrap" dir="ltr">{formatDateTime(debt.receiptDate)}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${statusConfig.bg} ${statusConfig.color}`}>
                        <StatusIcon size={12} />
                        {statusConfig.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-200/70 dark:border-gray-800/70 font-bold">
                <td className="p-4 text-gray-700 dark:text-gray-300" colSpan={2}>الإجمالي</td>
                <td className="p-4 text-primary font-black whitespace-nowrap" dir="rtl">{formatLYD(totalAmount)}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
      </div>
      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </motion.div>
  );
}
