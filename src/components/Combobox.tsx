import { useEffect, useRef, useState } from 'react';
import { Plus, Search } from 'lucide-react';

export default function Combobox({
  value, onChange, options, placeholder, allowCreate = true,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  allowCreate?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setQuery(value); }, [value]);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        if (!allowCreate) setQuery(value);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [allowCreate, value]);

  const searchText = allowCreate ? value : query;
  const filtered = options.filter(o => o.toLowerCase().includes(searchText.toLowerCase()));
  const exactMatch = options.some(o => o.toLowerCase() === searchText.trim().toLowerCase());

  const handleSelect = (option: string) => {
    onChange(option);
    setQuery(option);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative">
      <Search size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      <input
        type="text"
        required
        value={searchText}
        onChange={e => allowCreate ? onChange(e.target.value) : setQuery(e.target.value)}
        onFocus={() => setOpen(true)}
        className="glass-input w-full p-4 pr-11 rounded-2xl"
        placeholder={placeholder}
        autoComplete="off"
      />
      {open && (filtered.length > 0 || (allowCreate && searchText.trim() && !exactMatch) || (!allowCreate && searchText.trim() && filtered.length === 0)) && (
        <div className="absolute z-20 mt-2 w-full glass-card rounded-2xl overflow-hidden shadow-xl max-h-56 overflow-y-auto">
          {filtered.map(option => (
            <button
              key={option}
              type="button"
              onMouseDown={e => { e.preventDefault(); handleSelect(option); }}
              className="w-full text-right px-4 py-3 text-sm font-medium text-gray-800 dark:text-gray-200 hover:bg-primary/10 hover:text-primary transition-colors"
            >
              {option}
            </button>
          ))}
          {allowCreate && searchText.trim() && !exactMatch && (
            <button
              type="button"
              onMouseDown={e => { e.preventDefault(); setOpen(false); }}
              className="w-full text-right px-4 py-3 text-sm font-bold text-primary hover:bg-primary/10 transition-colors flex items-center gap-2 border-t border-white/40 dark:border-white/5"
            >
              <Plus size={14} />
              إنشاء جديد: {searchText.trim()}
            </button>
          )}
          {!allowCreate && searchText.trim() && filtered.length === 0 && (
            <div className="px-4 py-3 text-sm text-gray-400 text-center">لا توجد نتائج</div>
          )}
        </div>
      )}
    </div>
  );
}
