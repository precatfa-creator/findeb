import { ChevronRight, ChevronLeft } from 'lucide-react';

export default function Pagination({ page, totalPages, onChange }: { page: number, totalPages: number, onChange: (p: number) => void }) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-3 py-5">
      <button
        disabled={page === 1}
        onClick={() => onChange(page - 1)}
        className="p-2 rounded-xl glass-card disabled:opacity-30 hover:bg-white/40 dark:hover:bg-white/10 transition-colors"
      >
        <ChevronRight size={18} />
      </button>
      <span className="text-sm font-bold text-gray-600 dark:text-gray-300 min-w-[80px] text-center">
        {page} / {totalPages}
      </span>
      <button
        disabled={page === totalPages}
        onClick={() => onChange(page + 1)}
        className="p-2 rounded-xl glass-card disabled:opacity-30 hover:bg-white/40 dark:hover:bg-white/10 transition-colors"
      >
        <ChevronLeft size={18} />
      </button>
    </div>
  );
}
