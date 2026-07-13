import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { format, differenceInDays } from 'date-fns';
import * as XLSX from 'xlsx';
import { motion } from 'motion/react';
import { TrendingUp, Clock, CheckCircle, AlertOctagon, Download, Users } from 'lucide-react';
import SelectField from '../SelectField';
import { formatLYD } from '../../lib/format';

export default function AdminStats() {
  const [debts, setDebts] = useState<any[]>([]);
  const [delayTolerance, setDelayTolerance] = useState(5);
  const [loading, setLoading] = useState(true);
  const [employeeFilter, setEmployeeFilter] = useState('all');

  useEffect(() => {
    const fetchData = async () => {
      const [{ data: settings }, { data: rows }] = await Promise.all([
        supabase.from('settings').select('value').eq('key', 'app').single(),
        supabase.from('debts').select('*').order('created_at', { ascending: false }),
      ]);

      if (settings?.value?.delayTolerance !== undefined) {
        setDelayTolerance(settings.value.delayTolerance);
      }

      setDebts((rows || []).map(row => ({
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
      })));
      setLoading(false);
    };
    fetchData();
  }, []);

  const isDelayed = (receiptDate: string) => {
    if (!receiptDate) return false;
    const diff = differenceInDays(new Date(), new Date(receiptDate));
    return diff > delayTolerance;
  };

  const employees = Array.from(new Set(debts.map(d => d.employeeName))).filter(Boolean).sort();
  const filteredDebts = employeeFilter === 'all' ? debts : debts.filter(d => d.employeeName === employeeFilter);

  const handleExport = (onlyDelayed: boolean) => {
    const dataToExport = filteredDebts.filter(d => onlyDelayed ? (d.status === 'pending' && isDelayed(d.receiptDate)) : true).map(d => ({
      'اسم الموظف': d.employeeName,
      'قيمة الدين (د.ل.)': d.amount,
      'المستلم': d.recipient,
      'القسم': d.department,
      'بإذن من': d.authorizedBy,
      'السبب': d.reason,
      'تاريخ الاستلام': d.receiptDate ? format(new Date(d.receiptDate), 'yyyy-MM-dd HH:mm') : '',
      'الحالة': d.status === 'paid' ? 'تم السداد' : d.status === 'cancelled' ? 'ملغي' : (d.status === 'pending' && isDelayed(d.receiptDate) ? 'متأخر' : 'قيد الانتظار'),
      'تاريخ السداد': d.paymentDate ? format(new Date(d.paymentDate), 'yyyy-MM-dd HH:mm') : '',
      'تاريخ الإلغاء': d.cancelledAt ? format(new Date(d.cancelledAt), 'yyyy-MM-dd HH:mm') : '',
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    ws['!dir'] = 'rtl';
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'الديون');

    const fileName = onlyDelayed ? 'الديون_المتأخرة.xlsx' : 'جميع_الديون.xlsx';
    XLSX.writeFile(wb, fileName);
  };

  if (loading) return (
    <div className="flex justify-center p-10">
      <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent"></div>
    </div>
  );

  const totalAmount = filteredDebts.filter(d => d.status !== 'cancelled').reduce((sum, d) => sum + Number(d.amount || 0), 0);
  const pendingAmount = filteredDebts.filter(d => d.status === 'pending').reduce((sum, d) => sum + Number(d.amount || 0), 0);
  const paidAmount = filteredDebts.filter(d => d.status === 'paid').reduce((sum, d) => sum + Number(d.amount || 0), 0);
  const delayedCount = filteredDebts.filter(d => d.status === 'pending' && isDelayed(d.receiptDate)).length;

  const statsCards = [
    { label: 'إجمالي الديون', value: totalAmount, icon: TrendingUp, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'الديون المتبقية', value: pendingAmount, icon: Clock, color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-500/10' },
    { label: 'الديون المسددة', value: paidAmount, icon: CheckCircle, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-500/10' },
    { label: 'الديون المتأخرة (معاملات)', value: delayedCount, icon: AlertOctagon, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-500/10', isCount: true },
  ];

  return (
    <div className="space-y-8">
      <div className="glass-card p-4 sm:p-6 rounded-[2rem]">
        <SelectField value={employeeFilter} onChange={setEmployeeFilter} icon={Users} className="max-w-xs">
          <option value="all">جميع الموظفين</option>
          {employees.map(name => <option key={name} value={name}>{name}</option>)}
        </SelectField>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {statsCards.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="glass-card p-3 sm:p-6 rounded-2xl sm:rounded-[2rem] flex flex-col justify-between"
            >
              <div className="flex justify-between items-start mb-2 sm:mb-4">
                <div className={`p-2 sm:p-3 rounded-xl sm:rounded-2xl ${stat.bg} ${stat.color}`}>
                  <Icon size={18} className="sm:w-6 sm:h-6" />
                </div>
              </div>
              <div>
                <div className="text-xs sm:text-sm font-bold text-gray-500 dark:text-gray-400 mb-0.5 sm:mb-1">{stat.label}</div>
                <div className={`text-lg sm:text-3xl font-black font-sans tracking-tight ${stat.color}`} dir={stat.isCount ? 'ltr' : 'rtl'}>
                  {stat.isCount ? stat.value.toLocaleString() : formatLYD(stat.value)}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
        className="glass-card p-6 sm:p-8 rounded-[2rem]"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-gray-200/50 dark:bg-gray-800/50 rounded-xl">
            <Download size={20} className="text-gray-700 dark:text-gray-300" />
          </div>
          <h3 className="text-xl font-bold">تصدير البيانات (Excel)</h3>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <motion.button 
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={() => handleExport(false)}
            className="flex-1 bg-gray-800 dark:bg-gray-700 text-white p-4 rounded-2xl hover:bg-gray-700 dark:hover:bg-gray-600 transition flex items-center justify-center gap-2 font-bold shadow-lg"
          >
            <Download size={20} />
            تصدير كل الديون
          </motion.button>
          <motion.button 
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={() => handleExport(true)}
            className="flex-1 bg-primary text-white p-4 rounded-2xl hover:bg-primary/90 transition flex items-center justify-center gap-2 font-bold shadow-lg shadow-primary/20"
          >
            <AlertOctagon size={20} />
            تصدير المتأخرة فقط
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
