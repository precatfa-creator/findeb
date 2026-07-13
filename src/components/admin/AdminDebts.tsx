import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { differenceInDays, format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, Clock, Search, Filter, ChevronDown, List, LayoutGrid, Sigma, XCircle, X, Pencil, CalendarDays } from 'lucide-react';
import SelectField from '../SelectField';
import { useConfirmDialog } from '../ConfirmDialog';
import { formatLYD, formatDateTime } from '../../lib/format';
import Pagination from '../Pagination';

const PAGE_SIZE = 12;

type Debt = {
  id: string;
  employeeName: string;
  amount: number;
  recipient: string;
  department: string;
  reason: string;
  receiptDate: string;
  authorizedBy: string;
  status: 'pending' | 'paid' | 'cancelled';
  paymentDate: string | null;
  cancelledAt: string | null;
};

const mapDebt = (row: any): Debt => ({
  id: row.id,
  employeeName: row.employee_name,
  amount: row.amount,
  recipient: row.recipient,
  department: row.department,
  reason: row.reason,
  receiptDate: row.receipt_date,
  authorizedBy: row.authorized_by,
  status: row.status,
  paymentDate: row.payment_date,
  cancelledAt: row.cancelled_at,
});

function statusConfigFor(debt: Debt, delayed: boolean) {
  if (debt.status === 'paid') return { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-500/10', label: 'تم السداد' };
  if (debt.status === 'cancelled') return { icon: XCircle, color: 'text-gray-500', bg: 'bg-gray-500/10', label: 'ملغي' };
  if (delayed) return { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-500/10', label: 'متأخر' };
  return { icon: Clock, color: 'text-yellow-500', bg: 'bg-yellow-500/10', label: 'قيد الانتظار' };
}

type Actions = { onStatusChange: (debt: Debt, status: Debt['status']) => void, onEditDate: (debt: Debt) => void };

export default function AdminDebts() {
  const { confirm, notify } = useConfirmDialog();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [delayTolerance, setDelayTolerance] = useState(5);
  const [loading, setLoading] = useState(true);

  const [viewMode, setViewMode] = useState<'list' | 'cards' | 'cumulative'>('list');
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Filters
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterEmployee, setFilterEmployee] = useState('');
  const [filterRecipient, setFilterRecipient] = useState('');
  const [filterYear, setFilterYear] = useState('all');
  const [filterMonth, setFilterMonth] = useState('all');
  const [cumulativeStatus, setCumulativeStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);

  useEffect(() => {
    setPage(1);
  }, [viewMode, filterStatus, filterEmployee, filterRecipient, filterYear, filterMonth, cumulativeStatus]);

  const fetchDebts = async () => {
    const { data } = await supabase.from('debts').select('*').order('created_at', { ascending: false });
    setDebts((data || []).map(mapDebt));
    setLoading(false);
  };

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase.from('settings').select('value').eq('key', 'app').single();
      if (data?.value?.delayTolerance !== undefined) {
        setDelayTolerance(data.value.delayTolerance);
      }
    };
    fetchSettings();
    fetchDebts();

    const channel = supabase
      .channel('debts-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'debts' }, () => fetchDebts())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleStatusChange = async (debt: Debt, newStatus: Debt['status']) => {
    if (newStatus === debt.status) return;
    const messages: Record<Debt['status'], string> = {
      paid: 'هل أنت متأكد من تغيير الحالة إلى تم السداد؟',
      pending: 'هل أنت متأكد من إرجاع الحالة إلى قيد الانتظار؟',
      cancelled: 'سيتم إلغاء هذا القيد مع الاحتفاظ به للمراجعة. هل تريد المتابعة؟',
    };
    const ok = await confirm({
      title: newStatus === 'cancelled' ? 'إلغاء القيد' : undefined,
      message: messages[newStatus],
      confirmText: newStatus === 'paid' ? 'تأكيد السداد' : newStatus === 'cancelled' ? 'إلغاء القيد' : 'تأكيد',
      variant: newStatus === 'cancelled' ? 'danger' : 'default',
    });
    if (!ok) return;
    try {
      const { error } = await supabase.from('debts').update({
        status: newStatus,
        payment_date: newStatus === 'paid' ? new Date().toISOString() : null,
        cancelled_at: newStatus === 'cancelled' ? new Date().toISOString() : null,
      }).eq('id', debt.id);
      if (error) throw error;
    } catch (err) {
      notify({ message: 'خطأ في التحديث', variant: 'error' });
    }
  };

  const handleSaveDate = async (id: string, iso: string) => {
    try {
      const { error } = await supabase.from('debts').update({ receipt_date: iso }).eq('id', id);
      if (error) throw error;
      setEditingDebt(null);
    } catch (err) {
      notify({ message: 'خطأ في تحديث التاريخ', variant: 'error' });
    }
  };

  const isDelayed = (receiptDate: string) => {
    if (!receiptDate) return false;
    const diff = differenceInDays(new Date(), new Date(receiptDate));
    return diff > delayTolerance;
  };

  const availableYears: number[] = [...new Set<number>(
    debts.filter(d => d.receiptDate).map(d => new Date(d.receiptDate).getFullYear())
  )].sort((a: number, b: number) => b - a);

  const MONTHS = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
  ];

  const textFiltered = debts.filter(d => {
    if (filterEmployee && !d.employeeName?.includes(filterEmployee)) return false;
    if (filterRecipient && !d.recipient?.includes(filterRecipient)) return false;
    if (filterYear !== 'all' || filterMonth !== 'all') {
      if (!d.receiptDate) return false;
      const date = new Date(d.receiptDate);
      if (filterYear !== 'all' && date.getFullYear() !== Number(filterYear)) return false;
      if (filterMonth !== 'all' && date.getMonth() !== Number(filterMonth)) return false;
    }
    return true;
  });

  const applyStatusFilter = (list: Debt[], status: string) => list.filter(d => {
    if (status === 'delayed') return d.status === 'pending' && isDelayed(d.receiptDate);
    if (status !== 'all' && d.status !== status) return false;
    return true;
  });

  const filteredDebts = applyStatusFilter(textFiltered, filterStatus);

  const cumulativeRows = (() => {
    const base = applyStatusFilter(textFiltered, cumulativeStatus);
    const totals = new Map<string, number>();
    base.forEach(d => totals.set(d.employeeName, (totals.get(d.employeeName) || 0) + Number(d.amount || 0)));
    return Array.from(totals.entries())
      .map(([employeeName, total]) => ({ employeeName, total }))
      .sort((a, b) => b.total - a.total);
  })();

  const currentDataset = viewMode === 'cumulative' ? cumulativeRows : filteredDebts;
  const totalPages = Math.max(1, Math.ceil(currentDataset.length / PAGE_SIZE));
  const pageDebts = filteredDebts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const pageCumulativeRows = cumulativeRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const filteredTotal = filteredDebts.reduce((sum, d) => sum + Number(d.amount || 0), 0);

  const applyEmployeeFilter = (name: string) => {
    setFilterEmployee(name);
    setFiltersOpen(true);
  };
  const applyStatusClick = (status: string) => {
    setFilterStatus(status);
    setFiltersOpen(true);
  };
  const hasActiveFilters = !!filterEmployee || !!filterRecipient || filterStatus !== 'all' || filterYear !== 'all' || filterMonth !== 'all' || cumulativeStatus !== 'all';
  const clearFilters = () => {
    setFilterEmployee('');
    setFilterRecipient('');
    setFilterStatus('all');
    setFilterYear('all');
    setFilterMonth('all');
    setCumulativeStatus('all');
  };

  if (loading) return (
    <div className="flex justify-center p-10">
      <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent"></div>
    </div>
  );

  const viewOptions = [
    { id: 'list', label: 'قائمة', icon: List },
    { id: 'cards', label: 'بطاقات', icon: LayoutGrid },
    { id: 'cumulative', label: 'تراكمي', icon: Sigma },
  ] as const;

  const actions: Actions = { onStatusChange: handleStatusChange, onEditDate: setEditingDebt };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="glass-card rounded-[2rem] overflow-hidden">
        <div className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFiltersOpen(o => !o)}
              className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300"
            >
              <Filter size={16} />
              الفلاتر
              <ChevronDown size={14} className={`transition-transform ${filtersOpen ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {hasActiveFilters && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                  onClick={clearFilters}
                  title="مسح الفلاتر"
                  className="p-1.5 rounded-full bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
                >
                  <X size={14} />
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          <div className="flex p-1 glass-card rounded-full gap-1">
            {viewOptions.map(opt => {
              const Icon = opt.icon;
              const isActive = viewMode === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => setViewMode(opt.id)}
                  className={`relative px-3 sm:px-4 py-2 rounded-full font-bold text-xs sm:text-sm transition-colors flex items-center gap-1.5 ${isActive ? 'text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-white/20 dark:hover:bg-black/20'}`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="debtsViewIndicator"
                      className="absolute inset-0 bg-primary rounded-full shadow-md"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-1.5">
                    <Icon size={14} />
                    <span className="hidden sm:inline">{opt.label}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <AnimatePresence>
          {filtersOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="border-t border-white/40 dark:border-white/5"
            >
              <div className="p-4 sm:p-5 flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="بحث باسم الموظف..."
                    value={filterEmployee}
                    onChange={e => setFilterEmployee(e.target.value)}
                    className="glass-input w-full p-3.5 pr-12 rounded-2xl"
                  />
                </div>
                <div className="relative flex-1">
                  <Search size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="بحث باسم المستلم..."
                    value={filterRecipient}
                    onChange={e => setFilterRecipient(e.target.value)}
                    className="glass-input w-full p-3.5 pr-12 rounded-2xl"
                  />
                </div>
                {viewMode !== 'cumulative' && (
                  <SelectField value={filterStatus} onChange={setFilterStatus} icon={Filter} className="md:max-w-xs flex-1">
                    <option value="all">جميع الحالات</option>
                    <option value="pending">قيد الانتظار</option>
                    <option value="paid">تم السداد</option>
                    <option value="delayed">متأخرة</option>
                    <option value="cancelled">ملغاة</option>
                  </SelectField>
                )}
              </div>
              <div className="px-4 sm:px-5 pb-4 sm:pb-5 flex flex-col md:flex-row gap-4">
                <SelectField value={filterYear} onChange={setFilterYear} icon={CalendarDays} className="md:max-w-xs flex-1">
                  <option value="all">كل السنوات</option>
                  {availableYears.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </SelectField>
                <SelectField value={filterMonth} onChange={setFilterMonth} icon={CalendarDays} className="md:max-w-xs flex-1">
                  <option value="all">كل الأشهر</option>
                  {MONTHS.map((m, i) => (
                    <option key={m} value={i}>{m}</option>
                  ))}
                </SelectField>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {viewMode === 'cumulative' && (
        <div className="glass-card p-4 sm:p-5 rounded-[2rem] flex items-center gap-4">
          <SelectField value={cumulativeStatus} onChange={setCumulativeStatus} icon={Filter} className="max-w-xs">
            <option value="all">جميع الحالات</option>
            <option value="pending">قيد الانتظار</option>
            <option value="paid">تم السداد</option>
            <option value="delayed">متأخرة</option>
            <option value="cancelled">ملغاة</option>
          </SelectField>
        </div>
      )}

      {viewMode === 'list' && (
        <ListView
          debts={pageDebts}
          isDelayed={isDelayed}
          totalAmount={filteredTotal}
          onEmployeeClick={applyEmployeeFilter}
          onStatusClick={applyStatusClick}
          {...actions}
        />
      )}
      {viewMode === 'cards' && <CardsView debts={pageDebts} isDelayed={isDelayed} {...actions} />}
      {viewMode === 'cumulative' && <CumulativeView rows={pageCumulativeRows} />}

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />

      <AnimatePresence>
        {editingDebt && (
          <EditDateModal debt={editingDebt} onClose={() => setEditingDebt(null)} onSave={handleSaveDate} />
        )}
      </AnimatePresence>
    </div>
  );
}

function ActionCell({ debt, onStatusChange, onEditDate }: { debt: Debt } & Actions) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <select
        value={debt.status}
        onChange={e => onStatusChange(debt, e.target.value as Debt['status'])}
        className="glass-input text-xs font-bold rounded-xl px-2 py-1.5 cursor-pointer"
      >
        <option value="pending">قيد الانتظار</option>
        <option value="paid">تم السداد</option>
        <option value="cancelled">ملغي</option>
      </select>
      {debt.status === 'paid' && (
        <div className="text-xs text-green-600 dark:text-green-400 font-bold whitespace-nowrap" dir="ltr">
          {formatDateTime(debt.paymentDate)}
        </div>
      )}
      {debt.status === 'cancelled' && (
        <div className="text-xs text-gray-500 font-bold whitespace-nowrap" dir="ltr">
          {formatDateTime(debt.cancelledAt)}
        </div>
      )}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => onEditDate(debt)}
        title="تعديل تاريخ الاستلام"
        className="text-gray-400 hover:text-primary bg-gray-500/10 hover:bg-primary/10 p-1.5 rounded-xl transition-colors"
      >
        <Pencil size={14} />
      </motion.button>
    </div>
  );
}

function EditDateModal({ debt, onClose, onSave }: {
  debt: Debt;
  onClose: () => void;
  onSave: (id: string, iso: string) => Promise<void>;
}) {
  const [value, setValue] = useState(format(new Date(debt.receiptDate), "yyyy-MM-dd'T'HH:mm"));
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave(debt.id, new Date(value).toISOString());
    setSaving(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 10 }}
        transition={{ type: 'spring', bounce: 0.3, duration: 0.4 }}
        onClick={e => e.stopPropagation()}
        className="glass-card w-full max-w-sm rounded-[2rem] p-6 sm:p-8 bg-white/90 dark:bg-gray-900/90"
      >
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 bg-primary/10 text-primary">
          <Pencil size={24} />
        </div>
        <h3 className="text-lg font-extrabold text-gray-900 dark:text-white mb-2">تعديل تاريخ الاستلام</h3>
        <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-4">{debt.employeeName} — {debt.recipient}</p>
        <input
          type="datetime-local"
          value={value}
          onChange={e => setValue(e.target.value)}
          className="glass-input w-full p-4 rounded-2xl font-bold text-gray-800 dark:text-gray-200"
          dir="ltr"
        />
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl font-bold text-sm bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
          >
            إلغاء
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-3 rounded-2xl font-bold text-sm text-white bg-primary hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saving ? 'جاري الحفظ...' : 'حفظ'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ListView({
  debts, isDelayed, totalAmount, onEmployeeClick, onStatusClick, onStatusChange, onEditDate,
}: {
  debts: Debt[], isDelayed: (d: string) => boolean, totalAmount: number,
  onEmployeeClick: (name: string) => void, onStatusClick: (status: string) => void,
} & Actions) {
  return (
    <div className="glass-card rounded-[2rem] overflow-hidden">
      {debts.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="overflow-x-auto hide-scrollbar">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200/50 dark:border-gray-800/50 text-gray-500 dark:text-gray-400 text-xs">
                <th className="text-right font-bold p-4">الموظف</th>
                <th className="text-right font-bold p-4">المستلم</th>
                <th className="text-right font-bold p-4">القسم</th>
                <th className="text-right font-bold p-4">بإذن من</th>
                <th className="text-right font-bold p-4">المبلغ (د.ل.)</th>
                <th className="text-right font-bold p-4">تاريخ الاستلام</th>
                <th className="text-right font-bold p-4">الحالة</th>
                <th className="text-right font-bold p-4">إجراء</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {debts.map(debt => {
                  const delayed = debt.status === 'pending' && isDelayed(debt.receiptDate);
                  const statusConfig = statusConfigFor(debt, delayed);
                  const StatusIcon = statusConfig.icon;
                  const statusFilterValue = debt.status === 'paid' ? 'paid' : debt.status === 'cancelled' ? 'cancelled' : delayed ? 'delayed' : 'pending';

                  return (
                    <motion.tr
                      key={debt.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className={`border-b border-gray-100/50 dark:border-gray-800/30 hover:bg-white/30 dark:hover:bg-white/5 ${delayed ? 'bg-red-500/5' : ''} ${debt.status === 'cancelled' ? 'opacity-50' : ''}`}
                    >
                      <td className="p-4 font-bold text-gray-900 dark:text-white">
                        <button
                          onClick={() => onEmployeeClick(debt.employeeName)}
                          title="فلترة حسب هذا الموظف"
                          className="hover:text-primary hover:underline transition-colors text-right"
                        >
                          {debt.employeeName}
                        </button>
                      </td>
                      <td className="p-4 text-gray-700 dark:text-gray-300">{debt.recipient}</td>
                      <td className="p-4 text-gray-600 dark:text-gray-400">{debt.department}</td>
                      <td className="p-4 text-gray-600 dark:text-gray-400">{debt.authorizedBy}</td>
                      <td className="p-4 font-black text-primary whitespace-nowrap" dir="rtl">{formatLYD(debt.amount)}</td>
                      <td className="p-4 text-gray-600 dark:text-gray-400 whitespace-nowrap" dir="ltr">
                        {formatDateTime(debt.receiptDate)}
                      </td>
                      <td className="p-4">
                        <button
                          onClick={() => onStatusClick(statusFilterValue)}
                          title="فلترة حسب هذه الحالة"
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap hover:ring-2 hover:ring-offset-1 transition-all ${statusConfig.bg} ${statusConfig.color}`}
                        >
                          <StatusIcon size={12} />
                          {statusConfig.label}
                        </button>
                      </td>
                      <td className="p-4">
                        <ActionCell debt={debt} onStatusChange={onStatusChange} onEditDate={onEditDate} />
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-200/70 dark:border-gray-800/70 font-bold">
                <td className="p-4 text-gray-700 dark:text-gray-300" colSpan={4}>الإجمالي</td>
                <td className="p-4 text-primary font-black whitespace-nowrap" dir="rtl">{formatLYD(totalAmount)}</td>
                <td colSpan={3}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

function CardsView({ debts, isDelayed, onStatusChange, onEditDate }: { debts: Debt[], isDelayed: (d: string) => boolean } & Actions) {
  if (debts.length === 0) return <div className="glass-card rounded-[2rem] overflow-hidden"><EmptyState /></div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <AnimatePresence>
        {debts.map((debt, index) => {
          const delayed = debt.status === 'pending' && isDelayed(debt.receiptDate);
          const statusConfig = statusConfigFor(debt, delayed);
          const StatusIcon = statusConfig.icon;

          return (
            <motion.div
              key={debt.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ delay: index * 0.03 }}
              className={`glass-card p-5 sm:p-6 rounded-[2rem] border-2 transition-colors ${delayed ? 'border-red-500/30 dark:border-red-500/20 shadow-red-500/10' : 'border-transparent'} ${debt.status === 'cancelled' ? 'opacity-50' : ''}`}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="font-extrabold text-lg text-gray-900 dark:text-white mb-1">{debt.employeeName}</h4>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${statusConfig.bg} ${statusConfig.color}`}>
                    <StatusIcon size={14} />
                    {statusConfig.label}
                  </span>
                </div>
                <div className="text-left">
                  <div className="text-2xl font-black text-primary font-sans tracking-tight" dir="rtl">{formatLYD(debt.amount)}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 font-medium" dir="ltr">
                    {formatDateTime(debt.receiptDate)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm mb-4 bg-white/30 dark:bg-black/20 p-4 rounded-2xl">
                <div>
                  <div className="text-gray-500 dark:text-gray-400 text-xs mb-0.5">المستلم</div>
                  <div className="font-bold text-gray-800 dark:text-gray-200">{debt.recipient}</div>
                </div>
                <div>
                  <div className="text-gray-500 dark:text-gray-400 text-xs mb-0.5">القسم</div>
                  <div className="font-bold text-gray-800 dark:text-gray-200">{debt.department}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-gray-500 dark:text-gray-400 text-xs mb-0.5">السبب</div>
                  <div className="font-medium text-gray-800 dark:text-gray-200 bg-white/40 dark:bg-white/5 p-2 rounded-xl mt-1 line-clamp-2" title={debt.reason}>
                    {debt.reason}
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center mt-2">
                <div className="text-xs text-gray-500">
                  بإذن من: <span className="font-bold">{debt.authorizedBy}</span>
                </div>
                <ActionCell debt={debt} onStatusChange={onStatusChange} onEditDate={onEditDate} />
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

function CumulativeView({ rows }: { rows: { employeeName: string, total: number }[] }) {
  if (rows.length === 0) return <div className="glass-card rounded-[2rem] overflow-hidden"><EmptyState /></div>;

  const maxTotal = Math.max(...rows.map(r => r.total));

  return (
    <div className="glass-card rounded-[2rem] overflow-hidden divide-y divide-gray-100/50 dark:divide-gray-800/30">
      {rows.map(row => (
        <motion.div key={row.employeeName} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 sm:p-5">
          <div className="flex justify-between items-center mb-2">
            <span className="font-bold text-gray-900 dark:text-white">{row.employeeName}</span>
            <span className="font-black text-primary" dir="rtl">{formatLYD(row.total)}</span>
          </div>
          <div className="h-1.5 rounded-full bg-gray-200/50 dark:bg-gray-800/50 overflow-hidden">
            <div
              className="h-full bg-primary rounded-full"
              style={{ width: `${maxTotal ? (row.total / maxTotal) * 100 : 0}%` }}
            />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="py-16 text-center text-gray-400">
      <Filter size={48} className="mx-auto mb-4 opacity-20" />
      <p className="font-medium">لا توجد بيانات مطابقة للبحث</p>
    </div>
  );
}
