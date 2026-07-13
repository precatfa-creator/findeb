import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import AdminDebts from './admin/AdminDebts';
import AdminStats from './admin/AdminStats';
import AdminUsers from './admin/AdminUsers';
import AdminSettings from './admin/AdminSettings';
import { FileText, PieChart, Users, Settings } from 'lucide-react';

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState('debts');

  const tabs = [
    { id: 'debts', label: 'سجل الديون', icon: FileText },
    { id: 'stats', label: 'الاحصائيات', icon: PieChart },
    { id: 'users', label: 'الحسابات', icon: Users },
    { id: 'settings', label: 'الإعدادات', icon: Settings },
  ];

  return (
    <div className="mt-4 sm:mt-8 px-2 sm:px-0">
      {/* Apple style segmented control */}
      <div className="flex overflow-x-auto hide-scrollbar mb-8 pb-2">
        <div className="flex p-1.5 glass-card rounded-[2rem] gap-1 mx-auto min-w-max">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={(e) => {
                  setActiveTab(tab.id);
                  e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                }}
                className={`relative px-5 sm:px-8 py-3 rounded-full font-bold text-sm sm:text-base transition-colors flex items-center gap-2 ${isActive ? 'text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-white/20 dark:hover:bg-black/20'}`}
              >
                {isActive && (
                  <motion.div
                    layoutId="adminTabIndicator"
                    className="absolute inset-0 bg-primary rounded-full shadow-md"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  <motion.div animate={isActive ? { rotate: [0, -10, 10, 0] } : {}}>
                    <Icon size={18} />
                  </motion.div>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <motion.div 
        layout
        className="glass-card rounded-[2rem] p-4 sm:p-8"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'debts' && <AdminDebts />}
            {activeTab === 'stats' && <AdminStats />}
            {activeTab === 'users' && <AdminUsers />}
            {activeTab === 'settings' && <AdminSettings />}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
