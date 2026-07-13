import { useEffect, useRef, useState } from 'react';
import { Plus, Search } from 'lucide-react';

export default function Combobox({
  value, onChange, options, placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const filtered = options.filter(o => o.toLowerCase().includes(value.toLowerCase()));
  const exactMatch = options.some(o => o.toLowerCase() === value.trim().toLowerCase());

  return (
    <div ref={rootRef} className="relative">
      <Search size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      <input
        type="text"
        required
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setOpen(true)}
        className="glass-input w-full p-4 pr-11 rounded-2xl"
        placeholder={placeholder}
        autoComplete="off"
      />
      {open && (filtered.length > 0 || (value.trim() && !exactMatch)) && (
        <div className="absolute z-20 mt-2 w-full glass-card rounded-2xl overflow-hidden shadow-xl max-h-56 overflow-y-auto">
          {filtered.map(option => (
            <button
              key={option}
              type="button"
              onMouseDown={e => { e.preventDefault(); onChange(option); setOpen(false); }}
              className="w-full text-right px-4 py-3 text-sm font-medium text-gray-800 dark:text-gray-200 hover:bg-primary/10 hover:text-primary transition-colors"
            >
              {option}
            </button>
          ))}
          {value.trim() && !exactMatch && (
            <button
              type="button"
              onMouseDown={e => { e.preventDefault(); setOpen(false); }}
              className="w-full text-right px-4 py-3 text-sm font-bold text-primary hover:bg-primary/10 transition-colors flex items-center gap-2 border-t border-white/40 dark:border-white/5"
            >
              <Plus size={14} />
              إنشاء جديد: {value.trim()}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
